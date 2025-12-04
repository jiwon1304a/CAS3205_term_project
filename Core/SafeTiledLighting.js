// Original : https://threejs.org/docs/#TiledLighting.createNode
import * as THREE from 'three/webgpu';
import { TiledLighting } from 'three/addons/lighting/TiledLighting.js';
import TiledLightsNode, { circleIntersectsAABB } from 'three/addons/tsl/lighting/TiledLightsNode.js';
import { attributeArray, int, float, vec2, ivec4, Loop, Fn, If, Return, instanceIndex, screenCoordinate } from 'three/tsl';

const MAX_LIGHTS = 64;
const TILE_SIZE = 16;
const TILE_LIGHT_COUNT = 16;

// Fix for TiledLighting crash: Patch customCacheKey to handle null _compute
class SafeTiledLightsNode extends TiledLightsNode {
    constructor( maxLights = MAX_LIGHTS, tileSize = TILE_SIZE, tileLightCount = TILE_LIGHT_COUNT ) {
        super( maxLights, tileSize );
        this._tileLightCount = tileLightCount;
        this._blocksPerTile = Math.ceil( tileLightCount / 4 );
    }

    getBlock( block = 0 ) {
        return this._lightIndexes.element( this._screenTileIndex.mul( int( this._blocksPerTile ) ).add( int( block ) ) );
    }

    getTile( element ) {
        element = int( element );
        const stride = int( 4 );
        const tileOffset = element.div( stride );
        const tileIndex = this._screenTileIndex.mul( int( this._blocksPerTile ) ).add( tileOffset );
        return this._lightIndexes.element( tileIndex ).element( element.mod( stride ) );
    }

    create( width, height ) {
        const { tileSize, maxLights, _tileLightCount } = this;

        const bufferSize = new THREE.Vector2( width, height );
        
        const tileWidth = Math.ceil( bufferSize.width / tileSize );
        const tileHeight = Math.ceil( bufferSize.height / tileSize );
        const count = tileWidth * tileHeight;
        
        // https://unpkg.com/three@0.181.2/examples/jsm/tsl/lighting/TiledLightsNode.js
        // 원래 코드에서 tile별 light index를 ivec4
        const blocksPerTile = Math.ceil( _tileLightCount / 4 );

        // buffers
        // Light마다 2개의 vec4에 pos, distance, rgb, decay를 저장.
        const lightDataSize = 4 * 2;
        const lightsData = new Float32Array( maxLights * lightDataSize ); 
        // 2차원 배열로 저장하는데, 첫번째 dimension은 light index, 두번째 dimension은 vec4( pos.x, pos.y, pos.z, distance ), vec4( color.r, color.g, color.b, decay )
        // 배치
        // [light0]
        // 0x0000 vec4( pos.x, pos.y, pos.z, distance )
        // 0x0010 vec4( color.r, color.g, color.b, decay )
        // [light1]
        // 0x0020 vec4( pos.x, pos.y, pos.z, distance )
        // 0x0030 vec4( color.r, color.g, color.b, decay )
        // ...
        const lightsTexture = new THREE.DataTexture( lightsData, lightsData.length / lightDataSize, 2, THREE.RGBAFormat, THREE.FloatType );

        // Adjust buffer size for lightIndexes
        const lightIndexesArray = new Int32Array( count * 4 * blocksPerTile );
        const lightIndexes = attributeArray( lightIndexesArray, 'ivec4' ).setName( 'lightIndexes' );

        // compute

        const getBlock = ( index ) => {
            // Use blocksPerTile instead of hardcoded 2
            const tileIndex = instanceIndex.mul( int( blocksPerTile ) ).add( int( index ) );
            return lightIndexes.element( tileIndex );
        };

        const getTile = ( elementIndex ) => {
            elementIndex = int( elementIndex );
            const stride = int( 4 );
            const tileOffset = elementIndex.div( stride );
            // Use blocksPerTile instead of hardcoded 2
            const tileIndex = instanceIndex.mul( int( blocksPerTile ) ).add( tileOffset );
            return lightIndexes.element( tileIndex ).element( elementIndex.mod( stride ) );
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

            const index = int( 0 ).toVar();

            // Initialize all blocks
            for ( let j = 0; j < blocksPerTile; j ++ ) {
                getBlock( j ).assign( ivec4( 0 ) );
            }

            Loop( this.maxLights, ( { i } ) => {

                If( index.greaterThanEqual( this._tileLightCount ).or( int( i ).greaterThanEqual( int( this._lightsCount ) ) ), () => {
                    Return();
                } );

                const { viewPosition, distance } = this.getLightData( i );
                const projectedPosition = cameraProjectionMatrix.mul( viewPosition );
                const ndc = projectedPosition.div( projectedPosition.w );
                const screenPosition = ndc.xy.mul( 0.5 ).add( 0.5 ).flipY();

                const distanceFromCamera = viewPosition.z;
                const pointRadius = distance.div( distanceFromCamera );

                If( circleIntersectsAABB( screenPosition, pointRadius, minBounds, maxBounds ), () => {
                    If( index.lessThan( this._tileLightCount ), () => {
                        getTile( index ).assign( i.add( int( 1 ) ) );
                        index.addAssign( int( 1 ) );
                    } );
                } );

            } );

        } )().compute( count ).setName( 'Update Tiled Lights' );

        // screen coordinate lighting indexes

        const screenTile = screenCoordinate.div( tileSize ).floor().toVar();
        const screenTileIndex = screenTile.x.add( screenTile.y.mul( tileWidth ) );

        // assigns

        this._bufferSize = bufferSize;
        this._lightIndexes = lightIndexes;
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
        const node = new SafeTiledLightsNode(MAX_LIGHTS, this.tileSize, this.tileLightCount);
        node.setLights(lights);
        
        const originalCacheKey = node.customCacheKey.bind( node );
        node.customCacheKey = function() {
            if ( this._compute === null ) return '0';
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
