import { App } from './Core/App.js';
import { World } from './Core/World.js';
import { Interaction } from './Core/Interaction.js';
import { UIManager } from './Core/UIManager.js';

// 1. Initialize App (Renderer, Scene, Camera, Loop)
const app = new App();

// 2. Initialize World (Scene Content: Floor, Skybox, etc.)
const world = new World(app.scene);
world.init();
app.setWorld(world);

// 3. Initialize Interaction (Raycaster, Gizmo, Selection)
const interaction = new Interaction(app);

// 4. Initialize UI (GUI, Controls)
const uiManager = new UIManager(app, world, interaction);

// 6. Start Loop
app.start();
