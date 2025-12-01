export function initLightControls({ gui, params, createDirectional, createPoint, createSpot, getSelectedLight, setSelectedLight } = {}) {
    // Remove temporary directional-light controls; instead provide buttons
    // to create lights. The caller may pass factory callbacks `createDirectional`,
    // `createPoint`, `createSpot` which should create and add the light to the scene.
    const lightFolder = gui.addFolder('Lights');

    lightFolder.add({ addDirectional: () => {
        if (typeof createDirectional === 'function') {
            try { createDirectional(); }
            catch (e) { console.warn('createDirectional callback threw', e); }
        } else {
            console.warn('createDirectional callback not provided');
        }
    } }, 'addDirectional').name('Add Directional Light');

    lightFolder.add({ addPoint: () => {
        if (typeof createPoint === 'function') {
            try { createPoint(); }
            catch (e) { console.warn('createPoint callback threw', e); }
        } else {
            console.warn('createPoint callback not provided');
        }
    } }, 'addPoint').name('Add Point Light');

    lightFolder.add({ addSpot: () => {
        if (typeof createSpot === 'function') {
            try { createSpot(); }
            catch (e) { console.warn('createSpot callback threw', e); }
        } else {
            console.warn('createSpot callback not provided');
        }
    } }, 'addSpot').name('Add Spotlight');

    lightFolder.open();

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

    return { updateFromLight };
}
