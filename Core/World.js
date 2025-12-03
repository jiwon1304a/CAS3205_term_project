import { Floor, Box, Skybox } from '../Object/index.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.boxes = [];
        this.floor = null;
        this.sky = null;
    }

    init() {
        // Floor
        this.floor = new Floor({ width: 200, depth: 200, color: '#00FF00', grid: true }).setPosition(0, 0, 0);
        this.floor.addTo(this.scene);

        // Skybox (default params, can be updated later)
        this.sky = new Skybox({ size: 1000, color: '#87CEEB' }).addTo(this.scene);
    }

    createBox({ width = 1, height = 1, depth = 1, color = 0x0077ff, position = { x: 0, y: 0, z: 0 } } = {}) {
        const b = new Box({ width, height, depth, color, position });
        b.addTo(this.scene);
        this.boxes.push(b);
        return b;
    }
}
