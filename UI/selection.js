export function initSelection({ renderer, camera, scene, raycaster, pointer, onSelect, onDeselect }) {
    function onPointerDown(event) {
        // Only respond to left-click (button === 0)
        if (typeof event.button === 'number' && event.button !== 0) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        let foundBox = null;
        for (let i = 0; i < intersects.length; i++) {
            const obj = intersects[i].object;
            if (obj.userData && obj.userData.box) {
                foundBox = obj.userData.box;
                break;
            }
        }
        if (foundBox) {
            onSelect(foundBox);
        } else {
            onDeselect();
        }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    return function dispose() {
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    };
}
