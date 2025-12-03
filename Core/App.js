import { setupRenderer } from './Rendering.js';

export class App {
    constructor() {
        const { scene, camera, renderer, orbitControls, lighting, postProcessing } = setupRenderer();
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.orbitControls = orbitControls;
        this.lighting = lighting;
        this.postProcessing = postProcessing;

        this.onUpdate = []; // 외부에서 등록할 업데이트 콜백들
        
        window.addEventListener('resize', this.resize.bind(this));
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

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.render.bind(this));
    }

    resize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
