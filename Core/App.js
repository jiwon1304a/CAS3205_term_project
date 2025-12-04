import { setupRenderer } from './Rendering.js';
import * as THREE from 'three/webgpu';
import { uniform, pass, vec3, mix, step } from 'three/tsl';

export class App {
    constructor() {
        const { scene, camera, renderer, orbitControls, lighting, postProcessing } = setupRenderer();
        this.scene = scene;
        this.renderer = renderer;
        this.orbitControls = orbitControls;
        this.lighting = lighting;
        this.postProcessing = postProcessing;

        // Heatmap sensitivity
        this.heatmapScale = uniform(5.0);

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
        
        if (this.heatmapEnabled) {
            this.updateHeatmapPass();
        }
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

        if (this.heatmapEnabled) {
            // Force TiledLighting to use the active camera for correct view matrix
            if (this.lighting && this.lighting.forceCamera !== undefined) {
                this.lighting.forceCamera = this.activeCamera;
            }
            this.postProcessing.render();
            if (this.lighting && this.lighting.forceCamera !== undefined) {
                this.lighting.forceCamera = null;
            }
        } else {
            this.renderer.render(this.scene, this.activeCamera);
        }
        requestAnimationFrame(this.render.bind(this));
    }

    toggleLightHeatmap(enable) {
        this.heatmapEnabled = enable;
        if (enable) {
            // Enable Heatmap: Swap to white material
            if (!this._heatmapMaterial) {
                this._heatmapMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 1.0,
                    metalness: 0.0,
                    emissive: 0x000000
                });
            }
            this.scene.traverse((obj) => {
                // Hide Sprites (Icons), Lines (Helpers), and objects with 'Helper' in type
                if (obj.isSprite || obj.isLine || obj.isLineSegments || (obj.type && obj.type.includes('Helper'))) {
                    if (obj.userData.originalVisible === undefined) {
                        obj.userData.originalVisible = obj.visible;
                    }
                    obj.visible = false;
                }

                if (obj.isMesh) {
                    // Skip if it's a helper or gizmo (heuristic)
                    if (obj.type === 'TransformControlsPlane') return; 

                    if (!obj.userData.originalMaterial) {
                        obj.userData.originalMaterial = obj.material;
                    }
                    obj.material = this._heatmapMaterial;
                }
            });
            this.updateHeatmapPass();
        } else {
            // Disable Heatmap: Restore original materials and visibility
            this.scene.traverse((obj) => {
                // Restore visibility
                if (obj.userData.originalVisible !== undefined) {
                    obj.visible = obj.userData.originalVisible;
                    delete obj.userData.originalVisible;
                }

                if (obj.isMesh && obj.userData.originalMaterial) {
                    obj.material = obj.userData.originalMaterial;
                    delete obj.userData.originalMaterial;
                }
            });
            this.postProcessing.outputNode = null;
            this.postProcessing.needsUpdate = true;
        }
    }

    updateHeatmapPass() {
        if (!this.heatmapEnabled) return;
        
        const scenePass = pass(this.scene, this.activeCamera);
        // Use average of RGB as intensity
        const intensity = scenePass.r.add(scenePass.g).add(scenePass.b).div(3.0);
        const t = intensity.mul(this.heatmapScale).clamp(0.0, 1.0);
        
        // Gradient: Blue(0) -> Green(0.5) -> Red(1.0)
        const blue = vec3(0, 0, 1);
        const green = vec3(0, 1, 0);
        const red = vec3(1, 0, 0);
        
        // Mix Blue -> Green
        const color1 = mix(blue, green, t.mul(2.0));
        // Mix Green -> Red
        const color2 = mix(green, red, t.sub(0.5).mul(2.0));
        
        // Select based on t >= 0.5
        const finalColor = mix(color1, color2, step(0.5, t));
        
        this.postProcessing.outputNode = finalColor;
        this.postProcessing.needsUpdate = true;
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
