// Centralized settings for lights and shadows
export const SHADOW = {
    // shadow map resolution (width and height)
    mapSize: 4096,
    // half-size for directional light orthographic shadow camera (produces -size..+size)
    dirCameraHalfSize: 200,
    // near / far for directional light shadow camera
    dirNear: 0.5,
    dirFar: 200,
    // a small bias to reduce shadow acne (tweak per-scene)
    bias: -0.001
};

// Defaults for various lights (kept small; expand as needed)
export const LIGHT_DEFAULTS = {
    directional: {
        castShadow: true,
        intensity: 1.0
    },
    spot: {
        castShadow: true,
        mapSize: 2048
    },
    point: {
        castShadow: true,
        mapSize: 1024
    }
};

export default {
    SHADOW,
    LIGHT_DEFAULTS
};
