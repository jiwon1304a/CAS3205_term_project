import * as THREE from 'three/webgpu';
import { initOrbitControls } from '../util.js';
import { SHADOW } from '../Settings.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { TiledLighting } from 'three/addons/lighting/TiledLighting.js';

export function setupRenderer() {
    let scene = new THREE.Scene();
    
    let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 50);

    // const aspect = window.innerWidth / window.innerHeight;
    // const frustumSize = 100;
    // let camera = new THREE.OrthographicCamera(
    //     frustumSize * aspect / -2,
    //     frustumSize * aspect / 2,
    //     frustumSize / 2,
    //     frustumSize / -2,
    //     0.1,
    //     1000
    // );
    // camera.position.set(0, 50, 0);
    // camera.lookAt(0, 0, 0);

    scene.add(camera);
    
    let renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    // enable shadow map on renderer so lights/meshes can cast/receive shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Fix for TiledLighting crash: Patch customCacheKey to handle null _compute
    class SafeTiledLighting extends TiledLighting {
        createNode( lights = [] ) {
            const node = super.createNode( lights );
            const originalCacheKey = node.customCacheKey.bind( node );
            node.customCacheKey = function() {
                if ( this._compute === null ) return '0';
                return originalCacheKey();
            };
            return node;
        }
    }

    const lighting = new SafeTiledLighting();
    renderer.lighting = lighting;
    
    let postProcessing = new THREE.PostProcessing( renderer );

    // const debugBlockIndexes = lighting.getNode( scene, camera ).setSize( window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio ).getBlock().toColor().div( 100 * 2 );

    // postProcessing.outputNode = compose.add( debugBlockIndexes.mul( tileInfluence ) );
    postProcessing.needsUpdate = true;

    let orbitControls = initOrbitControls(camera, renderer);

    return { scene, camera, renderer, orbitControls, lighting, postProcessing };
};