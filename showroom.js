// --- Import Asset Loader ---
import { loadInitialAssets, clearAllAssets, swapModel, showroomAssetConfig } from './assetLoader.js';

// --- Global Variables ---
let camera, scene, renderer, controls; // controls is OrbitControls
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const clock = new THREE.Clock();
let isShowroomInitialized = false;
let animationFrameId = null;
let currentSceneId = null;

// --- Movement Variables (Smoother Panning) ---
const panVelocity = new THREE.Vector3(); // Current panning speed vector
const PAN_ACCELERATION = 35.0;           // Units per second^2 - How fast panning speeds up
const PAN_DAMPING_FACTOR = 0.90;         // Multiplier per second - lower values stop faster (e.g., 0.8 stops faster than 0.95)
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
        moveForward = moveBackward = moveLeft = moveRight = false; // Reset keys
        panVelocity.set(0, 0, 0); // Reset movement velocity
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
                        currentSceneId = null; return;
                    }
                } else {
                    console.log("Showroom already initialized.");
                    onWindowResize(); // Ensure size is correct
                    // Optional: Reset camera view on re-entry
                    if (controls) {
                        controls.reset(); // Resets OrbitControls state nicely
                        camera.position.set(0, 1.6, 7); // Re-apply desired start position
                        controls.target.set(0, 0.5, 0); // Re-apply desired target
                        controls.update();
                    }
                }
                if (scene) {
                    console.log("Loading assets for:", sceneId); loadInitialAssets(sceneId, scene);
                    console.log("Populating sidebar for:", sceneId); populateSidebar(sceneId);
                } else { console.error("Scene object not available!"); }
                if (!animationFrameId) { console.log("Starting animation loop."); animateShowroom(); }
            }, 500);
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
function handleSidebarClick(event) { // No changes needed
    const button = event.currentTarget; const modelUrl = button.dataset.modelUrl;
    if (!modelUrl || !currentSceneId || !scene) { console.error("Missing data for sidebar click"); return; }
    if (button.classList.contains('active-model')) { console.log("Sidebar click: Model already active."); return; }
    console.log(`Sidebar click: Requesting swap to ${modelUrl}`);
    updateSidebarActiveState(modelUrl); swapModel(modelUrl, currentSceneId, scene);
}
function updateSidebarActiveState(activeModelUrl) { // No changes needed
    if (!modelList) return; const buttons = modelList.querySelectorAll('button');
    buttons.forEach(btn => { btn.classList.toggle('active-model', btn.dataset.modelUrl === activeModelUrl); });
    console.log(`Sidebar active state updated.`);
}

// --- 3D Showroom Initialization ---
function initShowroom() {
    console.log("initShowroom: Setting up BASE scene with OrbitControls...");
    const container = document.getElementById('showroom-container');
    if (!container) throw new Error("#showroom-container missing!");

    // Scene, Camera, Renderer, Lighting, Floor (Setup remains the same)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);
    scene.fog = new THREE.Fog(0xdddddd, 15, 70); // Adjusted fog slightly

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 7); // Start position

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 10, 7.5); directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024; directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15; directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15; directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);

    // Instantiate OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false; // Keep panning parallel to ground
    controls.minDistance = 1; controls.maxDistance = 40; // Adjusted max distance
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent looking under floor
    controls.target.set(0, 0.5, 0); // Initial look-at point
    controls.update();

    // WASD Listeners (No changes needed)
    const onKeyDown = (event) => {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break; case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break; case 'ArrowRight': case 'KeyD': moveRight = true; break;
        }
    };
    const onKeyUp = (event) => {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = false; break; case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': moveBackward = false; break; case 'ArrowRight': case 'KeyD': moveRight = false; break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Floor (Setup remains the same)
    const floorGeometry = new THREE.PlaneGeometry(60, 60); // Slightly larger floor
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    window.addEventListener('resize', onWindowResize);
    console.log("initShowroom: Base setup complete.");
}

// --- Window Resize Handler ---
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        // console.log("Window resized."); // Optional log
    }
}

// --- Animation Loop (UPDATED Movement Logic) ---
const forwardVector = new THREE.Vector3(); // Reusable vectors for direction calculation
const sideVector = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
const panDelta = new THREE.Vector3(); // Calculated movement for this frame

function animateShowroom() {
    animationFrameId = requestAnimationFrame(animateShowroom);
    const delta = Math.min(clock.getDelta(), 0.1); // Get delta time, clamp to avoid large jumps

    // --- Calculate Desired Movement Direction ---
    let moveDirection = new THREE.Vector3(0, 0, 0);
    if (camera && controls) { // Ensure camera exists
        camera.getWorldDirection(forwardVector);
        forwardVector.y = 0; // Project onto XZ plane
        forwardVector.normalize();
        sideVector.crossVectors(worldUp, forwardVector).normalize(); // Get right vector

        if (moveForward) moveDirection.add(forwardVector);
        if (moveBackward) moveDirection.sub(forwardVector);
        if (moveLeft) moveDirection.add(sideVector); // Use add for left (camera space)
        if (moveRight) moveDirection.sub(sideVector); // Use sub for right (camera space)

        moveDirection.normalize(); // Ensure consistent speed regardless of direction count
    }

    // --- Apply Acceleration ---
    if (moveDirection.lengthSq() > 0.1) { // If keys are pressed (check lengthSq for efficiency)
        panVelocity.add(moveDirection.multiplyScalar(PAN_ACCELERATION * delta));
    }

    // --- Apply Damping ---
    // Calculate damping scale based on delta time
    // Avoids damping being frame-rate dependent
    const damping = Math.pow(PAN_DAMPING_FACTOR, delta); // Exponential decay
    panVelocity.multiplyScalar(damping);

    // --- Stop Movement if Velocity is Low ---
    if (panVelocity.lengthSq() < MIN_PAN_SPEED * MIN_PAN_SPEED) {
        panVelocity.set(0, 0, 0);
    }

    // --- Apply Velocity to Camera/Target ---
    if (panVelocity.lengthSq() > 0 && controls) {
        panDelta.copy(panVelocity).multiplyScalar(delta); // Movement = velocity * time
        controls.target.add(panDelta);
        camera.position.add(panDelta);
    }

    // --- Update OrbitControls ---
    if (controls) {
        controls.update(); // Applies damping from controls internal state and mouse input
    }

    // --- Render ---
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    } else if (animationFrameId) {
        console.error("Render components missing, stopping loop.");
        cancelAnimationFrame(animationFrameId); animationFrameId = null;
    }
}

// --- Initial Script Load Message ---
console.log("Showroom script loaded. OrbitControls, Smoother WASD Panning. Waiting for interaction.");