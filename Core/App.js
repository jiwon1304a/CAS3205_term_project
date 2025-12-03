import { setupRenderer } from './Rendering.js';
import * as THREE from 'three/webgpu';

export class App {
    constructor() {
        const { scene, camera, renderer, orbitControls, lighting, postProcessing } = setupRenderer();
        this.scene = scene;
        this.renderer = renderer;
        this.orbitControls = orbitControls;
        this.lighting = lighting;
        this.postProcessing = postProcessing;

        // Cameras
        this.perspectiveCamera = camera;
        
        // Orthographic Camera Setup
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 100; // Adjust as needed
        this.orthographicCamera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.orthographicCamera.position.set(0, 50, 0);
        this.orthographicCamera.lookAt(0, 0, 0);
        this.scene.add(this.orthographicCamera);

        this.activeCamera = this.perspectiveCamera;

        this.onUpdate = []; // 외부에서 등록할 업데이트 콜백들
        
        window.addEventListener('resize', this.resize.bind(this));
    }

    get camera() {
        return this.activeCamera;
    }

    switchCamera(mode) {
        if (mode === 'Perspective') {
            this.activeCamera = this.perspectiveCamera;
            this.orbitControls.object = this.activeCamera;
            this.orbitControls.enableRotate = true;
        } else if (mode === 'Orthographic') {
            this.activeCamera = this.orthographicCamera;
            this.activeCamera.position.set(0, 50, 0);
            this.activeCamera.lookAt(0, 0, 0);
            this.orbitControls.object = this.activeCamera;
            this.orbitControls.enableRotate = false; // Disable rotation for top-down view
            this.orbitControls.target.set(0, 0, 0); // Reset target to center
        }
        this.orbitControls.update();
    }

    async start() {
        if (typeof this.renderer.init === 'function') {
            try {
                await this.renderer.init();
            } catch (e) {
                console.warn('renderer.init() failed:', e);
            }
        }
        this.render();
    }

    render() {
        this.orbitControls.update();
        
        // 등록된 업데이트 콜백 실행 (예: Gizmo, UI 업데이트 등)
        this.onUpdate.forEach(callback => callback());

        this.renderer.render(this.scene, this.activeCamera);
        requestAnimationFrame(this.render.bind(this));
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;

        this.renderer.setSize(width, height);

        // Update Perspective
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();

        // Update Orthographic
        const frustumSize = 100;
        this.orthographicCamera.left = -frustumSize * aspect / 2;
        this.orthographicCamera.right = frustumSize * aspect / 2;
        this.orthographicCamera.top = frustumSize / 2;
        this.orthographicCamera.bottom = -frustumSize / 2;
        this.orthographicCamera.updateProjectionMatrix();
    }
}
