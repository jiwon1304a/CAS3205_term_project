import * as THREE from 'three';
import Mesh from './Mesh.js';

export class TomatoPlant extends Mesh {
    constructor({ position = { x: 0, y: 0, z: 0 }, scale = 1, name = 'TomatoPlant' } = {}) {
        const posVec = new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0);
        super({ position: posVec, name });

        const group = new THREE.Group();

        // Materials
        const matPot = new THREE.MeshStandardMaterial({
            color: 0x7a5a3a,
            roughness: 0.9,
            metalness: 0.05,
        });
        const matSoil = new THREE.MeshStandardMaterial({
            color: 0x5a3b26,
            roughness: 1.0,
            metalness: 0.02,
        });
        const matLeaf = new THREE.MeshStandardMaterial({
            color: 0x2f9b48,
            roughness: 0.7,
            metalness: 0.08,
            side: THREE.DoubleSide,
        });
        const matTomato = new THREE.MeshStandardMaterial({
            color: 0xe03221,
            emissive: 0x7a140c,
            emissiveIntensity: 0.35,
            roughness: 0.25,
            metalness: 0.08,
        });

        // pot
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.65, 0.85, 0.65, 32),
            matPot
        );
        pot.position.y = 0.32;
        pot.rotation.x = Math.PI; // flip the pot upside down
        pot.castShadow = true;
        pot.receiveShadow = true;
        group.add(pot);

        // soil
        const soil = new THREE.Mesh(
            new THREE.CylinderGeometry(0.58, 0.65, 0.16, 32),
            matSoil
        );
        soil.position.y = 0.68;
        soil.castShadow = true;
        soil.receiveShadow = true;
        group.add(soil);

        // helpers
        function addLeafCluster(origin, angle, scale = 1) {
            const count = 3;
            for (let i = 0; i < count; i++) {
                const spread = -0.15 + 0.15 * i;
                const leaf = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.32 * scale, 0.16 * scale),
                    matLeaf
                );
                leaf.position.set(
                    origin.x + Math.sin(angle) * spread,
                    origin.y + 0.02 * i,
                    origin.z + Math.cos(angle) * spread
                );
                leaf.rotation.set(-Math.PI / 7, angle + spread, 0);
                leaf.castShadow = true;
                leaf.receiveShadow = true;
                group.add(leaf);
            }
        }

        function addTomatoCluster(origin, angle, count = 2, baseSize = 0.14) {
            for (let i = 0; i < count; i++) {
                const size = baseSize + (i % 2) * 0.02;
                const fruit = new THREE.Mesh(
                    new THREE.SphereGeometry(size, 22, 22),
                    matTomato
                );
                const offset = 0.08 + i * 0.07;
                fruit.position.set(
                    origin.x + Math.sin(angle) * offset,
                    origin.y - 0.04 * i,
                    origin.z + Math.cos(angle) * offset
                );
                fruit.castShadow = true;
                fruit.receiveShadow = true;
                group.add(fruit);

                const pedicel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.012, 0.018, 0.06, 8),
                    matLeaf
                );
                pedicel.position.set(
                    fruit.position.x,
                    fruit.position.y + size + 0.03,
                    fruit.position.z
                );
                pedicel.castShadow = true;
                group.add(pedicel);
            }
        }

        // main stem
        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 1.6, 16),
            matLeaf
        );
        stem.position.y = 1.1;
        stem.castShadow = true;
        group.add(stem);

        // nodes for branches/leaves/fruits
        const nodes = 7;
        for (let i = 0; i < nodes; i++) {
            const y = 0.75 + (i / (nodes - 1)) * 1.1;
            const angle = (i % 2 === 0 ? 1 : -1) * (Math.PI / 4 + i * 0.1);
            const len = 0.75 + 0.08 * i;

            // branch
            const branch = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.055, len, 14),
                matLeaf
            );
            branch.position.y = y;
            branch.rotation.z = angle;
            branch.castShadow = true;
            branch.receiveShadow = true;
            group.add(branch);

            const tip = new THREE.Vector3(
                Math.sin(angle) * len,
                y + 0.02,
                Math.cos(angle) * len
            );

            addLeafCluster(tip, angle, 1.1);
            addLeafCluster(
                new THREE.Vector3(
                    Math.sin(angle) * len * 0.45,
                    y + 0.05,
                    Math.cos(angle) * len * 0.45
                ),
                angle + 0.25,
                0.9
            );

            addTomatoCluster(
                new THREE.Vector3(
                    Math.sin(angle) * (len * 0.8),
                    y - 0.05,
                    Math.cos(angle) * (len * 0.8)
                ),
                angle,
                2 + (i % 2),
                0.15
            );
        }

        // stem-side leaves for background density
        for (let i = 0; i < 8; i++) {
            const t = i / 7;
            const y = 0.8 + t * 1.0;
            const ang = (i % 2 === 0 ? 1 : -1) * (Math.PI / 5 + 0.15 * (i % 3));
            addLeafCluster(
                new THREE.Vector3(Math.sin(ang) * 0.18, y, Math.cos(ang) * 0.18),
                ang,
                0.9
            );
        }

        // crown leaves and fruits
        for (let i = 0; i < 14; i++) {
            const angle = (i / 14) * Math.PI * 2;
            const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18), matLeaf);
            leaf.position.set(Math.cos(angle) * 0.35, 2.1, Math.sin(angle) * 0.35);
            leaf.rotation.set(-Math.PI / 6, angle, 0);
            leaf.castShadow = true;
            leaf.receiveShadow = true;
            group.add(leaf);

            if (i % 3 === 0) {
                const tomato = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16, 22, 22),
                    matTomato
                );
                tomato.position.set(Math.cos(angle) * 0.42, 1.95, Math.sin(angle) * 0.42);
                tomato.castShadow = true;
                tomato.receiveShadow = true;
                group.add(tomato);
            }
        }

        if (scale !== 1) {
            group.scale.set(scale, scale, scale);
        }

        // Mark all children as selectable parts of this TomatoPlant
        group.traverse((child) => {
            if (child.isMesh) {
                child.userData.selectable = this;
            }
        });

        this.setMesh(group);
    }
    // Override setPosition/setRotation to update the internal group if needed,
    // but since we add the group to _object3D in setMesh, and BaseObject manipulates _object3D,
    // standard setPosition/setRotation should work fine.
    // However, if we want to expose these methods explicitly:
    setPosition(x = 0, y = 0, z = 0) { super.setPosition(new THREE.Vector3(x, y, z)); return this; }
    setRotation(x = 0, y = 0, z = 0) { super.setRotation(new THREE.Euler(x, y, z)); return this; }
}

export default TomatoPlant;
