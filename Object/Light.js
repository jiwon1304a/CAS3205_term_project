import * as THREE from 'three';
import BaseObject from './Object.js';

// Base Light wrapper
export class Light extends BaseObject {
    constructor({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(), name = '', icon = null, iconSize = 1 } = {}) {
        super({ position, name });
        this.color = new THREE.Color(color);
        this.intensity = intensity;
        this.light = null; // underlying THREE.Light instance
        // optional selectable icon (sprite) shown as a billboard
        this._iconSprite = null;
        this._iconSize = iconSize || 1;
        // optional helper (DirectionalLightHelper, PointLightHelper, SpotLightHelper)
        this._helper = null;
        if (icon) this.setIcon(icon, this._iconSize);
    }

    getLight() { return this.light; }

    setColor(col) {
        this.color.set(col);
        if (this.light && this.light.color) this.light.color.set(col);
        return this;
    }

    setIntensity(i) {
        this.intensity = Number(i);
        if (this.light) this.light.intensity = this.intensity;
        this.updateHelper();
        return this;
    }

    /**
     * Set a billboard icon for this light. `path` should be a URL relative to project
     * (e.g. `Assets/light_icon.png`). The sprite will be added under this.group and
     * be selectable (userData.selectable points back to this wrapper).
     */
    setIcon(path, size = 1) {
        if (!path) return this;
        const loader = new THREE.TextureLoader();
        const that = this;
        loader.load(path, function (tex) {
            // dispose previous sprite if exists
            if (that._iconSprite) {
                try { that.group.remove(that._iconSprite); } catch (e) {}
                if (that._iconSprite.material && that._iconSprite.material.map && that._iconSprite.material.map.dispose) {
                    // don't dispose texture passed externally
                }
                that._iconSprite = null;
            }
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(mat);
            // store icon size for later updates
            that._iconSize = size || 1;
            sprite.scale.set(that._iconSize, that._iconSize, 1);
            sprite.position.set(0, 0, 0);
            // mark selectable so selection system can pick this light
            sprite.userData = sprite.userData || {};
            sprite.userData.selectable = that;
            sprite.userData.light = that;
            that.group.add(sprite);
            that._iconSprite = sprite;
        });
        return this;
    }

    removeIcon() {
        if (!this._iconSprite) return this;
        try { this.group.remove(this._iconSprite); } catch (e) {}
        if (this._iconSprite.material && this._iconSprite.material.map && this._iconSprite.material.map.dispose) this._iconSprite.material.map.dispose();
        if (this._iconSprite.material && this._iconSprite.material.dispose) this._iconSprite.material.dispose();
        this._iconSprite = null;
        this._iconSize = 0;
        return this;
    }

    // Mark this light as selected/unselected. Visually scale its icon if present.
    setSelected(selected = true) {
        this._selected = !!selected;
        if (this._iconSprite) {
            const factor = this._selected ? 1.3 : 1.0;
            const s = (this._iconSize || 1) * factor;
            this._iconSprite.scale.set(s, s, 1);
        }
        return this;
    }

    // Adjust the icon sprite scale at runtime. Size is world-units applied to sprite.scale.
    setIconSize(size = 1) {
        this._iconSize = size;
        if (this._iconSprite) {
            this._iconSprite.scale.set(this._iconSize, this._iconSize, 1);
        }
        return this;
    }

    getIconSize() {
        return this._iconSize || 0;
    }

    // maintain same API shape as other objects
    setPosition(x = 0, y = 0, z = 0) { super.setPosition(new THREE.Vector3(x, y, z)); this.updateHelper(); return this; }

    addTo(parent) { if (parent && typeof parent.add === 'function') parent.add(this.group); return this; }
    getObject3D() { return this.group; }

    dispose() {
        // remove light from group (no explicit dispose on Light)
        if (this.light) {
            try { if (this.group) this.group.remove(this.light); } catch (e) {}
            this.light = null;
        }
        // remove icon sprite if present
        if (this._iconSprite) {
            try { if (this.group) this.group.remove(this._iconSprite); } catch (e) {}
            if (this._iconSprite.material && this._iconSprite.material.map && this._iconSprite.material.map.dispose) this._iconSprite.material.map.dispose();
            if (this._iconSprite.material && this._iconSprite.material.dispose) this._iconSprite.material.dispose();
            this._iconSprite = null;
        }
        // remove helper if present
        if (this._helper) {
            try { if (this.group) this.group.remove(this._helper); } catch (e) {}
            this._helper = null;
        }
        if (super.dispose) super.dispose();
        return this;
    }

    // Helper management
    setHelperVisible(v = true) {
        if (this._helper) this._helper.visible = !!v;
        return this;
    }

    getHelper() { return this._helper; }

    updateHelper() {
        if (!this._helper) return this;
        // If helper exists, try to anchor it to this wrapper's world transform so
        // it appears exactly where the light wrapper is placed. Some helpers
        // compute internal positions at creation time and don't follow parent
        // transforms automatically; copying the group's world matrix keeps the
        // helper aligned with the wrapper.
        try {
            if (this.group && this.group.matrixWorld && this._helper.matrix) {
                this._helper.matrix.copy(this.group.matrixWorld);
                this._helper.matrixAutoUpdate = false;
                this._helper.matrixWorldNeedsUpdate = true;
            }
        } catch (e) {}
        if (typeof this._helper.update === 'function') {
            try { this._helper.update(); } catch (e) {}
        }
        return this;
    }
}

// DirectionalLight wrapper
export class DirectionalLight extends Light {
    constructor({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(), target = null, castShadow = false, name = '', icon = null, iconSize = 1 } = {}) {
        super({ color, intensity, position, name, icon, iconSize });
        this.light = new THREE.DirectionalLight(this.color, this.intensity);
        this.light.castShadow = !!castShadow;
        // keep the underlying light at the group's local origin; the group's
        // world position (set by BaseObject) determines world placement.
        this.light.position.set(0, 0, 0);

        // create a target object (if provided as vector or object)
        if (target instanceof THREE.Object3D) {
            this.light.target = target;
            this.group.add(target);
        } else if (target && typeof target === 'object') {
            const t = new THREE.Object3D();
            t.position.set(target.x || 0, target.y || 0, target.z || 0);
            this.light.target = t;
            this.group.add(t);
        } else {
            // default target at origin relative to group
            const t = new THREE.Object3D();
            t.position.set(0, 0, 0);
            this.light.target = t;
            this.group.add(t);
        }

        this.group.add(this.light);
        // attach a default helper for directional lights
        try {
            this._helper = new THREE.DirectionalLightHelper(this.light, Math.max(1, (this._iconSize || 1)));
            this.group.add(this._helper);
            this.updateHelper();
        } catch (e) {
            this._helper = null;
        }
    }

    setTarget(x = 0, y = 0, z = 0) {
        if (this.light && this.light.target) this.light.target.position.set(x, y, z);
        return this;
    }

    setShadow(enabled = true) { if (this.light) this.light.castShadow = !!enabled; return this; }
}

// PointLight wrapper
export class PointLight extends Light {
    constructor({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(), distance = 0, decay = 1, castShadow = false, name = '', icon = null, iconSize = 1 } = {}) {
        super({ color, intensity, position, name, icon, iconSize });
        this.light = new THREE.PointLight(this.color, this.intensity, distance, decay);
        this.light.castShadow = !!castShadow;
        // place light at local origin (group manages world position)
        this.light.position.set(0, 0, 0);
        this.group.add(this.light);
        // attach a default helper for point lights
        try {
            const size = Math.max(0.5, (this._iconSize || 1));
            this._helper = new THREE.PointLightHelper(this.light, size);
            this.group.add(this._helper);
            this.updateHelper();
        } catch (e) {
            this._helper = null;
        }
    }

    setDistance(d) { if (this.light) this.light.distance = d; return this; }
    setDecay(dec) { if (this.light) this.light.decay = dec; return this; }
    setShadow(enabled = true) { if (this.light) this.light.castShadow = !!enabled; return this; }
}

// SpotLight wrapper
export class Spotlight extends Light {
    constructor({ color = 0xffffff, intensity = 1, position = new THREE.Vector3(), target = null, distance = 0, angle = Math.PI / 6, penumbra = 0, decay = 1, castShadow = false, name = '', icon = null, iconSize = 1 } = {}) {
        super({ color, intensity, position, name, icon, iconSize });
        this.light = new THREE.SpotLight(this.color, this.intensity, distance, angle, penumbra, decay);
        this.light.castShadow = !!castShadow;
        // place light at local origin (group manages world position)
        this.light.position.set(0, 0, 0);

        if (target instanceof THREE.Object3D) {
            this.light.target = target;
            this.group.add(target);
        } else if (target && typeof target === 'object') {
            const t = new THREE.Object3D();
            t.position.set(target.x || 0, target.y || 0, target.z || 0);
            this.light.target = t;
            this.group.add(t);
        } else {
            const t = new THREE.Object3D();
            t.position.set(0, 0, -1);
            this.light.target = t;
            this.group.add(t);
        }

        this.group.add(this.light);
        // attach a default helper for spotlights
        try {
            this._helper = new THREE.SpotLightHelper(this.light);
            this.group.add(this._helper);
            this.updateHelper();
        } catch (e) {
            this._helper = null;
        }
    }

    setAngle(a) { if (this.light) this.light.angle = a; return this; }
    setPenumbra(p) { if (this.light) this.light.penumbra = p; return this; }
    setDistance(d) { if (this.light) this.light.distance = d; return this; }
    setDecay(dec) { if (this.light) this.light.decay = dec; return this; }
    setShadow(enabled = true) { if (this.light) this.light.castShadow = !!enabled; return this; }
}

export default Light;
