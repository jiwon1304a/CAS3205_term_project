import { Floor, Box, Skybox, DirectionalLight, PointLight, Spotlight, FluxVolume } from '../Object/index.js';
import * as THREE from 'three/webgpu';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.boxes = [];
        this.lights = [];
        this.floor = null;
        this.sky = null;
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
        return b;
    }

    createDirectionalLight({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(0, 10, 0), name = 'DirectionalLight', icon = '', iconSize = 1, showHelper = true } = {}) {
        const dl = new DirectionalLight({ color, intensity, position, name, icon, iconSize });
        dl.addTo(this.scene);
        dl.createHelper(this.scene);
        if (typeof dl.setHelperVisible === 'function') dl.setHelperVisible(showHelper);
        this.lights.push(dl);
        return dl;
    }

    createPointLight({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(0, 5, 0), distance = 10, decay = 2, name = 'PointLight', icon = '', iconSize = 1 } = {}) {
        const pl = new PointLight({ color, intensity, position, distance, decay, name, icon, iconSize });
        pl.addTo(this.scene);
        pl.createHelper(this.scene);
        this.lights.push(pl);
        return pl;
    }

    createSpotLight({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(0, 10, 0), angle = Math.PI / 6, distance = 0, penumbra = 0, decay = 1, name = 'Spotlight', icon = '', iconSize = 1 } = {}) {
        const sl = new Spotlight({ color, intensity, position, angle, distance, penumbra, decay, name, icon, iconSize });
        sl.addTo(this.scene);
        sl.createHelper(this.scene);
        this.lights.push(sl);
        return sl;
    }

    createFluxVolume({ position = new THREE.Vector3(), rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1), name = '' } = {}) {
        const fv = new FluxVolume({ position, rotation, scale, name });
        fv.addTo(this.scene);
        this.fluxVolumes.push(fv);
        return fv;
    }
}
