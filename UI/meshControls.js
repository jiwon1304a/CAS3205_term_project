import * as THREE from 'three';
import { DEBUG } from '../Core/Globals.js';

// Controls for mesh objects: primarily edits material color.
export function initMeshControls({ gui, params, getSelectedMesh, setSelectedMesh, setDirty }) {
    const meshFolder = gui.addFolder('Mesh');
    let colorCtrl;
    if (DEBUG) {
        colorCtrl = meshFolder.addColor(params, 'color');
        colorCtrl.onChange((v) => {
            const m = getSelectedMesh();
            if (!m) return;
            // Prefer wrapper API
            if (typeof m.setColor === 'function') {
                m.setColor(v);
            } else {
                const obj3d = m.getObject3D ? m.getObject3D() : m;
                if (obj3d && obj3d.material && obj3d.material.color) obj3d.material.color.set(v);
            }
            if (setDirty) setDirty();
        });
    }
    meshFolder.open();

    function updateFromMesh(mesh) {
        if (!mesh) return;
        // try wrapper API first
        if (typeof mesh.getColor === 'function') {
            const c = mesh.getColor();
            if (c) params.color = '#' + (new THREE.Color(c)).getHexString();
        } else {
            const obj3d = mesh.getObject3D ? mesh.getObject3D() : mesh;
            if (obj3d && obj3d.material && obj3d.material.color) params.color = '#' + obj3d.material.color.getHexString();
        }
        if (colorCtrl) colorCtrl.setValue(params.color);
    }

    function setVisibility(visible) {
        visible ? meshFolder.show() : meshFolder.hide();
    }

    return { updateFromMesh, setVisibility };
}
