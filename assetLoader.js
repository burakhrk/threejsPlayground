// Assuming THREE and GLTFLoader are available (either globally or via imports)
const gltfLoader = new THREE.GLTFLoader();

// --- Data Structure ---
// Defines available models for each category
const showroomAssetConfig = {
    towels: [
        { name: 'Basic Towel Rack', url: 'models/hand_towel.glb', position: [1.5, 0, 0], scale: [1, 1, 1], swappable: true },
        { name: 'Towel Stack', url: 'models/hanging_towel.glb', position: [2.5, 0, 0.5], scale: [0.5, 0.5, 0.5], swappable: false }, // Example static prop
    ],
    bathrobes: [
        { name: 'White Cotton Robe', url: 'models/bathrobe.glb', position: [-1.5, 0.8, 1], scale: [0.6, 0.6, 0.6], rotationY: Math.PI / 4, swappable: true }, // Initial Swappable
        { name: 'Fancy Robe Stand', url: 'models/towels.glb', position: [-2.5, 0, 1], scale: [1, 1, 1], swappable: false }, // Example static prop
        { name: 'Blue Silk Robe', url: 'models/bathrobe.glb', position: [-1.5, 0.8, 1], scale: [0.6, 0.6, 0.6], rotationY: Math.PI / 4, swappable: true }, // Alternative Swappable (not loaded initially)
        { name: 'Hooded Terry Robe', url: 'models/hanging_towel.glb', position: [-1.5, 0.8, 1], scale: [0.65, 0.65, 0.65], rotationY: Math.PI / 4, swappable: true }, // Alternative Swappable (not loaded initially)
    ],
    accessories: [
        { name: 'Simple Soap Dish', url: 'models/bathrobe.glb', position: [0, 0.9, -1], scale: [0.3, 0.3, 0.3], swappable: true }, // Initial Swappable
        { name: 'Bath Mat', url: 'models/towels.glb', position: [0, 0.01, -0.5], scale: [1, 1, 1], swappable: false },
        { name: 'Lotion Dispenser', url: 'models/towels.glb', position: [0.5, 0.9, -1], scale: [0.2, 0.2, 0.2], swappable: true }, // Alternative Swappable (not loaded initially)
    ]
};

// --- State Variable ---
let currentSwappableModel = {
    model: null, // Reference to the THREE.Object3D
    configUrl: null // URL of the config used to load it
};
let otherLoadedAssets = []; // For non-swappable items

// --- Helper Function for Disposal ---
function disposeModel(model) {
    if (!model) return;
    model.traverse(child => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => disposeMaterial(material));
                } else {
                    disposeMaterial(child.material);
                }
            }
        }
    });
    // console.log(`AssetLoader: Disposed resources for a model.`);
}

function disposeMaterial(material) {
    material.dispose();
    for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value === 'object' && value.isTexture) {
            value.dispose();
        }
    }
}
// --- End Helper Function ---

/** Clears assets, disposes resources, resets state. */
function clearAllAssets(scene) {
    console.log("AssetLoader: Clearing all loaded assets and disposing resources.");
    if (currentSwappableModel.model) {
        scene.remove(currentSwappableModel.model);
        disposeModel(currentSwappableModel.model);
        currentSwappableModel.model = null;
        currentSwappableModel.configUrl = null;
    }
    otherLoadedAssets.forEach(asset => {
        scene.remove(asset);
        disposeModel(asset);
    });
    otherLoadedAssets = [];
    console.log("AssetLoader: All assets cleared.");
}

/** Loads initial assets: all static + the FIRST swappable one found. */
function loadInitialAssets(sceneId, scene) {
    if (!scene) { /* error */ return; }
    clearAllAssets(scene); // Ensure clean state

    const assetsToLoad = showroomAssetConfig[sceneId];
    if (!assetsToLoad || assetsToLoad.length === 0) { /* warning */ return; }

    console.log(`AssetLoader: Loading initial assets for ${sceneId}`);
    let initialSwappableFound = false;

    assetsToLoad.forEach(config => {
        const isInitialSwappable = config.swappable && !initialSwappableFound;
        const isStatic = !config.swappable;

        // Only load if it's static OR the very first swappable one
        if (isStatic || isInitialSwappable) {
            gltfLoader.load(
                config.url,
                (gltf) => { // onLoad
                    const model = gltf.scene;
                    console.log(`AssetLoader: Loaded "${config.name}" (${config.url})`);
                    applyConfigToModel(model, config);
                    scene.add(model);

                    if (isInitialSwappable) {
                        console.log(`AssetLoader: Setting initial swappable model: ${config.name}`);
                        currentSwappableModel.model = model;
                        currentSwappableModel.configUrl = config.url;
                        initialSwappableFound = true; // Mark as found
                    } else if (isStatic) {
                        console.log(`AssetLoader: Added static asset: ${config.name}`);
                        otherLoadedAssets.push(model);
                    }
                },
                undefined, // onProgress
                (error) => { console.error(`AssetLoader: ERROR loading "${config.name}" (${config.url}):`, error); }
            );
        } else if (config.swappable && !isInitialSwappable) {
            // This is a swappable alternative, log but don't load now
            console.log(`AssetLoader: Skipping initial load for swappable alternative: ${config.name}`);
        }
    });
}


/** Swaps the current swappable model with a new one (loads on demand). */
function swapModel(newModelConfigUrl, sceneId, scene) {
    if (!scene) { /* error */ return; }
    if (currentSwappableModel.configUrl === newModelConfigUrl) { /* log same */ return; }

    const categoryConf = showroomAssetConfig[sceneId];
    if (!categoryConf) { /* error */ return; }
    const newModelConfig = categoryConf.find(conf => conf.url === newModelConfigUrl && conf.swappable);
    if (!newModelConfig) { /* error */ return; }

    console.log(`AssetLoader: Swapping to model: ${newModelConfig.name} (${newModelConfigUrl})`);

    // 1. Remove and Dispose the old model
    if (currentSwappableModel.model) {
        scene.remove(currentSwappableModel.model);
        disposeModel(currentSwappableModel.model);
        currentSwappableModel.model = null;
        currentSwappableModel.configUrl = null;
    } else { /* warning */ }

    // 2. Load the new model
    gltfLoader.load(
        newModelConfig.url,
        (gltf) => { // onLoad
            const newModel = gltf.scene;
            console.log(`AssetLoader: Loaded new swappable model "${newModelConfig.name}"`);
            applyConfigToModel(newModel, newModelConfig);
            scene.add(newModel);
            currentSwappableModel.model = newModel; // Update state
            currentSwappableModel.configUrl = newModelConfig.url;
            console.log(`AssetLoader: Swap complete for ${newModelConfig.name}.`);
        },
        undefined, // onProgress
        (error) => { console.error(`AssetLoader: ERROR loading model for swap "${newModelConfig.name}" (${newModelConfig.url}):`, error); }
    );
}

/** Helper to apply position/scale/rotation/shadows from config */
function applyConfigToModel(model, config) {
    if (config.position) model.position.set(...config.position);
    if (config.scale) model.scale.set(...config.scale);
    if (config.rotationY !== undefined) model.rotation.y = config.rotationY;
    model.traverse(node => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });
}

// Export necessary functions and data
export { loadInitialAssets, clearAllAssets, swapModel, showroomAssetConfig };