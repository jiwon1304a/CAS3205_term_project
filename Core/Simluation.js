import * as THREE from 'three';
import { World } from './World.js';
import { FluxVolume, PointLight } from '../Object/index.js';

export class Simulation {
    constructor(world) {
        this.world = world;
    }

    calculate(world) {
        const fluxVolumes = world.fluxVolumes;
        const lights = world.lights;

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
                    
                    totalIntensity += this.calculateDiffuse(lightWrapper, P, N);
                }
            }

            if (samplingPoints.length > 0) {
                fluxVolume._fluxValue = totalIntensity / samplingPoints.length;
            } else {
                fluxVolume._fluxValue = 0;
            }
        }
    }

    calculateDiffuse(lightWrapper, point, normal) {
        const light = lightWrapper.light;
        const color = light.color;
        const intensity = light.intensity;
        const lightDir = new THREE.Vector3();
        let attenuation = 1.0;

        const lightPosition = lightWrapper.getObject3D().position;
        const lightRotation = lightWrapper.getObject3D().rotation;

        if (light.isDirectionalLight) {
            // Direction from target to light position (vector pointing to light)
            // In Light.js, target is at (0, -1, 0), so light points down -Y.
            // Vector TO light is +Y (0, 1, 0).
            lightDir.set(0, 1, 0).applyEuler(lightRotation).normalize();
        } else {
            // PointLight or SpotLight
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
                // Spot direction is (0, -1, 0) in local space
                const spotDir = new THREE.Vector3(0, -1, 0).applyEuler(lightRotation).normalize();
                
                const lightToPoint = new THREE.Vector3().subVectors(point, lightPosition).normalize();
                const angleCos = lightToPoint.dot(spotDir);
                
                if (angleCos < Math.cos(light.angle)) {
                    return 0;
                }
            }
        }

        const dot = Math.max(normal.dot(lightDir), 0);
        // Luminance approximation
        const luminance = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
        
        return luminance * intensity * dot * attenuation;
    }
}
