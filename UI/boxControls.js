import * as THREE from 'three';

// Initialize box-related GUI controls. Caller must provide functions to get/set currently selected box and createBox.
export function initBoxControls({ gui, params, getSelectedBox, setSelectedBox, createBox }) {
    const sizeFolder = gui.addFolder('Size');
    const widthCtrl = sizeFolder.add(params, 'width', 0.1, 50, 0.1);
    widthCtrl.onChange((v) => {
        const sb = getSelectedBox();
        if (sb) sb.setSize(v, params.height, params.depth);
    });
    const heightCtrl = sizeFolder.add(params, 'height', 0.1, 50, 0.1);
    heightCtrl.onChange((v) => {
        const sb = getSelectedBox();
        if (sb) sb.setSize(params.width, v, params.depth);
    });
    const depthCtrl = sizeFolder.add(params, 'depth', 0.1, 50, 0.1);
    depthCtrl.onChange((v) => {
        const sb = getSelectedBox();
        if (sb) sb.setSize(params.width, params.height, v);
    });
    sizeFolder.open();

    const positionFolder = gui.addFolder('Position');
    const posXCtrl = positionFolder.add(params, 'posX', -100, 100, 0.1);
    posXCtrl.onChange((v) => { const sb = getSelectedBox(); if (sb) sb.setPosition(v, params.posY, params.posZ); });
    const posYCtrl = positionFolder.add(params, 'posY', -100, 100, 0.1);
    posYCtrl.onChange((v) => { const sb = getSelectedBox(); if (sb) sb.setPosition(params.posX, v, params.posZ); });
    const posZCtrl = positionFolder.add(params, 'posZ', -100, 100, 0.1);
    posZCtrl.onChange((v) => { const sb = getSelectedBox(); if (sb) sb.setPosition(params.posX, params.posY, v); });
    positionFolder.open();

    const rotationFolder = gui.addFolder('Rotation (deg)');
    const rotXCtrl = rotationFolder.add(params, 'rotX', -180, 180, 1);
    rotXCtrl.onChange((v) => { const sb = getSelectedBox(); if (sb) sb.setRotation(THREE.MathUtils.degToRad(v), THREE.MathUtils.degToRad(params.rotY), THREE.MathUtils.degToRad(params.rotZ)); });
    const rotYCtrl = rotationFolder.add(params, 'rotY', -180, 180, 1);
    rotYCtrl.onChange((v) => { const sb = getSelectedBox(); if (sb) sb.setRotation(THREE.MathUtils.degToRad(params.rotX), THREE.MathUtils.degToRad(v), THREE.MathUtils.degToRad(params.rotZ)); });
    const rotZCtrl = rotationFolder.add(params, 'rotZ', -180, 180, 1);
    rotZCtrl.onChange((v) => { const sb = getSelectedBox(); if (sb) sb.setRotation(THREE.MathUtils.degToRad(params.rotX), THREE.MathUtils.degToRad(params.rotY), THREE.MathUtils.degToRad(v)); });
    rotationFolder.open();

    const colorCtrl = gui.addColor(params, 'color');
    colorCtrl.onChange((v) => { const sb = getSelectedBox(); if (sb) sb.setColor(v); });

    // Add Box button
    gui.add({ addBox: () => {
        const px = (Math.random() * 40) - 20;
        const pz = (Math.random() * 40) - 20;
        const b = createBox({ width: 1 + Math.random() * 3, height: 1 + Math.random() * 3, depth: 1 + Math.random() * 3, color: Math.floor(Math.random()*0xffffff), position: { x: px, y: 1 + Math.random()*2, z: pz } });
        if (getSelectedBox()) getSelectedBox().setSelected(false);
        setSelectedBox(b);
        setSelectedBox(b); // ensure selection update
    } }, 'addBox').name('Add Box');

    // function to update GUI controllers from a selected box
    function updateFromBox(box) {
        if (!box) return;
        const geo = box.mesh.geometry;
        if (geo && geo.parameters) {
            params.width = geo.parameters.width || params.width;
            params.height = geo.parameters.height || params.height;
            params.depth = geo.parameters.depth || params.depth;
        }
        const pos = box.getObject3D().position;
        params.posX = pos.x;
        params.posY = pos.y;
        params.posZ = pos.z;
        const rot = box.getObject3D().rotation;
        params.rotX = THREE.MathUtils.radToDeg(rot.x);
        params.rotY = THREE.MathUtils.radToDeg(rot.y);
        params.rotZ = THREE.MathUtils.radToDeg(rot.z);
        if (box.material && box.material.color) {
            params.color = '#' + box.material.color.getHexString();
        }

        widthCtrl.setValue(params.width);
        heightCtrl.setValue(params.height);
        depthCtrl.setValue(params.depth);
        posXCtrl.setValue(params.posX);
        posYCtrl.setValue(params.posY);
        posZCtrl.setValue(params.posZ);
        rotXCtrl.setValue(params.rotX);
        rotYCtrl.setValue(params.rotY);
        rotZCtrl.setValue(params.rotZ);
        colorCtrl.setValue(params.color);
    }

    return { updateFromBox };
}
