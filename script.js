import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { initOrbitControls } from './util.js';
import { SHADOW } from './Settings.js';

import { Floor } from './Object/Floor.js';
import { Box } from './Object/Box.js';
// support multiple selectable boxes
import { Skybox } from './Object/Skybox.js';
import { DirectionalLight, PointLight, Spotlight } from './Object/Light.js';
// UI modules
import { createGUI } from './UI/gui.js';
import { initObjectControls } from './UI/objectControls.js';
import { initLightControls } from './UI/lightControls.js';
import { initMeshControls } from './UI/meshControls.js';
import { initSelection } from './UI/selection.js';
import { Gizmo } from './UI/gizmo.js';

let myBox;
let myFloor;
const boxes = [];
let selectedObject = null;
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
// enable shadow map on renderer so lights/meshes can cast/receive shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const orbitControls = initOrbitControls(camera, renderer);

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
myFloor = new Floor({ width: 200, depth: 200, color: '#00FF00', grid: true, }).setPosition(0, 0, 0);
myFloor.addTo(scene);

// create initial box
myBox = new Box({ width: params.width, height: params.height, depth: params.depth, color: 0x0077ff }).setPosition(params.posX, params.posY, params.posZ);
myBox.addTo(scene);
boxes.push(myBox);
// select initial box
selectedObject = myBox;
selectedObject.setSelected(true);

function createBox({ width = 1, height = 1, depth = 1, color = 0x0077ff, position = { x: 0, y: 0, z: 0 } } = {}) {
    const b = new Box({ width, height, depth, color, position });
    b.addTo(scene);
    boxes.push(b);
    return b;
}

// create skybox and add to scene
const sky = new Skybox({ size: params.skySize, color: params.skyColor }).addTo(scene);


const gui = createGUI();

// initialize UI modules
// ensure params contain fields used by mesh/light controls
params.selectedLightIntensity = params.selectedLightIntensity || 1;
params.selectedLightColor = params.selectedLightColor || '#ffffff';

const objectUI = initObjectControls({ gui, params,
    getSelectedObject: () => selectedObject,
    setSelectedObject: (o) => {
        if (selectedObject && selectedObject !== o && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(false);
        selectedObject = o;
        if (selectedObject && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(true);
        if (objectUI && typeof objectUI.updateFromObject === 'function') objectUI.updateFromObject(selectedObject);
    }
});

// provide an Add Box button in the top-level script so creation is centralized
gui.add({ addBox: () => {
    const px = (Math.random() * 40) - 20;
    const pz = (Math.random() * 40) - 20;
    const b = createBox({ color: Math.floor(Math.random()*0xffffff), position: { x: px, y: 1 + Math.random()*2, z: pz } });
    if (b && b.getObject3D) {
        const sx = 1 + Math.random() * 3;
        const sy = 1 + Math.random() * 3;
        const sz = 1 + Math.random() * 3;
        b.getObject3D().scale.set(sx, sy, sz);
    }
    // select the newly-created box
    if (selectedObject && selectedObject !== b && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(false);
    selectedObject = b;
    if (selectedObject && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(true);
    if (objectUI && typeof objectUI.updateFromObject === 'function') objectUI.updateFromObject(selectedObject);
} }, 'addBox').name('Add Box');


const dierctionalLightIcon = 'Assets/directionallight.svg';
const pointLightIcon = 'Assets/pointlight.svg';
const spotlightIcon = 'Assets/spotlight.svg';
const iconSize = 5;

// Light controls (moved to UI module) — provide factory callbacks
const lightUI = initLightControls({ gui, params,
    createDirectional: () => {
        const dl = new DirectionalLight({ color: 0xffffff, intensity: params.dirIntensity, position: new THREE.Vector3(params.dirX, params.dirY, params.dirZ), name: 'DirectionalLight', icon: dierctionalLightIcon, iconSize: iconSize });
        dl.addTo(scene);
        dl.createHelper(scene);
        // sync helper visibility with params (helper created by class)
        if (typeof dl.setHelperVisible === 'function') dl.setHelperVisible(params.showDirHelper);
        return dl;
    },
    createPoint: () => {
        const pl = new PointLight({ color: 0xffffff, intensity: 1000, position: new THREE.Vector3(0, 5, 0), distance: 100, decay: 2, name: 'PointLight', icon: pointLightIcon, iconSize: iconSize });
        pl.addTo(scene);
        pl.createHelper(scene);
        return pl;
    },
    createSpot: () => {
        const sl = new Spotlight({ color: 0xffffff, intensity: 1, position: new THREE.Vector3(0, 10, 0), angle: Math.PI / 6, distance: 0, penumbra: 0, decay: 1, name: 'Spotlight', icon: spotlightIcon, iconSize: iconSize });
        sl.addTo(scene);
        sl.createHelper(scene);
        return sl;
    },
    getSelectedLight: () => (selectedObject && typeof selectedObject.getLight === 'function') ? selectedObject : null
});

// mesh controls (color) — operate on selected mesh-like objects
const meshUI = initMeshControls({ gui, params,
    getSelectedMesh: () => {
        // treat any selected object that exposes a material or setColor as a mesh
        if (!selectedObject) return null;
        const obj3d = selectedObject.getObject3D() ? selectedObject.getObject3D() : selectedObject;
        if (selectedObject && (typeof selectedObject.setColor === 'function' || (obj3d && obj3d.material && obj3d.material.color))) return selectedObject;
        return null;
    },
    setSelectedMesh: (m) => {
        if (selectedObject && selectedObject !== m && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(false);
        selectedObject = m;
        if (selectedObject && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(true);
        if (meshUI && typeof meshUI.updateFromMesh === 'function') meshUI.updateFromMesh(selectedObject);
    }
});

// Skybox controls removed; skybox is created above and can be edited via Object controls.

// Transform (gizmo) controls
// create unified gizmo (visuals + interaction + snapping)
gizmo = new Gizmo({ renderer, camera, domElement: renderer.domElement, orbitControls, scene, size: 3, snap: { translate: 1, rotate: 15, scale: 0.1 } });
scene.add(gizmo.group);
gizmo.setVisibility(false);

// Keyboard shortcuts: Blender-like (G: grab/move, R: rotate, S: scale)
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!gizmo) return;
    // Unreal-style bindings: W = Translate, E = Rotate, R = Scale
    if (key === 'w') {
        gizmo.setMode('translate');
    } else if (key === 'e') {
        gizmo.setMode('rotate');
    } else if (key === 'r') {
        gizmo.setMode('scale');
    }
});

// objectUI provides updateFromObject; keep boxUI available for quick-box-only tweaks
const updateParamsFromSelected = (objectUI && typeof objectUI.updateFromObject === 'function') ? objectUI.updateFromObject : (() => {});

// pointer / raycast selection
// Pointer selection handled by UI selection module
initSelection({ renderer, camera, scene, raycaster, pointer,
    onSelect: (found) => {
        if (selectedObject && selectedObject !== found && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(false);
        selectedObject = found;
        if (selectedObject && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(true);
        // update the generic object UI from the current selection
        if (objectUI && typeof objectUI.updateFromObject === 'function') {
            objectUI.updateFromObject(selectedObject);
        }
        // update mesh UI if applicable
        if (meshUI && typeof meshUI.updateFromMesh === 'function') meshUI.updateFromMesh(selectedObject);
        // update light UI if applicable
        if (typeof lightUI !== 'undefined' && lightUI && typeof lightUI.updateFromLight === 'function') lightUI.updateFromLight(selectedObject);
        // attach and show unified gizmo for any selectable object
        if (gizmo) { gizmo.attach(found); gizmo.setVisibility(true); gizmo.setMode('translate'); }
        console.log('Selected', selectedObject);
    },
    onDeselect: () => {
        if (selectedObject && typeof selectedObject.setSelected === 'function') selectedObject.setSelected(false);
        selectedObject = null;
        // detach unified gizmo
        if (gizmo) { gizmo.detach(); gizmo.setVisibility(false); }
    }
});

render();

function render() {
    orbitControls.update();
    requestAnimationFrame(render);
    // update unified gizmo to follow selected object
    if (gizmo) gizmo.update();
        // keep GUI in sync with selected object every frame (so gizmo drags update controls)
    if (selectedObject && objectUI && typeof objectUI.updateFromObject === 'function') {
        objectUI.updateFromObject(selectedObject);
    }
    if (selectedObject && meshUI && typeof meshUI.updateFromMesh === 'function') {
        meshUI.updateFromMesh(selectedObject);
    }
    if (selectedObject && typeof lightUI !== 'undefined' && lightUI && typeof lightUI.updateFromLight === 'function') {
        lightUI.updateFromLight(selectedObject);
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});