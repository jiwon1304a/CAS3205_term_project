import * as THREE from 'three';
import Mesh from './Mesh.js';

export class Box extends Mesh {
    constructor({ width = 1, height = 1, depth = 1, color = 0x0077ff, metalness = 0.0, roughness = 1.0, position = { x: 0, y: 0, z: 0 }, name = '' } = {}) {
        const posVec = new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0);
        super({ position: posVec, name });

        const geometry = new THREE.BoxGeometry(width, height, depth);
        geometry.translate(width / 2, height / 2, depth / 2);
        this.material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.box = this;
        this.setMesh(mesh);
        this._selected = false;
        this._originalEmissive = this.material.emissive ? this.material.emissive.clone() : new THREE.Color(0x000000);
        
        // Ensure material is updated to pick up lighting environment immediately
        this.material.needsUpdate = true;
    }

    // Maintain original API surface
    setPosition(x = 0, y = 0, z = 0) { super.setPosition(new THREE.Vector3(x, y, z)); return this; }
    setRotation(x = 0, y = 0, z = 0) { super.setRotation(new THREE.Euler(x, y, z)); return this; }

    setColor(color) { if (this.material) this.material.color.set(color); return this; }

    setSize(width = 1, height = 1, depth = 1) {
        if (!this.mesh) return this;
        if (typeof height === 'undefined' || typeof depth === 'undefined') { height = width; depth = width; }
        this.mesh.geometry.dispose();
        const geom = new THREE.BoxGeometry(width, height, depth);
        geom.translate(width / 2, height / 2, depth / 2);
        this.mesh.geometry = geom;
        return this;
    }

    setSelected(selected = true) {
        this._selected = !!selected;
        if (!this.material) return this;
        if (this._selected) {
            if (this.material.emissive) this.material.emissive.set(0x222222);
        } else {
            if (this.material.emissive) this.material.emissive.copy(this._originalEmissive);
        }
        return this;
    }

    // Getters
    getMesh() { return super.getMesh ? super.getMesh() : (this.mesh || null); }
    getMaterial() { return this.material || (this.mesh && this.mesh.material) || null; }
    isSelected() { return !!this._selected; }
}

export default Box;
