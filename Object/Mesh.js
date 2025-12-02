import * as THREE from 'three';
import BaseObject from './Object.js';

// Mesh base class: wraps a THREE.Mesh and provides helpers to set geometry/material
export class Mesh extends BaseObject {
    constructor({ mesh = null, geometry = null, material = null, position = new THREE.Vector3(), name = '' } = {}) {
        super({ position, name });
        this.mesh = null;
        // shadow flags (controlled on this wrapper and forwarded to underlying mesh)
        this.castShadow = true;
        this.receiveShadow = true;
        if (mesh) {
            this.setMesh(mesh);
        } else if (geometry) {
            const mat = material || new THREE.MeshStandardMaterial();
            this.setMesh(new THREE.Mesh(geometry, mat));
        }
    }

    setMesh(m) {
        if (!m) return this;
        this.mesh = m;
        if (this.mesh) {
            // ensure shadow flags are applied to the underlying THREE.Mesh
            this.mesh.castShadow = !!this.castShadow;
            this.mesh.receiveShadow = !!this.receiveShadow;
            this._object3D.add(this.mesh);
        }
        return this;
    }

    // Convenience setters to control shadows on the wrapped mesh
    setCastShadow(enabled = true) {
        this.castShadow = !!enabled;
        if (this.mesh) this.mesh.castShadow = this.castShadow;
        return this;
    }

    setReceiveShadow(enabled = true) {
        this.receiveShadow = !!enabled;
        if (this.mesh) this.mesh.receiveShadow = this.receiveShadow;
        return this;
    }

    getMesh() {
        return this.mesh;
    }

    setGeometry(geom) {
        if (!this.mesh) {
            this.setMesh(new THREE.Mesh(geom, new THREE.MeshStandardMaterial()));
        } else {
            if (this.mesh.geometry && this.mesh.geometry.dispose) this.mesh.geometry.dispose();
            this.mesh.geometry = geom;
        }
        return this;
    }

    setMaterial(mat) {
        if (!this.mesh) {
            this.setMesh(new THREE.Mesh(new THREE.BufferGeometry(), mat));
        } else {
            // dispose previous if owned
            if (this.mesh.material && this.mesh.material.dispose && this.mesh.material !== mat) {
                // do not dispose external material blindly in case it's shared
            }
            this.mesh.material = mat;
        }
        return this;
    }

    // Ensure mesh geometry/material are disposed when disposing the object
    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry && this.mesh.geometry.dispose) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) this.mesh.material.forEach(m => m && m.dispose && m.dispose());
                else if (this.mesh.material.dispose) this.mesh.material.dispose();
            }
            this.mesh = null;
        }
        if (super.dispose) super.dispose();
        return this;
    }
}

export default Mesh;
