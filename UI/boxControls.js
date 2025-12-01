// Deprecated: Box controls removed in favor of generic object controls.
// This file has been cleared. Use `initObjectControls` in `UI/objectControls.js`
// for generic object editing. Calling the old box-specific API will throw
// so imports using it fail loudly and prompt migration.
export function initBoxControls() {
    throw new Error('initBoxControls has been removed. Use initObjectControls instead.');
}
