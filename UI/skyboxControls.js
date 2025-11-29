export function initSkyboxControls({ gui, params, sky, scene }) {
    const skyFolder = gui.addFolder('Skybox');
    skyFolder.add(params, 'skyVisible').name('Visible').onChange((v) => sky.setVisibility(v));
    skyFolder.add(params, 'skySize', 100, 5000, 1).name('Size').onChange((v) => sky.setSize(v));
    skyFolder.addColor(params, 'skyColor').name('Color').onChange((v) => sky.setColor(v));
    skyFolder.add({ applyAsBackground: () => sky.applyAsBackground(scene) }, 'applyAsBackground').name('Apply as Background');
    skyFolder.open();
}
