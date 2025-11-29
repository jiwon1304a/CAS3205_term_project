import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { initOrbitControls } from './util.js';

import { Floor } from './Geometry/floor.js';
import { Box } from './Geometry/box.js';
// support multiple selectable boxes
import { Skybox } from './Geometry/skybox.js';
// UI modules
import { createGUI } from './UI/gui.js';
import { initBoxControls } from './UI/boxControls.js';
import { initLightControls } from './UI/lightControls.js';
import { initSkyboxControls } from './UI/skyboxControls.js';
import { initSelection } from './UI/selection.js';
import { Gizmo } from './UI/gizmo.js';

let myBox;
let myFloor;
const boxes = [];
let selectedBox = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let gizmo = null;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 50);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const orbitControls = initOrbitControls(camera, renderer);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Parameters for the box and GUI
const params = {
    width: 4,
    height: 2,
    depth: 2,
    posX: 0,
    posY: 3,
    posZ: 0,
    rotX: 0, // degrees
    rotY: 0,
    rotZ: 0,
    color: '#0077ff'
};

// add scale params (controlled from GUI)
params.scaleX = 1;
params.scaleY = 1;
params.scaleZ = 1;

// temporary directional light params
params.lightEnabled = true;
params.dirIntensity = 1;
params.dirX = -10;
params.dirY = 10;
params.dirZ = -10;
params.showDirHelper = true;
// skybox params
params.skyColor = '#87CEEB';
params.skySize = 1000;
params.skyVisible = true;

// plane
myFloor = new Floor({ width: 200, depth: 200, color: '#00FF00', grid: true }).setPosition(0, 0, 0);
myFloor.addTo(scene);

// create initial box
myBox = new Box({ width: params.width, height: params.height, depth: params.depth, color: 0x0077ff }).setPosition(params.posX, params.posY, params.posZ);
myBox.addTo(scene);
boxes.push(myBox);
// select initial box
selectedBox = myBox;
selectedBox.setSelected(true);

function createBox({ width = 1, height = 1, depth = 1, color = 0x0077ff, position = { x: 0, y: 0, z: 0 } } = {}) {
    const b = new Box({ width, height, depth, color, position });
    b.addTo(scene);
    boxes.push(b);
    return b;
}

// create skybox and add to scene
const sky = new Skybox({ size: params.skySize, color: params.skyColor }).setVisibility(params.skyVisible).addTo(scene);

// temporary directional light (additional)
const dirLightTemp = new THREE.DirectionalLight(0xffffff, params.dirIntensity);
dirLightTemp.position.set(params.dirX, params.dirY, params.dirZ);
dirLightTemp.visible = params.lightEnabled;
scene.add(dirLightTemp);

const dirHelper = new THREE.DirectionalLightHelper(dirLightTemp, 5);
dirHelper.visible = params.lightEnabled && params.showDirHelper;
scene.add(dirHelper);

const gui = createGUI();

// initialize UI modules
const boxUI = initBoxControls({ gui, params,
    getSelectedBox: () => selectedBox,
    setSelectedBox: (b) => {
        if (selectedBox && selectedBox !== b) selectedBox.setSelected(false);
        selectedBox = b;
        if (selectedBox) selectedBox.setSelected(true);
        // update box UI from selection
        if (boxUI && typeof boxUI.updateFromBox === 'function') boxUI.updateFromBox(selectedBox);
    },
    createBox
});

// Light controls (moved to UI module)
initLightControls({ gui, params, dirLightTemp, dirHelper });

// Skybox controls
// Skybox controls (moved to UI module)
initSkyboxControls({ gui, params, sky, scene });

// Transform (gizmo) controls
// create unified gizmo (visuals + interaction + snapping)
gizmo = new Gizmo({ renderer, camera, domElement: renderer.domElement, orbitControls, scene, size: 3, snap: { translate: 1, rotate: 15, scale: 0.1 } });
scene.add(gizmo.group);
gizmo.setVisibility(false);

// Keyboard shortcuts: Blender-like (G: grab/move, R: rotate, S: scale)
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!gizmo) return;
    if (key === 'g') {
        gizmo.setMode('translate');
    } else if (key === 'r') {
        gizmo.setMode('rotate');
    } else if (key === 's') {
        gizmo.setMode('scale');
    }
});

// boxUI provides updateFromBox
const updateParamsFromSelected = (boxUI && typeof boxUI.updateFromBox === 'function') ? boxUI.updateFromBox : (() => {});

// pointer / raycast selection
// Pointer selection handled by UI selection module
initSelection({ renderer, camera, scene, raycaster, pointer,
    onSelect: (foundBox) => {
        if (selectedBox && selectedBox !== foundBox) selectedBox.setSelected(false);
        selectedBox = foundBox;
        selectedBox.setSelected(true);
        updateParamsFromSelected(selectedBox);
        // attach and show unified gizmo
        if (gizmo) { gizmo.attach(foundBox); gizmo.setVisibility(true); gizmo.setMode('translate'); }
        console.log('Selected box', selectedBox);
    },
    onDeselect: () => {
        if (selectedBox) {
            selectedBox.setSelected(false);
            selectedBox = null;
            // detach unified gizmo
            if (gizmo) { gizmo.detach(); gizmo.setVisibility(false); }
        }
    }
});

render();

function render() {
    orbitControls.update();
    requestAnimationFrame(render);
    // update unified gizmo to follow selected object
    if (gizmo) gizmo.update();
    // keep GUI in sync with selected object every frame (so gizmo drags update controls)
    if (selectedBox && boxUI && typeof boxUI.updateFromBox === 'function') {
        boxUI.updateFromBox(selectedBox);
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});