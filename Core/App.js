import { setupRenderer } from './Rendering.js';
import * as THREE from 'three/webgpu';
import { uniform, pass, vec3, vec4, mix, step } from 'three/tsl';

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
        
        // Light Count Overlay Influence
        this.tileInfluence = uniform(0.0);

        // Add to Inspector
        const debugFolder = this.renderer.inspector.createParameters('Debug');
        debugFolder.add(this.tileInfluence, 'value', 0, 1).name('Light Count Overlay');

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
        
        // Initialize PostProcessing Graph
        this.updateCompositePass();
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
        
        this.updateCompositePass();
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

        const usePostProcessing = this.heatmapEnabled || this.tileInfluence.value > 0;

        if (usePostProcessing) {
            const lightingNode = this.lighting.getNode(this.scene, this.activeCamera);
            if (lightingNode) {
                // Manually update the lighting node to ensure compute shader runs with current camera
                // This fixes the issue where the heatmap doesn't update when moving the camera
                const frame = {
                    renderer: this.renderer,
                    camera: this.activeCamera,
                    scene: this.scene,
                    time: performance.now(),
                    deltaTime: 0
                };
                lightingNode.updateBefore(frame);
            }
            this.postProcessing.render();
        } else {
            this.renderer.render(this.scene, this.activeCamera);
        }
        requestAnimationFrame(this.render.bind(this));
    }

    updateCompositePass() {
        const scenePass = pass(this.scene, this.activeCamera);
        
        // 1. Base Color (Normal Scene or Heatmap)
        let baseColor;
        if (this.heatmapEnabled) {
            // Use average of RGB as intensity
            const intensity = scenePass.r.add(scenePass.g).add(scenePass.b).div(3.0);
            const t = intensity.mul(this.heatmapScale).clamp(0.0, 1.0);
            
            // Gradient: Blue(0) -> Green(0.5) -> Red(1.0)
            const blue = vec3(0, 0, 1);
            const green = vec3(0, 1, 0);
            const red = vec3(1, 0, 0);
            
            const color1 = mix(blue, green, t.mul(2.0));
            const color2 = mix(green, red, t.sub(0.5).mul(2.0));
            
            baseColor = vec4(mix(color1, color2, step(0.5, t)), 1.0);
        } else {
            baseColor = scenePass;
        }

        // 2. Light Count Overlay
        const node = this.lighting.getNode(this.scene, this.activeCamera);
        // Ensure the node is sized correctly for the current renderer
        node.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);

        let finalOutput;
        if (node && node.getLightCountDebugNode) {
            const ratio = node.getLightCountDebugNode();
            
            const blue = vec3(0, 0, 1);
            const green = vec3(0, 1, 0);
            const red = vec3(1, 0, 0);
            
            const color1 = mix(blue, green, ratio.mul(2.0));
            const color2 = mix(green, red, ratio.sub(0.5).mul(2.0));
            const heatmapColor = mix(color1, color2, step(0.5, ratio));
            
            // Mix baseColor and heatmapColor based on tileInfluence
            finalOutput = mix(baseColor, vec4(heatmapColor, 1.0), this.tileInfluence);
        } else {
            finalOutput = baseColor;
        }

        // Composite
        this.postProcessing.outputNode = finalOutput;
        this.postProcessing.needsUpdate = true;
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
        }
        this.updateCompositePass();
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
        
        this.updateCompositePass();
    }
}
