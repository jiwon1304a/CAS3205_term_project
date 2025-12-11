import { createGUI, initObjectControls, initLightControls, initMeshControls, FluxOverlay } from '../UI/index.js';
import * as THREE from 'three/webgpu';

export class UIManager {
    constructor(app, world, interaction) {
        this.app = app;
        this.world = world;
        this.interaction = interaction;
        
        this.fluxOverlay = new FluxOverlay(app, world);

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
            selectedLightIntensity: 1, selectedLightColor: '#ffffff',
            selectedLightDistance: 0, selectedLightPenumbra: 0
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
        // 0. Camera Mode
        const camFolder = this.gui.addFolder('Camera & View');
        const camParams = {
            setPerspective: () => {
                this.app.switchCamera('Perspective');
                this.interaction.updateCamera(this.app.activeCamera);
            },
            setOrthographic: () => {
                this.app.switchCamera('Orthographic');
                this.interaction.updateCamera(this.app.activeCamera);
            },
            lightHeatmap: false
        };
        const btnPersp = camFolder.add(camParams, 'setPerspective').name('Perspective');
        const btnOrtho = camFolder.add(camParams, 'setOrthographic').name('Orthographic');

        // Place buttons on the same line
        btnPersp.domElement.style.width = '50%';
        btnPersp.domElement.style.display = 'inline-block';
        btnOrtho.domElement.style.width = '50%';
        btnOrtho.domElement.style.display = 'inline-block';

        camFolder.add(camParams, 'lightHeatmap').name('Light Heatmap').onChange((v) => {
            this.app.toggleLightHeatmap(v);
            if (v) {
                this.interaction.select(null);
            }
        }).listen();
        
        camFolder.add(this.app.heatmapScale, 'value', 0.1, 50).name('Heatmap Sensitivity');
        
        camFolder.open();

        // 1. Create Object Dropdown & Button
        const createFolder = this.gui.addFolder('Create Object');
        const createParams = {
            type: 'Box', // default
            create: () => {
                const type = createParams.type;
                let obj = null;
                const iconSize = 5;

                if (type === 'Box') {
                    obj = this.addRandomBox();
                    // addRandomBox already selects the object, but we can ensure it returns the object
                    // Note: addRandomBox calls interaction.select(b) at the end.
                    // So we don't need to select it again here if addRandomBox handles it.
                    // However, addRandomBox returns void in current implementation? Let's check.
                    // Wait, addRandomBox calls this.world.createBox and then this.interaction.select(b).
                    // So obj will be undefined if addRandomBox doesn't return.
                    // Let's update addRandomBox to return the box.
                } else if (type === 'DirectionalLight') {
                    obj = this.world.createDirectionalLight({ 
                        color: Math.floor(Math.random() * 0xffffff), 
                        intensity: 0.5 + Math.random() * 1.5, 
                        position: new THREE.Vector3((Math.random() - 0.5) * 40, 5 + Math.random() * 15, (Math.random() - 0.5) * 40), 
                        name: 'DirectionalLight', icon: 'Assets/directionallight.svg', iconSize,
                        showHelper: true
                    });
                } else if (type === 'PointLight') {
                    obj = this.world.createPointLight({ 
                        color: Math.floor(Math.random() * 0xffffff), 
                        intensity: 10 + Math.random() * 20, 
                        position: new THREE.Vector3((Math.random() - 0.5) * 100, 1 + Math.random() * 4, (Math.random() - 0.5) * 100), 
                        distance: 2 + Math.random() * 8, 
                        decay: 1 + Math.random(), 
                        name: 'PointLight', icon: 'Assets/pointlight.svg', iconSize 
                    });
                } else if (type === 'SpotLight') {
                    obj = this.world.createSpotLight({ 
                        color: Math.floor(Math.random() * 0xffffff), 
                        intensity: 10 + Math.random() * 40, 
                        position: new THREE.Vector3((Math.random() - 0.5) * 40, 5 + Math.random() * 15, (Math.random() - 0.5) * 40), 
                        angle: Math.PI / 8 + Math.random() * (Math.PI / 4), 
                        distance: 0, 
                        penumbra: Math.random() * 0.5, 
                        decay: 1 + Math.random(), 
                        name: 'SpotLight', icon: 'Assets/spotlight.svg', iconSize 
                    });
                } else if (type === 'FluxVolume') {
                    obj = this.world.createFluxVolume({ 
                        position: new THREE.Vector3((Math.random() - 0.5) * 20, 5 + Math.random() * 10, (Math.random() - 0.5) * 20),
                        scale: new THREE.Vector3(5 + Math.random() * 10, 5 + Math.random() * 10, 5 + Math.random() * 10),
                        name: 'FluxVolume'
                    });
                }

                if (obj) {
                    this.interaction.select(obj);
                }
            }
        };

        createFolder.add(createParams, 'type', ['Box', 'DirectionalLight', 'PointLight', 'SpotLight', 'FluxVolume']).name('Type');
        createFolder.add(createParams, 'create').name('Create');
        createFolder.open();

        // Object Controls
        this.objectUI = initObjectControls({ 
            gui: this.gui, 
            params: this.params,
            getSelectedObject: () => this.interaction.selectedObject,
            setSelectedObject: (o) => this.interaction.select(o)
        });

        // Light Controls (Inspection only)
        this.lightUI = initLightControls({ 
            gui: this.gui, 
            params: this.params,
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

        // Initialize visibility (hide all initially if nothing selected)
        this.updateUI(this.interaction.selectedObject);
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
        return b;
    }

    updateUI(selectedObject) {
        if (this.objectUI && this.objectUI.updateFromObject) this.objectUI.updateFromObject(selectedObject);
        if (this.meshUI && this.meshUI.updateFromMesh) this.meshUI.updateFromMesh(selectedObject);
        if (this.lightUI && this.lightUI.updateFromLight) this.lightUI.updateFromLight(selectedObject);

        // Handle visibility
        if (!selectedObject) {
            if (this.objectUI) this.objectUI.setVisibility(false);
            if (this.meshUI) this.meshUI.setVisibility(false);
            if (this.lightUI) this.lightUI.setVisibility(false);
            return;
        }

        // Always show object transform controls for selected objects
        if (this.objectUI) this.objectUI.setVisibility(true);

        // Determine type
        let isMesh = false;
        let isLight = false;

        // Check for Mesh
        const obj3d = (selectedObject.getObject3D && typeof selectedObject.getObject3D === 'function') 
            ? selectedObject.getObject3D() 
            : selectedObject;
        
        if (obj3d && obj3d.isMesh) {
            isMesh = true;
        } else if (selectedObject.setColor && !selectedObject.getLight) {
             // Fallback: if it has setColor but is not a light wrapper
             isMesh = true;
        }

        // Check for Light
        const lightObj = (selectedObject.getLight && typeof selectedObject.getLight === 'function')
            ? selectedObject.getLight()
            : (obj3d && obj3d.isLight ? obj3d : null);

        if (lightObj && lightObj.isLight) {
            isLight = true;
        }

        // Apply visibility
        if (this.meshUI) this.meshUI.setVisibility(isMesh);
        if (this.lightUI) this.lightUI.setVisibility(isLight);
    }

    updateLoop() {
        // 매 프레임 선택된 객체 상태를 UI에 반영 (Gizmo로 이동 시 값 변화 등)
        if (this.interaction.selectedObject) {
            // Only update transform (Object) UI, as it can be changed by Gizmo.
            if (this.objectUI && this.objectUI.updateFromObject) {
                this.objectUI.updateFromObject(this.interaction.selectedObject);
            }
        }
    }
}
