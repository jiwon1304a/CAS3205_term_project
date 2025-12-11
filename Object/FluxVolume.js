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

    intersectRay(ray) {
        this._object3D.updateMatrixWorld();
        const inverseMatrix = new THREE.Matrix4().copy(this._object3D.matrixWorld).invert();
        const localRay = ray.clone().applyMatrix4(inverseMatrix);

        const min = new THREE.Vector3(0, 0, 0);
        const max = new THREE.Vector3(1, 1, 1);

        let tmin = (min.x - localRay.origin.x) / localRay.direction.x;
        let tmax = (max.x - localRay.origin.x) / localRay.direction.x;

        if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

        let tymin = (min.y - localRay.origin.y) / localRay.direction.y;
        let tymax = (max.y - localRay.origin.y) / localRay.direction.y;

        if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

        if ((tmin > tymax) || (tymin > tmax)) return -1;

        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;

        let tzmin = (min.z - localRay.origin.z) / localRay.direction.z;
        let tzmax = (max.z - localRay.origin.z) / localRay.direction.z;

        if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

        if ((tmin > tzmax) || (tzmin > tmax)) return -1;

        if (tzmin > tmin) tmin = tzmin;
        if (tzmax < tmax) tmax = tzmax;

        if (tmax < 0) return -1;

        const tEnter = Math.max(tmin, 0);
        const tExit = tmax;

        const pEnterLocal = localRay.at(tEnter, new THREE.Vector3());
        const pExitLocal = localRay.at(tExit, new THREE.Vector3());

        const pEnterWorld = pEnterLocal.applyMatrix4(this._object3D.matrixWorld);
        const pExitWorld = pExitLocal.applyMatrix4(this._object3D.matrixWorld);

        return pEnterWorld.distanceTo(pExitWorld);
    }

}

export default FluxVolume;