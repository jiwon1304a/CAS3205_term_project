import { App } from './Core/App.js';
import { World } from './Core/World.js';
import { Interaction } from './Core/Interaction.js';
import { UIManager } from './Core/UIManager.js';

// 1. Initialize App (Renderer, Scene, Camera, Loop)
const app = new App();

// 2. Initialize World (Scene Content: Floor, Skybox, etc.)
const world = new World(app.scene);
world.init();

// 3. Initialize Interaction (Raycaster, Gizmo, Selection)
const interaction = new Interaction(app);

// 4. Initialize UI (GUI, Controls)
const uiManager = new UIManager(app, world, interaction);

// 5. Create initial objects
const myBox = world.createBox({ 
    width: 4, height: 2, depth: 2, 
    color: 0x0077ff, 
    position: { x: 0, y: 3, z: 0 } 
});

// Select initial object
interaction.select(myBox);

// 6. Start Loop
app.start();
