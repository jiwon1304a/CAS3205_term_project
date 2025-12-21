import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';

export class Simulation {
    constructor() {
        this.fluxVolumes = [];
        this.lights = [];
        this.boxes = [];
        this.attenuationCoefficient = 0.2;
        
        // Simple Octree implementation for OBBs
        this.octree = new SimpleOctree(new THREE.Box3(new THREE.Vector3(-1000, -1000, -1000), new THREE.Vector3(1000, 1000, 1000)));
        this.isCalculating = false;
    }

    registerFluxVolume(fluxVolume) {
        this.fluxVolumes.push(fluxVolume);
        this.octree.insert(fluxVolume);
    }

    registerLight(light) {
        this.lights.push(light);
    }

    registerBox(box) {
        this.boxes.push(box);
        this.octree.insert(box);
    }

    clear() {
        this.fluxVolumes = [];
        this.lights = [];
        this.boxes = [];
        this.octree = new SimpleOctree(new THREE.Box3(new THREE.Vector3(-1000, -1000, -1000), new THREE.Vector3(1000, 1000, 1000)));
    }

    async calculate(world, tickCount) {
        if (this.isCalculating && tickCount === undefined) return;
        this.isCalculating = true;

        // Yield to allow UI updates and event processing
        await new Promise(resolve => setTimeout(resolve, 0));

        // Rebuild Octree every frame to handle moving objects
        this.octree = new SimpleOctree(new THREE.Box3(new THREE.Vector3(-1000, -1000, -1000), new THREE.Vector3(1000, 1000, 1000)));
        for (const box of this.boxes) {
            this.octree.insert(box);
        }
        for (const fluxVolume of this.fluxVolumes) {
            this.octree.insert(fluxVolume);
        }

        const fluxVolumes = this.fluxVolumes;
        const lights = this.lights;

        for (let i = 0; i < fluxVolumes.length; i++) {
            const fluxVolume = fluxVolumes[i];
            const samplingPoints = fluxVolume.getSamplingPoints();
            let totalIntensity = 0;

            for (let k = 0; k < samplingPoints.length; k++) {
                const sample = samplingPoints[k];
                const P = sample.point;
                const N = sample.normal;

                for (let j = 0; j < lights.length; j++) {
                    const lightWrapper = lights[j];
                    
                    totalIntensity += this.calculateDiffuse(lightWrapper, P, N, fluxVolume);
                }
            }

            if (samplingPoints.length > 0) {
                fluxVolume._fluxValue = totalIntensity / samplingPoints.length;
            } else {
                fluxVolume._fluxValue = 0;
            }
        }

        this.isCalculating = false;

        if (world && world.lastDirtyTickCount !== tickCount) {
            this.calculate(world, world.lastDirtyTickCount);
        }
    }

    calculateDiffuse(lightWrapper, point, normal, currentFluxVolume) {
        const light = lightWrapper.light;
        const color = light.color;
        const intensity = light.intensity;
        const lightDir = new THREE.Vector3();
        let attenuation = 1.0;

        const lightPosition = lightWrapper.getObject3D().position;
        const lightRotation = lightWrapper.getObject3D().rotation;

        if (light.isDirectionalLight) {
            lightDir.set(0, 1, 0).applyEuler(lightRotation).normalize();
        } else {
            lightDir.subVectors(lightPosition, point);
            const distance = lightDir.length();
            lightDir.normalize();

            if (light.distance > 0 && distance > light.distance) {
                return 0;
            }

            if (light.decay > 0) {
                attenuation = Math.pow(Math.max(0, 1 - distance / light.distance), light.decay);
            }

            if (light.isSpotLight) {
                const spotDir = new THREE.Vector3(0, -1, 0).applyEuler(lightRotation).normalize();
                const lightToPoint = new THREE.Vector3().subVectors(point, lightPosition).normalize();
                const angleCos = lightToPoint.dot(spotDir);
                
                if (angleCos < Math.cos(light.angle)) {
                    return 0;
                }
            }
        }

        // Check occlusion using Octree
        const ray = new THREE.Ray(point, lightDir);
        const occlusionResult = this.octree.intersectRay(ray, currentFluxVolume);

        if (occlusionResult.hitBox) {
            return 0;
        }

        if (occlusionResult.length > 0) {
            attenuation *= Math.exp(-this.attenuationCoefficient * occlusionResult.length);
        }

        const dot = Math.max(normal.dot(lightDir), 0);
        const luminance = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
        
        return luminance * intensity * dot * attenuation;
    }
}

class SimpleOctree {
    constructor(bounds, depth = 0, maxDepth = 5) {
        this.bounds = bounds;
        this.depth = depth;
        this.maxDepth = maxDepth;
        this.objects = [];
        this.children = [];
    }

    insert(object) {
        if (this.children.length > 0) {
            this._insertIntoChildren(object);
            return;
        }

        this.objects.push(object);

        if (this.objects.length > 8 && this.depth < this.maxDepth) {
            this.split();
        }
    }

    _insertIntoChildren(object) {
        // Simplified: Insert into all overlapping children
        // For OBBs, exact overlap check is complex, so we use AABB of the object if available,
        // or just insert into all for now (or check center).
        // To be correct, we should check intersection of object bounds with child bounds.
        // Here we assume object has getBoundingBox() or we calculate it.
        
        // Fallback: insert into all children that intersect with object's AABB
        // Since we don't have AABB readily available on the wrapper without calculation:
        // We'll just put it in the root or split if we can calculate bounds.
        
        // For this implementation, let's keep it simple:
        // If we can't easily determine split, keep in this node.
        // But to make it an Octree, we must split.
        
        // Let's calculate AABB for the object
        const obj3D = object.getObject3D();
        const box = new THREE.Box3().setFromObject(obj3D);

        for (const child of this.children) {
            if (child.bounds.intersectsBox(box)) {
                child.insert(object);
            }
        }
    }

    split() {
        const min = this.bounds.min;
        const max = this.bounds.max;
        const mid = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);

        const centers = [
            new THREE.Vector3(min.x, min.y, min.z),
            new THREE.Vector3(mid.x, min.y, min.z),
            new THREE.Vector3(min.x, mid.y, min.z),
            new THREE.Vector3(mid.x, mid.y, min.z),
            new THREE.Vector3(min.x, min.y, mid.z),
            new THREE.Vector3(mid.x, min.y, mid.z),
            new THREE.Vector3(min.x, mid.y, mid.z),
            new THREE.Vector3(mid.x, mid.y, mid.z)
        ];

        for (let i = 0; i < 8; i++) {
            const childMin = centers[i];
            const childMax = new THREE.Vector3().addVectors(childMin, mid.sub(min));
            this.children.push(new SimpleOctree(new THREE.Box3(childMin, childMax), this.depth + 1, this.maxDepth));
        }

        // Re-distribute objects
        const objs = this.objects;
        this.objects = [];
        for (const obj of objs) {
            this._insertIntoChildren(obj);
        }
    }

    intersectRay(ray, ignoreObject) {
        if (!ray.intersectsBox(this.bounds)) return { length: 0, hitBox: false };

        let totalLength = 0;
        let hitBox = false;

        // Check objects in this node
        for (const obj of this.objects) {
            if (obj === ignoreObject) continue;
            
            // Check if object has intersectRay method (FluxVolume)
            if (typeof obj.intersectRay === 'function') {
                const len = obj.intersectRay(ray);
                if (len > 0) totalLength += len;
            } else {
                // Assume it's a Box or other object without intersectRay
                // Use AABB check for now, or if it has geometry use raycast
                const obj3D = obj.getObject3D();
                const box = new THREE.Box3().setFromObject(obj3D);
                if (ray.intersectsBox(box)) {
                    hitBox = true;
                    // If we hit a solid box, we can stop early if we only care about blocking
                    // But for correct length accumulation of flux volumes, we might need to continue?
                    // User asked to return 0 if hit box. So we can return immediately.
                    return { length: totalLength, hitBox: true };
                }
            }
        }

        // Check children
        if (this.children.length > 0) {
            for (const child of this.children) {
                const result = child.intersectRay(ray, ignoreObject);
                if (result.hitBox) return { length: totalLength, hitBox: true };
                totalLength += result.length;
            }
        }

        return { length: totalLength, hitBox: false };
    }
}
