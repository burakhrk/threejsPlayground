// --- Import Asset Loader ---
// Ensure assetLoader.js exports these: loadInitialAssets, clearAllAssets, swapModel, showroomAssetConfig
import { loadInitialAssets, clearAllAssets, swapModel, showroomAssetConfig } from './assetLoader.js';

// --- Global Variables ---
let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();
let isShowroomInitialized = false; // Flag to check if base scene is set up
let animationFrameId = null;       // To control the animation loop
let currentSceneId = null;         // Track the active scene ID ('towels', 'bathrobes', etc.)

// --- DOM Element Selections ---
console.log("Script start: Getting elements...");
const carouselContainer = document.getElementById('carousel-container');
const showroomContainer = document.getElementById('showroom-container'); // Main 3D view container
const slider = document.getElementById('card-slider');             // Carousel card container
const prevBtn = document.getElementById('prev-btn');               // Carousel prev button
const nextBtn = document.getElementById('next-btn');               // Carousel next button
const enterButtons = document.querySelectorAll('.enter-button[data-scene-id]'); // Buttons on cards
// Sidebar Element Selections
const modelSidebar = document.getElementById('model-sidebar');     // Sidebar outer div
const modelList = document.getElementById('model-list');           // UL element inside sidebar for buttons


// --- Carousel Logic ---
const cardElements = document.querySelectorAll('#card-slider .card');
const numCards = cardElements.length; // Calculate dynamically
let currentCardIndex = 0;

function updateSliderPosition() {
    if (!slider || !numCards) { // Check if slider and cards exist
        console.warn("Slider or cards not found for positioning.");
        return;
    }
    // Calculate width based on actual number of cards
    const cardWidthPercentage = 100 / numCards;
    const offset = -currentCardIndex * cardWidthPercentage;
    slider.style.transform = `translateX(${offset}%)`;

    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCardIndex >= numCards - 1; // Use >= for safety
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentCardIndex > 0) { currentCardIndex--; updateSliderPosition(); }
    });
}
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (currentCardIndex < numCards - 1) { currentCardIndex++; updateSliderPosition(); }
    });
}

// Initialize slider based on number of cards found
if (slider && numCards > 0) {
    slider.style.width = `${numCards * 100}%`; // Set total width for flexbox layout
    // Adjust each card's flex-basis dynamically (Ensure CSS supports this or is overridden)
    cardElements.forEach(card => {
        card.style.flex = `0 0 calc(100% / ${numCards})`;
    });
    updateSliderPosition(); // Initialize slider position
    console.log(`Carousel initialized with ${numCards} cards.`);
} else {
    console.warn("Cannot initialize slider - elements missing or no cards found.");
}


// --- Enter Button Logic (Entry point to 3D view) ---
if (enterButtons && enterButtons.length > 0) {
    console.log(`Found ${enterButtons.length} enter buttons. Attaching listeners...`);
    enterButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const sceneId = button.getAttribute('data-scene-id');
            if (!sceneId) {
                console.error(`Button #${index} is missing data-scene-id attribute.`);
                return;
            }
            console.log(`Enter button #${index} CLICKED! Scene ID: ${sceneId}`);
            currentSceneId = sceneId; // Store the current scene ID

            if (!carouselContainer || !showroomContainer) {
                console.error("Core container elements (carousel or showroom) missing. Aborting scene entry.");
                return;
            }

            carouselContainer.classList.add('hidden'); // Hide carousel UI

            // Use setTimeout to allow CSS transition and prevent freeze during setup
            setTimeout(() => {
                showroomContainer.style.display = 'block'; // Show 3D area

                // Initialize base THREE.js scene ONLY if it hasn't been done yet
                if (!isShowroomInitialized) {
                    console.log("First entry: Initializing base showroom...");
                    try {
                        initShowroom(); // Sets up scene, camera, renderer, lights, floor, controls
                        isShowroomInitialized = true; // Mark as initialized
                    } catch (initError) {
                        console.error("FATAL ERROR during initShowroom():", initError);
                        // Attempt recovery: hide showroom, show carousel again
                        showroomContainer.style.display = 'none';
                        carouselContainer.classList.remove('hidden');
                        currentSceneId = null; // Reset scene ID
                        return; // Stop further execution for this click
                    }
                } else {
                    console.log("Showroom already initialized. Preparing for new assets.");
                    // Ensure renderer size is correct if window was resized while on carousel
                    onWindowResize(); // Call resize handler to update aspect ratio and renderer size
                }

                // Load scene-specific assets and populate the sidebar
                if (scene) { // Ensure scene object exists (should after init)
                    console.log("Loading initial assets for scene:", sceneId);
                    loadInitialAssets(sceneId, scene); // Use assetLoader function

                    console.log("Populating sidebar for scene:", sceneId);
                    populateSidebar(sceneId); // Populate the sidebar with swappable models
                } else {
                    console.error("Scene object not available after initialization attempt, cannot load assets or populate sidebar!");
                }

                // Ensure the animation loop is running
                if (!animationFrameId) {
                    console.log("Starting animation loop.");
                    animateShowroom();
                }

            }, 500); // Match CSS transition time (adjust if needed)
        });
    });
} else {
    console.error("Could not find any '.enter-button' elements with 'data-scene-id'.");
}


// --- Sidebar Functions ---

/** Populates the sidebar list based on the current sceneId */
function populateSidebar(sceneId) {
    if (!modelList || !showroomAssetConfig || !modelSidebar) {
        console.error("Sidebar elements (modelList, modelSidebar) or showroomAssetConfig missing.");
        if (modelSidebar) modelSidebar.style.display = 'none'; // Ensure it's hidden if setup fails
        return;
    }

    modelList.innerHTML = ''; // Clear previous items

    const categoryConfig = showroomAssetConfig[sceneId];
    if (!categoryConfig) {
        console.warn(`Sidebar: No config found for scene ${sceneId}. Hiding sidebar.`);
        modelSidebar.style.display = 'none'; // Hide sidebar if no config for this scene
        return;
    }

    // Filter config to get only items that are marked as swappable
    const swappableItems = categoryConfig.filter(item => item.swappable === true);

    // If there's only one (or zero) swappable item, no need for a selection list
    if (swappableItems.length <= 1) {
        console.log(`Sidebar: ${swappableItems.length} swappable items for scene ${sceneId}. Hiding sidebar.`);
        modelSidebar.style.display = 'none';
        return; // Exit if no choices are needed
    }

    // Determine the URL of the *initially* loaded swappable model.
    // This relies on the assumption that loadInitialAssets loads the *first*
    // 'swappable: true' item it finds in the config array for the category.
    const initialSwappableConfig = categoryConfig.find(item => item.swappable === true);
    const initialSwappableUrl = initialSwappableConfig ? initialSwappableConfig.url : null;
    if (!initialSwappableUrl && swappableItems.length > 0) { // Added check swappableItems > 0
        console.warn(`Sidebar: Could not determine initial swappable URL for scene ${sceneId}, though swappable items exist. Check config structure.`);
    }
    console.log("Sidebar: Initial swappable URL determined as:", initialSwappableUrl);

    // Create list items (buttons) for each swappable model
    swappableItems.forEach(itemConfig => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = itemConfig.name;         // Display name
        button.dataset.modelUrl = itemConfig.url;     // Store the model URL for the click handler

        // Add 'active-model' class if this item's URL matches the initial one
        if (itemConfig.url === initialSwappableUrl) {
            console.log(`Sidebar: Marking "${itemConfig.name}" as active initial model.`);
            button.classList.add('active-model');
        }

        button.addEventListener('click', handleSidebarClick); // Add the click handler
        li.appendChild(button);
        modelList.appendChild(li);
    });

    // Sidebar visibility is controlled by PointerLock state (see controls event listeners)
    console.log(`Sidebar populated with ${swappableItems.length} items. Visibility tied to PointerLock.`);
    // Check lock state immediately in case we entered an already initialized scene
    // and sidebar should be visible right away if locked.
    if (controls && controls.isLocked) {
        modelSidebar.style.display = 'flex';
    } else {
        modelSidebar.style.display = 'none';
    }
}

/** Handles clicks on sidebar item buttons */
function handleSidebarClick(event) {
    const button = event.currentTarget;
    const modelUrl = button.dataset.modelUrl;

    if (!modelUrl || !currentSceneId || !scene) {
        console.error("Missing data for sidebar click handler:", { modelUrl, currentSceneId, sceneExists: !!scene });
        return;
    }

    // Prevent unnecessary swaps if the clicked model is already the active one
    if (button.classList.contains('active-model')) {
        console.log("Sidebar click: Model already active.");
        return;
    }

    console.log(`Sidebar click: Requesting swap to ${modelUrl} in scene ${currentSceneId}`);

    // 1. Visually update the sidebar immediately (optimistic UI update)
    updateSidebarActiveState(modelUrl);

    // 2. Call the swap function from the asset loader module
    swapModel(modelUrl, currentSceneId, scene);
}

/** Updates which button in the sidebar has the 'active-model' class */
function updateSidebarActiveState(activeModelUrl) {
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


// --- 3D Showroom Initialization (Sets up the base THREE.js environment) ---
function initShowroom() {
    console.log("initShowroom: Setting up BASE scene elements...");

    const container = document.getElementById('showroom-container'); // Already selected
    // Get blocker/instructions elements *inside* the container for robustness
    const blocker = container.querySelector('#blocker');
    const instructions = container.querySelector('#instructions');

    if (!container || !blocker || !instructions) {
        // More specific error if elements are missing *within* the expected container
        console.error("Crucial elements missing within #showroom-container for initShowroom. Check IDs: blocker, instructions.", { container_exists: !!container, blocker_exists: !!blocker, instructions_exists: !!instructions });
        throw new Error("Crucial child elements (blocker, instructions) missing for initShowroom!");
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd); // Light grey background
    scene.fog = new THREE.Fog(0xdddddd, 10, 60); // Fog starts 10 units away, full at 60

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100); // Good defaults
    camera.position.set(0, 0.75, 5); // Start at average eye height, 5 units back from origin

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio); // Adjust for high-DPI screens
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding; // Correct color output for GLTF/textures
    renderer.shadowMap.enabled = true;            // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadow edges
    container.appendChild(renderer.domElement); // Add the canvas to the #showroom-container div

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft overall light
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7); // Main light source
    directionalLight.position.set(5, 10, 7.5); // Position light diagonally from above
    directionalLight.castShadow = true;         // Allow this light to cast shadows
    // Configure shadow properties (adjust frustum based on your scene scale)
    directionalLight.shadow.mapSize.width = 1024; // Shadow map resolution
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15; // Adjust bounds to cover your scene area
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);
    // scene.add(directionalLight.target); // Target defaults to (0,0,0) which is often fine

    // Controls (Pointer Lock for FPS-style movement)
    controls = new THREE.PointerLockControls(camera, document.body); // Use document.body for capture to work correctly

    // --- Lock/Unlock Logic (Handling UI changes and Back Button) ---
    blocker.style.display = 'flex'; // Show blocker overlay initially
    instructions.style.display = ''; // Show "Click to explore" text

    function removeBackButton() {
        const btn = blocker.querySelector('#back-to-menu-button'); // Find button specifically inside blocker
        if (btn) btn.remove();
    }

    instructions.addEventListener('click', () => {
        console.log("Instructions clicked - attempting to lock controls.");
        controls.lock(); // Request pointer lock
    });

    controls.addEventListener('lock', () => {
        console.log("Controls Locked.");
        instructions.style.display = 'none'; // Hide "Click to explore"
        blocker.style.display = 'none';      // Hide the grey overlay
        removeBackButton();                  // Remove back button if it somehow existed
        // Show sidebar ONLY if it has content (i.e., more than 1 swappable item for the current scene)
        if (modelSidebar && modelList && modelList.children.length > 0) {
            modelSidebar.style.display = 'flex'; // Use flex to show it
        } else {
            if (modelSidebar) modelSidebar.style.display = 'none'; // Ensure hidden if empty
        }
    });

    controls.addEventListener('unlock', () => {
        console.log("Controls Unlocked (likely Esc pressed).");
        blocker.style.display = 'flex';   // Show blocker overlay again
        instructions.style.display = ''; // Show instructions text again
        if (modelSidebar) modelSidebar.style.display = 'none'; // Hide sidebar when unlocked (menu visible)

        removeBackButton(); // Ensure no duplicates before adding a new one
        const backButton = document.createElement('button');
        backButton.id = 'back-to-menu-button';
        backButton.textContent = 'Back to Menu';
        backButton.classList.add('enter-button'); // Reuse existing fancy button style

        backButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent blocker's own click if button is clicked directly
            console.log("'Back to Menu' button clicked.");

            // Stop the animation loop FIRST
            if (animationFrameId) {
                console.log("Stopping animation loop.");
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            // Hide 3D view, show carousel
            if (showroomContainer) showroomContainer.style.display = 'none';
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

            removeBackButton(); // Remove the button itself after click action

            // Reset movement keys state to prevent sticky movement on re-entry
            moveForward = moveBackward = moveLeft = moveRight = false;
        });
        blocker.appendChild(backButton); // Add the button to the blocker div
        console.log("'Back to Menu' button added to blocker.");
    });
    // --- End Lock/Unlock ---

    // Input Listeners (WASD for movement)
    const onKeyDown = (event) => {
        // Only process movement keys if controls are locked to prevent background movement
        if (!controls || !controls.isLocked) return;
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
        }
    };
    const onKeyUp = (event) => {
        // Always process key up to avoid stuck keys if unlocking while holding
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = false; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': moveBackward = false; break;
            case 'ArrowRight': case 'KeyD': moveRight = false; break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Base Scene Content (Just a floor plane)
    const floorGeometry = new THREE.PlaneGeometry(50, 50); // Size of the floor
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,    // Neutral grey color
        roughness: 0.8,     // Mostly diffuse reflection
        metalness: 0.2      // Slightly metallic appearance
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate plane to lie flat on XZ plane
    floor.receiveShadow = true;      // Allow floor to receive shadows from objects
    scene.add(floor);
    console.log("initShowroom: Base floor added.");

    // Resize Listener (Updates camera and renderer on window resize)
    window.addEventListener('resize', onWindowResize);

    console.log("initShowroom: Base setup complete.");
    // Note: Animation loop (animateShowroom) is started *after* entering a scene
    // either for the first time or when re-entering.
}


// --- Window Resize Handler ---
function onWindowResize() {
    // Only run if camera and renderer have been initialized
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight; // Update aspect ratio
        camera.updateProjectionMatrix(); // Apply the aspect ratio change
        renderer.setSize(window.innerWidth, window.innerHeight); // Resize renderer output canvas
        console.log("Window resized, updated camera and renderer.");
    }
}

// --- Animation Loop (Handles rendering and movement updates frame-by-frame) ---
function animateShowroom() {
    // Schedule the next frame
    animationFrameId = requestAnimationFrame(animateShowroom);

    // Calculate time delta for smooth, frame-rate independent movement
    const delta = clock.getDelta();

    // Movement Logic (Only process if pointer is locked)
    if (controls && controls.isLocked === true) {
        // Apply damping to velocity (simulates friction/air resistance)
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        // Optional: Apply simple gravity
        // velocity.y -= 9.8 * 0.5 * delta; // Adjust multiplier for desired gravity strength

        // Calculate movement direction based on current WASD key states
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        // Normalize direction vector if there's movement (prevents faster diagonal speed)
        if (direction.lengthSq() > 0) direction.normalize();

        const moveSpeed = 5.0; // Adjust this value for desired movement speed

        // Apply movement impulse based on direction and speed
        if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * delta;

        // Move the camera using PointerLockControls methods (respects view direction)
        controls.moveRight(-velocity.x * delta); // moveRight is correct for local X axis
        controls.moveForward(-velocity.z * delta);// moveForward is correct for local Z axis
        // Apply vertical velocity if using gravity
        // controls.getObject().position.y += velocity.y * delta;

        // Simple Floor Constraint (prevent falling through floor at y=0)
        const eyeLevel = 0.75; // Should match camera's initial Y position or desired height
        if (controls.getObject().position.y < eyeLevel) {
            // velocity.y = 0; // Stop downward velocity if gravity is applied
            controls.getObject().position.y = eyeLevel; // Reset position to eye level
        }
    }

    // Render the scene using the current camera view
    // Ensure renderer, scene, and camera exist before trying to render
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    } else if (animationFrameId) {
        // If something critical is missing, stop the loop to prevent errors
        console.error("Animation loop running but renderer, scene, or camera is missing! Stopping loop.");
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// --- Initial Script Load Message ---
console.log("Showroom script (showroom.js) loaded. Waiting for interaction.");