import * as THREE from 'three/webgpu';
import { Gizmo, initSelection } from '../UI/index.js';

export class Interaction {
    constructor(app) {
        this.app = app;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.selectedObject = null;
        this.gizmo = null;
        
        this.onSelectionChanged = null; // 외부에서 설정할 콜백 (예: UI 업데이트)

        this.initGizmo();
        this.initSelection();
        this.initKeyboard();
        
        // App의 렌더 루프에 업데이트 함수 등록
        this.app.onUpdate.push(this.update.bind(this));
    }

    initGizmo() {
        this.gizmo = new Gizmo({ 
            renderer: this.app.renderer, 
            camera: this.app.camera, 
            domElement: this.app.renderer.domElement, 
            orbitControls: this.app.orbitControls, 
            scene: this.app.scene, 
            size: 3, 
            snap: { translate: 1, rotate: 15, scale: 0.1 } 
        });
        this.app.scene.add(this.gizmo.group);
        this.gizmo.setVisibility(false);
    }

    initSelection() {
        this.selection = initSelection({ 
            renderer: this.app.renderer, 
            camera: this.app.camera, 
            scene: this.app.scene, 
            raycaster: this.raycaster, 
            pointer: this.pointer,
            onSelect: (found) => this.select(found),
            onDeselect: () => this.deselect()
        });
    }

    updateCamera(camera) {
        if (this.gizmo && typeof this.gizmo.setCamera === 'function') {
            this.gizmo.setCamera(camera);
        }
        if (this.selection && typeof this.selection.setCamera === 'function') {
            this.selection.setCamera(camera);
        }
    }

    select(object) {
        if (!object) {
            this.deselect();
            return;
        }

        // 기존 선택 해제
        if (this.selectedObject && this.selectedObject !== object && typeof this.selectedObject.setSelected === 'function') {
            this.selectedObject.setSelected(false);
        }
        
        this.selectedObject = object;
        
        // 새 선택 설정
        if (this.selectedObject && typeof this.selectedObject.setSelected === 'function') {
            this.selectedObject.setSelected(true);
        }

        // Gizmo 부착
        if (this.gizmo) {
            this.gizmo.attach(object);
            this.gizmo.setVisibility(true);
            this.gizmo.setMode('translate');
        }

        console.log('Selected', this.selectedObject);
        
        // UI 등에 알림
        if (this.onSelectionChanged) this.onSelectionChanged(this.selectedObject);
    }

    deselect() {
        if (this.selectedObject && typeof this.selectedObject.setSelected === 'function') {
            this.selectedObject.setSelected(false);
        }
        this.selectedObject = null;
        
        if (this.gizmo) {
            this.gizmo.detach();
            this.gizmo.setVisibility(false);
        }
        
        if (this.onSelectionChanged) this.onSelectionChanged(null);
    }

    initKeyboard() {
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (!this.gizmo) return;
            if (key === 'w') this.gizmo.setMode('translate');
            else if (key === 'e') this.gizmo.setMode('rotate');
            else if (key === 'r') this.gizmo.setMode('scale');
        });
    }

    update() {
        if (this.gizmo) this.gizmo.update();
    }
}
