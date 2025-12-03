export function initLightControls({ gui, params, getSelectedLight, setSelectedLight } = {}) {
    // Light property controls for the currently-selected light (intensity/color)
    const propFolder = gui.addFolder('Light Properties');
    const intensityCtrl = propFolder.add(params, 'selectedLightIntensity', 0, 10, 0.01).name('Intensity');
    intensityCtrl.onChange((v) => {
        const l = (typeof getSelectedLight === 'function') ? getSelectedLight() : null;
        if (!l) return;
        if (typeof l.setIntensity === 'function') l.setIntensity(v);
        else if (l.getLight && l.getLight()) l.getLight().intensity = v;
    });
    const colorCtrl = propFolder.addColor(params, 'selectedLightColor').name('Color');
    colorCtrl.onChange((v) => {
        const l = (typeof getSelectedLight === 'function') ? getSelectedLight() : null;
        if (!l) return;
        if (typeof l.setColor === 'function') l.setColor(v);
        else if (l.getLight && l.getLight() && l.getLight().color) l.getLight().color.set(v);
    });
    propFolder.open();

    // helper to update controllers when selection changes
    function updateFromLight(lightWrapper) {
        if (!lightWrapper) return;
        const intensity = (lightWrapper && lightWrapper.getLight && lightWrapper.getLight()) ? (lightWrapper.getLight().intensity || 0) : (lightWrapper.intensity || 0);
        const color = (lightWrapper && lightWrapper.getLight && lightWrapper.getLight() && lightWrapper.getLight().color) ? ('#' + lightWrapper.getLight().color.getHexString()) : (lightWrapper.color ? ('#' + lightWrapper.color.getHexString()) : params.selectedLightColor);
        params.selectedLightIntensity = intensity;
        params.selectedLightColor = color;
        intensityCtrl.setValue(params.selectedLightIntensity);
        colorCtrl.setValue(params.selectedLightColor);
    }

    function setVisibility(visible) {
        visible ? propFolder.show() : propFolder.hide();
    }

    return { updateFromLight, setVisibility };
}
