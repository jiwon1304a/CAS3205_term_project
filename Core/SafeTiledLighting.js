// Original : https://threejs.org/docs/#TiledLighting.createNode
import * as THREE from 'three/webgpu';
import { TiledLighting } from 'three/addons/lighting/TiledLighting.js';
import TiledLightsNode, { circleIntersectsAABB } from 'three/addons/tsl/lighting/TiledLightsNode.js';
import { attributeArray, int, float, vec2, vec3, vec4, ivec4, mat4, Loop, Fn, If, Return, instanceIndex, screenCoordinate, Break, positionView, directPointLight, uniform } from 'three/tsl';

const NUM_MAX_LIGHTS = 256;
const TILE_SIZE = 16;
const TILE_LIGHT_COUNT = 32;

// getPlaneVec: clip space (x, y, 1) -> view space (vec3)
// This will be created as an Fn inside the compute() scope so it can access
// the local `projectionMatrixInverse` defined there.



// Fix for TiledLighting crash: Patch customCacheKey to handle null _compute
class SafeTiledLightsNode extends TiledLightsNode {
    constructor( maxLights = NUM_MAX_LIGHTS, tileSize = TILE_SIZE, tileLightCount = TILE_LIGHT_COUNT ) {
        super( maxLights, tileSize );
        this._tileLightCount = tileLightCount;
        this._blocksPerTile = Math.ceil( tileLightCount / 4 );
        this._cameraProjectionMatrixInverse = uniform( 'mat4' );
    }

    updateBefore( frame ) {
        super.updateBefore( frame );
        this._cameraProjectionMatrixInverse.value.copy( this._cameraProjectionMatrix.value ).invert();
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

    getDebugValueNode() {
        return Fn( () => {
            return this._debugValue.element( this._screenTileIndex );
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

        const debugValueArray = new Float32Array( numTiles );
        const debugValue = attributeArray( debugValueArray, 'float' ).setName( 'debugValue' );

        const compute = Fn( () => {
            // Initialize all blocks
            for ( let j = 0; j < blocksPerTile; j ++ ) {
                const tileOffset = instanceIndex.mul( int( blocksPerTile ) );
                const tileIndex = tileOffset.add( int( j ) );
                lightIndices.element(tileIndex).assign( ivec4( 0 ) );
            }

            const { _cameraProjectionMatrix: cameraProjectionMatrix, _cameraProjectionMatrixInverse: cameraProjectionMatrixInverse, _bufferSize: bufferSize, _screenSize: screenSize } = this;

            const tiledBufferSize = bufferSize.clone().divideScalar( tileSize ).ceil();

            // !!!vec2맞음
            const tileScreen = vec2(
                instanceIndex.mod( tiledBufferSize.width ),
                instanceIndex.div( tiledBufferSize.width )
            ).mul( tileSize ).div( screenSize );

            const blockSize = float( tileSize ).div( float( screenSize ) );
            const minBounds = vec2( tileScreen.x, tileScreen.y );
            const maxBounds = minBounds.add( vec2( float(blockSize), float(blockSize) ) );

            const numLightsAssigned = int( 0 ).toVar(name='numLightsAssigned');

            // Frustum Planes Calculation
            const ndcMinX = minBounds.x.mul( 2.0 ).sub( 1.0 );
            const ndcMaxX = maxBounds.x.mul( 2.0 ).sub( 1.0 );
            const ndcMinY = maxBounds.y.mul( -2.0 ).add( 1.0 );
            const ndcMaxY = minBounds.y.mul( -2.0 ).add( 1.0 );

            // View-space basis vectors
            const cameraUp    = vec3(0.0, 1.0, 0.0);
            const cameraRight = vec3(1.0, 0.0, 0.0);

            // const ProjMat = cameraProjectionMatrix.toVar(name='ProjMat');
            // const projectionMatrixInverse = ProjMat.inverse();

            // Fn-style helper: clip space (x, y, 1) -> view space vec3
            const getPlaneVec = /*@__PURE__*/ Fn( ( [ x, y ] ) => {
                const clip = vec4( x, y, float( 1.0 ), float( 1.0 ) );
                const view = cameraProjectionMatrixInverse.mul( clip );
                return view.xyz.div( view.w );
            } ).setLayout( {
                name: 'getPlaneVec',
                type: 'vec3',
                inputs: [
                    { name: 'x', type: 'float' },
                    { name: 'y', type: 'float' },
                ]
            } );

            // (ndcMinX, 0) : 타일의 왼쪽 모서리가 만드는 직선 위의 한 점
            // (ndcMinX, 0, 1) : 타일이 만드는 박스의 왼쪽 면 위의 한 직선
            // 위의 clip space상에서의 좌표를 view space로 변환
            const viewL = getPlaneVec(ndcMinX, float(0.0));
            const viewR = getPlaneVec(ndcMaxX, float(0.0));
            const viewB = getPlaneVec(float(0.0), ndcMinY);
            const viewT = getPlaneVec(float(0.0), ndcMaxY);

            // view space에서 viewL과 cameraUp은 (0,0,0)에서 교차함
            // 또한 cameraUp은 왼쪽 평면 위에 위치한다.
            // 따라서 두 벡터의 외적으로 왼쪽 평면의 법선 벡터를 구할 수 있음
            const planeL = viewL.cross(cameraUp).normalize();
            const planeR = cameraUp.cross(viewR).normalize();
            const planeB = viewB.cross(cameraRight).normalize();
            const planeT = cameraRight.cross(viewT).normalize();

            // 확실하게 겹치지 않는것만 제외
            const sphereIntersectsFrustum = Fn( ( [ sphereCenter, sphereRadius ] ) => {
                // 각 평면에 대해서 구한 법선 벡터와 구의 중심을 내적해서 음수이면 구가 평면 뒤에 있다는 뜻
                // 즉, 구와 frustum이 겹치지 않음
                const distanceL = planeL.dot( sphereCenter );
                const distanceR = planeR.dot( sphereCenter );
                const distanceB = planeB.dot( sphereCenter );
                const distanceT = planeT.dot( sphereCenter );
                
                const inL = distanceL.lessThan( sphereRadius );
                const inR = distanceR.lessThan( sphereRadius );
                const inB = distanceB.lessThan( sphereRadius );
                const inT = distanceT.lessThan( sphereRadius );

                const outL = distanceL.greaterThan( sphereRadius.negate() );
                const outR = distanceR.greaterThan( sphereRadius.negate() );
                const outB = distanceB.greaterThan( sphereRadius.negate() );
                const outT = distanceT.greaterThan( sphereRadius.negate() );

                const nearL = inL.and(outL);
                const nearR = inR.and(outR);
                const nearB = inB.and(outB);
                const nearT = inT.and(outT);

                return nearL.and( nearR ).and( nearB ).and( nearT );
            }).setLayout( {
                name: 'sphereIntersectsFrustum',
                type: 'bool',
                inputs: [
                    { name: 'sphereCenter', type: 'vec3' },
                    { name: 'sphereRadius', type: 'float' }
                ]
            } );

            // 모든 light를 순회하면서 현재 타일에 영향을 주는 light를 찾음
            Loop( this.maxLights, ( { i: lightIdx } ) => {
                // 이미 할당된 light 개수가 타일당 최대치에 도달했으면 종료
                If( numLightsAssigned.greaterThanEqual( this._tileLightCount ).or( int( lightIdx ).greaterThanEqual( int( this._lightsCount ) ) ), () => {
                    Return();
                } );

                const { viewPosition, distance } = this.getLightData( lightIdx );
                const sphereRadius = distance;
                // If ( circleIntersectsAABB( viewPosition, sphereRadius, minBounds, maxBounds ), () => {
                If( sphereIntersectsFrustum( viewPosition, sphereRadius ), () => {
                    If( numLightsAssigned.lessThan( this._tileLightCount ), () => {
                        // 0이 저장되어있으면 tile을 패스하도록 되어있으므로, light index + 1을 저장
                        // 나중에 읽을 때는 -1을 해서 실제 light index를 얻음
                        getTile( numLightsAssigned ).assign( lightIdx.add( int( 1 ) ) );
                        numLightsAssigned.addAssign( int( 1 ) );
                    } );
                } );
                // debugValue.element( instanceIndex ).assign( planeL.dot( viewPosition ).x);
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
        this._debugValue = debugValue;
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
