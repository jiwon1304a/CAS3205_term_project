import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class FluxOverlay {
    constructor(app, world) {
        this.app = app;
        this.world = world;
        this.overlays = new Map(); // FluxVolume -> CSS2DObject

        // Setup CSS2DRenderer
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none'; // Allow clicks to pass through
        document.body.appendChild(this.labelRenderer.domElement);

        // Hook into resize
        window.addEventListener('resize', this.onResize.bind(this));

        // Hook into update loop
        this.app.onUpdate.push(this.update.bind(this));
    }

    onResize() {
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    update() {
        // Render labels
        this.labelRenderer.render(this.app.scene, this.app.activeCamera);

        // Update label content and create new ones if needed
        const fluxVolumes = this.world.fluxVolumes;
        
        // Check for removed volumes
        for (const [volume, label] of this.overlays) {
            if (!fluxVolumes.includes(volume)) {
                volume.getObject3D().remove(label);
                this.overlays.delete(volume);
            }
        }

        // Update or create labels
        for (const volume of fluxVolumes) {
            let label = this.overlays.get(volume);
            
            if (!label) {
                const div = document.createElement('div');
                div.className = 'flux-label';
                div.style.color = 'white';
                div.style.fontFamily = 'monospace';
                div.style.fontSize = '14px';
                div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                div.style.padding = '2px 5px';
                div.style.borderRadius = '3px';
                div.style.userSelect = 'none';
                
                label = new CSS2DObject(div);
                label.position.set(0, 1.2, 0); // Position slightly above the cube
                volume.getObject3D().add(label);
                this.overlays.set(volume, label);
            }

            // Update text and color based on flux value
            const value = volume._fluxValue !== undefined ? volume._fluxValue : 0;
            const displayValue = value.toFixed(2);
            
            let color = 'white'; // default
            if (value < 40) {
                color = '#0000ff'; // blue for low flux
            } else if (value <= 60) {
                color = '#00ff00'; // green for medium flux
            } else {
                color = '#ff0000'; // red for high flux
            }
            
            label.element.textContent = `광량: ${displayValue}`;
            label.element.style.color = color;
        }
    }
}
