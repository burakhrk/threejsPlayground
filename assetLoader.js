// assetLoader.js

// Import necessary Three.js parts if not globally available (good practice for modules)
// Assuming THREE is globally available from the script tag in HTML for now.
// If not, you'd import like: import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// const THREE = window.THREE; // If THREE is attached to window

const gltfLoader = new THREE.GLTFLoader();
let loadedAssets = []; // Internal array to track assets loaded by this module

/**
 * Removes all assets previously loaded by this module from the provided scene.
 * @param {THREE.Scene} scene - The Three.js scene to remove assets from.
 */
function clearAssets(scene) {
    if (!scene) {
        console.error("AssetLoader: Scene object is required for clearAssets.");
        return;
    }
    console.log(`AssetLoader: Clearing ${loadedAssets.length} previous assets.`);
    loadedAssets.forEach(asset => {
        if (asset) {
            scene.remove(asset);
            // Optional: Add full disposal logic here if needed later
            // asset.traverse(node => {
            //     if (node.isMesh) {
            //         node.geometry?.dispose();
            //         node.material?.dispose();
            //     }
            // });
        }
    });
    loadedAssets = []; // Reset the tracking array
}

/**
 * Loads specific 3D models and assets into the provided scene based on the sceneId.
 * @param {string} sceneId - Identifier for the showroom (e.g., "towels", "bathrobes").
 * @param {THREE.Scene} scene - The Three.js scene to add assets to.
 */
function loadAssets(sceneId, scene) {
    if (!scene) {
        console.error("AssetLoader: Scene object is required for loadAssets.");
        return;
    }
    console.log(`AssetLoader: Loading assets for scene: ${sceneId}`);

    // --- Define Asset Configurations ---
    // You could move this to a separate config object/file for even more cleanliness
    const assetConfigs = {
        towels: [
            { url: 'models/bathrobe.glb', position: [1.5, 0, 0], scale: [1, 1, 1], rotationY: 0 }
            // Add more assets for 'towels' here
        ],
        bathrobes: [
            { url: 'models/bathrobe.glb', position: [-1.5, 0.8, 1], scale: [0.6, 0.6, 0.6], rotationY: Math.PI / 4 }
            // Add more assets for 'bathrobes' here
        ],
        accessories: [
            { url: 'models/bathrobe.glb', position: [0, 0.9, -1], scale: [0.3, 0.3, 0.3], rotationY: 0 }
            // Add more assets for 'accessories' here
        ]
    };

    // --- Get assets for the current sceneId ---
    const assetsToLoad = assetConfigs[sceneId];

    if (!assetsToLoad || assetsToLoad.length === 0) {
        console.warn(`AssetLoader: No specific assets defined or found for sceneId: ${sceneId}`);
        return; // Nothing to load for this ID
    }

    // --- Load each asset ---
    assetsToLoad.forEach(config => {
        gltfLoader.load(
            config.url, // Model URL from config
            (gltf) => {
                const model = gltf.scene;
                console.log(`AssetLoader: Loaded "${config.url}"`);

                // Apply transformations from config
                if (config.position) model.position.set(...config.position);
                if (config.scale) model.scale.set(...config.scale);
                if (config.rotationY) model.rotation.y = config.rotationY;
                // Add more rotations (X, Z) or quaternion if needed

                // Enable shadows
                model.traverse(node => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                scene.add(model);         // Add to the provided scene
                loadedAssets.push(model); // Track it internally

            },
            undefined, // onProgress callback (optional)
            (error) => {
                console.error(`AssetLoader: Error loading model "${config.url}":`, error);
            }
        );
    });
}

// Export the functions to be used by other modules
export { loadAssets, clearAssets };