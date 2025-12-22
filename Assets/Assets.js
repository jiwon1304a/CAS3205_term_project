/* ======================================================
   BASIC SETUP
====================================================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(45, 30, 45);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 4, 0);

/* ======================================================
   STUDIO LIGHTING (PRODUCT RENDER STYLE)
====================================================== */
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
keyLight.position.set(4, 5, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
fillLight.position.set(-3, 2, 4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
rimLight.position.set(-3, 3, -4);
scene.add(rimLight);

/* ======================================================
   GROUND (SHADOW RECEIVER)
====================================================== */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

/* ======================================================
   MATERIALS
====================================================== */
const matBlackMetal = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.45,
  metalness: 0.65,
});

const matSilver = new THREE.MeshStandardMaterial({
  color: 0xcfd3d6,
  roughness: 0.2,
  metalness: 0.9,
});

const matPlastic = new THREE.MeshStandardMaterial({
  color: 0x1b1b1b,
  roughness: 0.75,
  metalness: 0.1,
});

const matLens = new THREE.MeshPhysicalMaterial({
  color: 0xffe066,
  emissive: 0xffe066,
  emissiveIntensity: 1.4,
  roughness: 0.05,
  transmission: 0.9,
  thickness: 0.25,
  ior: 1.45,
});

const matPCB = new THREE.MeshStandardMaterial({
  color: 0xf7f5e6,
  roughness: 0.8,
});

const matLED = new THREE.MeshStandardMaterial({
  color: 0xffff99,
  emissive: 0xffff99,
  emissiveIntensity: 2.0,
});

const matConcrete = new THREE.MeshStandardMaterial({
  color: 0x4e4e4e,
  roughness: 0.85,
  metalness: 0.08,
  side: THREE.DoubleSide,
});

const matRoof = new THREE.MeshStandardMaterial({
  color: 0x3a3a3a,
  roughness: 0.65,
  metalness: 0.25,
  side: THREE.DoubleSide,
});

const matGlass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  roughness: 0.1,
  transmission: 0.9,
  transparent: true,
  opacity: 0.25,
  metalness: 0.05,
  thickness: 0.02,
  side: THREE.DoubleSide,
});

const matPot = new THREE.MeshStandardMaterial({
  color: 0x7a5a3a,
  roughness: 0.9,
  metalness: 0.05,
});

const matSoil = new THREE.MeshStandardMaterial({
  color: 0x5a3b26,
  roughness: 1.0,
  metalness: 0.02,
});

const matLeaf = new THREE.MeshStandardMaterial({
  color: 0x2f9b48,
  roughness: 0.7,
  metalness: 0.08,
  side: THREE.DoubleSide,
});

const matTomato = new THREE.MeshStandardMaterial({
  color: 0xe03221,
  emissive: 0x7a140c,
  emissiveIntensity: 0.35,
  roughness: 0.25,
  metalness: 0.08,
});

const matFloor = new THREE.MeshStandardMaterial({
  color: 0x555555, // darker neutral gray floor
  roughness: 0.85,
  metalness: 0.02,
});

/* ======================================================
   PENDANT LIGHT FACTORY
====================================================== */
function createPendantLight() {
  const light = new THREE.Group();

  /* ---- TOP DRIVER HOUSING ---- */
  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.72, 0.18, 64), // trapezoid: wider base for a lighting bezel feel
    matPlastic
  );
  topCap.position.y = 0.34;
  topCap.castShadow = true;
  light.add(topCap);

  /* ---- MAIN BODY (SMOOTH ROUND) ---- */
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.09, 96),
    matBlackMetal
  );
  body.position.y = 0.48;
  body.castShadow = true;
  light.add(body);

  /* ---- LED PCB ---- */
  const pcbY = 0.24; // bring PCB back down so it remains visible at the base
  const pcb = new THREE.Mesh(new THREE.CircleGeometry(0.48, 96), matPCB);
  pcb.rotation.x = -Math.PI / 2;
  pcb.position.y = pcbY;
  light.add(pcb);

  /* ---- LED DOT PATTERN ---- */
  for (let r = 0.12; r < 0.45; r += 0.07) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const led = new THREE.Mesh(new THREE.CircleGeometry(0.01, 12), matLED);
      led.position.set(Math.cos(a) * r, pcbY - 0.002, Math.sin(a) * r);
      led.rotation.x = -Math.PI / 2;
      light.add(led);
    }
  }

  /* ---- DIFFUSER LENS ---- */
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.04, 96),
    matLens
  );
  lens.position.y = 0.22; // slight protrusion so the lens is visible
  light.add(lens);

  /* ---- HANGING RING (DIRECT ATTACH) ---- */
  const hook = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.015, 20, 100),
    matSilver
  );
  hook.rotation.set(0, Math.PI / 2, 0); // stand ring up so its circle is visible from the side
  hook.position.y = 0.62;
  light.add(hook);

  return light;
}

function createTomatoPlant() {
  const plant = new THREE.Group();

  // pot
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.85, 0.65, 32),
    matPot
  );
  pot.position.y = 0.32;
  pot.rotation.x = Math.PI; // flip the pot upside down
  pot.castShadow = true;
  pot.receiveShadow = true;
  plant.add(pot);

  // soil
  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.65, 0.16, 32),
    matSoil
  );
  soil.position.y = 0.68;
  soil.castShadow = true;
  soil.receiveShadow = true;
  plant.add(soil);

  // helpers
  function addLeafCluster(origin, angle, scale = 1) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const spread = -0.15 + 0.15 * i;
      const leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32 * scale, 0.16 * scale),
        matLeaf
      );
      leaf.position.set(
        origin.x + Math.sin(angle) * spread,
        origin.y + 0.02 * i,
        origin.z + Math.cos(angle) * spread
      );
      leaf.rotation.set(-Math.PI / 7, angle + spread, 0);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      plant.add(leaf);
    }
  }

  function addTomatoCluster(origin, angle, count = 2, baseSize = 0.14) {
    for (let i = 0; i < count; i++) {
      const size = baseSize + (i % 2) * 0.02;
      const fruit = new THREE.Mesh(
        new THREE.SphereGeometry(size, 22, 22),
        matTomato
      );
      const offset = 0.08 + i * 0.07;
      fruit.position.set(
        origin.x + Math.sin(angle) * offset,
        origin.y - 0.04 * i,
        origin.z + Math.cos(angle) * offset
      );
      fruit.castShadow = true;
      fruit.receiveShadow = true;
      plant.add(fruit);

      const pedicel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.018, 0.06, 8),
        matLeaf
      );
      pedicel.position.set(
        fruit.position.x,
        fruit.position.y + size + 0.03,
        fruit.position.z
      );
      pedicel.castShadow = true;
      plant.add(pedicel);
    }
  }

  // main stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 1.6, 16),
    matLeaf
  );
  stem.position.y = 1.1;
  stem.castShadow = true;
  plant.add(stem);

  // nodes for branches/leaves/fruits
  const nodes = 7;
  for (let i = 0; i < nodes; i++) {
    const y = 0.75 + (i / (nodes - 1)) * 1.1;
    const angle = (i % 2 === 0 ? 1 : -1) * (Math.PI / 4 + i * 0.1);
    const len = 0.75 + 0.08 * i;

    // branch
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.055, len, 14),
      matLeaf
    );
    branch.position.y = y;
    branch.rotation.z = angle;
    branch.castShadow = true;
    branch.receiveShadow = true;
    plant.add(branch);

    const tip = new THREE.Vector3(
      Math.sin(angle) * len,
      y + 0.02,
      Math.cos(angle) * len
    );

    addLeafCluster(tip, angle, 1.1);
    addLeafCluster(
      new THREE.Vector3(
        Math.sin(angle) * len * 0.45,
        y + 0.05,
        Math.cos(angle) * len * 0.45
      ),
      angle + 0.25,
      0.9
    );

    addTomatoCluster(
      new THREE.Vector3(
        Math.sin(angle) * (len * 0.8),
        y - 0.05,
        Math.cos(angle) * (len * 0.8)
      ),
      angle,
      2 + (i % 2),
      0.15
    );
  }

  // stem-side leaves for background density
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const y = 0.8 + t * 1.0;
    const ang = (i % 2 === 0 ? 1 : -1) * (Math.PI / 5 + 0.15 * (i % 3));
    addLeafCluster(
      new THREE.Vector3(Math.sin(ang) * 0.18, y, Math.cos(ang) * 0.18),
      ang,
      0.9
    );
  }

  // crown leaves and fruits
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18), matLeaf);
    leaf.position.set(Math.cos(angle) * 0.35, 2.1, Math.sin(angle) * 0.35);
    leaf.rotation.set(-Math.PI / 6, angle, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    plant.add(leaf);

    if (i % 3 === 0) {
      const tomato = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 22, 22),
        matTomato
      );
      tomato.position.set(Math.cos(angle) * 0.42, 1.95, Math.sin(angle) * 0.42);
      tomato.castShadow = true;
      tomato.receiveShadow = true;
      plant.add(tomato);
    }
  }

  return plant;
}

/* ======================================================
   HOUSE & LIGHT LAYOUT
====================================================== */
const house = new THREE.Group();
scene.add(house);

// Edit ghWidth/ghDepth first to resize the overall footprint; roof/walls/floor follow automatically
const ghWidth = 60.0; 
const ghDepth = 40.0; 
const wallHeight = 12.0; 
const roofHeight = 6.0;
const ridgeHeight = wallHeight + roofHeight;
const wallThk = 0.3;
const doorWidth = 5.0;
const doorHeight = 8.0;
const doorThk = 0.08;

function addWall(w, h, d, position) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matConcrete);
  wall.position.set(position.x, position.y, position.z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  house.add(wall);
}

function addRoofPanel(side, material) {
  const positions =
    side === "left"
      ? [
          -ghWidth / 2,
          wallHeight,
          -ghDepth / 2,
          0,
          ridgeHeight,
          -ghDepth / 2,
          0,
          ridgeHeight,
          ghDepth / 2,
          -ghWidth / 2,
          wallHeight,
          -ghDepth / 2,
          0,
          ridgeHeight,
          ghDepth / 2,
          -ghWidth / 2,
          wallHeight,
          ghDepth / 2,
        ]
      : [
          ghWidth / 2,
          wallHeight,
          -ghDepth / 2,
          ghWidth / 2,
          wallHeight,
          ghDepth / 2,
          0,
          ridgeHeight,
          ghDepth / 2,
          ghWidth / 2,
          wallHeight,
          -ghDepth / 2,
          0,
          ridgeHeight,
          ghDepth / 2,
          0,
          ridgeHeight,
          -ghDepth / 2,
        ];
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  const roof = new THREE.Mesh(geom, material);
  roof.castShadow = true;
  roof.receiveShadow = true;
  house.add(roof);
}

// Walls (front segmented with doorway, back, left, right)
const sideSpan = (ghWidth - doorWidth) / 2;
addWall(sideSpan, wallHeight, wallThk, {
  x: -doorWidth / 2 - sideSpan / 2,
  y: wallHeight / 2,
  z: ghDepth / 2 - wallThk / 2,
});
addWall(sideSpan, wallHeight, wallThk, {
  x: doorWidth / 2 + sideSpan / 2,
  y: wallHeight / 2,
  z: ghDepth / 2 - wallThk / 2,
});
// lintel above door opening
addWall(doorWidth, wallHeight - doorHeight, wallThk, {
  x: 0,
  y: doorHeight + (wallHeight - doorHeight) / 2,
  z: ghDepth / 2 - wallThk / 2,
});
addWall(ghWidth, wallHeight, wallThk, {
  x: 0,
  y: wallHeight / 2,
  z: -ghDepth / 2 + wallThk / 2,
});
addWall(wallThk, wallHeight, ghDepth, {
  x: -ghWidth / 2 + wallThk / 2,
  y: wallHeight / 2,
  z: 0,
});
// right wall transparent to show interior
const rightWall = new THREE.Mesh(
  new THREE.BoxGeometry(wallThk, wallHeight, ghDepth),
  matGlass
);
rightWall.position.set(ghWidth / 2 - wallThk / 2, wallHeight / 2, 0);
house.add(rightWall);

// Gable triangles
const gableGeom = new THREE.BufferGeometry();
gableGeom.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      -ghWidth / 2,
      wallHeight,
      0,
      ghWidth / 2,
      wallHeight,
      0,
      0,
      ridgeHeight,
      0,
    ],
    3
  )
);
gableGeom.computeVertexNormals();
const gableFront = new THREE.Mesh(gableGeom, matConcrete);
gableFront.position.z = ghDepth / 2 - wallThk / 2;
gableFront.castShadow = true;
gableFront.receiveShadow = true;
house.add(gableFront);
const gableBack = gableFront.clone();
gableBack.position.z = -ghDepth / 2 + wallThk / 2;
house.add(gableBack);

// Roof panels
addRoofPanel("left", matRoof);
addRoofPanel("right", matGlass);

// Frames along the opaque left wall, climbing toward the ridge (visible inside & outside)
function addWallFrame(z) {
  const frameRadius = 0.08;
  const xInside = -ghWidth / 2 + wallThk - frameRadius * 0.5;
  const xOutside = -ghWidth / 2 - frameRadius * 0.5;

  [xInside, xOutside].forEach((xPos) => {
    // vertical post
    const vertical = new THREE.Mesh(
      new THREE.CylinderGeometry(frameRadius, frameRadius, wallHeight, 18),
      matBlackMetal
    );
    vertical.position.set(xPos, wallHeight / 2, z);
    vertical.castShadow = true;
    vertical.receiveShadow = true;
    house.add(vertical);

    // sloped member following the gable roof toward the ridge
    const start = new THREE.Vector3(xPos, wallHeight, z);
    const end = new THREE.Vector3(0, ridgeHeight, z);
    const length = start.distanceTo(end);
    const slope = new THREE.Mesh(
      new THREE.CylinderGeometry(
        frameRadius * 0.9,
        frameRadius * 0.9,
        length,
        18
      ),
      matBlackMetal
    );
    slope.position.copy(start).add(end).multiplyScalar(0.5);
    slope.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.clone().sub(start).normalize()
    );
    slope.castShadow = true;
    slope.receiveShadow = true;
    house.add(slope);
  });
}

const frameCount = 2;
for (let i = 0; i < frameCount; i++) {
  const t = (i + 1) / (frameCount + 1); // even spacing away from edges
  const z = THREE.MathUtils.lerp(
    -ghDepth / 2 + wallThk,
    ghDepth / 2 - wallThk,
    t
  );
  addWallFrame(z);
}

// Floor slab
const floorThk = 0.3;
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(ghWidth, floorThk, ghDepth),
  matFloor
);
floor.position.y = floorThk / 2;
floor.receiveShadow = true;
house.add(floor);

// Five pendant lights along the ridge, hung by a short cord
const lightCount = 5;
const edgeClearance = 1.2; // pull end lights fully inside the house
const startZ = -ghDepth / 2 + edgeClearance;
const endZ = ghDepth / 2 - edgeClearance;
for (let i = 0; i < lightCount; i++) {
  const t = lightCount === 1 ? 0.5 : i / (lightCount - 1);
  const z = THREE.MathUtils.lerp(startZ, endZ, t);
  const cordLength = 0.1; // short run from ridge to pendant ring
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, cordLength, 12),
    matBlackMetal
  );
  cord.position.set(0, ridgeHeight - cordLength / 2, z);
  house.add(cord);

  const fixture = createPendantLight();
  fixture.position.set(0, ridgeHeight - (cordLength + 0.62), z); // align hook (y=0.62) to cord end
  house.add(fixture);
}

// Tomato plants grid (approx 100 plants)
const rows = 8;
const cols = 12;
const xSpacing = 4.0;
const zSpacing = 4.0;

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const plant = createTomatoPlant();
    plant.scale.set(2.31, 2.31, 2.31);
    
    // Center the grid
    const x = (c - (cols - 1) / 2) * xSpacing;
    const z = (r - (rows - 1) / 2) * zSpacing;
    
    plant.position.set(x, 0.28, z);
    house.add(plant);
  }
}

/* ======================================================
   RENDER LOOP
====================================================== */
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

/* ======================================================
   RESIZE
====================================================== */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
