// Assuming THREE and GLTFLoader are available (either globally or via imports)
const gltfLoader = new THREE.GLTFLoader();

// --- Data Structure ---
// Defines available models for each category
const showroomAssetConfig = {
    towels: [
        // The first swappable:true item will be loaded initially
        { name: 'Test1 (Initial)', url: 'models/hand_towel.glb', position: [1.5, 0, 0], scale: [1, 1, 1], swappable: true },
        // These will NOT be loaded initially, only when selected from sidebar
        { name: 'Test2', url: 'models/bathrobe.glb', position: [1.5, 0, 0], scale: [1, 1, 1], swappable: true },
        { name: 'Test3', url: 'models/towels.glb', position: [1.5, 0, 0], scale: [1, 1, 1], swappable: true },
        // This static item will NOT be loaded initially with the new logic
        // { name: 'Towel Stack', url: 'models/hanging_towel.glb', position: [2.5, 0, 0.5], scale: [0.5, 0.5, 0.5], swappable: false },
    ],
    // Add other categories back if needed, following the same pattern
    /*
    bathrobes: [ ... ],
    accessories: [ ... ]
    */
};

// --- State Variable ---
let currentSwappableModel = {
    model: null, // Reference to the THREE.Object3D
    configUrl: null // URL of the config used to load it
};
// otherLoadedAssets will remain empty with the new loadInitialAssets logic unless static items are loaded elsewhere
let otherLoadedAssets = [];

// --- Helper Function for Disposal ---
function disposeModel(model) {
    if (!model) return;
    model.traverse(child => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(disposeMaterial);
                else disposeMaterial(child.material);
            }
        }
    });
}
function disposeMaterial(material) {
    material.dispose();
    for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value === 'object' && value.isTexture) value.dispose();
    }
}

/** Clears the currently loaded swappable model and any other tracked assets. */
function clearAllAssets(scene) {
    console.log("AssetLoader: Clearing all tracked assets and disposing resources.");
    if (currentSwappableModel.model) {
        scene.remove(currentSwappableModel.model);
        disposeModel(currentSwappableModel.model);
        currentSwappableModel.model = null;
        currentSwappableModel.configUrl = null;
    }
    // Clear static assets too, though this array will likely be empty now
    otherLoadedAssets.forEach(asset => {
        scene.remove(asset);
        disposeModel(asset);
    });
    otherLoadedAssets = [];
    console.log("AssetLoader: All tracked assets cleared.");
}

// --- *** MODIFIED loadInitialAssets Function *** ---
/**
 * Loads ONLY the FIRST swappable asset found for the given sceneId.
 * Sets the camera to view this initial asset more closely.
 * @param {string} sceneId
 * @param {THREE.Scene} scene
 * @param {THREE.PerspectiveCamera} camera - The main camera
 * @param {THREE.OrbitControls} controls - The orbit controls instance
 */
function loadInitialAssets(sceneId, scene, camera, controls) { // <-- Added camera, controls
    if (!scene || !camera || !controls) { // <-- Added checks
        console.error("AssetLoader: Scene, Camera, and Controls required for loadInitialAssets.");
        return;
    }
    clearAllAssets(scene); // Ensure clean state

    const assetsInCategory = showroomAssetConfig[sceneId];
    if (!assetsInCategory || assetsInCategory.length === 0) {
        console.warn(`AssetLoader: No asset configuration found for sceneId: ${sceneId}`);
        return;
    }

    const initialSwappableConfig = assetsInCategory.find(config => config.swappable === true);

    if (initialSwappableConfig) {
        console.log(`AssetLoader: Found initial swappable asset for ${sceneId}: "${initialSwappableConfig.name}". Loading ONLY this model...`);

        gltfLoader.load(
            initialSwappableConfig.url,
            (gltf) => { // onLoad
                const model = gltf.scene;
                console.log(`AssetLoader: Loaded initial model "${initialSwappableConfig.name}" (${initialSwappableConfig.url})`);
                applyConfigToModel(model, initialSwappableConfig);
                scene.add(model);

                currentSwappableModel.model = model;
                currentSwappableModel.configUrl = initialSwappableConfig.url;
                console.log(`AssetLoader: Initial swappable model set: ${initialSwappableConfig.name}`);

                // --- START: Set Initial Camera View ---
                const modelPos = initialSwappableConfig.position; // e.g., [1.5, 0, 0]
                const targetYOffset = 0.6; // Look slightly above the model's base position
                const cameraDistance = 2.0; // How far back the camera should be
                const cameraHeightOffset = 1.0; // How much higher the camera should be than the target

                // Set the point OrbitControls looks at
                controls.target.set(
                    modelPos[0],
                    modelPos[1] + targetYOffset,
                    modelPos[2]
                );

                // Set the camera's position relative to the model
                camera.position.set(
                    modelPos[0],                         // Same X as model
                    modelPos[1] + cameraHeightOffset,    // Higher Y than model base
                    modelPos[2] + cameraDistance         // Z position behind the model
                );

                controls.update(); // IMPORTANT: Apply the new target and position
                console.log(`AssetLoader: Camera position adjusted for initial model.`);
                // --- END: Set Initial Camera View ---

            },
            undefined, // onProgress
            (error) => {
                console.error(`AssetLoader: ERROR loading initial swappable model "${initialSwappableConfig.name}" (${initialSwappableConfig.url}):`, error);
                currentSwappableModel.model = null;
                currentSwappableModel.configUrl = null;
            }
        );

    } else {
        console.warn(`AssetLoader: No 'swappable: true' assets found for initial load in sceneId: ${sceneId}. Scene will be empty initially.`);
        // Ensure state is clear if nothing was found to load
        currentSwappableModel.model = null;
        currentSwappableModel.configUrl = null;
    }

    // Static assets (swappable: false) and other swappable assets are intentionally NOT loaded by this function.
    // The otherLoadedAssets array will remain empty unless static items are loaded via a different mechanism.
}
// --- *** END MODIFIED loadInitialAssets Function *** ---


/** Swaps the current swappable model with a new one (loads on demand). */
function swapModel(newModelConfigUrl, sceneId, scene) {
    // --- This function remains unchanged ---
    if (!scene) { console.error("AssetLoader: Scene required for swapModel."); return; }
    if (currentSwappableModel.configUrl === newModelConfigUrl) { console.log("AssetLoader: Model already displayed."); return; }

    const categoryConf = showroomAssetConfig[sceneId];
    if (!categoryConf) { console.error(`AssetLoader: No category config for sceneId: ${sceneId}`); return; }
    const newModelConfig = categoryConf.find(conf => conf.url === newModelConfigUrl && conf.swappable);
    if (!newModelConfig) { console.error(`AssetLoader: Swappable config not found for URL: ${newModelConfigUrl}`); return; }

    console.log(`AssetLoader: Swapping to: ${newModelConfig.name} (${newModelConfigUrl})`);

    // 1. Remove and Dispose the old model
    if (currentSwappableModel.model) {
        scene.remove(currentSwappableModel.model);
        disposeModel(currentSwappableModel.model);
        currentSwappableModel.model = null;
        currentSwappableModel.configUrl = null;
    } else {
        console.warn("AssetLoader: No current swappable model found to remove during swap.");
    }

    // 2. Load the new model
    gltfLoader.load(
        newModelConfig.url,
        (gltf) => { // onLoad
            const newModel = gltf.scene;
            console.log(`AssetLoader: Loaded new swappable model "${newModelConfig.