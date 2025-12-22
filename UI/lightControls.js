export function initLightControls({ gui, params, getSelectedLight, setSelectedLight, setDirty, removeLight } = {}) {
    // Light property controls for the currently-selected light (intensity/color)
    const propFolder = gui.addFolder('Light Properties');
    const intensityCtrl = propFolder.add(params, 'selectedLightIntensity', 0.01, 1000, 0.01).name('Intensity');
    intensityCtrl.onChange((v) => {
        const l = (typeof getSelectedLight === 'function') ? getSelectedLight() : null;
        if (!l) return;
        if (typeof l.setIntensity === 'function') l.setIntensity(v);
        else if (l.getLight && l.getLight()) l.getLight().intensity = v;
        if (setDirty) setDirty();
    });
    const colorCtrl = propFolder.addColor(params, 'selectedLightColor').name('Color');
    colorCtrl.onChange((v) => {
        const l = (typeof getSelectedLight === 'function') ? getSelectedLight() : null;
        if (!l) return;
        if (typeof l.setColor === 'function') l.setColor(v);
        else if (l.getLight && l.getLight() && l.getLight().color) l.getLight().color.set(v);
        if (setDirty) setDirty();
    });

    // Distance control (PointLight, SpotLight)
    const distanceCtrl = propFolder.add(params, 'selectedLightDistance', 1, 100).name('Distance');
    distanceCtrl.onChange((v) => {
        const l = (typeof getSelectedLight === 'function') ? getSelectedLight() : null;
        if (!l) return;
        if (typeof l.setDistance === 'function') l.setDistance(v);
        else if (l.getLight && l.getLight()) l.getLight().distance = v;
        if (l.updateHelper) l.updateHelper();
        if (setDirty) setDirty();
    });

    // Penumbra control (SpotLight)
    const penumbraCtrl = propFolder.add(params, 'selectedLightPenumbra', 0, 1).name('Penumbra');
    penumbraCtrl.onChange((v) => {
        const l = (typeof getSelectedLight === 'function') ? getSelectedLight() : null;
        if (!l) return;
        if (typeof l.setPenumbra === 'function') l.setPenumbra(v);
        else if (l.getLight && l.getLight()) l.getLight().penumbra = v;
        if (l.updateHelper) l.updateHelper();
        if (setDirty) setDirty();
    });

    // Angle control (SpotLight) - displayed in degrees
    const angleCtrl = propFolder.add(params, 'selectedLightAngle', 0, 90).name('Angle (deg)');
    angleCtrl.onChange((v) => {
        const l = (typeof getSelectedLight === 'function') ? getSelectedLight() : null;
        if (!l) return;
        const rad = v * (Math.PI / 180);
        if (typeof l.setAngle === 'function') l.setAngle(rad);
        else if (l.getLight && l.getLight()) l.getLight().angle = rad;
        if (l.updateHelper) l.updateHelper();
        if (setDirty) setDirty();
    });

    const removeBtn = {
        remove: () => {
            const l = (typeof getSelectedLight === 'function') ? getSelectedLight() : null;
            if (l && removeLight) {
                removeLight(l);
            }
        }
    };
    propFolder.add(removeBtn, 'remove').name('Remove Light');

    propFolder.open();

    // helper to update controllers when selection changes
    function updateFromLight(lightWrapper) {
        if (!lightWrapper) return;
        const light = (lightWrapper.getLight && typeof lightWrapper.getLight === 'function') ? lightWrapper.getLight() : null;
        
        const intensity = light ? (light.intensity || 0) : (lightWrapper.intensity || 0);
        const color = light ? ('#' + light.color.getHexString()) : (lightWrapper.color ? ('#' + lightWrapper.color.getHexString()) : params.selectedLightColor);
        
        params.selectedLightIntensity = intensity;
        params.selectedLightColor = color;
        intensityCtrl.setValue(params.selectedLightIntensity);
        colorCtrl.setValue(params.selectedLightColor);

        // Handle Distance & Penumbra visibility
        if (light && (light.isPointLight || light.isSpotLight)) {
            distanceCtrl.show();
            params.selectedLightDistance = light.distance;
            distanceCtrl.setValue(params.selectedLightDistance);
        } else {
            distanceCtrl.hide();
        }

        if (light && light.isSpotLight) {
            penumbraCtrl.show();
            params.selectedLightPenumbra = light.penumbra;
            penumbraCtrl.setValue(params.selectedLightPenumbra);
            
            angleCtrl.show();
            params.selectedLightAngle = light.angle * (180 / Math.PI);
            angleCtrl.setValue(params.selectedLightAngle);
        } else {
            penumbraCtrl.hide();
            angleCtrl.hide();
        }
    }

    function setVisibility(visible) {
        visible ? propFolder.show() : propFolder.hide();
    }

    return { updateFromLight, setVisibility };
}
