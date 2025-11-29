export function initSelection({ renderer, camera, scene, raycaster, pointer, onSelect, onDeselect }) {
    // Click vs drag detection
    let _mouseDown = false;
    let _startPos = { x: 0, y: 0 };
    let _moved = false;
    const DRAG_THRESHOLD = 4; // pixels - if moved more than this, treat as drag

    function _computePointer(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerDown(event) {
        // Only respond to left-click (button === 0)
        if (typeof event.button === 'number' && event.button !== 0) return;
        _mouseDown = true;
        _moved = false;
        _startPos.x = event.clientX;
        _startPos.y = event.clientY;
    }

    function onPointerMove(event) {
        if (!_mouseDown) return;
        const dx = Math.abs(event.clientX - _startPos.x);
        const dy = Math.abs(event.clientY - _startPos.y);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) _moved = true;
    }

    function onPointerUp(event) {
        // Only consider left-button releases
        if (typeof event.button === 'number' && event.button !== 0) {
            _mouseDown = false;
            _moved = false;
            return;
        }
        // If pointerdown didn't originate on the renderer (e.g. gizmo consumed it),
        // don't run selection logic on pointerup.
        if (!_mouseDown) {
            _mouseDown = false;
            _moved = false;
            return;
        }

        // If this was a drag, don't change selection
        if (_moved) {
            _mouseDown = false;
            _moved = false;
            return;
        }

        // It's a click (no substantial move) -> run selection logic
        _computePointer(event);
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

        _mouseDown = false;
        _moved = false;
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return function dispose() {
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    };
}
