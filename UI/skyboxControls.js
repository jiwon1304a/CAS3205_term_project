// Deprecated: Skybox controls removed in favor of generic object controls.
// This file has been cleared. Use `initObjectControls` in `UI/objectControls.js`
// for generic object editing. Calling the old skybox-specific API will throw
// so imports using it fail loudly and prompt migration.
export function initSkyboxControls() {
    throw new Error('initSkyboxControls has been removed. Use initObjectControls instead.');
}
