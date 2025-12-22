import { Floor, Box, Skybox, DirectionalLight, PointLight, Spotlight, FluxVolume, Greenhouse, TomatoPlant, PendantLight, Plant } from '../Object/index.js';
import * as THREE from 'three/webgpu';

const MAX_NUM_LIGHTS = 12; // 제한된 수의 조명만 허용
export class World {
    constructor(scene) {
        this.scene = scene;
        this.boxes = [];
        this.lights = [];
        this.floor = null;
        this.sky = null;
        this.dirty = false;
        this.lastDirtyTickCount = 0;
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(this.ambientLight);
    }

    init() {
        // Floor
        this.floor = new Floor({ width: 200, depth: 200, color: '#00FF00', grid: true }).setPosition(0, 0, 0);
        this.floor.addTo(this.scene);

        // Skybox (default params, can be updated later)
        this.sky = new Skybox({ size: 1000, color: '#87CEEB' }).addTo(this.scene);

        // Default Greenhouse at center
        this.greenhouse = this.createGreenhouse({ position: { x: 0, y: 0, z: 0 } });

        this.fluxVolumes = [];
    }

    createBox({ width = 1, height = 1, depth = 1, color = 0x0077ff, position = { x: 0, y: 0, z: 0 } } = {}) {
        const b = new Box({ width, height, depth, color, position });
        b.addTo(this.scene);
        this.boxes.push(b);
        this.dirty = true;
        return b;
    }

    createGreenhouse({ position = { x: 0, y: 0, z: 0 } } = {}) {
        const gh = new Greenhouse({ position });
        gh.addTo(this.scene);
        // Greenhouse contains lights and plants, we might need to register them if we want simulation to see them
        // For now, just adding the mesh group to scene
        this.boxes.push(gh); // Treat as a box/mesh for now
        this.dirty = true;
        return gh;
    }

    createTomatoPlant({ position = { x: 0, y: 0, z: 0 }, scale = 1 } = {}) {
        const tp = new TomatoPlant({ position, scale });
        tp.addTo(this.scene);
        this.boxes.push(tp); // Treat as a box/mesh for now
        this.dirty = true;
        return tp;
    }

    createPendantLight({ position = { x: 0, y: 0, z: 0 }, color = 0xffffff, intensity = 500, angle = Math.PI / 4, penumbra = 0.5, decay = 1 } = {}) {
        const pl = new PendantLight({ position, color, intensity, angle, penumbra, decay });
        pl.addTo(this.scene);
        pl.createHelper(this.scene);
        this.boxes.push(pl); // It has geometry
        this.lights.push(pl); // It has light
        this.dirty = true;
        return pl;
    }

    createPlant({ position = new THREE.Vector3(), rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1), name = '' } = {}) {
        const plant = new Plant({ position, rotation, scale, name });
        plant.addTo(this.scene);
        this.fluxVolumes.push(plant);
        this.dirty = true;
        return plant;
    }

    createDirectionalLight({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(0, 10, 0), name = 'DirectionalLight', icon = '', iconSize = 1, showHelper = true } = {}) {
        if (this.lights.length >= MAX_NUM_LIGHTS) {
            console.warn(`Maximum number of lights (${MAX_NUM_LIGHTS}) reached. Cannot add more lights.`);
            return null;
        }
        const dl = new DirectionalLight({ color, intensity, position, name, icon, iconSize });
        dl.addTo(this.scene);
        dl.createHelper(this.scene);
        if (typeof dl.setHelperVisible === 'function') dl.setHelperVisible(showHelper);
        this.lights.push(dl);
        this.dirty = true;
        return dl;
    }

    createPointLight({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(0, 5, 0), distance = 10, decay = 2, name = 'PointLight', icon = '', iconSize = 1 } = {}) {
        if (this.lights.length >= MAX_NUM_LIGHTS) {
            console.warn(`Maximum number of lights (${MAX_NUM_LIGHTS}) reached. Cannot add more lights.`);
            return null;
        }
        const pl = new PointLight({ color, intensity, position, distance, decay, name, icon, iconSize });
        pl.addTo(this.scene);
        pl.createHelper(this.scene);
        this.lights.push(pl);
        this.dirty = true;
        return pl;
    }

    createSpotLight({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(0, 10, 0), angle = Math.PI / 6, distance = 10, penumbra = 0, decay = 1, name = 'Spotlight', icon = '', iconSize = 1 } = {}) {
        if (this.lights.length >= MAX_NUM_LIGHTS) {
            console.warn(`Maximum number of lights (${MAX_NUM_LIGHTS}) reached. Cannot add more lights.`);
            return null;
        }
        const sl = new Spotlight({ color, intensity, position, angle, distance, penumbra, decay, name, icon, iconSize });
        sl.addTo(this.scene);
        sl.createHelper(this.scene);
        this.lights.push(sl);
        this.dirty = true;
        return sl;
    }

    createFluxVolume({ position = new THREE.Vector3(), rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1), name = '' } = {}) {
        const fv = new FluxVolume({ position, rotation, scale, name });
        fv.addTo(this.scene);
        this.fluxVolumes.push(fv);
        this.dirty = true;
        return fv;
    }

    removeLight(lightWrapper) {
        const index = this.lights.indexOf(lightWrapper);
        if (index > -1) {
            this.lights.splice(index, 1);
            
            // Remove from scene
            if (lightWrapper.getObject3D()) {
                this.scene.remove(lightWrapper.getObject3D());
            }
            
            // Remove helper
            const helper = lightWrapper.getHelper();
            if (helper) {
                this.scene.remove(helper);
            }
            
            // Dispose resources
            if (lightWrapper.dispose) {
                lightWrapper.dispose();
            }
            
            this.dirty = true;
        }
    }

    // Get positions of all Plant objects
    getPlantsPositions() {
        return this.fluxVolumes
            .filter(obj => obj instanceof Plant)
            .map(plant => plant.getObject3D().position.clone());
    }

    // Get positions and properties of all PendantLight objects
    getPendantLightsPositions() {
        return this.lights
            .filter(obj => obj instanceof PendantLight)
            .map(light => {
                const position = light.getObject3D().position.clone();
                const lightObj = light.getLight();
                return {
                    position: { x: position.x, y: position.y, z: position.z },
                    intensity: lightObj.intensity,
                    angle: lightObj.angle,
                    penumbra: lightObj.penumbra,
                    decay: lightObj.decay
                };
            });
    }

    // Get flux information for all Plant objects
    getPlantsFluxInfo() {
        const plants = this.fluxVolumes.filter(obj => obj instanceof Plant);
        if (plants.length === 0) return { count: 0, avg: 0, min: 0, max: 0 };

        const fluxes = plants.map(plant => plant._fluxValue);
        const sum = fluxes.reduce((a, b) => a + b, 0);
        const avg = sum / fluxes.length;
        const min = Math.min(...fluxes);
        const max = Math.max(...fluxes);

        return { count: plants.length, avg, min, max };
    }
}
