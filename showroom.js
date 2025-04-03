// --- Import Asset Loader ---
import * as THREE from 'three'; // Assuming you're using modules and have THREE installed
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Make sure path is correct
import { loadInitialAssets, clearAllAssets, swapModel, showroomAssetConfig } from './assetLoader.js';

// --- Global Variables ---
let camera, scene, renderer, controls; // controls is OrbitControls
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false; // <<< ADDED for Q/E
const clock = new THREE.Clock();
let isShowroomInitialized = false;
let animationFrameId = null;
let currentSceneId = null;

// --- Movement Variables (Smoother Panning/Flying) ---
const panVelocity = new THREE.Vector3(); // Current movement speed vector (XYZ)
const PAN_ACCELERATION = 15.0;           // Units per second^2 - How fast movement speeds up
const PAN_DAMPING_FACTOR = 0.90;         // Multiplier per second - lower values stop faster
const MIN_PAN_SPEED = 0.01;              // Speed below which velocity is zeroed out

// --- DOM Element Selections ---
const carouselContainer = document.getElementById('carousel-container');
const showroomContainer = document.getElementById('showroom-container');
const slider = document.getElementById('card-slider');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const enterButtons = document.querySelectorAll('.enter-button[data-scene-id]');
const modelSidebar = document.getElementById('model-sidebar');
const modelList = document.getElementById('model-list');
const permanentBackButton = document.getElementById('permanent-back-button');

// --- Carousel Logic ---
const cardElements = document.querySelectorAll('#card-slider .card');
const numCards = cardElements.length;
let currentCardIndex = 0;
function updateSliderPosition() {
    if (!slider || !numCards) { console.warn("Slider/cards not found"); return; }
    const cardWidthPercentage = 100 / numCards;
    const offset = -currentCardIndex * cardWidthPercentage;
    slider.style.transform = `translateX(${offset}%)`;
    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCardIndex >= numCards - 1;
}
if (prevBtn) prevBtn.addEventListener('click', () => { if (currentCardIndex > 0) { currentCardIndex--; updateSliderPosition(); } });
if (nextBtn) nextBtn.addEventListener('click', () => { if (currentCardIndex < numCards - 1) { currentCardIndex++; updateSliderPosition(); } });
if (slider && numCards > 0) {
    slider.style.width = `${numCards * 100}%`;
    cardElements.forEach(card => card.style.flex = `0 0 calc(100% / ${numCards})`);
    updateSliderPosition();
    console.log(`Carousel initialized with ${numCards} cards.`);
} else { console.warn("Cannot initialize slider."); }

// --- Back Button Logic ---
if (permanentBackButton) {
    permanentBackButton.addEventListener('click', () => {
        console.log("'Permanent Back to Menu' button clicked.");
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
        if (showroomContainer) showroomContainer.style.display = 'none';
        permanentBackButton.style.display = 'none';
        if (carouselContainer) carouselContainer.classList.remove('hidden');
        if (scene) { console.log("Clearing assets..."); clearAllAssets(scene); }
        if (modelSidebar) modelSidebar.style.display = 'none';
        if (modelList) modelList.innerHTML = '';
        currentSceneId = null;
        // Reset movement keys and velocity
        moveForward = moveBackward = moveLeft = moveRight = moveUp = moveDown = false;
        panVelocity.set(0, 0, 0);
    });
} else { console.error("Permanent back button not found!"); }

// --- Enter Button Logic ---
if (enterButtons && enterButtons.length > 0) {
    enterButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const sceneId = button.getAttribute('data-scene-id');
            if (!sceneId) { console.error(`Button #${index} missing data-scene-id`); return; }
            console.log(`Enter button #${index} CLICKED! Scene ID: ${sceneId}`);
            currentSceneId = sceneId;
            if (!carouselContainer || !showroomContainer) { console.error("Core containers missing"); return; }
            carouselContainer.classList.add('hidden');
            setTimeout(() => {
                showroomContainer.style.display = 'block';
                if (permanentBackButton) permanentBackButton.style.display = 'block';
                if (!isShowroomInitialized) {
                    console.log("Initializing base showroom...");
                    try {
                        initShowroom(); isShowroomInitialized = true;
                    } catch (initError) {
                        console.error("FATAL ERROR during initShowroom():", initError);
                        showroomContainer.style.display = 'none';
                        if (permanentBackButton) permanentBackButton.style.display = 'none';
                        carouselContainer.classList.remove('hidden');
                        currentSceneId = null;
                        return; // Stop execution on init error
                    }
                } else {
                    console.log("Showroom already initialized.");
                    onWindowResize(); // Ensure size is correct
                }

                // Ensure scene, camera, controls are ready BEFORE loading assets
                if (scene && camera && controls) {
                    console.log("Loading assets for:", sceneId);
                    // Pass camera and controls to potentially set initial positions/targets
                    loadInitialAssets(sceneId, scene, camera, controls);
                    console.log("Populating sidebar for:", sceneId);
                    populateSidebar(sceneId);
                } else {
                    console.error("Scene, Camera, or Controls object not available before loading assets!");
                    if (permanentBackButton) permanentBackButton.click(); // Go back if essentials are missing
                    return;
                }

                if (!animationFrameId) {
                    console.log("Starting animation loop.");
                    animateShowroom();
                }
            }, 500); // Delay for transition
        });
    });
} else { console.error("Could not find any '.enter-button' elements with 'data-scene-id'."); }

// --- Sidebar Functions ---
function populateSidebar(sceneId) {
    console.log(`--- Populating sidebar for scene: ${sceneId} ---`);
    if (!modelList || !showroomAssetConfig || !modelSidebar) { console.error("Sidebar elements/config missing."); if (modelSidebar) modelSidebar.style.display = 'none'; return; }
    modelList.innerHTML = '';
    const categoryConfig = showroomAssetConfig[sceneId];
    if (!categoryConfig) { console.warn(`Sidebar: No config for scene ${sceneId}.`); modelSidebar.style.display = 'none'; return; }
    const swappableItems = categoryConfig.filter(item => item.swappable === true);
    console.log(`Found ${swappableItems.length} swappable items.`);
    if (swappableItems.length <= 1) {
        console.log("Hiding sidebar (<= 1 swappable item).");
        modelSidebar.style.display = 'none';
    } else {
        const initialSwappableConfig = categoryConfig.find(item => item.swappable === true);
        const initialSwappableUrl = initialSwappableConfig ? initialSwappableConfig.url : null;
        swappableItems.forEach(itemConfig => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = itemConfig.name;
            button.dataset.modelUrl = itemConfig.url;
            if (itemConfig.url === initialSwappableUrl) button.classList.add('active-model');
            button.addEventListener('click', handleSidebarClick);
            li.appendChild(button);
            modelList.appendChild(li);
        });
        console.log(`Sidebar populated. Setting display to flex.`);
        modelSidebar.style.display = 'flex'; // Show sidebar
    }
}
function handleSidebarClick(event) {
    const button = event.currentTarget; const modelUrl = button.dataset.modelUrl;
    if (!modelUrl || !currentSceneId || !scene) { console.error("Missing data for sidebar click"); return; }
    if (button.classList.contains('active-model')) { console.log("Sidebar click: Model already active."); return; }
    console.log(`Sidebar click: Requesting swap to ${modelUrl}`);
    updateSidebarActiveState(modelUrl); swapModel(modelUrl, currentSceneId, scene);
}
function updateSidebarActiveState(activeModelUrl) {
    if (!modelList) return; const buttons = modelList.querySelectorAll('button');
    buttons.forEach(btn => { btn.classList.toggle('active-model', btn.dataset.modelUrl === activeModelUrl); });
    console.log(`Sidebar active state updated.`);
}

// --- 3D Showroom Initialization (MODIFIED: Adds Q/E Key Listeners) ---
function initShowroom() {
    console.log("initShowroom: Setting up BASE scene with OrbitControls...");
    const container = document.getElementById('showroom-container');
    if (!container) throw new Error("#showroom-container missing!");

    // --- Scene, Camera, Renderer, Lighting ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);
    scene.fog = new THREE.Fog(0xeeeeee, 15, 70);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 7); // Default start - overridden by loadInitialAssets

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
    directionalLight.position.set(5, 10, 7.5); directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024; directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15; directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15; directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);

    // --- OrbitControls ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false; // Pan parallel to ground plane
    controls.minDistance = 1; controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent looking under floor initially
    controls.target.set(0, 0.5, 0); // Default target - overridden by loadInitialAssets
    controls.update();

    // --- Key Listeners (WASDQE + Space) ---
    const onKeyDown = (event) => {
        if (showroomContainer.style.display !== 'block' || !currentSceneId) return; // Only when active
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
            case 'KeyQ': moveUp = true; break;       // <<< ADDED
            case 'KeyE': moveDown = true; break;     // <<< ADDED
            case 'Space':
                event.preventDefault(); // Stop browser scroll/action
                panVelocity.set(0, 0, 0); // Reset velocity immediately
                console.log("Movement stopped via Spacebar.");
                break;
        }
    };
    const onKeyUp = (event) => {
        if (showroomContainer.style.display !== 'block' || !currentSceneId) return; // Only when active
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = false; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': moveBackward = false; break;
            case 'ArrowRight': case 'KeyD': moveRight = false; break;
            case 'KeyQ': moveUp = false; break;       // <<< ADDED
            case 'KeyE': moveDown = false; break;     // <<< ADDED
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    // --- End Key Listeners ---

    // --- Floor ---
    const floorGeometry = new THREE.PlaneGeometry(60, 60);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    window.addEventListener('resize', onWindowResize);
    console.log("initShowroom: Base setup complete with WASDQE + Space controls.");
}

// --- Window Resize Handler ---
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// --- Animation Loop (MODIFIED: Incorporates Q/E vertical movement) ---
const forwardVector = new THREE.Vector3(); // Reusable vector for forward direction
const sideVector = new THREE.Vector3();    // Reusable vector for side direction
const worldUp = new THREE.Vector3(0, 1, 0); // Constant world up vector
const panDelta = new THREE.Vector3();      // Calculated movement delta for this frame

function animateShowroom() {
    animationFrameId = requestAnimationFrame(animateShowroom);
    const delta = Math.min(clock.getDelta(), 0.1); // Get delta time, clamp max value

    // --- Calculate Desired Movement Direction (Combined WASDQE) ---
    let moveDirection = new THREE.Vector3(0, 0, 0); // Reset each frame

    if (camera && controls) { // Ensure camera and controls are available
        // --- Horizontal (WASD) based on camera's XZ direction ---
        camera.getWorldDirection(forwardVector);
        forwardVector.y = 0; // Project onto the horizontal plane (XZ)
        forwardVector.normalize();
        sideVector.crossVectors(worldUp, forwardVector).normalize(); // Calculate right vector (perpendicular to forward on XZ)

        if (moveForward) moveDirection.add(forwardVector);
        if (moveBackward) moveDirection.sub(forwardVector);
        if (moveLeft) moveDirection.add(sideVector);    // Add for left (negative cross product)
        if (moveRight) moveDirection.sub(sideVector);   // Subtract for right (positive cross product)

        // --- Vertical (QE) - directly affects the Y component ---
        if (moveUp) moveDirection.y += 1;
        if (moveDown) moveDirection.y -= 1;

        // --- Normalize the final combined direction vector ---
        // Only normalize if there's *any* movement input to avoid normalizing (0,0,0) -> NaN
        if (moveDirection.lengthSq() > 0.0001) { // Use squared length for efficiency check
            moveDirection.normalize(); // Ensures consistent speed regardless of direction(s) pressed
        }
    }

    // --- Apply Acceleration based on Input ---
    // Add acceleration if any movement key is currently pressed
    if (moveDirection.lengthSq() > 0.0001) {
        panVelocity.add(moveDirection.multiplyScalar(PAN_ACCELERATION * delta));
    }

    // --- Apply Damping (Deceleration) ---
    // Apply damping always to slow down existing velocity, even if no keys are pressed
    const damping = Math.pow(PAN_DAMPING_FACTOR, delta); // Time-corrected damping factor
    panVelocity.multiplyScalar(damping);

    // --- Stop Movement if Velocity is Very Low ---
    // Snap velocity to zero if it falls below a threshold to prevent tiny drifting
    if (panVelocity.lengthSq() < MIN_PAN_SPEED * MIN_PAN_SPEED) {
        panVelocity.set(0, 0, 0);
    }

    // --- Apply Calculated Velocity to Camera and Target ---
    // Only apply movement if there's significant velocity
    if (panVelocity.lengthSq() > 0.00001 && controls) { // Use a very small threshold
        panDelta.copy(panVelocity).multiplyScalar(delta); // Calculate position change: velocity * time

        // Apply the delta to BOTH the camera's position and the OrbitControls target
        // This results in a "fly" or "translate" movement (like Unity editor)
        controls.target.add(panDelta);
        camera.position.add(panDelta);
    }

    // --- Update OrbitControls ---
    // Essential for applying mouse input, internal damping, and target changes
    if (controls) {
        controls.update();
    }

    // --- Render the Scene ---
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    } else if (animationFrameId) {
        // If rendering components are missing but the loop is running, stop it.
        console.error("Render components missing, stopping animation loop.");
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    console.log("Showroom script loaded. OrbitControls, Smoother WASDQE Flying, Spacebar Stop. Waiting for interaction.");
}

 