// assetLoader.js

// Assuming THREE and GLTFLoader are available (either globally or via imports)
const gltfLoader = new THREE.GLTFLoader();

// --- NEW Data Structure ---
// Defines available models for each category
// 'swappable: true' marks the primary model type to be exchanged
const showroomAssetConfig = {
    towels: [
        { name: 'Basic Towel Rack', url: 'models/hand_towel.glb', position: [1.5, 0, 0], scale: [1, 1, 1], swappable: true },
        { name: 'Towel Stack', url: 'models/hanging_towel.glb', position: [2.5, 0, 0.5], scale: [0.5, 0.5, 0.5], swappable: false }, // Example static prop
        // Add other swappable towel models here... (ensure only one type has swappable:true initially per category if needed)
    ],
    bathrobes: [
        { name: 'White Cotton Robe', url: 'models/bathrobe.glb', position: [-1.5, 0.8, 1], scale: [0.6, 0.6, 0.6], rotationY: Math.PI / 4, swappable: true },
        { name: 'Fancy Robe Stand', url: 'models/towels.glb', position: [-2.5, 0, 1], scale: [1, 1, 1], swappable: false }, // Example static prop
        // Add other swappable bathrobe models here
        { name: 'Blue Silk Robe', url: 'models/bathrobe.glb', position: [-1.5, 0.8, 1], scale: [0.6, 0.6, 0.6], rotationY: Math.PI / 4, swappable: true },
        { name: 'Hooded Terry Robe', url: 'models/hanging_towel.glb', position: [-1.5, 0.8, 1], scale: [0.65, 0.65, 0.65], rotationY: Math.PI / 4, swappable: true },
    ],
    accessories: [
        { name: 'Simple Soap Dish', url: 'models/bathrobe.glb', position: [0, 0.9, -1], scale: [0.3, 0.3, 0.3], swappable: true },
        // Add other swappable accessories here
        { name: 'Bath Mat', url: 'models/towels.glb', position: [0, 0.01, -0.5], scale: [1, 1, 1], swappable: false },
        { name: 'Lotion Dispenser', url: 'models/towels.glb', position: [0.5, 0.9, -1], scale: [0.2, 0.2, 0.2], swappable: true },
    ]
};

// --- State Variable ---
let currentSwappableModel = {
    model: null, // Reference to the THREE.Object3D
    configUrl: null // URL of the config used to load it
};
let otherLoadedAssets = []; // For non-swappable items

/**
 * Clears ALL assets loaded by this module (swappable and others).
 * Resets the state.
 * @param {THREE.Scene} scene
 */
function clearAllAssets(scene) {
    console.log("AssetLoader: Clearing all loaded assets.");
    if (currentSwappableModel.model) {
        scene.remove(currentSwappableModel.model);
        // Add proper disposal if needed
        currentSwappableModel.model = null;
        currentSwappableModel.configUrl = null;
    }
    otherLoadedAssets.forEach(asset => scene.remove(asset));
    otherLoadedAssets = [];
}

/**
 * Loads the initial set of assets for a sceneId.
 * @param {string} sceneId
 * @param {THREE.Scene} scene
 */
function loadInitialAssets(sceneId, scene) {
    if (!scene) {
        console.error("AssetLoader: Scene required for loadInitialAssets.");
        return;
    }
    clearAllAssets(scene); // Ensure clean state before loading initial

    const assetsToLoad = showroomAssetConfig[sceneId];
    if (!assetsToLoad || assetsToLoad.length === 0) {
        console.warn(`AssetLoader: No initial assets defined for sceneId: ${sceneId}`);
        return;
    }

    console.log(`AssetLoader: Loading initial assets for ${sceneId}`);
    let initialSwappableFound = false;

    assetsToLoad.forEach(config => {
        // Load the first swappable item found as the initial one, others as static
        const isInitialSwappable = config.swappable && !initialSwappableFound;

        gltfLoader.load(config.url, (gltf) => {
            const model = gltf.scene;
            console.log(`AssetLoader: Loaded "${config.url}"`);
            applyConfigToModel(model, config); // Helper function below

            scene.add(model);

            if (isInitialSwappable) {
                console.log(`AssetLoader: Setting initial swappable model: ${config.url}`);
                currentSwappableModel.model = model;
                currentSwappableModel.configUrl = config.url;
                initialSwappableFound = true;
            } else if (!config.swappable) {
                otherLoadedAssets.push(model); // Track non-swappable items
            } else {
                // If it's swappable but not the *first* one, we don't display it initially
                console.log(`AssetLoader: Model "${config.url}" is swappable but not initial.`);
            }

        }, undefined, (error) => console.error(`AssetLoader: Error loading "${config.url}":`, error));
    });
}


/**
 * Swaps the currently displayed swappable model with a new one.
 * @param {string} newModelConfigUrl - The URL from the config for the new model.
 * @param {string} sceneId - The current scene ID (to find config).
 * @param {THREE.Scene} scene
 */
function swapModel(newModelConfigUrl, sceneId, scene) {
    if (!scene) {
        console.error("AssetLoader: Scene required for swapModel.");
        return;
    }
    if (currentSwappableModel.configUrl === newModelConfigUrl) {
        console.log("AssetLoader: Clicked model is already displayed.");
        return; // Don't reload the same model
    }

    // Find the config for the new model
    const categoryConf = showroomAssetConfig[sceneId];
    if (!categoryConf) return; // Should not happen if sidebar is populated correctly

    const newModelConfig = categoryConf.find(conf => conf.url === newModelConfigUrl && conf.swappable);

    if (!newModelConfig) {
        console.error(`AssetLoader: Swappable config not found for URL: ${newModelConfigUrl}`);
        return;
    }

    console.log(`AssetLoader: Swapping to model: ${newModelConfigUrl}`);

    // 1. Remove the old model (if it exists)
    if (currentSwappableModel.model) {
        scene.remove(currentSwappableModel.model);
        // TODO: Dispose geometry/materials if needed
        currentSwappableModel.model = null;
        currentSwappableModel.configUrl = null;
    }

    // 2. Load the new model
    gltfLoader.load(newModelConfig.url, (gltf) => {
        const newModel = gltf.scene;
        console.log(`AssetLoader: Loaded new swappable model "${newModelConfig.url}"`);
        applyConfigToModel(newModel, newModelConfig); // Use helper

        scene.add(newModel);

        // 3. Update state to track the new model
        currentSwappableModel.model = newModel;
        currentSwappableModel.configUrl = newModelConfig.url;

        // Optional: Dispatch an event or use a callback if showroom.js needs to know the swap finished
        // document.dispatchEvent(new CustomEvent('modelSwapped', { detail: { url: newModelConfig.url } }));

    }, undefined, (error) => {
        console.error(`AssetLoader: Error loading model for swap "${newModelConfig.url}":`, error);
        // Maybe try to reload the previous model? Or leave it empty?
    });
}

/** Helper to apply position/scale/rotation/shadows from config */
function applyConfigToModel(model, config) {
    if (config.position) model.position.set(...config.position);
    if (config.scale) model.scale.set(...config.scale);
    if (config.rotationY) model.rotation.y = config.rotationY;
    // Add other rotations if needed

    model.traverse(node => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });
}


// Export necessary functions and data
export { loadInitialAssets, clearAllAssets, swapModel, showroomAssetConfig }; // Export config too