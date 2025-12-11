import * as THREE from 'three';

// Initialize generic object-related GUI controls. Caller must provide
// functions to get/set currently selected object (which should follow the
// project's `Object` wrapper API: provide `getObject3D()` and optionally
// `setPosition()` / `setRotation()` / `setColor()`).
export function initObjectControls({ gui, params, getSelectedObject, setSelectedObject, setDirty }) {
    const positionFolder = gui.addFolder('Position');
    const posXCtrl = positionFolder.add(params, 'posX', -100, 100, 0.1);
    posXCtrl.onChange((v) => { const so = getSelectedObject(); if (so) {
        if (typeof so.setPosition === 'function') so.setPosition(v, params.posY, params.posZ);
        else so.getObject3D().position.set(v, params.posY, params.posZ);
        if (setDirty) setDirty();
    } });
    const posYCtrl = positionFolder.add(params, 'posY', -100, 100, 0.1);
    posYCtrl.onChange((v) => { const so = getSelectedObject(); if (so) {
        if (typeof so.setPosition === 'function') so.setPosition(params.posX, v, params.posZ);
        else so.getObject3D().position.set(params.posX, v, params.posZ);
        if (setDirty) setDirty();
    } });
    const posZCtrl = positionFolder.add(params, 'posZ', -100, 100, 0.1);
    posZCtrl.onChange((v) => { const so = getSelectedObject(); if (so) {
        if (typeof so.setPosition === 'function') so.setPosition(params.posX, params.posY, v);
        else so.getObject3D().position.set(params.posX, params.posY, v);
        if (setDirty) setDirty();
    } });
    positionFolder.open();

    const rotationFolder = gui.addFolder('Rotation (deg)');
    const rotXCtrl = rotationFolder.add(params, 'rotX', -180, 180, 1);
    rotXCtrl.onChange((v) => { const so = getSelectedObject(); if (so) {
        const rx = THREE.MathUtils.degToRad(v);
        const ry = THREE.MathUtils.degToRad(params.rotY);
        const rz = THREE.MathUtils.degToRad(params.rotZ);
        if (typeof so.setRotation === 'function') so.setRotation(rx, ry, rz);
        else so.getObject3D().rotation.set(rx, ry, rz);
        if (setDirty) setDirty();
    } });
    const rotYCtrl = rotationFolder.add(params, 'rotY', -180, 180, 1);
    rotYCtrl.onChange((v) => { const so = getSelectedObject(); if (so) {
        const rx = THREE.MathUtils.degToRad(params.rotX);
        const ry = THREE.MathUtils.degToRad(v);
        const rz = THREE.MathUtils.degToRad(params.rotZ);
        if (typeof so.setRotation === 'function') so.setRotation(rx, ry, rz);
        else so.getObject3D().rotation.set(rx, ry, rz);
        if (setDirty) setDirty();
    } });
    const rotZCtrl = rotationFolder.add(params, 'rotZ', -180, 180, 1);
    rotZCtrl.onChange((v) => { const so = getSelectedObject(); if (so) {
        const rx = THREE.MathUtils.degToRad(params.rotX);
        const ry = THREE.MathUtils.degToRad(params.rotY);
        const rz = THREE.MathUtils.degToRad(v);
        if (typeof so.setRotation === 'function') so.setRotation(rx, ry, rz);
        else so.getObject3D().rotation.set(rx, ry, rz);
        if (setDirty) setDirty();
    } });
    rotationFolder.open();

    const scaleFolder = gui.addFolder('Scale');
    const scaleXCtrl = scaleFolder.add(params, 'scaleX', 0.01, 10, 0.01);
    scaleXCtrl.onChange((v) => {
        const so = getSelectedObject();
        if (so) so.getObject3D().scale.x = v;
        if (setDirty) setDirty();
    });
    const scaleYCtrl = scaleFolder.add(params, 'scaleY', 0.01, 10, 0.01);
    scaleYCtrl.onChange((v) => {
        const so = getSelectedObject();
        if (so) so.getObject3D().scale.y = v;
        if (setDirty) setDirty();
    });
    const scaleZCtrl = scaleFolder.add(params, 'scaleZ', 0.01, 10, 0.01);
    scaleZCtrl.onChange((v) => {
        const so = getSelectedObject();
        if (so) so.getObject3D().scale.z = v;
        if (setDirty) setDirty();
    });
    scaleFolder.open();

    function updateFromObject(obj) {
        if (!obj) return;
        const pos = obj.getObject3D().position;
        params.posX = pos.x;
        params.posY = pos.y;
        params.posZ = pos.z;
        const rot = obj.getObject3D().rotation;
        params.rotX = THREE.MathUtils.radToDeg(rot.x);
        params.rotY = THREE.MathUtils.radToDeg(rot.y);
        params.rotZ = THREE.MathUtils.radToDeg(rot.z);
        const scl = obj.getObject3D().scale;
        params.scaleX = scl.x;
        params.scaleY = scl.y;
        params.scaleZ = scl.z;
        // color is intentionally not handled here; use mesh controls for material color.
        posXCtrl.setValue(params.posX);
        posYCtrl.setValue(params.posY);
        posZCtrl.setValue(params.posZ);
        rotXCtrl.setValue(params.rotX);
        rotYCtrl.setValue(params.rotY);
        rotZCtrl.setValue(params.rotZ);
        scaleXCtrl.setValue(params.scaleX);
        scaleYCtrl.setValue(params.scaleY);
        scaleZCtrl.setValue(params.scaleZ);
    }

    function setVisibility(visible) {
        visible ? positionFolder.show() : positionFolder.hide();
        visible ? rotationFolder.show() : rotationFolder.hide();
        visible ? scaleFolder.show() : scaleFolder.hide();
    }

    return { updateFromObject, setVisibility };
}
