import { createGUI, initObjectControls, initLightControls, initMeshControls, FluxOverlay } from '../UI/index.js';
import * as THREE from 'three/webgpu';
import { DEBUG } from '../Core/Globals.js';

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
            color: '#ffffff',
            scaleX: 1, scaleY: 1, scaleZ: 1,
            lightEnabled: true,
            dirIntensity: 1, dirX: -10, dirY: 10, dirZ: -10, showDirHelper: true,
            skyColor: '#87CEEB', skySize: 1000, skyVisible: true,
            selectedLightIntensity: 1, selectedLightColor: '#ffffff',
            selectedLightDistance: 0, selectedLightPenumbra: 0, selectedLightAngle: 30
        };

        this.objectUI = null;
        this.meshUI = null;
        this.lightUI = null;
        this.titleDiv = null;

        this.initControls();
        
        // Interaction에서 선택 변경 시 UI 업데이트
        this.interaction.onSelectionChanged = (obj) => this.updateUI(obj);
        this.interaction.onObjectChanged = (obj) => {
            this.world.dirty = true;
        };
        
        // App 루프에서 UI 업데이트 (Gizmo 드래그 시 값 변경 반영)
        this.app.onUpdate.push(this.updateLoop.bind(this));

        // Add title text in top-left corner
        this.addTitleText();
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

        camFolder.add(camParams, 'lightHeatmap').name('조명 히트맵').onChange((v) => {
            this.app.toggleLightHeatmap(v);
            if (v) {
                this.interaction.select(null);
            }
        }).listen();
        
        camFolder.add(this.app.heatmapScale, 'value', 0.01, 0.5).name('민감도');
        
        camFolder.open();

        // Greenhouse Scale Controls (always visible)
        const greenhouseFolder = this.gui.addFolder('온실 크기 조절');
        greenhouseFolder.add(this.params, 'scaleX', 0.1, 5, 0.1).name('가로').onChange((v) => {
            if (this.world.greenhouse) {
                this.world.greenhouse.getObject3D().scale.x = v;
                this.world.dirty = true;
            }
        });
        greenhouseFolder.add(this.params, 'scaleY', 0.1, 5, 0.1).name('높이').onChange((v) => {
            if (this.world.greenhouse) {
                this.world.greenhouse.getObject3D().scale.y = v;
                this.world.dirty = true;
            }
        });
        greenhouseFolder.add(this.params, 'scaleZ', 0.1, 5, 0.1).name('세로').onChange((v) => {
            if (this.world.greenhouse) {
                this.world.greenhouse.getObject3D().scale.z = v;
                this.world.dirty = true;
            }
        });
        greenhouseFolder.open();

        // 1. Create Object Dropdown & Button
        const createFolder = this.gui.addFolder('추가하기');
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
                    if (obj && this.app.simulation) {
                        this.app.simulation.registerBox(obj);
                    }
                } else if (type === 'DirectionalLight') {
                    obj = this.world.createDirectionalLight({ 
                        color: Math.floor(0xffffff), 
                        intensity: 0.5 + Math.random() * 1.5, 
                        position: new THREE.Vector3((Math.random() - 0.5) * 40, 5 + Math.random() * 15, (Math.random() - 0.5) * 40), 
                        name: 'DirectionalLight', icon: 'Assets/directionallight.svg', iconSize,
                        showHelper: true
                    });
                    if (obj && this.app.simulation) {
                        this.app.simulation.registerLight(obj);
                    }
                } else if (type === 'PointLight') {
                    obj = this.world.createPointLight({ 
                        color: Math.floor(0xffffff), 
                        intensity: 10 + Math.random() * 20, 
                        position: new THREE.Vector3((Math.random() - 0.5) * 100, 1 + Math.random() * 4, (Math.random() - 0.5) * 100), 
                        distance: 2 + Math.random() * 80, 
                        decay: 1 + Math.random(), 
                        name: 'PointLight', icon: 'Assets/pointlight.svg', iconSize 
                    });
                    if (obj && this.app.simulation) {
                        this.app.simulation.registerLight(obj);
                    }
                } else if (type === 'SpotLight') {
                    obj = this.world.createSpotLight({ 
                        color: Math.floor(0xffffff), 
                        intensity: 500, 
                        position: new THREE.Vector3((Math.random() - 0.5) * 30,  10, (Math.random() - 0.5) * 30), 
                        angle: Math.PI / 8, 
                        penumbra: Math.random() * 0.5, 
                        decay: 1 + Math.random(), 
                        name: 'SpotLight', icon: 'Assets/spotlight.svg', iconSize 
                    });
                    if (obj && this.app.simulation) {
                        this.app.simulation.registerLight(obj);
                    }
                } else if (type === 'FluxVolume') {
                    obj = this.world.createFluxVolume({ 
                        position: new THREE.Vector3((Math.random() - 0.5) * 200, 5 + Math.random() * 10, (Math.random() - 0.5) * 200),
                        scale: new THREE.Vector3(5 + Math.random() * 10, 5 + Math.random() * 10, 5 + Math.random() * 10),
                        name: 'FluxVolume'
                    });
                    if (obj && this.app.simulation) {
                        this.app.simulation.registerFluxVolume(obj);
                    }
                } else if (type === 'TomatoPlant') {
                    obj = this.world.createTomatoPlant({
                        position: { x: (Math.random() - 0.5) * 20, y: 0.28, z: (Math.random() - 0.5) * 20 },
                        scale: 2.31
                    });
                    if (obj && this.app.simulation) {
                        this.app.simulation.registerBox(obj);
                    }
                }

                if (obj) {
                    this.interaction.select(obj);
                }
            }
        };

        if (DEBUG) {
            createFolder.add(createParams, 'type', ['Box', 'DirectionalLight', 'PointLight', 'SpotLight', 'FluxVolume', 'TomatoPlant']).name('Type');
            createFolder.add(createParams, 'create').name('Create');
        }

        // Plant 생성 버튼
        const plantParams = {
            createPlant: () => {
                const obj = this.world.createPlant({
                    position: new THREE.Vector3(0, 0, 0),
                    scale: new THREE.Vector3(2.31, 2.31, 2.31),
                    name: 'Plant'
                });
                if (obj && this.app.simulation) {
                    this.app.simulation.registerFluxVolume(obj);
                }
                if (obj) {
                    this.interaction.select(obj);
                }
            }
        };
        createFolder.add(plantParams, 'createPlant').name('식물 추가');

        // PendantLight 생성 버튼
        const pendantLightParams = {
            createPendantLight: () => {
                const obj = this.world.createPendantLight({
                    position: { x: 0, y: 12, z: 0 }
                });
                if (obj && this.app.simulation) {
                    this.app.simulation.registerLight(obj);
                }
                if (obj) {
                    this.interaction.select(obj);
                }
            }
        };
        createFolder.add(pendantLightParams, 'createPendantLight').name('조명 추가');
        createFolder.open();

        // Save State 버튼
        const saveParams = {
            saveState: () => {
                const plantsData = this.world.getPlantsPositions();
                const lightsData = this.world.getPendantLightsPositions();
                const greenhouseScale = this.world.greenhouse ? {
                    x: this.world.greenhouse.getObject3D().scale.x,
                    y: this.world.greenhouse.getObject3D().scale.y,
                    z: this.world.greenhouse.getObject3D().scale.z
                } : { x: 1, y: 1, z: 1 };
                const state = {
                    plants: plantsData,
                    pendantLights: lightsData,
                    greenhouseScale: greenhouseScale
                };
                const dataStr = JSON.stringify(state, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'world_state.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        };
        createFolder.add(saveParams, 'saveState').name('파일로 저장');

        // Load State 버튼
        const loadParams = {
            loadState: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const state = JSON.parse(e.target.result);
                                this.loadState(state);
                            } catch (error) {
                                console.error('Failed to parse JSON:', error);
                                alert('Invalid JSON file');
                            }
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            }
        };
        createFolder.add(loadParams, 'loadState').name('파일에서 불러오기');

        const setDirty = () => { if (this.world) this.world.dirty = true; };

            // Object Controls
            this.objectUI = initObjectControls({ 
                gui: this.gui, 
                params: this.params,
                getSelectedObject: () => this.interaction.selectedObject,
                setSelectedObject: (o) => this.interaction.select(o),
                setDirty
            });

            // Light Controls (Inspection only)
            this.lightUI = initLightControls({ 
                gui: this.gui, 
                params: this.params,
                getSelectedLight: () => (this.interaction.selectedObject && typeof this.interaction.selectedObject.getLight === 'function') ? this.interaction.selectedObject : null,
                setDirty,
                removeLight: (light) => {
                    if (this.world) this.world.removeLight(light);
                    if (this.app.simulation) this.app.simulation.removeLight(light);
                    this.interaction.select(null);
                }
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
                setSelectedMesh: (m) => this.interaction.select(m),
                setDirty
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
        
        // Update title with Plant flux information
        if (this.titleDiv) {
            const fluxInfo = this.world.getPlantsFluxInfo();
            this.titleDiv.innerHTML = `
                식물 수: ${fluxInfo.count}<br>
                평균 광량: ${fluxInfo.avg.toFixed(3)}<br>
                최소 광량: ${fluxInfo.min.toFixed(3)}<br>
                최대 광량: ${fluxInfo.max.toFixed(3)}
            `;
        }
        
        // Always update Greenhouse scale UI
        if (this.world.greenhouse) {
            const ghScale = this.world.greenhouse.getObject3D().scale;
            this.params.scaleX = ghScale.x;
            this.params.scaleZ = ghScale.z;
        }
    }

    addTitleText() {
        this.titleDiv = document.createElement('div');
        this.titleDiv.style.position = 'fixed';
        this.titleDiv.style.top = '10px';
        this.titleDiv.style.left = '10px';
        this.titleDiv.style.color = 'white';
        this.titleDiv.style.fontSize = '16px';
        this.titleDiv.style.fontFamily = 'Arial, sans-serif';
        this.titleDiv.style.zIndex = '1000';
        this.titleDiv.style.pointerEvents = 'none'; // Don't interfere with interactions
        document.body.appendChild(this.titleDiv);
    }

    loadState(state) {
        if (state.plants) {
            state.plants.forEach(pos => {
                const obj = this.world.createPlant({
                    position: new THREE.Vector3(pos.x, pos.y, pos.z),
                    scale: new THREE.Vector3(2.31, 2.31, 2.31),
                    name: 'Plant'
                });
                if (obj && this.app.simulation) {
                    this.app.simulation.registerFluxVolume(obj);
                }
            });
        }

        if (state.pendantLights) {
            state.pendantLights.forEach(lightData => {
                const obj = this.world.createPendantLight({
                    position: { x: lightData.position.x, y: lightData.position.y, z: lightData.position.z },
                    color: 0xffffff,
                    intensity: lightData.intensity || 500,
                    angle: lightData.angle || Math.PI / 4,
                    penumbra: lightData.penumbra || 0.5,
                    decay: lightData.decay || 1
                });
                if (obj && this.app.simulation) {
                    this.app.simulation.registerLight(obj);
                }
            });
        }

        if (state.greenhouseScale && this.world.greenhouse) {
            this.world.greenhouse.getObject3D().scale.set(
                state.greenhouseScale.x,
                state.greenhouseScale.y,
                state.greenhouseScale.z
            );
            this.world.dirty = true;
            // Update UI params
            this.params.scaleX = state.greenhouseScale.x;
            this.params.scaleY = state.greenhouseScale.y;
            this.params.scaleZ = state.greenhouseScale.z;
        }
    }
}
