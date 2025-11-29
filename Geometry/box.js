import * as THREE from 'three';

export class Box {
    constructor({ width = 1, height = 1, depth = 1, color = 0x0077ff, metalness = 0.5, roughness = 0.3, position = { x: 0, y: 0, z: 0 } } = {}) {
        this.group = new THREE.Object3D();

        const geometry = new THREE.BoxGeometry(width, height, depth);
        // Move geometry so that the box corner is at the local origin (0,0,0).
        // By default BoxGeometry is centered at the origin; translate it by
        // half-extents so one corner lies at (0,0,0).
        geometry.translate(width / 2, height / 2, depth / 2);
        this.material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // link back for raycasting selection
        this.mesh.userData.box = this;
        this._selected = false;
        this._originalEmissive = this.material.emissive ? this.material.emissive.clone() : new THREE.Color(0x000000);

        this.group.add(this.mesh);
        this.setPosition(position.x, position.y, position.z);
    }

    setPosition(x = 0, y = 0, z = 0) {
        this.group.position.set(x, y, z);
        return this;
    }

    setRotation(x = 0, y = 0, z = 0) {
        this.group.rotation.set(x, y, z);
        return this;
    }

    setColor(color) {
        if (this.material) this.material.color.set(color);
        return this;
    }

    setSize(width = 1, height = 1, depth = 1) {
        if (!this.mesh) return this;
        // allow calling setSize(singleNumber) for uniform scale
        if (typeof height === 'undefined' || typeof depth === 'undefined') {
            height = width;
            depth = width;
        }
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

    move(dx = 0, dy = 0, dz = 0) {
        this.group.position.x += dx;
        this.group.position.y += dy;
        this.group.position.z += dz;
        return this;
    }

    rotate(x = 0, y = 0, z = 0, inDegrees = false) {
        if (inDegrees) {
            x = THREE.MathUtils.degToRad(x);
            y = THREE.MathUtils.degToRad(y);
            z = THREE.MathUtils.degToRad(z);
        }
        this.group.rotation.x += x;
        this.group.rotation.y += y;
        this.group.rotation.z += z;
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
