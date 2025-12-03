import { createGUI, initObjectControls, initLightControls, initMeshControls } from '../UI/index.js';
import { DirectionalLight, PointLight, Spotlight } from '../Object/index.js';
import * as THREE from 'three/webgpu';

export class UIManager {
    constructor(app, world, interaction) {
        this.app = app;
        this.world = world;
        this.interaction = interaction;
        
        this.gui = createGUI();
        this.params = {
            width: 4, height: 2, depth: 2,
            posX: 0, posY: 3, posZ: 0,
            rotX: 0, rotY: 0, rotZ: 0,
            color: '#0077ff',
            scaleX: 1, scaleY: 1, scaleZ: 1,
            lightEnabled: true,
            dirIntensity: 1, dirX: -10, dirY: 10, dirZ: -10, showDirHelper: true,
            skyColor: '#87CEEB', skySize: 1000, skyVisible: true,
            selectedLightIntensity: 1, selectedLightColor: '#ffffff'
        };

        this.objectUI = null;
        this.meshUI = null;
        this.lightUI = null;

        this.initControls();
        
        // Interaction에서 선택 변경 시 UI 업데이트
        this.interaction.onSelectionChanged = (obj) => this.updateUI(obj);
        
        // App 루프에서 UI 업데이트 (Gizmo 드래그 시 값 변경 반영)
        this.app.onUpdate.push(this.updateLoop.bind(this));
    }

    initControls() {
        // Object Controls
        this.objectUI = initObjectControls({ 
            gui: this.gui, 
            params: this.params,
            getSelectedObject: () => this.interaction.selectedObject,
            setSelectedObject: (o) => this.interaction.select(o)
        });

        // Add Box Button
        this.gui.add({ addBox: () => this.addRandomBox() }, 'addBox').name('Add Box');

        // Light Controls
        const iconSize = 5;
        this.lightUI = initLightControls({ 
            gui: this.gui, 
            params: this.params,
            createDirectional: () => {
                const dl = new DirectionalLight({ 
                    color: 0xffffff, intensity: this.params.dirIntensity, 
                    position: new THREE.Vector3(this.params.dirX, this.params.dirY, this.params.dirZ), 
                    name: 'DirectionalLight', icon: 'Assets/directionallight.svg', iconSize 
                });
                dl.addTo(this.app.scene);
                dl.createHelper(this.app.scene);
                if (typeof dl.setHelperVisible === 'function') dl.setHelperVisible(this.params.showDirHelper);
                return dl;
            },
            createPoint: () => {
                const pl = new PointLight({ 
                    color: 0xffffff, intensity: 1000, 
                    position: new THREE.Vector3(0, 5, 0), distance: 10, decay: 2, 
                    name: 'PointLight', icon: 'Assets/pointlight.svg', iconSize 
                });
                pl.addTo(this.app.scene);
                pl.createHelper(this.app.scene);
                return pl;
            },
            createSpot: () => {
                const sl = new Spotlight({ 
                    color: 0xffffff, intensity: 1000, 
                    position: new THREE.Vector3(0, 10, 0), angle: Math.PI / 6, distance: 0, penumbra: 0, decay: 1, 
                    name: 'Spotlight', icon: 'Assets/spotlight.svg', iconSize 
                });
                sl.addTo(this.app.scene);
                sl.createHelper(this.app.scene);
                return sl;
            },
            getSelectedLight: () => (this.interaction.selectedObject && typeof this.interaction.selectedObject.getLight === 'function') ? this.interaction.selectedObject : null
        });

        // Mesh Controls
        this.meshUI = initMeshControls({ 
            gui: this.gui, 
            params: this.params,
            getSelectedMesh: () => {
                const sel = this.interaction.selectedObject;
                if (!sel) return null;
                const obj3d = sel.getObject3D ? sel.getObject3D() : sel;
                if (sel.setColor || (obj3d && obj3d.material && obj3d.material.color)) return sel;
                return null;
            },
            setSelectedMesh: (m) => this.interaction.select(m)
        });
    }

    addRandomBox() {
        const px = (Math.random() * 40) - 20;
        const pz = (Math.random() * 40) - 20;
        const b = this.world.createBox({ 
            color: Math.floor(Math.random()*0xffffff), 
            position: { x: px, y: 1 + Math.random()*2, z: pz } 
        });
        
        if (b && b.getObject3D) {
            const sx = 1 + Math.random() * 3;
            const sy = 1 + Math.random() * 3;
            const sz = 1 + Math.random() * 3;
            b.getObject3D().scale.set(sx, sy, sz);
        }
        this.interaction.select(b);
    }

    updateUI(selectedObject) {
        if (this.objectUI && this.objectUI.updateFromObject) this.objectUI.updateFromObject(selectedObject);
        if (this.meshUI && this.meshUI.updateFromMesh) this.meshUI.updateFromMesh(selectedObject);
        if (this.lightUI && this.lightUI.updateFromLight) this.lightUI.updateFromLight(selectedObject);
    }

    updateLoop() {
        // 매 프레임 선택된 객체 상태를 UI에 반영 (Gizmo로 이동 시 값 변화 등)
        if (this.interaction.selectedObject) {
            this.updateUI(this.interaction.selectedObject);
        }
    }
}
