import * as THREE from 'three';
import Box from './Box.js';

export class FluxVolume extends Box {
    constructor({ position = new THREE.Vector3(), rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1), name = '' } = {}) {
        super({ position, rotation, scale, name });
        this._fluxValue = 0;

        this.boxHelper = new THREE.BoxHelper(this.mesh, 0x00ff00);
        this.boxHelper.userData.fluxVolume = this;
        this.boxHelper.visible = true;
        this.mesh.visible = false;
        this.setMesh(this.boxHelper);

        // this.setMesh(wireframeCube);
    }

    getSamplingPoints() {
        this._object3D.updateMatrixWorld(true);
        const matrixWorld = this._object3D.matrixWorld;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrixWorld);

        const points = [];

        // Face centers (excluding y=0)
        points.push({ point: new THREE.Vector3(0.5, 1, 0.5), normal: new THREE.Vector3(0, 1, 0) }); // Top
        points.push({ point: new THREE.Vector3(0.5, 0.5, 1), normal: new THREE.Vector3(0, 0, 1) }); // Front
        points.push({ point: new THREE.Vector3(0.5, 0.5, 0), normal: new THREE.Vector3(0, 0, -1) }); // Back
        points.push({ point: new THREE.Vector3(1, 0.5, 0.5), normal: new THREE.Vector3(1, 0, 0) }); // Right
        points.push({ point: new THREE.Vector3(0, 0.5, 0.5), normal: new THREE.Vector3(-1, 0, 0) }); // Left

        // Vertices at y=1
        // (0, 1, 0)
        points.push({ point: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(0, 1, 0) });
        points.push({ point: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(-1, 0, 0) });
        points.push({ point: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(0, 0, -1) });

        // (1, 1, 0)
        points.push({ point: new THREE.Vector3(1, 1, 0), normal: new THREE.Vector3(0, 1, 0) });
        points.push({ point: new THREE.Vector3(1, 1, 0), normal: new THREE.Vector3(1, 0, 0) });
        points.push({ point: new THREE.Vector3(1, 1, 0), normal: new THREE.Vector3(0, 0, -1) });

        // (0, 1, 1)
        points.push({ point: new THREE.Vector3(0, 1, 1), normal: new THREE.Vector3(0, 1, 0) });
        points.push({ point: new THREE.Vector3(0, 1, 1), normal: new THREE.Vector3(-1, 0, 0) });
        points.push({ point: new THREE.Vector3(0, 1, 1), normal: new THREE.Vector3(0, 0, 1) });

        // (1, 1, 1)
        points.push({ point: new THREE.Vector3(1, 1, 1), normal: new THREE.Vector3(0, 1, 0) });
        points.push({ point: new THREE.Vector3(1, 1, 1), normal: new THREE.Vector3(1, 0, 0) });
        points.push({ point: new THREE.Vector3(1, 1, 1), normal: new THREE.Vector3(0, 0, 1) });

        // Apply transformations
        for (const p of points) {
            p.point.applyMatrix4(matrixWorld);
            p.normal.applyMatrix3(normalMatrix).normalize();
        }

        return points;
    }
}

export default FluxVolume;