// --- Import Asset Loader ---
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
let isShowroomInitialized = false;
let animationFrameId = null;
let currentSceneId = null; // Track the active scene ID

// --- DOM Element Selections ---
// (Keep these as they are)
console.log("Script start: Getting elements...");
const carouselContainer = document.getElementById('carousel-container');
const showroomContainer = document.getElementById('showroom-container');
const slider = document.getElementById('card-slider');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const enterButtons = document.querySelectorAll('.enter-button');
const modelSidebar = document.getElementById('model-sidebar');
const modelList = document.getElementById('model-list');


// --- Carousel Logic ---
// (Keep this as it is)
const numCards = 3; // Make sure this matches the number of cards in HTML
const cardWidthPercentage = 100 / numCards;
let currentCardIndex = 0;

function updateSliderPosition() {
    if (!slider) return;
    const offset = -currentCardIndex * cardWidthPercentage;
    slider.style.transform = `translateX(${offset}%)`;
    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCardIndex === (document.querySelectorAll('#card-slider .card').length - 1); // Calculate dynamically
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentCardIndex > 0) { currentCardIndex--; updateSliderPosition(); }
    });
}
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        // Calculate max index dynamically
        const maxIndex = document.querySelectorAll('#card-slider .card').length - 1;
        if (currentCardIndex < maxIndex) { currentCardIndex++; updateSliderPosition(); }
    });
}

if (slider && prevBtn && nextBtn) {
    updateSliderPosition(); // Initialize slider
} else {
    console.warn("Cannot initialize slider - elements missing.");
}

// --- Enter Button Logic ---
// (Keep this as it is - looks correct)
if (enterButtons && enterButtons.length > 0) {
    console.log(`Found ${enterButtons.length} enter buttons. Attaching listeners...`);
    enterButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const sceneId = button.getAttribute('data-scene-id');
            console.log(`Enter button #${index} CLICKED! Scene ID: ${sceneId}`);
            currentSceneId = sceneId; // Store the current scene ID

            if (!carouselContainer || !showroomContainer) {
                console.error("Core container elements missing. Aborting scene entry.");
                return;
            }

            carouselContainer.classList.add('hidden'); // Hide carousel

            setTimeout(() => {
                showroomContainer.style.display = 'block'; // Show 3D area

                if (!isShowroomInitialized) {
                    console.log("First entry: Initializing base showroom...");
                    try {
                        initShowroom();
                        isShowroomInitialized = true;
                    } catch (initError) {
                        console.error("FATAL ERROR during initShowroom():", initError);
                        showroomContainer.style.display = 'none';
                        carouselContainer.classList.remove('hidden');
                        return;
                    }
                } else {
                    console.log("Showroom already initialized. Preparing for new assets.");
                    // Ensure renderer size is correct if window was resized while on carousel
                    if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);
                    if (camera) {
                        camera.aspect = window.innerWidth / window.innerHeight;
                        camera.updateProjectionMatrix();
                    }
                }

                if (scene) {
                    console.log("Loading initial assets for scene:", sceneId);
                    loadInitialAssets(sceneId, scene);

                    console.log("Populating sidebar for scene:", sceneId);
                    populateSidebar(sceneId);
                } else {
                    console.error("Scene object not available, cannot load assets or populate sidebar!");
                }

            }, 500); // Match CSS transition time
        });
    });
} else {
    console.error("Could not find any 'enter-button' elements.");
}

// --- Sidebar Functions ---
// (Keep these as they are - logic seems correct)
function populateSidebar(sceneId) {
    // ... (keep existing implementation) ...
    if (!modelList || !showroomAssetConfig || !modelSidebar) {
        console.error("Sidebar elements or config missing.");
        return;
    }

    modelList.innerHTML = ''; // Clear previous items

    const categoryConfig = showroomAssetConfig[sceneId];
    if (!categoryConfig) {
        console.warn(`Sidebar: No config found for scene ${sceneId}`);
        modelSidebar.style.display = 'none'; // Hide sidebar if no config
        return;
    }

    const swappableItems = categoryConfig.filter(item => item.swappable); // Get only swappable items

    if (swappableItems.length <= 1) { // Hide if 0 or 1 swappable items
        console.log(`Sidebar: ${swappableItems.length} swappable items for scene ${sceneId}. Hiding sidebar.`);
        modelSidebar.style.display = 'none';
        return; // No need for a choice
    }

    // Find the initially loaded swappable model's URL (assume it's the first swappable in config)
    // This relies on loadInitialAssets loading the first swappable it finds.
    const initialSwappableUrl = swappableItems.length > 0 ? swappableItems[0].url : null;
    console.log("Sidebar: Initial swappable URL determined as:", initialSwappableUrl);


    swappableItems.forEach(itemConfig => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = itemConfig.name;
        button.dataset.modelUrl = itemConfig.url; // Store URL for click handler

        // Add 'active-model' class if this is the initially loaded one
        if (itemConfig.url === initialSwappableUrl) {
            console.log(`Sidebar: Marking "${itemConfig.name}" as active initial model.`);
            button.classList.add('active-model');
        }

        button.addEventListener('click', handleSidebarClick);

        li.appendChild(button);
        modelList.appendChild(li);
    });

    // Only show sidebar if it was populated AND pointer is locked
    if (controls && controls.isLocked) {
        modelSidebar.style.display = 'flex'; // Show the sidebar
    } else {
        modelSidebar.style.display = 'none'; // Keep hidden if not locked
    }
}

function handleSidebarClick(event) {
    // ... (keep existing implementation) ...
    const button = event.currentTarget;
    const modelUrl = button.dataset.modelUrl;

    if (!modelUrl || !currentSceneId || !scene) {
        console.error("Missing data for sidebar click handler:", { modelUrl, currentSceneId, sceneExists: !!scene });
        return;
    }

    // Check if already active to prevent unnecessary swaps
    if (button.classList.contains('active-model')) {
        console.log("Sidebar click: Model already active.");
        return;
    }

    console.log(`Sidebar click: Requesting swap to ${modelUrl} in scene ${currentSceneId}`);

    // Visually update the sidebar immediately (optimistic update)
    updateSidebarActiveState(modelUrl);

    // Call the swap function from the asset loader
    swapModel(modelUrl, currentSceneId, scene); // Use swapModel from assetLoader
}

function updateSidebarActiveState(activeModelUrl) {
    // ... (keep existing implementation) ...
    if (!modelList) return;
    const buttons = modelList.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.dataset.modelUrl === activeModelUrl) {
            btn.classList.add('active-model');
        } else {
            btn.classList.remove('active-model');
        }
    });
}

// --- 3D Showroom Initialization ---
// (Keep this as it is - looks correct, including lock/unlock logic)
function initShowroom() {
    console.log("initShowroom: Setting up BASE scene elements...");

    const container = document.getElementById('showroom-container');
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    // Check if crucial elements exist *within the container*
    if (!container || !blocker || !instructions) {
        // Ensure the error points to the correct potential missing elements
        console.error("Crucial elements missing for initShowroom. Check IDs: showroom-container, blocker, instructions.", { container, blocker, instructions });
        throw new Error("Crucial elements missing for initShowroom!");
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);
    scene.fog = new THREE.Fog(0xdddddd, 10, 60); // Adjust fog distance if needed

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100); // Adjusted far plane
    camera.position.set(0, eyeLevel, 5); // Standard eye-level and distance


    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // IMPORTANT: Append renderer to the CORRECT container
    container.appendChild(renderer.domElement); // Append canvas inside #showroom-container

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    // Adjust shadow camera bounds if needed based on scene size
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    // Optional: Add a target for the light if needed, or let it point towards origin
    // directionalLight.target.position.set(0, 0, 0);
    // scene.add(directionalLight.target);
    // const helper = new THREE.DirectionalLightHelper( directionalLight, 5 ); // Helper for debugging
    // scene.add( helper );
    // const shadowHelper = new THREE.CameraHelper( directionalLight.shadow.camera ); // Helper for debugging shadow bounds
    // scene.add( shadowHelper );


    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    // --- Lock/Unlock/Back Button Logic ---
    blocker.style.display = 'flex'; // Show blocker initially inside the container
    instructions.style.display = '';

    function removeBackButton() {
        const btn = document.getElementById('back-to-menu-button');
        if (btn) btn.remove();
    }

    instructions.addEventListener('click', () => {
        console.log("Instructions clicked - locking controls.");
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        console.log("Controls Locked.");
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        removeBackButton();
        // Show sidebar only if it has content (populateSidebar handles this check)
        if (modelList && modelList.children.length > 0) {
            modelSidebar.style.display = 'flex';
        } else {
            modelSidebar.style.display = 'none';
        }
    });

    controls.addEventListener('unlock', () => {
        console.log("Controls Unlocked.");
        blocker.style.display = 'flex'; // Show blocker again
        instructions.style.display = '';
        if (modelSidebar) modelSidebar.style.display = 'none'; // Hide sidebar when unlocked

        removeBackButton(); // Ensure no duplicates
        const backButton = document.createElement('button');
        backButton.id = 'back-to-menu-button';
        backButton.textContent = 'Back to Menu';
        backButton.classList.add('enter-button'); // Use fancy style

        backButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent blocker click if button is clicked
            console.log("'Back to Menu' button clicked.");

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId); // Stop animation loop if returning
                animationFrameId = null;
            }

            if (showroomContainer) showroomContainer.style.display = 'none';
            if (carouselContainer) carouselContainer.classList.remove('hidden');

            if (scene) {
                console.log("Clearing all assets before returning to menu...");
                clearAllAssets(scene);
            }
            if (modelSidebar) modelSidebar.style.display = 'none';
            if (modelList) modelList.innerHTML = '';
            currentSceneId = null;

            removeBackButton(); // Remove the button itself
            // Reset movement keys just in case
            moveForward = moveBackward = moveLeft = moveRight = false;
        });
        blocker.appendChild(backButton); // Append button to blocker
        console.log("'Back to Menu' button added.");
    });
    // --- End Lock/Unlock ---

    // Input Listeners (WASD) - CORRECTED (removed comments)
    const onKeyDown = (event) => {
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

    // BASE Scene Content (Floor Only)
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    console.log("initShowroom: Base floor added.");

    // Resize Listener
    window.addEventListener('resize', onWindowResize);

    // Start Animation Loop ONLY if not already running
    if (!animationFrameId) {
        animateShowroom();
    }


    console.log("initShowroom: Base setup complete.");
}


// --- Window Resize Handler ---
// (Keep as is)
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// --- Animation Loop ---
// (Keep as is, but added floor constraint value check)
function animateShowroom() {
    animationFrameId = requestAnimationFrame(animateShowroom); // Store the ID
    const delta = clock.getDelta();

    // Movement Logic
    if (controls && controls.isLocked === true) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        if (direction.lengthSq() > 0) direction.normalize();

        const speed = 35.0; // Adjusted speed (was 35.0, maybe too fast?)
        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        // Use controls methods for movement relative to view direction
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Floor constraint - Check if camera.position.y matches initShowroom setting
        const eyeLevel = 0.75; // Match camera's initial Y position
        if (controls.getObject().position.y < eyeLevel) {
            velocity.y = 0; // Prevent falling further
            controls.getObject().position.y = eyeLevel; // Reset to eye level
        }
    }

    // Render
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// --- Initial Script Load Message ---
console.log("Showroom script (Module) loaded. Waiting for interaction.");