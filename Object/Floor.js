import * as THREE from 'three';
import Mesh from './Mesh.js';

export class Floor extends Mesh {
    constructor({ width = 100, depth = 100, color = 0x228B22, receiveShadow = true, grid = false, position = { x: 0, y: 0, z: 0 }, name = '' } = {}) {
        const posVec = new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0);
        super({ position: posVec, name });

        const geometry = new THREE.PlaneGeometry(width, depth);
        this.material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = receiveShadow;
        this.setMesh(mesh);

        if (grid) {
            const size = Math.max(width, depth);
            const divisions = Math.floor(size / 2);
            this.gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x888888);
            this.group.add(this.gridHelper);
        }
    }

    setPosition(x = 0, y = 0, z = 0) { super.setPosition(new THREE.Vector3(x, y, z)); return this; }
    setColor(color) { if (this.material) this.material.color.set(color); return this; }
    setSize(width = 100, depth = 100) { if (!this.mesh) return this; this.mesh.geometry.dispose(); this.mesh.geometry = new THREE.PlaneGeometry(width, depth); return this; }
    addTo(parent) { 
        if (!parent) return this;
        const target = (typeof parent.getObject3D === 'function') ? parent.getObject3D() : parent;
        if (target && typeof target.add === 'function') target.add(this.group);
        return this;
    }
    getObject3D() { return this.group; }
}

export default Floor;
