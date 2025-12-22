import * as THREE from 'three';
import FluxVolume, { SAMPLING_POINTS_TEMPLATE } from './FluxVolume.js';

export class Plant extends FluxVolume {
    constructor(options = {}) {
        super(options);

        // Create TomatoPlant-like mesh
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

        // Geometries for instancing
        const leafGeometry = new THREE.PlaneGeometry(0.32, 0.16);
        const crownLeafGeometry = new THREE.PlaneGeometry(0.34, 0.18);
        const crownTomatoGeometry = new THREE.SphereGeometry(0.16, 22, 22);

        // Instance arrays
        const leafInstances = [];
        const crownLeafInstances = [];
        const crownTomatoInstances = [];

        // helpers
        function addLeafCluster(origin, angle, scale = 1) {
            const count = 3;
            for (let i = 0; i < count; i++) {
                const spread = -0.15 + 0.15 * i;
                const matrix = new THREE.Matrix4();
                const position = new THREE.Vector3(
                    origin.x + Math.sin(angle) * spread,
                    origin.y + 0.02 * i,
                    origin.z + Math.cos(angle) * spread
                );
                const rotation = new THREE.Euler(-Math.PI / 7, angle + spread, 0);
                matrix.makeRotationFromEuler(rotation);
                matrix.setPosition(position);
                matrix.scale(new THREE.Vector3(scale, scale, scale));
                leafInstances.push(matrix);
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
            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3(Math.cos(angle) * 0.35, 2.1, Math.sin(angle) * 0.35);
            const rotation = new THREE.Euler(-Math.PI / 6, angle, 0);
            matrix.makeRotationFromEuler(rotation);
            matrix.setPosition(position);
            crownLeafInstances.push(matrix);

            if (i % 3 === 0) {
                const tomatoMatrix = new THREE.Matrix4();
                const tomatoPos = new THREE.Vector3(Math.cos(angle) * 0.42, 1.95, Math.sin(angle) * 0.42);
                tomatoMatrix.setPosition(tomatoPos);
                crownTomatoInstances.push(tomatoMatrix);
            }
        }

        // Create instanced meshes after all instances are collected
        const leafInstancedMesh = new THREE.InstancedMesh(leafGeometry, matLeaf, leafInstances.length);
        leafInstances.forEach((matrix, i) => leafInstancedMesh.setMatrixAt(i, matrix));
        leafInstancedMesh.castShadow = true;
        leafInstancedMesh.receiveShadow = true;
        group.add(leafInstancedMesh);

        const crownLeafInstancedMesh = new THREE.InstancedMesh(crownLeafGeometry, matLeaf, crownLeafInstances.length);
        crownLeafInstances.forEach((matrix, i) => crownLeafInstancedMesh.setMatrixAt(i, matrix));
        crownLeafInstancedMesh.castShadow = true;
        crownLeafInstancedMesh.receiveShadow = true;
        group.add(crownLeafInstancedMesh);

        const crownTomatoInstancedMesh = new THREE.InstancedMesh(crownTomatoGeometry, matTomato, crownTomatoInstances.length);
        crownTomatoInstances.forEach((matrix, i) => crownTomatoInstancedMesh.setMatrixAt(i, matrix));
        crownTomatoInstancedMesh.castShadow = true;
        crownTomatoInstancedMesh.receiveShadow = true;
        group.add(crownTomatoInstancedMesh);

        // Apply scale if provided
        const scale = options.scale || 1;
        if (scale !== 1) {
            if (typeof scale === 'number') {
                group.scale.set(scale, scale, scale);
            } else if (scale instanceof THREE.Vector3) {
                group.scale.copy(scale);
            }
        }

        // Don't set userData.selectable to avoid circular references during cloning
        // Selection will be handled by the wireframe cube

        // Create wireframe cube instead of boxHelper
        const geometry = new THREE.BoxGeometry(8, 5, 8);
        geometry.translate(0,3,0);
        const wireframe = new THREE.WireframeGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const wireframeCube = new THREE.LineSegments(wireframe, material);
        wireframeCube.userData.fluxVolume = this;
        wireframeCube.visible = true;

        // Replace the default box helper with wireframe cube and tomato plant meshes
        this._object3D.remove(this.boxHelper);
        this._object3D.add(wireframeCube);
        this.wireframeCube = wireframeCube;

        // Add 2x2 grid of tomato plants
        const positions = [];
        for (let x = -2; x <= 2; x += 4) {
            for (let z = -2; z <= 2; z += 4) {
                positions.push(new THREE.Vector3(x, 0, z));
            }
        }

        this.plantMeshes = [];
        positions.forEach((pos, index) => {
            const plantGroup = group.clone();
            plantGroup.position.copy(pos);
            this._object3D.add(plantGroup);
            this.plantMeshes.push(plantGroup);

            // Don't set userData.selectable to avoid circular references
            // Selection will be handled by the wireframe cube
        });

        // Set the first plant as the main mesh for compatibility
        this.mesh = this.plantMeshes[0];
        this.mesh.visible = true;
    }

    updateWireframeColor() {
        if (!this.wireframeCube) return;
        
        const fluxValue = this._fluxValue;
        let color;
        
        if (fluxValue < 40) {
            color = 0x0000ff; // Blue for low flux (< 30)
        } else if (fluxValue <= 60) {
            color = 0x00ff00; // Green for medium flux (30-70)
        } else {
            color = 0xff0000; // Red for high flux (> 70)
        }
        
        this.wireframeCube.material.color.setHex(color);
    }

    getSamplingPoints() {
        this._object3D.updateMatrixWorld(true);
        const matrixWorld = this._object3D.matrixWorld;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrixWorld);

        const scale = new THREE.Vector3(8, 5, 8);
        const translate = new THREE.Vector3(-4, 0, -4);

        const points = [];

        for (const template of SAMPLING_POINTS_TEMPLATE) {
            const p = {
                point: template.point.clone().multiply(scale).add(translate),
                normal: template.normal.clone()
            };
            p.point.applyMatrix4(matrixWorld);
            p.normal.applyMatrix3(normalMatrix).normalize();
            points.push(p);
        }

        return points;
    }
}

export default Plant;