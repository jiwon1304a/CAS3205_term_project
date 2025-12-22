import * as THREE from 'three';
import Box from './Box.js';

export const SAMPLING_POINTS_TEMPLATE = [
    // Top face (y=1), 4x4 grid
    ...Array.from({length: 16}, (_, idx) => {
        const i = idx % 4;
        const j = Math.floor(idx / 4);
        return {
            point: new THREE.Vector3(i / 3, 1, j / 3),
            normal: new THREE.Vector3(0, 1, 0)
        };
    }),

    // Front face (z=1), 4x3 grid (y from 1/3 to 1)
    ...Array.from({length: 12}, (_, idx) => {
        const i = idx % 4;
        const j = Math.floor(idx / 4) + 1; // j=1,2,3
        return {
            point: new THREE.Vector3(i / 3, j / 3, 1),
            normal: new THREE.Vector3(0, 0, 1)
        };
    }),

    // Back face (z=0), 4x3 grid
    ...Array.from({length: 12}, (_, idx) => {
        const i = idx % 4;
        const j = Math.floor(idx / 4) + 1;
        return {
            point: new THREE.Vector3(i / 3, j / 3, 0),
            normal: new THREE.Vector3(0, 0, -1)
        };
    }),

    // Right face (x=1), 4x3 grid
    ...Array.from({length: 12}, (_, idx) => {
        const i = idx % 4;
        const j = Math.floor(idx / 4) + 1;
        return {
            point: new THREE.Vector3(1, j / 3, i / 3),
            normal: new THREE.Vector3(1, 0, 0)
        };
    }),

    // Left face (x=0), 4x3 grid
    ...Array.from({length: 12}, (_, idx) => {
        const i = idx % 4;
        const j = Math.floor(idx / 4) + 1;
        return {
            point: new THREE.Vector3(0, j / 3, i / 3),
            normal: new THREE.Vector3(-1, 0, 0)
        };
    })
];

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

        for (const template of SAMPLING_POINTS_TEMPLATE) {
            const p = {
                point: template.point.clone(),
                normal: template.normal.clone()
            };
            p.point.applyMatrix4(matrixWorld);
            p.normal.applyMatrix3(normalMatrix).normalize();
            points.push(p);
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