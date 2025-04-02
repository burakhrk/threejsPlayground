// Assuming THREE and GLTFLoader are available (either globally or via imports)
const gltfLoader = new THREE.GLTFLoader();

// --- NEW Data Structure ---
// Defines available models for each category
// 'swappable: true' marks the primary model type to be exchanged
// NOTE: Only the *first* 'swappable: true' item per category is loaded initially.
const showroomAssetConfig = {
    towels: [
        // IMPORTANT: Ensure these paths ('models/...') are correct!
        { name: 'Basic Towel Rack', url: 'models/hand_towel.glb', position: [1.5, 0, 0], scale: [1, 1, 1], swappable: true },
        { name: 'Towel Stack', url: 'models/hanging_towel.glb', position: [2.5, 0, 0.5], scale: [0.5, 0.5, 0.5], swappable: false }, // Example static prop
    ],
    bathrobes: [
        { name: 'White Cotton Robe', url: 'models/bathrobe.glb', position: [-1.5, 0.8, 1], scale: [0.6, 0.6, 0.6], rotationY: Math.PI / 4, swappable: true },
        { name: 'Fancy Robe Stand', url: 'models/towels.glb', position: [-2.5, 0, 1], scale: [1, 1, 1], swappable: false }, // Example static prop
        { name: 'Blue Silk Robe', url: 'models/bathrobe.glb', position: [-1.5, 0.8, 1], scale: [0.6, 0.6, 0.6], rotationY: Math.PI / 4, swappable: true }, // Swappable alternative
        { name: 'Hooded Terry Robe', url: 'models/hanging_towel.glb', position: [-1.5, 0.8, 1], scale: [0.65, 0.65, 0.65], rotationY: Math.PI / 4, swappable: true }, // Swappable alternative
    ],
    accessories: [
        { name: 'Simple Soap Dish', url: 'models/bathrobe.glb', position: [0, 0.9, -1], scale: [0.3, 0.3, 0.3], swappable: true },
        { name: 'Bath Mat', url: 'models/towels.glb', position: [0, 0.01, -0.5], scale: [1, 1, 1], swappable: false },
        { name: 'Lotion Dispenser', url: 'models/towels.glb', position: [0.5, 0.9, -1], scale: [0.2, 0.2, 0.2], swappable: true }, // Swappable alternative
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
            if (child.geometry) {
                child.geometry.dispose();
                // console.log("Disposed geometry");
            }
            if (child.material) {
                // If material is an array
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => disposeMaterial(material));
                } else {
                    disposeMaterial(child.material);
                }
                // console.log("Disposed material(s)");
            }
        }
    });
    console.log(`AssetLoader: Disposed resources for model.`);
}

function disposeMaterial(material) {
    material.dispose(); // Dispose the material itself

    // Dispose textures
    for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value === 'object' && value.isTexture) {
            value.dispose();
            // console.log(`Disposed texture: ${key}`);
        }
    }
}
// --- End Helper Function ---


/**
 * Clears ALL assets loaded by this module (swappable and others).
 * Disposes of their resources.
 * Resets the state.
 * @param {THREE.Scene} scene
 */
function clearAllAssets(scene) {
    console.log("AssetLoader: Clearing all loaded assets and disposing resources.");
    if (currentSwappableModel.model) {
        scene.remove(currentSwappableModel.model);
        disposeModel(currentSwappableModel.model); // Dispose resources
        currentSwappableModel.model = null;
        currentSwappableModel.configUrl = null;
    }
    otherLoadedAssets.forEach(asset => {
        scene.remove(asset);
        disposeModel(asset); // Dispose resources
    });
    otherLoadedAssets = [];
    console.log("AssetLoader: All assets cleared.");
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
        const isInitialSwappable = config.swappable && !initialSwappableFound;

        gltfLoader.load(
            config.url,
            (gltf) => { // onLoad
                const model = gltf.scene;
                console.log(`AssetLoader: Loaded "${config.name}" (${config.url})`);
                applyConfigToModel(model, config); // Helper function below
                scene.add(model);

                if (isInitialSwappable) {
                    console.log(`AssetLoader: Setting initial swappable model: ${config.name}`);
                    currentSwappableModel.model = model;
                    currentSwappableModel.configUrl = config.url;
                    initialSwappableFound = true;
                } else if (!config.swappable) {
                    console.log(`AssetLoader: Added static asset: ${config.name}`);
                    otherLoadedAssets.push(model); // Track non-swappable items
                } else {
                    // If it's swappable but not the *first* one, we don't display it initially
                    console.log(`AssetLoader: Model "${config.name}" is swappable but not loaded initially.`);
                }
            },
            undefined, // onProgress - can be added if needed
            (error) => { // onError
                console.error(`AssetLoader: ERROR loading "${config.name}" (${config.url}):`, error);
                // You could potentially add placeholder logic here or notify the user
            }
        );
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
    if (!categoryConf) {
        console.error(`AssetLoader: No category config found for sceneId: ${sceneId}`);
        return;
    }

    const newModelConfig = categoryConf.find(conf => conf.url === newModelConfigUrl && conf.swappable);

    if (!newModelConfig) {
        console.error(`AssetLoader: Swappable config not found for URL: ${newModelConfigUrl} in scene ${sceneId}`);
        return;
    }

    console.log(`AssetLoader: Swapping to model: ${newModelConfig.name} (${newModelConfigUrl})`);

    // 1. Remove and Dispose the old model (if it exists)
    if (currentSwappableModel.model) {
        scene.remove(currentSwappableModel.model);
        disposeModel(currentSwappableModel.model); // Dispose resources
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
            console.log(`AssetLoader: Loaded new swappable model "${newModelConfig.name}"`);
            applyConfigToModel(newModel, newModelConfig); // Use helper

            scene.add(newModel);

            // 3. Update state to track the new model
            currentSwappableModel.model = newModel;
            currentSwappableModel.configUrl = newModelConfig.url;

            // Optional: Dispatch an event or use a callback if showroom.js needs to know the swap finished
            // document.dispatchEvent(new CustomEvent('modelSwapped', { detail: { url: newModelConfig.url } }));
            console.log(`AssetLoader: Swap complete for ${newModelConfig.name}.`);

        },
        undefined, // onProgress
        (error) => { // onError
            console.error(`AssetLoader: ERROR loading model for swap "${newModelConfig.name}" (${newModelConfig.url}):`, error);
            // Consider what to do here. Maybe leave the scene empty? Or show an error message?
            // For now, just log the error. The state `currentSwappableModel` remains null.
        }
    );
}

/** Helper to apply position/scale/rotation/shadows from config */
function applyConfigToModel(model, config) {
    if (config.position) model.position.set(...config.position);
    if (config.scale) model.scale.set(...config.scale);
    if (config.rotationY !== undefined) model.rotation.y = config.rotationY; // Check for undefined specifically
    // Add other rotations if needed (e.g., config.rotationX, config.rotationZ)

    model.traverse(node => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            // Optional: Log material names for debugging
            // if (node.material) {
            //     const matName = Array.isArray(node.material) ? node.material.map(m=>m.name).join(', ') : node.material.name;
            //     console.log(`Applying shadows to mesh with material(s): ${matName || 'Unnamed'}`);
            // }
        }
    });
}


// Export necessary functions and data
export { loadInitialAssets, clearAllAssets, swapModel, showroomAssetConfig }; // Ensure showroomAssetConfig is here!
