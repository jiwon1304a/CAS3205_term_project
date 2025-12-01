import * as THREE from 'three';

// A simple scene object wrapper used by the app. This class intentionally
// uses the name `Object` per request — it wraps a THREE.Object3D and
// provides convenient setters/getters for position, rotation, scale and
// a debug `name`.
export class Object {
    constructor({ position = new THREE.Vector3(), rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1), name = '' } = {}) {
        this._object3D = new THREE.Object3D();
        // compatibility alias used by older code in this repo
        this.group = this._object3D;
        this._object3D.position.copy(position);
        this._object3D.rotation.copy(rotation);
        this._object3D.scale.copy(scale);
        this.name = name || '';
        this._object3D.name = this.name;
    }

    // Return the underlying THREE.Object3D so existing code (gizmo, scene)
    // can operate with the native object.
    getObject3D() {
        return this._object3D;
    }

    // Getters for convenience
    get position() { return this._object3D.position; }
    get rotation() { return this._object3D.rotation; }
    get scale() { return this._object3D.scale; }
    get debugName() { return this.name; }

    // Setters accept THREE types or plain objects
    setPosition(p) {
        if (p instanceof THREE.Vector3) this._object3D.position.copy(p);
        else this._object3D.position.set(p.x || 0, p.y || 0, p.z || 0);
        return this;
    }

    setRotation(r) {
        if (r instanceof THREE.Euler) this._object3D.rotation.copy(r);
        else this._object3D.rotation.set(r.x || 0, r.y || 0, r.z || 0);
        return this;
    }

    setScale(s) {
        if (typeof s === 'number') this._object3D.scale.setScalar(s);
        else if (s instanceof THREE.Vector3) this._object3D.scale.copy(s);
        else this._object3D.scale.set(s.x || 1, s.y || 1, s.z || 1);
        return this;
    }

    setName(n) {
        this.name = String(n || '');
        this._object3D.name = this.name;
        return this;
    }

    // Small helpers
    translate(x = 0, y = 0, z = 0) {
        this._object3D.position.x += x;
        this._object3D.position.y += y;
        this._object3D.position.z += z;
        return this;
    }

    rotate(x = 0, y = 0, z = 0) {
        this._object3D.rotation.x += x;
        this._object3D.rotation.y += y;
        this._object3D.rotation.z += z;
        return this;
    }

    // Dispose placeholder: if the object holds geometries/materials, user should
    // call dispose on them. This method clears children for convenience.
    dispose() {
        while (this._object3D.children.length) {
            const c = this._object3D.children.pop();
            if (c.geometry && c.geometry.dispose) c.geometry.dispose();
            if (c.material) {
                if (Array.isArray(c.material)) c.material.forEach(m => m && m.dispose && m.dispose());
                else if (c.material.dispose) c.material.dispose();
            }
        }
    }

    toString() {
        return `Object(${this.name || 'unnamed'})`;
    }
}

export default Object;

// Convenience: allow adding this object's root to another parent
Object.prototype.addTo = function (parent) {
    if (!parent) return this;
    // If parent is a wrapper using getObject3D, use that underlying Object3D
    const target = (typeof parent.getObject3D === 'function') ? parent.getObject3D() : parent;
    if (target && typeof target.add === 'function') target.add(this._object3D);
    return this;
};
