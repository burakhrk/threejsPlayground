// --- Import Asset Loader ---
import { loadInitialAssets, clearAllAssets, swapModel, showroomAssetConfig } from './assetLoader.js';

// --- Global Variables ---
let camera, scene, renderer, controls; // controls will now be OrbitControls
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
// REMOVE: velocity, direction (old movement system)
// const velocity = new THREE.Vector3();
// const direction = new THREE.Vector3();
const clock = new THREE.Clock();
let isShowroomInitialized = false;
let animationFrameId = null;
let currentSceneId = null;

// --- DOM Element Selections ---
console.log("Script start: Getting elements...");
const carouselContainer = document.getElementById('carousel-container');
const showroomContainer = document.getElementById('showroom-container');
const slider = document.getElementById('card-slider');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const enterButtons = document.querySelectorAll('.enter-button[data-scene-id]');
const modelSidebar = document.getElementById('model-sidebar');
const modelList = document.getElementById('model-list');
// REMOVE: Blocker/Instructions references
// const blocker = document.getElementById('blocker'); // REMOVED
// const instructions = document.getElementById('instructions'); // REMOVED
// ADD: Permanent Back Button reference
const permanentBackButton = document.getElementById('permanent-back-button');


// --- Carousel Logic (Keep as is) ---
// ... (previous carousel code remains the same) ...


// --- Back Button Logic (Attached to permanent button) ---
if (permanentBackButton) {
    permanentBackButton.addEventListener('click', () => {
        console.log("'Permanent Back to Menu' button clicked.");

        // Stop the animation loop FIRST
        if (animationFrameId) {
            console.log("Stopping animation loop.");
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Hide 3D view & button, show carousel
        if (showroomContainer) showroomContainer.style.display = 'none';
        permanentBackButton.style.display = 'none'; // Hide this button too
        if (carouselContainer) carouselContainer.classList.remove('hidden');

        // Use AssetLoader to clear models and dispose resources properly
        if (scene) {
            console.log("Clearing all assets before returning to menu...");
            clearAllAssets(scene); // Calls the function from assetLoader.js
        }

        // Clean up sidebar state
        if (modelSidebar) modelSidebar.style.display = 'none'; // Explicitly hide
        if (modelList) modelList.innerHTML = '';             // Clear list content
        currentSceneId = null;                               // Reset scene ID tracker

        // Reset movement keys state
        moveForward = moveBackward = moveLeft = moveRight = false;
    });
} else {
    console.error("Permanent back button not found!");
}


// --- Enter Button Logic (Entry point to 3D view - minor changes) ---
if (enterButtons && enterButtons.length > 0) {
    enterButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const sceneId = button.getAttribute('data-scene-id');
            // ... (rest of the checks for sceneId, containers) ...
            console.log(`Enter button #${index} CLICKED! Scene ID: ${sceneId}`);
            currentSceneId = sceneId;

            if (!carouselContainer || !showroomContainer) { /* ... error ... */ return; }

            carouselContainer.classList.add('hidden');

            setTimeout(() => {
                showroomContainer.style.display = 'block';
                // Show permanent back button when entering showroom
                if (permanentBackButton) permanentBackButton.style.display = 'block';

                if (!isShowroomInitialized) {
                    console.log("First entry: Initializing base showroom...");
                    try {
                        initShowroom();
                        isShowroomInitialized = true;
                    } catch (initError) { /* ... error handling ... */
                        if (permanentBackButton) permanentBackButton.style.display = 'none'; // Hide button on error
                        return;
                    }
                } else {
                    console.log("Showroom already initialized.");
                    onWindowResize();
                    // Reset controls target/position if desired when re-entering a scene
                    if (controls) {
                        // Example: Reset target to origin, position back slightly
                        // controls.target.set(0, 0, 0);
                        // camera.position.set(0, 1.6, 5);
                        // controls.update(); // Apply changes
                    }
                }

                if (scene) {
                    console.log("Loading initial assets for scene:", sceneId);
                    loadInitialAssets(sceneId, scene);
                    console.log("Populating sidebar for scene:", sceneId);
                    populateSidebar(sceneId); // This now potentially shows the sidebar immediately
                } else { /* ... error ... */ }

                if (!animationFrameId) {
                    console.log("Starting animation loop.");
                    animateShowroom();
                }

            }, 500);
        });
    });
} else { /* ... error ... */ }


// --- Sidebar Functions ---

function populateSidebar(sceneId) {
    // ... (Keep existing logic for getting config, filtering swappables) ...
    console.log(`--- Populating sidebar for scene: ${sceneId} ---`);
    if (!modelList || !showroomAssetConfig || !modelSidebar) { /* ... */ return; }

    modelList.innerHTML = '';
    const categoryConfig = showroomAssetConfig[sceneId];
    console.log("Category Config found:", categoryConfig);
    if (!categoryConfig) { /* ... */ return; }

    const swappableItems = categoryConfig.filter(item => item.swappable === true);
    console.log(`Found ${swappableItems.length} swappable items:`, swappableItems);

    // --- Modified Visibility Logic ---
    if (swappableItems.length <= 1) {
        console.log("Hiding sidebar because <= 1 swappable item.");
        modelSidebar.style.display = 'none'; // Hide if not needed
    } else {
        // Populate the list
        const initialSwappableConfig = categoryConfig.find(item => item.swappable === true);
        const initialSwappableUrl = initialSwappableConfig ? initialSwappableConfig.url : null;
        // ... (rest of the forEach loop creating buttons and adding active-model class) ...
        swappableItems.forEach(itemConfig => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = itemConfig.name;
            button.dataset.modelUrl = itemConfig.url;
            if (itemConfig.url === initialSwappableUrl) {
                button.classList.add('active-model');
            }
            button.addEventListener('click', handleSidebarClick);
            li.appendChild(button);
            modelList.appendChild(li);
        });

        console.log(`Sidebar populated with ${swappableItems.length} items. Setting display to flex.`);
        modelSidebar.style.display = 'flex'; // **** SHOW sidebar immediately if populated ****
    }
}

// handleSidebarClick (Keep as is)
function handleSidebarClick(event) {
    // ... (no changes needed here) ...
    const button = event.currentTarget;
    const modelUrl = button.dataset.modelUrl;

    if (!modelUrl || !currentSceneId || !scene) { /* ... error ... */ return; }
    if (button.classList.contains('active-model')) { /* ... log active ... */ return; }

    console.log(`Sidebar click: Requesting swap to ${modelUrl} in scene ${currentSceneId}`);
    updateSidebarActiveState(modelUrl);
    swapModel(modelUrl, currentSceneId, scene);
}

// updateSidebarActiveState (Keep as is)
function updateSidebarActiveState(activeModelUrl) {
    // ... (no changes needed here) ...
    if (!modelList) return;
    const buttons = modelList.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.dataset.modelUrl === activeModelUrl) {
            btn.classList.add('active-model');
        } else {
            btn.classList.remove('active-model');
        }
    });
    console.log(`Sidebar active state updated. Active URL: ${activeModelUrl}`);
}


// --- 3D Showroom Initialization (Major Changes Here) ---
function initShowroom() {
    console.log("initShowroom: Setting up BASE scene elements with OrbitControls...");

    const container = document.getElementById('showroom-container');
    // REMOVE: blocker, instructions references

    if (!container) { // Check only for container now
        throw new Error("Crucial element (#showroom-container) missing for initShowroom!");
    }

    // Scene, Camera, Renderer, Lighting, Floor (Keep setup as is)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);
    scene.fog = new THREE.Fog(0xdddddd, 10, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 7); // Start a bit further back for orbit view

    renderer = new THREE.WebGLRenderer({ antialias: true });
    // ... (renderer setup: pixelRatio, size, encoding, shadowMap) ...
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ... (lighting setup: ambient, directional) ...
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    // ... (shadow map setup) ...
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);


    // *** Instantiate OrbitControls ***
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // For smoother movement inertia
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false; // Pan moves parallel to ground plane
    controls.minDistance = 1; // How close camera can get
    controls.maxDistance = 30; // How far camera can zoom out
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent looking straight down or under floor slightly
    controls.target.set(0, 0.5, 0); // Set initial look-at point (e.g., slightly above floor)
    controls.update(); // IMPORTANT: Apply initial target setting

    // --- REMOVE Pointer Lock Event Listeners ---
    // instructions.addEventListener('click', ...); // REMOVED
    // controls.addEventListener('lock', ...); // REMOVED
    // controls.addEventListener('unlock', ...); // REMOVED

    // --- Keep WASD Listeners ---
    const onKeyDown = (event) => {
        // No lock check needed now
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
        }
    };
    const onKeyUp = (event) => {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = false; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': moveBackward = false; break;
            case 'ArrowRight': case 'KeyD': moveRight = false; break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Base Scene Content (Floor - Keep as is)
    // ... (floor geometry, material, mesh, rotation, add to scene) ...
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa, roughness: 0.8, metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    console.log("initShowroom: Base floor added.");


    // Resize Listener (Keep as is)
    window.addEventListener('resize', onWindowResize);

    console.log("initShowroom: Base setup with OrbitControls complete.");
}


// --- Window Resize Handler (Keep as is) ---
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        console.log("Window resized, updated camera and renderer.");
    }
}

// --- Animation Loop (Movement logic updated) ---
// Helpers for WASD panning with OrbitControls
const panSpeed = 5.0; // Adjust speed as needed
const forwardVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const spherical = new THREE.Spherical();
const panOffset = new THREE.Vector3();

function animateShowroom() {
    animationFrameId = requestAnimationFrame(animateShowroom);
    const delta = clock.getDelta();

    // --- Update WASD Panning ---
    let moved = false;
    panOffset.set(0, 0, 0); // Reset pan offset each frame

    // Get camera forward direction (aligned with the ground)
    camera.getWorldDirection(forwardVector);
    forwardVector.y = 0; // Project onto XZ plane
    forwardVector.normalize();

    // Get camera side direction
    sideVector.copy(forwardVector).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); // Rotate forward 90 deg around Y

    if (moveForward) {
        panOffset.add(forwardVector);
        moved = true;
    }
    if (moveBackward) {
        panOffset.sub(forwardVector);
        moved = true;
    }
    if (moveLeft) {
        panOffset.sub(sideVector); // Subtract side vector to move left
        moved = true;
    }
    if (moveRight) {
        panOffset.add(sideVector); // Add side vector to move right
        moved = true;
    }

    if (moved) {
        panOffset.normalize().multiplyScalar(panSpeed * delta); // Scale by speed and time delta

        // Apply the pan to BOTH camera position and controls target
        controls.target.add(panOffset);
        camera.position.add(panOffset);
    }
    // --- End WASD Panning ---

    // Update OrbitControls (applies damping, handles mouse input)
    if (controls) {
        controls.update(); // Required if enableDamping = true OR for autoRotate
    }

    // Render
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    } else if (animationFrameId) { /* ... error handling ... */ }
}

// --- Initial Script Load Message ---
console.log("Showroom script (showroom.js) loaded. Configured for OrbitControls. Waiting for interaction.");