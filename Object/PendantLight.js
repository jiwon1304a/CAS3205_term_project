import * as THREE from 'three';
import BaseObject from './Object.js';

export class PendantLight extends BaseObject {
    constructor({ position = { x: 0, y: 0, z: 0 }, name = 'PendantLight', color = 0xffffff, intensity = 50 } = {}) {
        const posVec = new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0);
        super({ position: posVec, name });

        // Internal group for mesh parts
        const group = new THREE.Group();
        this._object3D.add(group);

        // Materials
        const matPlastic = new THREE.MeshStandardMaterial({
            color: 0x1b1b1b,
            roughness: 0.75,
            metalness: 0.1,
        });
        const matBlackMetal = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.45,
            metalness: 0.65,
        });
        const matPCB = new THREE.MeshStandardMaterial({
            color: 0xf7f5e6,
            roughness: 0.8,
        });
        const matLED = new THREE.MeshStandardMaterial({
            color: 0xffff99,
            emissive: 0xffff99,
            emissiveIntensity: 2.0,
        });
        const matLens = new THREE.MeshPhysicalMaterial({
            color: 0xffe066,
            emissive: 0xffe066,
            emissiveIntensity: 1.4,
            roughness: 0.05,
            transmission: 0.9,
            thickness: 0.25,
            ior: 1.45,
        });
        const matSilver = new THREE.MeshStandardMaterial({
            color: 0xcfd3d6,
            roughness: 0.2,
            metalness: 0.9,
        });

        /* ---- TOP DRIVER HOUSING ---- */
        const topCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.72, 0.18, 64), 
            matPlastic
        );
        topCap.position.y = 0.34;
        topCap.castShadow = true;
        topCap.receiveShadow = true;
        group.add(topCap);

        /* ---- MAIN BODY (SMOOTH ROUND) ---- */
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.09, 96),
            matBlackMetal
        );
        body.position.y = 0.48;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        /* ---- LED PCB ---- */
        const pcbY = 0.24; 
        const pcb = new THREE.Mesh(new THREE.CircleGeometry(0.48, 96), matPCB);
        pcb.rotation.x = -Math.PI / 2;
        pcb.position.y = pcbY;
        group.add(pcb);

        /* ---- LED DOT PATTERN ---- */
        for (let r = 0.12; r < 0.45; r += 0.07) {
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
                const led = new THREE.Mesh(new THREE.CircleGeometry(0.01, 12), matLED);
                led.position.set(Math.cos(a) * r, pcbY - 0.002, Math.sin(a) * r);
                led.rotation.x = -Math.PI / 2;
                group.add(led);
            }
        }

        /* ---- DIFFUSER LENS ---- */
        const lens = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.04, 96),
            matLens
        );
        lens.position.y = 0.22; 
        group.add(lens);

        /* ---- HANGING RING (DIRECT ATTACH) ---- */
        const hook = new THREE.Mesh(
            new THREE.TorusGeometry(0.09, 0.015, 20, 100),
            matSilver
        );
        hook.rotation.set(0, Math.PI / 2, 0); 
        hook.position.y = 0.62;
        hook.castShadow = true;
        group.add(hook);

        // --- LIGHT COMPONENT ---
        this.color = new THREE.Color(color);
        this.intensity = intensity;
        
        // Use SpotLight for downward illumination
        this.light = new THREE.SpotLight(this.color, this.intensity);
        this.light.position.set(0, 0, 0); // Inside the lens
        this.light.angle = Math.PI / 8;
        this.light.penumbra = 0.3;
        this.light.decay = 1.5;
        this.light.distance = 20;
        this.light.castShadow = true;
        
        // Shadow settings
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
        this.light.shadow.bias = -0.0001;

        this._object3D.add(this.light);

        // Target for spotlight (pointing down)
        const target = new THREE.Object3D();
        target.position.set(0, -1, 0);
        this._object3D.add(target);
        this.light.target = target;

        this._helper = null;

        // Mark all children as selectable parts of this PendantLight
        group.traverse((child) => {
            if (child.isMesh) {
                child.userData.selectable = this;
            }
        });
    }

    // --- Light Interface ---
    getLight() { return this.light; }

    setColor(col) {
        this.color.set(col);
        if (this.light) this.light.color.set(col);
        return this;
    }

    getColor() {
        return this.color;
    }

    setIntensity(i) {
        this.intensity = Number(i);
        if (this.light) this.light.intensity = this.intensity;
        this.updateHelper();
        return this;
    }

    setDistance(d) {
        if (this.light) {
            this.light.distance = d;
            this.updateHelper();
        }
        return this;
    }

    setDecay(d) {
        if (this.light) {
            this.light.decay = d;
            this.updateHelper();
        }
        return this;
    }

    setPenumbra(p) {
        if (this.light) {
            this.light.penumbra = p;
            this.updateHelper();
        }
        return this;
    }

    setAngle(a) {
        if (this.light) {
            this.light.angle = a;
            this.updateHelper();
        }
        return this;
    }

    // --- Helper Management ---
    createHelper(scene) {
        if (this._helper) return this;
        this._helper = new THREE.SpotLightHelper(this.light);
        // Helper needs to be in the scene to work correctly with transforms usually, 
        // or added to the object if we want it to move with it. 
        // Standard Light.js adds it to the scene.
        if (scene) scene.add(this._helper);
        return this;
    }

    updateHelper() {
        if (this._helper) this._helper.update();
        return this;
    }

    setHelperVisible(v = true) {
        if (this._helper) this._helper.visible = !!v;
        return this;
    }

    // --- Cleanup ---
    dispose() {
        if (this._helper) {
            if (this._helper.parent) this._helper.parent.remove(this._helper);
            this._helper.dispose();
            this._helper = null;
        }
        // Dispose light? THREE.Light doesn't need explicit dispose usually, but good practice to nullify
        this.light = null;
        
        super.dispose();
    }
    
    // Override setPosition/Rotation to update helper
    setPosition(x, y, z) {
        if (x instanceof THREE.Vector3) {
            super.setPosition(x);
        } else {
            super.setPosition(new THREE.Vector3(x, y, z));
        }
        this.updateHelper();
        return this;
    }

    setRotation(x, y, z) {
        if (x instanceof THREE.Euler) {
            super.setRotation(x);
        } else {
            super.setRotation(new THREE.Euler(x, y, z));
        }
        this.updateHelper();
        return this;
    }
}

export default PendantLight;
