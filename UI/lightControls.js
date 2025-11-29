export function initLightControls({ gui, params, dirLightTemp, dirHelper }) {
    const lightFolder = gui.addFolder('Temporary Directional Light');
    lightFolder.add(params, 'lightEnabled').name('Enabled').onChange((v) => {
        dirLightTemp.visible = v;
        dirHelper.visible = v && params.showDirHelper;
    });
    lightFolder.add(params, 'dirIntensity', 0, 5, 0.1).name('Intensity').onChange((v) => dirLightTemp.intensity = v);
    lightFolder.add(params, 'dirX', -100, 100, 0.1).name('X').onChange((v) => dirLightTemp.position.x = v);
    lightFolder.add(params, 'dirY', -100, 100, 0.1).name('Y').onChange((v) => dirLightTemp.position.y = v);
    lightFolder.add(params, 'dirZ', -100, 100, 0.1).name('Z').onChange((v) => dirLightTemp.position.z = v);
    lightFolder.add(params, 'showDirHelper').name('Show Helper').onChange((v) => dirHelper.visible = v && params.lightEnabled);
    lightFolder.open();
}
