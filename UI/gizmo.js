import * as THREE from 'three';

export class Gizmo {
    constructor({ renderer, camera, domElement, orbitControls, snap = { translate: 1, rotate: 15, scale: 0.1 } } = {}) {
        this.renderer = renderer;
        this.camera = camera;
        this.domElement = domElement || renderer.domElement;
        this.orbitControls = orbitControls;
        this.snap = snap;

        this.group = new THREE.Object3D();
        this.group.name = 'Gizmo';
        this._target = null;
        this._mode = 'translate';
        this._dragging = false;
        this._activeHandle = null;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        // desired gizmo screen size in pixels (approximate) and user multiplier
        this.screenSize = 120; // pixels the gizmo should appear roughly
        this.screenScaleMultiplier = 1.0; // additional user multiplier

        this._createVisuals();
        this._bindEvents();

        this.group.visible = false;
    }

    _closestPointOnLineToRay(rayOrigin, rayDir, linePoint, lineDir) {
        // Solve for closest points between ray (p + t r) and line (q + u s)
        const p = rayOrigin.clone();
        const r = rayDir.clone().normalize();
        const q = linePoint.clone();
        const s = lineDir.clone().normalize();
        const pq = p.clone().sub(q);
        const a = r.dot(r);
        const b = r.dot(s);
        const c = s.dot(s);
        const d = r.dot(pq);
        const e = s.dot(pq);
        const denom = a * c - b * b;
        if (Math.abs(denom) < 1e-6) {
            // nearly parallel: project pq onto s to get u
            const u = e / c;
            const pointOnLine = q.clone().add(s.clone().multiplyScalar(u));
            return { point: pointOnLine, u };
        }
        const t = (b * e - c * d) / denom;
        const u = (a * e - b * d) / denom;
        const pointOnLine = q.clone().add(s.clone().multiplyScalar(u));
        return { point: pointOnLine, u };
    }

    _createVisuals() {
        const s = 1.0; // base visual size in local gizmo units
        this.handles = new THREE.Object3D();

        // Translate arrows
        const shaftGeom = new THREE.CylinderGeometry(s * 0.03, s * 0.03, s * 0.6, 8);
        const headGeom = new THREE.ConeGeometry(s * 0.07, s * 0.16, 12);
        const matX = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const matY = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const matZ = new THREE.MeshBasicMaterial({ color: 0x0000ff });

        const headOffset = 0.7;
        const shaftOffset = 0.35;
        
        // X
        const shaftX = new THREE.Mesh(shaftGeom, matX);
        shaftX.position.set(s * shaftOffset, 0, 0);
        shaftX.rotation.z = -Math.PI / 2;
        shaftX.userData = { gizmo: true, type: 'translate', axis: 'X' };
        const headX = new THREE.Mesh(headGeom, matX);
        headX.position.set(s * headOffset, 0, 0);
        headX.rotation.z = -Math.PI / 2;
        headX.userData = { gizmo: true, type: 'translate', axis: 'X' };

        // Y
        const shaftY = new THREE.Mesh(shaftGeom, matY);
        shaftY.position.set(0, s * shaftOffset, 0);
        shaftY.userData = { gizmo: true, type: 'translate', axis: 'Y' };
        const headY = new THREE.Mesh(headGeom, matY);
        headY.position.set(0, s * headOffset, 0);
        headY.userData = { gizmo: true, type: 'translate', axis: 'Y' };

        // Z
        const shaftZ = new THREE.Mesh(shaftGeom, matZ);
        shaftZ.position.set(0, 0, s * shaftOffset);
        shaftZ.rotation.x = Math.PI / 2;
        shaftZ.userData = { gizmo: true, type: 'translate', axis: 'Z' };
        const headZ = new THREE.Mesh(headGeom, matZ);
        headZ.position.set(0, 0, s * headOffset);
        headZ.rotation.x = Math.PI / 2;
        headZ.userData = { gizmo: true, type: 'translate', axis: 'Z' };

        const translateGroup = new THREE.Object3D();
        translateGroup.add(shaftX, headX, shaftY, headY, shaftZ, headZ);

        // Rotation rings
        const torusGeom = new THREE.TorusGeometry(s * 0.9, s * 0.02, 8, 64);
        const ringX = new THREE.Mesh(torusGeom, matX);
        ringX.rotation.y = Math.PI / 2; ringX.userData = { gizmo: true, type: 'rotate', axis: 'X' };
        const ringY = new THREE.Mesh(torusGeom, matY);
        ringY.rotation.x = Math.PI / 2; ringY.userData = { gizmo: true, type: 'rotate', axis: 'Y' };
        const ringZ = new THREE.Mesh(torusGeom, matZ);
        ringZ.userData = { gizmo: true, type: 'rotate', axis: 'Z' };
        const rotateGroup = new THREE.Object3D();
        rotateGroup.add(ringX, ringY, ringZ);

        // Scale boxes
        const boxGeom = new THREE.BoxGeometry(s * 0.12, s * 0.12, s * 0.12);
        const bx = new THREE.Mesh(boxGeom, matX); bx.position.set(s * 0.6, 0, 0); bx.userData = { gizmo: true, type: 'scale', axis: 'X' };
        const by = new THREE.Mesh(boxGeom, matY); by.position.set(0, s * 0.6, 0); by.userData = { gizmo: true, type: 'scale', axis: 'Y' };
        const bz = new THREE.Mesh(boxGeom, matZ); bz.position.set(0, 0, s * 0.6); bz.userData = { gizmo: true, type: 'scale', axis: 'Z' };
        const scaleGroup = new THREE.Object3D();
        scaleGroup.add(bx, by, bz);

        // store
        this._translateGroup = translateGroup;
        this._rotateGroup = rotateGroup;
        this._scaleGroup = scaleGroup;

        this.handles.add(translateGroup);
        this.handles.add(rotateGroup);
        this.handles.add(scaleGroup);
        this.group.add(this.handles);

        this.setMode(this._mode);
    }

    setMode(mode = 'translate') {
        this._mode = mode;
        this._translateGroup.visible = (mode === 'translate');
        this._rotateGroup.visible = (mode === 'rotate');
        this._scaleGroup.visible = (mode === 'scale');
        return this;
    }

    setVisibility(v) {
        this.group.visible = !!v;
        return this;
    }

    attach(target) {
        this._target = target;
        this.setVisibility(true);
        this.update(true);
        return this;
    }

    detach() {
        this._target = null;
        this.setVisibility(false);
        return this;
    }

    _bindEvents() {
        // capture pointerdown on domElement to prioritize gizmo handles
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this.domElement.addEventListener('pointerdown', this._onPointerDown, { capture: true });
        window.addEventListener('pointermove', this._onPointerMove);
        window.addEventListener('pointerup', this._onPointerUp);
    }

    _onPointerDown(event) {
        // Only allow left-button interactions for gizmo
        if (typeof event.button === 'number' && event.button !== 0) return;
        if (!this.group.visible) return;
        const ndc = this._getNDC(event);
        this.pointer.copy(ndc);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.handles.children, true);
        if (!intersects.length) return;

        // Prefer handles that match current mode and skip invisible parents.
        let obj = null;
        let fallback = null;
        for (let it of intersects) {
            const o = it.object;
            if (!o.userData || !o.userData.gizmo) continue;
            // ensure object and its parents are visible
            let p = o;
            let visible = true;
            while (p) {
                if (typeof p.visible === 'boolean' && !p.visible) { visible = false; break; }
                p = p.parent;
            }
            if (!visible) continue;
            // exact match with current mode takes precedence
            if (o.userData.type === this._mode) { obj = o; break; }
            if (!fallback) fallback = o;
        }
        if (!obj) obj = fallback;
        if (!obj) return;

        const sel = this._target;
        if (!sel) return;

        this._activeHandle = { mesh: obj, type: obj.userData.type, axis: obj.userData.axis };
        this._dragging = true;

        const obj3 = sel.getObject3D();
        // store start position in WORLD coordinates (important for axis math)
        this._startPosition = new THREE.Vector3();
        obj3.getWorldPosition(this._startPosition);
        this._startRotation = obj3.rotation.clone();
        this._startScale = obj3.scale.clone();

        // store start screen coords
        this._startScreen = { x: event.clientX, y: event.clientY };

        // compute starting axis parameter (u) along the gizmo axis line using the pointer ray
        const axisVec = this._axisVector(this._activeHandle.axis, obj3);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const rayOrigin = this.raycaster.ray.origin.clone();
        const rayDir = this.raycaster.ray.direction.clone();
        const closest = this._closestPointOnLineToRay(rayOrigin, rayDir, this._startPosition.clone(), axisVec.clone());
        this._startAxisParam = (closest && typeof closest.u === 'number') ? closest.u : 0;

        // for rotate, store starting intersection point on plane orthogonal to axis
        const axis = axisVec.clone();
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(axis, this._startPosition);
        const startPlanePt = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, startPlanePt);
        this._startPlanePoint = startPlanePt;

        // disable orbit while dragging
        if (this.orbitControls) this.orbitControls.enabled = false;

        // stop propagation to selection handlers
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        if (event.stopPropagation) event.stopPropagation();
    }

    _onPointerMove(event) {
        if (!this._dragging || !this._activeHandle) return;
        const ndc = this._getNDC(event);
        this.pointer.copy(ndc);
        const sel = this._target;
        if (!sel) return;
        const obj3 = sel.getObject3D();

        if (this._activeHandle.type === 'translate') {
            // Map mouse ray to closest point along the gizmo axis line, compute delta in axis param
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const rayOrigin = this.raycaster.ray.origin.clone();
            const rayDir = this.raycaster.ray.direction.clone();
            const axisVec = this._axisVector(this._activeHandle.axis, obj3);
            const closest = this._closestPointOnLineToRay(rayOrigin, rayDir, this._startPosition.clone(), axisVec.clone());
            if (closest == null) return;
            const currentU = closest.u;
            const delta = currentU - (this._startAxisParam || 0);
            const snapped = Math.round(delta / this.snap.translate) * this.snap.translate;
            const newWorldPos = this._startPosition.clone().add(axisVec.clone().multiplyScalar(snapped));
            const newLocal = newWorldPos.clone();
            if (obj3.parent) obj3.parent.worldToLocal(newLocal);
            if (this._activeHandle.axis === 'X') obj3.position.x = newLocal.x;
            if (this._activeHandle.axis === 'Y') obj3.position.y = newLocal.y;
            if (this._activeHandle.axis === 'Z') obj3.position.z = newLocal.z;
        } else if (this._activeHandle.type === 'rotate') {
            // rotate around axis: compute angle between start vector and current vector projected on plane orthogonal to axis
            const axis = this._axisVector(this._activeHandle.axis, obj3);
            // plane orthogonal to axis
            const plane = new THREE.Plane();
            plane.setFromNormalAndCoplanarPoint(axis, this._startPosition);

            // use stored start plane point and compute current intersection
            const startPt = this._startPlanePoint;
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const curPt = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(plane, curPt);
            if (!startPt || !curPt) return;
            const v1 = startPt.clone().sub(this._startPosition).normalize();
            const v2 = curPt.clone().sub(this._startPosition).normalize();
            // compute signed angle around axis
            const angle = Math.atan2(axis.clone().dot(v1.clone().cross(v2)), v1.dot(v2));
            // snap angle to snap.rotate degrees
            const angleDeg = THREE.MathUtils.radToDeg(angle);
            const snappedDeg = Math.round(angleDeg / this.snap.rotate) * this.snap.rotate;
            const snappedRad = THREE.MathUtils.degToRad(snappedDeg);
            // apply rotation relative to start rotation
            const newRot = this._startRotation.clone();
            if (this._activeHandle.axis === 'X') newRot.x = this._startRotation.x + snappedRad;
            if (this._activeHandle.axis === 'Y') newRot.y = this._startRotation.y + snappedRad;
            if (this._activeHandle.axis === 'Z') newRot.z = this._startRotation.z + snappedRad;
            obj3.rotation.copy(newRot);
        } else if (this._activeHandle.type === 'scale') {
            // map mouse ray to closest point along axis and use delta to compute scale factor
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const rayOrigin = this.raycaster.ray.origin.clone();
            const rayDir = this.raycaster.ray.direction.clone();
            const axisVec = this._axisVector(this._activeHandle.axis, obj3);
            const closest = this._closestPointOnLineToRay(rayOrigin, rayDir, this._startPosition.clone(), axisVec.clone());
            if (closest == null) return;
            const currentU = closest.u;
            const delta = currentU - (this._startAxisParam || 0);
            // interpret delta as length change -> scale factor
            let factor = 1 + delta * 0.5; // sensitivity
            factor = Math.max(0.01, factor);
            factor = Math.round(factor / this.snap.scale) * this.snap.scale;
            const newScale = this._startScale.clone();
            if (this._activeHandle.axis === 'X') newScale.x = Math.max(0.01, newScale.x * factor);
            if (this._activeHandle.axis === 'Y') newScale.y = Math.max(0.01, newScale.y * factor);
            if (this._activeHandle.axis === 'Z') newScale.z = Math.max(0.01, newScale.z * factor);
            obj3.scale.copy(newScale);
        }
    }

    _screenDeltaToWorld(screenDeltaPixels, obj3, rect, isVertical = false) {
        // Convert screen pixel delta to world units at object's distance from camera.
        const cam = this.camera;
        // world width/height at object's distance
        const world = { w: 1, h: 1 };
        const worldPos = new THREE.Vector3();
        obj3.getWorldPosition(worldPos);
        const dist = cam.position.distanceTo(worldPos);
        if (cam.isPerspectiveCamera) {
            const fovRad = cam.fov * Math.PI / 180;
            const worldH = 2 * dist * Math.tan(fovRad / 2);
            const worldW = worldH * cam.aspect;
            world.w = worldW; world.h = worldH;
        } else if (cam.isOrthographicCamera) {
            world.w = Math.abs(cam.right - cam.left);
            world.h = Math.abs(cam.top - cam.bottom);
        }
        // map pixel delta to world delta (use width reference)
        const worldPerPixelX = world.w / rect.width;
        const worldPerPixelY = world.h / rect.height;
        return screenDeltaPixels * (isVertical ? worldPerPixelY : worldPerPixelX);
    }

    _onPointerUp(/*event*/) {
        if (!this._dragging) return;
        this._dragging = false;
        this._activeHandle = null;
        if (this.orbitControls) this.orbitControls.enabled = true;
    }

    _getNDC(event) {
        const rect = this.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    _axisVector(axis, obj3) {
        const v = new THREE.Vector3();
        if (axis === 'X') v.set(1, 0, 0);
        if (axis === 'Y') v.set(0, 1, 0);
        if (axis === 'Z') v.set(0, 0, 1);
        // transform by object's world quaternion so axis aligns with object
        obj3.updateWorldMatrix(true, false);
        const q = obj3.getWorldQuaternion(new THREE.Quaternion());
        v.applyQuaternion(q);
        return v.normalize();
    }

    // runtime setters
    setScreenSize(pixels) {
        this.screenSize = Number(pixels) || this.screenSize;
        return this;
    }

    setScaleMultiplier(m) {
        this.screenScaleMultiplier = Number(m) || this.screenScaleMultiplier;
        return this;
    }

    update(forceScale = false) {
        if (!this._target) return;
        const obj = this._target.getObject3D ? this._target.getObject3D() : this._target;
        obj.updateWorldMatrix(true, false);
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        this.group.position.copy(worldPos);
        this.group.rotation.set(0, 0, 0);

        // scale gizmo so it appears roughly constant on screen based on camera distance
        const rect = this.domElement.getBoundingClientRect();
        const canvasHeight = rect.height || 1;
        const cam = this.camera;
        let desiredWorldSize = 1.0; // fallback world size if camera calculations fail
        // compute desired world-space size that corresponds to this.screenSize pixels
        try {
            if (cam.isPerspectiveCamera) {
                const dist = cam.position.distanceTo(worldPos);
                const fovRad = cam.fov * Math.PI / 180;
                const worldH = 2 * dist * Math.tan(fovRad / 2);
                const worldPerPixel = worldH / canvasHeight;
                desiredWorldSize = this.screenSize * worldPerPixel;
            } else if (cam.isOrthographicCamera) {
                const worldH = Math.abs(cam.top - cam.bottom);
                const worldPerPixel = worldH / canvasHeight;
                desiredWorldSize = this.screenSize * worldPerPixel;
            }
        } catch (e) {
            // in case camera properties are missing, fall back to size
            desiredWorldSize = this.size * UI_SCALE;
        }

        const base = 1.0;
        let scaleFactor = (desiredWorldSize / base) * (this.screenScaleMultiplier || 1.0);
        if (!isFinite(scaleFactor) || scaleFactor <= 0) scaleFactor = 1.0;
        this.group.scale.setScalar(scaleFactor);
    }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this._onPointerDown, { capture: true });
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
    }
}
