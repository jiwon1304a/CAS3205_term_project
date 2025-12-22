import { Floor, Box, Skybox, DirectionalLight, PointLight, Spotlight, FluxVolume, Greenhouse, TomatoPlant, PendantLight } from '../Object/index.js';
import * as THREE from 'three/webgpu';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.boxes = [];
        this.lights = [];
        this.floor = null;
        this.sky = null;
        this.dirty = false;
        this.lastDirtyTickCount = 0;
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(this.ambientLight);
    }

    init() {
        // Floor
        this.floor = new Floor({ width: 200, depth: 200, color: '#00FF00', grid: true }).setPosition(0, 0, 0);
        this.floor.addTo(this.scene);

        // Skybox (default params, can be updated later)
        this.sky = new Skybox({ size: 1000, color: '#87CEEB' }).addTo(this.scene);

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

    createPendantLight({ position = { x: 0, y: 0, z: 0 } } = {}) {
        const pl = new PendantLight({ position });
        pl.addTo(this.scene);
        pl.createHelper(this.scene);
        this.boxes.push(pl); // It has geometry
        this.lights.push(pl); // It has light
        this.dirty = true;
        return pl;
    }

    createDirectionalLight({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(0, 10, 0), name = 'DirectionalLight', icon = '', iconSize = 1, showHelper = true } = {}) {
        if (this.lights.length >= 7) {
            console.warn('Maximum number of lights (7) reached. Cannot add more lights.');
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
        if (this.lights.length >= 7) {
            console.warn('Maximum number of lights (7) reached. Cannot add more lights.');
            return null;
        }
        const pl = new PointLight({ color, intensity, position, distance, decay, name, icon, iconSize });
        pl.addTo(this.scene);
        pl.createHelper(this.scene);
        this.lights.push(pl);
        this.dirty = true;
        return pl;
    }

    createSpotLight({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(0, 10, 0), angle = Math.PI / 6, distance = 0, penumbra = 0, decay = 1, name = 'Spotlight', icon = '', iconSize = 1 } = {}) {
        if (this.lights.length >= 7) {
            console.warn('Maximum number of lights (7) reached. Cannot add more lights.');
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
}
