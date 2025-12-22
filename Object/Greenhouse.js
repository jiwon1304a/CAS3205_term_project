import * as THREE from 'three';
import Mesh from './Mesh.js';

export class Greenhouse extends Mesh {
    constructor({ position = { x: 0, y: 0, z: 0 }, name = 'Greenhouse' } = {}) {
        const posVec = new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0);
        super({ position: posVec, name });

        const group = new THREE.Group();

        // Materials
        const matConcrete = new THREE.MeshStandardMaterial({
            color: 0x4e4e4e,
            roughness: 0.85,
            metalness: 0.08,
            side: THREE.DoubleSide,
        });
        const matRoof = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.65,
            metalness: 0.25,
            side: THREE.DoubleSide,
        });
        const matGlass = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.1,
            transmission: 0.9,
            transparent: true,
            opacity: 0.25,
            metalness: 0.05,
            thickness: 0.02,
            side: THREE.DoubleSide,
        });
        const matBlackMetal = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.45,
            metalness: 0.65,
        });
        const matFloor = new THREE.MeshStandardMaterial({
            color: 0x555555, // darker neutral gray floor
            roughness: 0.85,
            metalness: 0.02,
        });

        // Dimensions
        const ghWidth = 60.0;
        const ghDepth = 40.0;
        const wallHeight = 12.0;
        const roofHeight = 6.0;
        const ridgeHeight = wallHeight + roofHeight;
        const wallThk = 0.3;
        const doorWidth = 5.0;
        const doorHeight = 8.0;
        // const doorThk = 0.08; // Unused in Assets.js

        function addWall(w, h, d, pos) {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matConcrete);
            wall.position.set(pos.x, pos.y, pos.z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            group.add(wall);
        }

        function addRoofPanel(side, material) {
            const positions =
                side === "left"
                    ? [
                        -ghWidth / 2,
                        wallHeight,
                        -ghDepth / 2,
                        0,
                        ridgeHeight,
                        -ghDepth / 2,
                        0,
                        ridgeHeight,
                        ghDepth / 2,
                        -ghWidth / 2,
                        wallHeight,
                        -ghDepth / 2,
                        0,
                        ridgeHeight,
                        ghDepth / 2,
                        -ghWidth / 2,
                        wallHeight,
                        ghDepth / 2,
                    ]
                    : [
                        ghWidth / 2,
                        wallHeight,
                        -ghDepth / 2,
                        ghWidth / 2,
                        wallHeight,
                        ghDepth / 2,
                        0,
                        ridgeHeight,
                        ghDepth / 2,
                        ghWidth / 2,
                        wallHeight,
                        -ghDepth / 2,
                        0,
                        ridgeHeight,
                        ghDepth / 2,
                        0,
                        ridgeHeight,
                        -ghDepth / 2,
                    ];
            const geom = new THREE.BufferGeometry();
            geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            geom.computeVertexNormals();
            const roof = new THREE.Mesh(geom, material);
            roof.castShadow = true;
            roof.receiveShadow = true;
            group.add(roof);
        }

        // Walls (front segmented with doorway, back, left, right)
        const sideSpan = (ghWidth - doorWidth) / 2;
        addWall(sideSpan, wallHeight, wallThk, {
            x: -doorWidth / 2 - sideSpan / 2,
            y: wallHeight / 2,
            z: ghDepth / 2 - wallThk / 2,
        });
        addWall(sideSpan, wallHeight, wallThk, {
            x: doorWidth / 2 + sideSpan / 2,
            y: wallHeight / 2,
            z: ghDepth / 2 - wallThk / 2,
        });
        // lintel above door opening
        addWall(doorWidth, wallHeight - doorHeight, wallThk, {
            x: 0,
            y: doorHeight + (wallHeight - doorHeight) / 2,
            z: ghDepth / 2 - wallThk / 2,
        });
        addWall(ghWidth, wallHeight, wallThk, {
            x: 0,
            y: wallHeight / 2,
            z: -ghDepth / 2 + wallThk / 2,
        });
        addWall(wallThk, wallHeight, ghDepth, {
            x: -ghWidth / 2 + wallThk / 2,
            y: wallHeight / 2,
            z: 0,
        });
        // right wall transparent to show interior
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThk, wallHeight, ghDepth),
            matGlass
        );
        rightWall.position.set(ghWidth / 2 - wallThk / 2, wallHeight / 2, 0);
        group.add(rightWall);

        // Gable triangles
        const gableGeom = new THREE.BufferGeometry();
        gableGeom.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                [
                    -ghWidth / 2,
                    wallHeight,
                    0,
                    ghWidth / 2,
                    wallHeight,
                    0,
                    0,
                    ridgeHeight,
                    0,
                ],
                3
            )
        );
        gableGeom.computeVertexNormals();
        const gableFront = new THREE.Mesh(gableGeom, matConcrete);
        gableFront.position.z = ghDepth / 2 - wallThk / 2;
        gableFront.castShadow = true;
        gableFront.receiveShadow = true;
        group.add(gableFront);
        const gableBack = gableFront.clone();
        gableBack.position.z = -ghDepth / 2 + wallThk / 2;
        group.add(gableBack);

        // Roof panels
        addRoofPanel("left", matRoof);
        addRoofPanel("right", matGlass);

        // Frames along the opaque left wall, climbing toward the ridge (visible inside & outside)
        function addWallFrame(z) {
            const frameRadius = 0.08;
            const xInside = -ghWidth / 2 + wallThk - frameRadius * 0.5;
            const xOutside = -ghWidth / 2 - frameRadius * 0.5;

            [xInside, xOutside].forEach((xPos) => {
                // vertical post
                const vertical = new THREE.Mesh(
                    new THREE.CylinderGeometry(frameRadius, frameRadius, wallHeight, 18),
                    matBlackMetal
                );
                vertical.position.set(xPos, wallHeight / 2, z);
                vertical.castShadow = true;
                vertical.receiveShadow = true;
                group.add(vertical);

                // sloped member following the gable roof toward the ridge
                const start = new THREE.Vector3(xPos, wallHeight, z);
                const end = new THREE.Vector3(0, ridgeHeight, z);
                const length = start.distanceTo(end);
                const slope = new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        frameRadius * 0.9,
                        frameRadius * 0.9,
                        length,
                        18
                    ),
                    matBlackMetal
                );
                slope.position.copy(start).add(end).multiplyScalar(0.5);
                slope.quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    end.clone().sub(start).normalize()
                );
                slope.castShadow = true;
                slope.receiveShadow = true;
                group.add(slope);
            });
        }

        const frameCount = 2;
        for (let i = 0; i < frameCount; i++) {
            const t = (i + 1) / (frameCount + 1); // even spacing away from edges
            const z = THREE.MathUtils.lerp(
                -ghDepth / 2 + wallThk,
                ghDepth / 2 - wallThk,
                t
            );
            addWallFrame(z);
        }

        // Floor slab
        const floorThk = 0.3;
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(ghWidth, floorThk, ghDepth),
            matFloor
        );
        floor.position.y = floorThk / 2;
        floor.receiveShadow = true;
        group.add(floor);

        // Mark all children as selectable parts of this Greenhouse
        group.traverse((child) => {
            if (child.isMesh) {
                child.userData.selectable = null; // Make unselectable
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

export default Greenhouse;
