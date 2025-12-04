// Original : https://threejs.org/docs/#TiledLighting.createNode
import * as THREE from 'three/webgpu';
import { TiledLighting } from 'three/addons/lighting/TiledLighting.js';
import TiledLightsNode, { circleIntersectsAABB } from 'three/addons/tsl/lighting/TiledLightsNode.js';
import { attributeArray, int, float, vec2, vec4, ivec4, Loop, Fn, If, Return, instanceIndex, screenCoordinate, Break, positionView, directPointLight } from 'three/tsl';

const NUM_MAX_LIGHTS = 128;
const TILE_SIZE = 16;
const TILE_LIGHT_COUNT = 16;

// Fix for TiledLighting crash: Patch customCacheKey to handle null _compute
class SafeTiledLightsNode extends TiledLightsNode {
    constructor( maxLights = NUM_MAX_LIGHTS, tileSize = TILE_SIZE, tileLightCount = TILE_LIGHT_COUNT ) {
        super( maxLights, tileSize );
        this._tileLightCount = tileLightCount;
        this._blocksPerTile = Math.ceil( tileLightCount / 4 );
    }

    getBlock( block = 0 ) {
        return this._lightIndexes.element( this._screenTileIndex.mul( int( this._blocksPerTile ) ).add( int( block ) ) );
    }

    // 현재 픽셀이 속한
    getTile( element ) {
        element = int( element );
        const stride = int( 4 );
        const tileOffset = element.div( stride );
        const tileIndex = this._screenTileIndex.mul( int( this._blocksPerTile ) ).add( tileOffset );
        return this._lightIndexes.element( tileIndex ).element( element.mod( stride ) );
    }

    getLightCountDebugNode() {
        return Fn( () => {
            const count = float( 0 ).toVar();
            
            Loop( this._tileLightCount, ( { i } ) => {
                const lightIndex = this.getTile( i );
                If( lightIndex.notEqual( int( 0 ) ), () => {
                    count.addAssign( 1.0 );
                } );
            } );

            return count.div( float( this._tileLightCount ) );
        } )();
    }

    setLights( lights ) {
        const { tiledLights, materialLights } = this;

        let materialindex = 0;
        let tiledIndex = 0;

        for ( const light of lights ) {

            if ( light.isPointLight === true ) {

                tiledLights[ tiledIndex ++ ] = light;

            } else {

                materialLights[ materialindex ++ ] = light;

            }

        }

        materialLights.length = materialindex;
        tiledLights.length = tiledIndex;

        return THREE.LightsNode.prototype.setLights.call( this, materialLights );
    }

    create( width, height ) {
        const { tileSize, maxLights, _tileLightCount } = this;

        const bufferSize = new THREE.Vector2( width, height );
        
        const tileWidth = Math.ceil( bufferSize.width / tileSize );
        const tileHeight = Math.ceil( bufferSize.height / tileSize );
        const numTiles = tileWidth * tileHeight;


        // buffers
        // Light마다 2개의 vec4에 pos, distance, rgb, decay를 저장.
        const lightDataSize = 4 * 2;
        const lightsData = new Float32Array( maxLights * lightDataSize ); 
        // 2차원 배열로 저장하는데, 첫번째 dimension은 light index, 두번째 dimension은 vec4( pos.x, pos.y, pos.z, distance ), vec4( color.r, color.g, color.b, decay )
        // 배치
        // lightsData[0][0] 0x0000 vec4( pos.x, pos.y, pos.z, distance )
        // lightsData[0][1] 0x0010 vec4( color.r, color.g, color.b, decay )
        // [light1]
        // lightsData[1][0] 0x0020 vec4( pos.x, pos.y, pos.z, distance )
        // lightsData[1][1] 0x0030 vec4( color.r, color.g, color.b, decay )
        // ...
        const lightsTexture = new THREE.DataTexture( lightsData, lightsData.length / lightDataSize, 2, THREE.RGBAFormat, THREE.FloatType );
        
        // https://unpkg.com/three@0.181.2/examples/jsm/tsl/lighting/TiledLightsNode.js
        // 원래 코드에서 타일별 light index를 ivec4로 저장하고 있음
        // lightIndices buffer layout
        // [tile0]
        // 0x0000 [block0] ivec4( lightIndex0, lightIndex1, lightIndex2, lightIndex3 )
        // 0x0010 [block1] ivec4( lightIndex4, lightIndex5, lightIndex6, lightIndex7 )
        // 0x0020 [block2] ivec4( lightIndex8, lightIndex9, lightIndex10, lightIndex11 )
        // 0x0030 [block3] ivec4( lightIndex12, lightIndex13, lightIndex14, lightIndex15 )
        // [tile1]
        // 0x0040 [block0] ivec4( lightIndex0, lightIndex1, lightIndex2, lightIndex3 )
        // 0x0050 [block1] ivec4( lightIndex4, lightIndex5, lightIndex6, lightIndex7 )
        // ...
        // 한 타일에 최대 16개의 light index를 저장 가능 (타일당 4개의 ivec4, _tileLightCount = 16 기준)

        const blocksPerTile = Math.ceil( _tileLightCount / 4 );
        // _tileLightCount / 4 * 4를 해서 결과적으로는 한 타일에 _tileLightCount개의 light index를 저장
        // (정확하게는 4의 배수로 올림)
        const lightIndicesArray = new Int32Array( numTiles * 4 * blocksPerTile );
        const lightIndices = attributeArray( lightIndicesArray, 'ivec4' ).setName( 'lightIndexes' );

        // 현재 스레드가 담당하는 타일 기준으로 elementIndex번째 light index를 저장하는 위치를 계산
        // lightIndices에서 해당 위치에 대한 참조를 반환
        // 100번째 thread에서 elementIndex가 13이라면,
        // 100번째 타일의 세번째 ivec4의 두번째 요소에 해당
        // -> index = 100 * blocksPerTile + 4 * 2 + 1 (int형 배열로 해석했을 때)
        const getTile = ( elementIndex ) => {
            elementIndex = int( elementIndex );
            const stride = int( 4 ); // 한 블럭에 4개의 int가 들어가니까
            const offsetBlock = elementIndex.div( stride );
            const tileIndex = instanceIndex.mul( int( blocksPerTile ) );
            const blockIndex = tileIndex.add( offsetBlock );
            return lightIndices.element( blockIndex ).element( elementIndex.mod( stride ) );
        };

        const compute = Fn( () => {

            const { _cameraProjectionMatrix: cameraProjectionMatrix, _bufferSize: bufferSize, _screenSize: screenSize } = this;

            const tiledBufferSize = bufferSize.clone().divideScalar( tileSize ).ceil();

            const tileScreen = vec2(
                instanceIndex.mod( tiledBufferSize.width ),
                instanceIndex.div( tiledBufferSize.width )
            ).mul( tileSize ).div( screenSize );

            const blockSize = float( tileSize ).div( screenSize );
            const minBounds = tileScreen;
            const maxBounds = minBounds.add( blockSize );

            const numLightsAssigned = int( 0 ).toVar();

            // Initialize all blocks
            for ( let j = 0; j < blocksPerTile; j ++ ) {
                const tileOffset = instanceIndex.mul( int( blocksPerTile ) );
                const tileIndex = tileOffset.add( int( j ) );
                lightIndices.element(tileIndex).assign( ivec4( 0 ) );
            }

            // 모든 light를 순회하면서 현재 타일에 영향을 주는 light를 찾음
            Loop( this.maxLights, ( { i: lightIdx } ) => {

                If( numLightsAssigned.greaterThanEqual( this._tileLightCount ).or( int( lightIdx ).greaterThanEqual( int( this._lightsCount ) ) ), () => {
                    Return();
                } );

                const { viewPosition, distance } = this.getLightData( lightIdx );
                const projectedPosition = cameraProjectionMatrix.mul( viewPosition );
                const ndc = projectedPosition.div( projectedPosition.w );
                const screenPosition = ndc.xy.mul( 0.5 ).add( 0.5 ).flipY();

                const distanceFromCamera = viewPosition.z;
                const pointRadius = distance.div( distanceFromCamera );

                If( circleIntersectsAABB( screenPosition, pointRadius, minBounds, maxBounds ), () => {
                    If( numLightsAssigned.lessThan( this._tileLightCount ), () => {
                        // 0이 저장되어있으면 tile을 패스하도록 되어있으므로, light index + 1을 저장
                        // 나중에 읽을 때는 -1을 해서 실제 light index를 얻음
                        getTile( numLightsAssigned ).assign( lightIdx.add( int( 1 ) ) );
                        numLightsAssigned.addAssign( int( 1 ) );
                    } );
                } );

            } );

        } )().compute( numTiles ).setName( 'Update Tiled Lights' );

        // screen coordinate lighting indexes

        const screenTile = screenCoordinate.div( tileSize ).floor().toVar();
        const screenTileIndex = screenTile.x.add( screenTile.y.mul( tileWidth ) );

        // assigns

        this._bufferSize = bufferSize;
        this._lightIndexes = lightIndices;
        this._screenTileIndex = screenTileIndex;
        this._compute = compute;
        this._lightsTexture = lightsTexture;
    }
}

export class SafeTiledLighting extends TiledLighting {
    constructor(tileSize = TILE_SIZE, tileLightCount = TILE_LIGHT_COUNT) {
        super();
        this.tileSize = tileSize;
        this.tileLightCount = tileLightCount;
        this.forceCamera = null;
    }
    createNode( lights = [] ) {
        // Use SafeTiledLightsNode with fixed create method
        const node = new SafeTiledLightsNode(NUM_MAX_LIGHTS, this.tileSize, this.tileLightCount);
        node.setLights(lights);
        
        const originalCacheKey = node.customCacheKey.bind( node );
        node.customCacheKey = function() {
            if ( this._compute === null ) return THREE.LightsNode.prototype.customCacheKey.call(this);
            return originalCacheKey();
        };

        const originalUpdateBefore = node.updateBefore.bind(node);
        const self = this;
        node.updateBefore = function(frame) {
            if (self.forceCamera) {
                frame.camera = self.forceCamera;
            }
            originalUpdateBefore(frame);
        };

        return node;
    }
}
