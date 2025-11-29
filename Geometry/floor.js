import * as THREE from 'three';

export class Floor {
    constructor({ width = 100, depth = 100, color = 0x228B22, receiveShadow = true, grid = false, position = { x: 0, y: 0, z: 0 } } = {}) {
        this.group = new THREE.Object3D();

        const geometry = new THREE.PlaneGeometry(width, depth);
        this.material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2; // make plane horizontal
        this.mesh.receiveShadow = receiveShadow;

        this.group.add(this.mesh);

        if (grid) {
            const size = Math.max(width, depth);
            const divisions = Math.floor(size / 2);
            this.gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x888888);
            this.group.add(this.gridHelper);
        }

        this.setPosition(position.x, position.y, position.z);
    }

    setPosition(x = 0, y = 0, z = 0) {
        this.group.position.set(x, y, z);
        return this;
    }

    setColor(color) {
        if (this.material) this.material.color.set(color);
        return this;
    }

    setSize(width = 100, depth = 100) {
        if (!this.mesh) return this;
        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.PlaneGeometry(width, depth);
        return this;
    }

    addTo(parent) {
        if (parent && typeof parent.add === 'function') parent.add(this.group);
        return this;
    }

    getObject3D() {
        return this.group;
    }
}
