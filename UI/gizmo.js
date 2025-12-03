import * as THREE from 'three';

// Centralized configuration for important numeric literals used by the gizmo.
const GIZMO_CONFIG = {
    BASE_SIZE: 1.0,
    DEFAULT_SCREEN_SIZE: 120,
    DEFAULT_SCALE_MULTIPLIER: 1.0,

    // visuals (multipliers of BASE_SIZE)
    SHAFT_RADIUS: 0.03,
    SHAFT_LENGTH: 0.6,
    HEAD_RADIUS: 0.07,
    HEAD_HEIGHT: 0.16,
    HEAD_OFFSET: 0.73,
    SHAFT_OFFSET: 0.35,
    TORUS_RADIUS: 0.6,
    TORUS_TUBE: 0.03,
    BOX_SIZE: 0.12,
    BOX_OFFSET: 0.6,

    // geometry tessellation
    CYLINDER_SEGMENTS: 8,
    CONE_SEGMENTS: 12,
    TORUS_RADIAL_SEGMENTS: 8,
    TORUS_TUBULAR_SEGMENTS: 64,

    // interaction
    SCALE_SENSITIVITY: 0.5,
    MIN_SCALE: 0.01,
    // rotate sensitivity in degrees per pixel of vertical mouse movement
    ROTATE_SENSITIVITY: 0.5,
    // proximity-based boost: when the mouse is within ROTATE_PROXIMITY_RADIUS
    // pixels of the object's screen position, multiply sensitivity up to
    // ROTATE_PROXIMITY_BOOST (e.g. 2.0 => up to 2x sensitivity at zero distance)
    ROTATE_PROXIMITY_RADIUS: 200,
    ROTATE_PROXIMITY_BOOST: 2.0,

    // numerics
    EPSILON: 1e-6,
    DEFAULT_BASE: 1.0,
    // occlusion
    OCCLUDED_OPACITY: 0.35,
    // when object is this many times larger than gizmo size, treat as 'large'
    LARGE_OBJECT_RATIO: 10.0,

    // colors
    GIZMO_RED: 0xEE2020,
    GIZMO_GREEN: 0x20EE20,
    GIZMO_BLUE: 0x2020EE
};

export class Gizmo {
    constructor({ renderer, camera, domElement, orbitControls, snap = { translate: 1, rotate: 15, scale: 0.1 } } = {}) {
        this.renderer = renderer;
        this.camera = camera;
        this.domElement = domElement || renderer.domElement;
        this.orbitControls = orbitControls;
        // optional scene reference used for occlusion testing
        this.scene = arguments[0] && arguments[0].scene ? arguments[0].scene : null;
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
        this.screenSize = GIZMO_CONFIG.DEFAULT_SCREEN_SIZE; // pixels the gizmo should appear roughly
        this.screenScaleMultiplier = GIZMO_CONFIG.DEFAULT_SCALE_MULTIPLIER; // additional user multiplier

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
        if (Math.abs(denom) < GIZMO_CONFIG.EPSILON) {
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
        const s = GIZMO_CONFIG.BASE_SIZE; // base visual size in local gizmo units
        this.handles = new THREE.Object3D();

        // Translate arrows
        const shaftGeom = new THREE.CylinderGeometry(s * GIZMO_CONFIG.SHAFT_RADIUS, s * GIZMO_CONFIG.SHAFT_RADIUS, s * GIZMO_CONFIG.SHAFT_LENGTH, GIZMO_CONFIG.CYLINDER_SEGMENTS);
        const headGeom = new THREE.ConeGeometry(s * GIZMO_CONFIG.HEAD_RADIUS, s * GIZMO_CONFIG.HEAD_HEIGHT, GIZMO_CONFIG.CONE_SEGMENTS);
        const matX = new THREE.MeshBasicMaterial({ color: GIZMO_CONFIG.GIZMO_RED });
        const matY = new THREE.MeshBasicMaterial({ color: GIZMO_CONFIG.GIZMO_GREEN });
        const matZ = new THREE.MeshBasicMaterial({ color: GIZMO_CONFIG.GIZMO_BLUE });

        // keep track of materials so we can toggle occlusion visibility
        this._materials = [matX, matY, matZ];

        const headOffset = GIZMO_CONFIG.HEAD_OFFSET;
        const shaftOffset = GIZMO_CONFIG.SHAFT_OFFSET;
        
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
        const torusGeom = new THREE.TorusGeometry(s * GIZMO_CONFIG.TORUS_RADIUS, s * GIZMO_CONFIG.TORUS_TUBE, GIZMO_CONFIG.TORUS_RADIAL_SEGMENTS, GIZMO_CONFIG.TORUS_TUBULAR_SEGMENTS);
        const ringX = new THREE.Mesh(torusGeom, matX);
        ringX.rotation.y = Math.PI / 2; ringX.userData = { gizmo: true, type: 'rotate', axis: 'X' };
        const ringY = new THREE.Mesh(torusGeom, matY);
        ringY.rotation.x = Math.PI / 2; ringY.userData = { gizmo: true, type: 'rotate', axis: 'Y' };
        const ringZ = new THREE.Mesh(torusGeom, matZ);
        ringZ.userData = { gizmo: true, type: 'rotate', axis: 'Z' };
        const rotateGroup = new THREE.Object3D();
        rotateGroup.add(ringX, ringY, ringZ);

        // Scale boxes
        const boxGeom = new THREE.BoxGeometry(s * GIZMO_CONFIG.BOX_SIZE, s * GIZMO_CONFIG.BOX_SIZE, s * GIZMO_CONFIG.BOX_SIZE);
        const bx = new THREE.Mesh(boxGeom, matX); bx.position.set(s * GIZMO_CONFIG.BOX_OFFSET, 0, 0); bx.userData = { gizmo: true, type: 'scale', axis: 'X' };
        const by = new THREE.Mesh(boxGeom, matY); by.position.set(0, s * GIZMO_CONFIG.BOX_OFFSET, 0); by.userData = { gizmo: true, type: 'scale', axis: 'Y' };
        const bz = new THREE.Mesh(boxGeom, matZ); bz.position.set(0, 0, s * GIZMO_CONFIG.BOX_OFFSET); bz.userData = { gizmo: true, type: 'scale', axis: 'Z' };
        const scaleGroup = new THREE.Object3D();
        scaleGroup.add(bx, by, bz);

        // Overlay (transparent) visuals: duplicates of the main meshes rendered
        // on-top so the gizmo remains visible even when occluded by geometry.
        const matXOverlay = new THREE.MeshBasicMaterial({ color: GIZMO_CONFIG.GIZMO_RED, transparent: true, opacity: GIZMO_CONFIG.OCCLUDED_OPACITY, depthTest: false, depthWrite: false });
        const matYOverlay = new THREE.MeshBasicMaterial({ color: GIZMO_CONFIG.GIZMO_GREEN, transparent: true, opacity: GIZMO_CONFIG.OCCLUDED_OPACITY, depthTest: false, depthWrite: false });
        const matZOverlay = new THREE.MeshBasicMaterial({ color: GIZMO_CONFIG.GIZMO_BLUE, transparent: true, opacity: GIZMO_CONFIG.OCCLUDED_OPACITY, depthTest: false, depthWrite: false });

        const overlayTranslate = new THREE.Object3D();
        const shaftX_o = shaftX.clone(); shaftX_o.material = matXOverlay; shaftX_o.userData = { gizmo: false }; shaftX_o.renderOrder = 999;
        const headX_o = headX.clone(); headX_o.material = matXOverlay; headX_o.userData = { gizmo: false }; headX_o.renderOrder = 999;
        const shaftY_o = shaftY.clone(); shaftY_o.material = matYOverlay; shaftY_o.userData = { gizmo: false }; shaftY_o.renderOrder = 999;
        const headY_o = headY.clone(); headY_o.material = matYOverlay; headY_o.userData = { gizmo: false }; headY_o.renderOrder = 999;
        const shaftZ_o = shaftZ.clone(); shaftZ_o.material = matZOverlay; shaftZ_o.userData = { gizmo: false }; shaftZ_o.renderOrder = 999;
        const headZ_o = headZ.clone(); headZ_o.material = matZOverlay; headZ_o.userData = { gizmo: false }; headZ_o.renderOrder = 999;
        overlayTranslate.add(shaftX_o, headX_o, shaftY_o, headY_o, shaftZ_o, headZ_o);

        const overlayRotate = new THREE.Object3D();
        const ringX_o = ringX.clone(); ringX_o.material = matXOverlay; ringX_o.userData = { gizmo: false }; ringX_o.renderOrder = 999;
        const ringY_o = ringY.clone(); ringY_o.material = matYOverlay; ringY_o.userData = { gizmo: false }; ringY_o.renderOrder = 999;
        const ringZ_o = ringZ.clone(); ringZ_o.material = matZOverlay; ringZ_o.userData = { gizmo: false }; ringZ_o.renderOrder = 999;
        overlayRotate.add(ringX_o, ringY_o, ringZ_o);

        const overlayScale = new THREE.Object3D();
        const bx_o = bx.clone(); bx_o.material = matXOverlay; bx_o.userData = { gizmo: false }; bx_o.renderOrder = 999;
        const by_o = by.clone(); by_o.material = matYOverlay; by_o.userData = { gizmo: false }; by_o.renderOrder = 999;
        const bz_o = bz.clone(); bz_o.material = matZOverlay; bz_o.userData = { gizmo: false }; bz_o.renderOrder = 999;
        overlayScale.add(bx_o, by_o, bz_o);

        const overlayGroup = new THREE.Object3D();
        overlayGroup.name = 'GizmoOverlay';
        overlayGroup.add(overlayTranslate, overlayRotate, overlayScale);
        overlayGroup.renderOrder = 999;

        // remember overlay materials so they can be tweaked if needed
        this._overlayMaterials = [matXOverlay, matYOverlay, matZOverlay];

        // expose overlay groups so we can toggle visibility per-mode
        this._overlayTranslate = overlayTranslate;
        this._overlayRotate = overlayRotate;
        this._overlayScale = overlayScale;
        this._overlayGroup = overlayGroup;

        // store
        this._translateGroup = translateGroup;
        this._rotateGroup = rotateGroup;
        this._scaleGroup = scaleGroup;

        this.handles.add(translateGroup);
        this.handles.add(rotateGroup);
        this.handles.add(scaleGroup);
        this.group.add(this.handles);
        // add overlay as a sibling under the same group so it shares transforms
        this.group.add(overlayGroup);

        this.setMode(this._mode);
    }

    setMode(mode = 'translate') {
        this._mode = mode;
        this._translateGroup.visible = (mode === 'translate');
        this._rotateGroup.visible = (mode === 'rotate');
        this._scaleGroup.visible = (mode === 'scale');
        // mirror visibility for overlay groups so only the current mode's
        // opaque + overlay meshes are shown together.
        if (this._overlayTranslate) this._overlayTranslate.visible = (mode === 'translate');
        if (this._overlayRotate) this._overlayRotate.visible = (mode === 'rotate');
        if (this._overlayScale) this._overlayScale.visible = (mode === 'scale');
        // refresh orientation/visibility immediately when mode changes
        if (this._target) this.update(true);
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
            const axisVec = this._axisToVector(this._activeHandle.axis);
            const closest = this._closestPointOnLineToRay(rayOrigin, rayDir, this._startPosition.clone(), axisVec.clone());
            if (closest == null) return;
            const currentU = closest.u;
            const delta = currentU - (this._startAxisParam || 0);
            const snapped = Math.round(delta / this.snap.translate) * this.snap.translate;
            const newWorldPos = this._startPosition.clone().add(axisVec.clone().multiplyScalar(snapped));
            const newLocal = newWorldPos.clone();
            if (obj3.parent) obj3.parent.worldToLocal(newLocal);
            console.log('Gizmo axis move:', this._activeHandle.axis, 
                ' axisVec=', axisVec,
                ' delta=', delta, 
                ' snapped=', snapped, 
                ' newWorld=', newWorldPos, 
                ' newLocal=', newLocal);
            if (this._activeHandle.axis === 'X') obj3.position.x = newLocal.x;
            if (this._activeHandle.axis === 'Y') obj3.position.y = newLocal.y;
            if (this._activeHandle.axis === 'Z') obj3.position.z = newLocal.z;
        } else if (this._activeHandle.type === 'rotate') {
            // rotate mapping: use vertical mouse movement only (delta Y) mapped to
            // degrees via ROTATE_SENSITIVITY. Additionally scale the sensitivity
            // based on how close the mouse is to the object's screen position
            // so moving the mouse near the object produces larger rotation.
            // deltaY: positive when moving mouse down, negative when moving up.
            const deltaY = (event && typeof event.clientY === 'number') ? (event.clientY - (this._startScreen ? this._startScreen.y : 0)) : 0;

            // compute proximity factor: project object's world pos to screen
            // and measure pixel distance between mouse and object center.
            let proximityFactor = 1.0;
            try {
                const rect = this.domElement.getBoundingClientRect();
                const objWorld = new THREE.Vector3();
                obj3.getWorldPosition(objWorld);
                const ndc = objWorld.clone().project(this.camera);
                const screenX = ((ndc.x + 1) / 2) * rect.width + rect.left;
                const screenY = ((-ndc.y + 1) / 2) * rect.height + rect.top;
                const dx = (event.clientX - screenX);
                const dy = (event.clientY - screenY);
                const dist = Math.sqrt(dx * dx + dy * dy);
                const radius = GIZMO_CONFIG.ROTATE_PROXIMITY_RADIUS || 200;
                const boost = GIZMO_CONFIG.ROTATE_PROXIMITY_BOOST || 2.0;
                if (dist < radius && radius > 0) {
                    const t = 1 - (dist / radius); // 0..1 (1 when exactly on target)
                    proximityFactor = 1 + t * (boost - 1);
                }
            } catch (e) {
                proximityFactor = 1.0;
            }

            // map to degrees (invert sign so upward movement = positive rotation)
            const baseSensitivity = (GIZMO_CONFIG.ROTATE_SENSITIVITY || 0.5);
            const angleDeg = -deltaY * baseSensitivity * proximityFactor;
            const snappedDeg = Math.round(angleDeg / this.snap.rotate) * this.snap.rotate;
            const snappedRad = THREE.MathUtils.degToRad(snappedDeg);
            const newRot = this._startRotation.clone();
            console.log('Gizmo rotate:', this._activeHandle.axis,
                ' deltaY=', deltaY,
                ' proximityFactor=', proximityFactor,
                ' angleDeg=', angleDeg,
                ' snappedDeg=', snappedDeg);
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
            let factor = 1 + delta * GIZMO_CONFIG.SCALE_SENSITIVITY; // sensitivity
            factor = Math.max(GIZMO_CONFIG.MIN_SCALE, factor);
            factor = Math.round(factor / this.snap.scale) * this.snap.scale;
            const newScale = this._startScale.clone();
            if (this._activeHandle.axis === 'X') newScale.x = Math.max(GIZMO_CONFIG.MIN_SCALE, newScale.x * factor);
            if (this._activeHandle.axis === 'Y') newScale.y = Math.max(GIZMO_CONFIG.MIN_SCALE, newScale.y * factor);
            if (this._activeHandle.axis === 'Z') newScale.z = Math.max(GIZMO_CONFIG.MIN_SCALE, newScale.z * factor);
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

    _axisToVector(axis) {
        const v = new THREE.Vector3();
        if (axis === 'X') v.set(1, 0, 0);
        if (axis === 'Y') v.set(0, 1, 0);
        if (axis === 'Z') v.set(0, 0, 1);
        return v;
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

    setCamera(camera) {
        this.camera = camera;
        return this;
    }

    update(forceScale = false) {
        if (!this._target) return;
        const obj = this._target.getObject3D ? this._target.getObject3D() : this._target;
        obj.updateWorldMatrix(true, false);
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        this.group.position.copy(worldPos);
        // By default keep the gizmo aligned to world axes. When in `scale` mode
        // align the gizmo to the target's world quaternion so the scale handles
        // follow the target's local coordinate system.
        if (this._mode === 'scale') {
            const q = obj.getWorldQuaternion(new THREE.Quaternion());
            this.group.quaternion.copy(q);
        } else {
            this.group.rotation.set(0, 0, 0);
        }

        let desiredWorldSize = 1.0; // fallback world size if camera calculations fail

        // Note: overlay meshes are always present (added during _createVisuals)
        // and rendered on-top (depthTest=false). No per-frame occlusion toggling
        // is required here.

        // scale gizmo so it appears roughly constant on screen based on camera distance
        const rect = this.domElement.getBoundingClientRect();
        const canvasHeight = rect.height || 1;
        const cam = this.camera;
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
            desiredWorldSize = GIZMO_CONFIG.DEFAULT_BASE;
        }

        const base = GIZMO_CONFIG.DEFAULT_BASE;
        let scaleFactor = (desiredWorldSize / base) * (this.screenScaleMultiplier || GIZMO_CONFIG.DEFAULT_SCALE_MULTIPLIER);
        if (!isFinite(scaleFactor) || scaleFactor <= 0) scaleFactor = 1.0;
        this.group.scale.setScalar(scaleFactor);
    }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this._onPointerDown, { capture: true });
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
    }
}
