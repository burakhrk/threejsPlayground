// showroom.js

// --- Import Asset Loader Functions ---
import { loadAssets, clearAssets } from './assetLoader.js'; // Adjust path if needed

// --- Global Variables ---
let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();
let isShowroomInitialized = false; // Flag remains useful here
let animationFrameId = null;

// --- DOM Element Selections (Keep as before) ---
console.log("Script start: Getting elements...");
const carouselContainer = document.getElementById('carousel-container');
const showroomContainer = document.getElementById('showroom-container');
const slider = document.getElementById('card-slider');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const enterButtons = document.querySelectorAll('.enter-button');
// Add logging/checks for these elements if needed

// --- Carousel Logic (Keep as before) ---
const numCards = 3;
const cardWidthPercentage = 100 / numCards;
let currentCardIndex = 0;

function updateSliderPosition() {
    if (!slider) return;
    const offset = -currentCardIndex * cardWidthPercentage;
    slider.style.transform = `translateX(${offset}%)`;
    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCardIndex === numCards - 1;
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

// Initialize slider
if (slider && prevBtn && nextBtn) {
    updateSliderPosition();
} else {
    console.warn("Cannot initialize slider - elements missing.");
}

// --- Enter Button Logic (Updated to use AssetLoader) ---
if (enterButtons && enterButtons.length > 0) {
    console.log(`Found ${enterButtons.length} enter buttons. Attaching listeners...`);
    enterButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const sceneId = button.getAttribute('data-scene-id');
            console.log(`Enter button #${index} CLICKED! Scene ID: ${sceneId}`);

            if (!carouselContainer || !showroomContainer) {
                console.error("Core container elements missing. Aborting scene entry.");
                return;
            }

            carouselContainer.classList.add('hidden'); // Hide carousel

            // Delay to allow fade-out and prevent heavy load during transition
            setTimeout(() => {
                showroomContainer.style.display = 'block'; // Show 3D area

                // Initialize base scene ONLY if it hasn't been done yet
                if (!isShowroomInitialized) {
                    console.log("First entry: Initializing base showroom...");
                    try {
                        initShowroom(); // Sets up scene, camera, renderer, lights, floor, controls
                        isShowroomInitialized = true; // Mark as initialized
                    } catch (initError) {
                        console.error("FATAL ERROR during initShowroom():", initError);
                        // Attempt recovery
                        showroomContainer.style.display = 'none';
                        carouselContainer.classList.remove('hidden');
                        return; // Stop further execution for this click
                    }
                } else {
                    console.log("Showroom already initialized. Preparing for new assets.");
                }

                // --- Use AssetLoader ---
                if (scene) { // Ensure scene exists (should after init)
                    console.log("Clearing previous assets...");
                    clearAssets(scene); // Clear assets using the imported function

                    console.log("Loading new assets for scene:", sceneId);
                    loadAssets(sceneId, scene); // Load new assets using the imported function
                } else {
                    console.error("Scene object not available, cannot clear/load assets!");
                }
                // --- End AssetLoader Usage ---

                // Optional: Reset camera, controls state if needed for the new scene
                // resetCameraForScene(sceneId);
                // if (controls && !controls.isLocked) controls.lock(); // Or prompt lock again?

            }, 500); // Match CSS transition time
        });
    });
} else {
    console.error("Could not find any 'enter-button' elements.");
}


// --- 3D Showroom Initialization (BASE SETUP ONLY) ---
function initShowroom() {
    console.log("initShowroom: Setting up BASE scene elements...");

    const container = document.getElementById('showroom-container');
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    if (!container || !blocker || !instructions) {
        throw new Error("Crucial elements (container, blocker, instructions) missing for initShowroom!");
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);
    scene.fog = new THREE.Fog(0xdddddd, 0, 75);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 0.7;
    camera.position.z = 5;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    scene.add(directionalLight.target); // Good practice

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    // --- Lock/Unlock/Back Button Logic (Updated to use AssetLoader) ---
    blocker.style.display = 'flex'; // Start with blocker visible
    instructions.style.display = '';

    function removeBackButton() {
        const btn = document.getElementById('back-to-menu-button');
        if (btn) btn.remove();
    }

    instructions.addEventListener('click', () => { controls.lock(); });

    controls.addEventListener('lock', () => {
        console.log("Controls Locked.");
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        removeBackButton();
    });

    controls.addEventListener('unlock', () => {
        console.log("Controls Unlocked.");
        blocker.style.display = 'flex';
        instructions.style.display = '';

        removeBackButton(); // Ensure no duplicates
        const backButton = document.createElement('button');
        backButton.id = 'back-to-menu-button';
        backButton.textContent = 'Back to Menu';
        backButton.classList.add('enter-button'); // Use fancy style

        backButton.addEventListener('click', () => {
            console.log("'Back to Menu' button clicked.");
            if (showroomContainer) showroomContainer.style.display = 'none';
            if (carouselContainer) carouselContainer.classList.remove('hidden');

            // --- Use AssetLoader on Back ---
            if (scene) {
                console.log("Clearing assets before returning to menu...");
                clearAssets(scene); // Clear assets using the imported function
            }
            // --- End AssetLoader Usage ---

            removeBackButton(); // Remove the button itself
        });
        blocker.appendChild(backButton);
        console.log("'Back to Menu' button added.");
    });
    // --- End Lock/Unlock ---

    // Input Listeners (WASD)
    const onKeyDown = (event) => { /* ... WASD logic ... */
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
        }
    };
    const onKeyUp = (event) => { /* ... WASD logic ... */
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

    // Start Animation Loop
    animateShowroom(); // Ensure this is defined and working

    console.log("initShowroom: Base setup complete.");
}


// --- Window Resize Handler (Keep as before) ---
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// --- Animation Loop (Keep as before) ---
function animateShowroom() {
    animationFrameId = requestAnimationFrame(animateShowroom);
    const delta = clock.getDelta();

    // Movement Logic
    if (controls && controls.isLocked === true) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        if (direction.lengthSq() > 0) direction.normalize();

        const speed = 20.0;
        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        if (controls.moveRight) controls.moveRight(-velocity.x * delta);
        if (controls.moveForward) controls.moveForward(-velocity.z * delta);

        const camObject = controls.getObject ? controls.getObject() : null;
        if (camObject && camObject.position.y < 1.6) {
            velocity.y = 0;
            camObject.position.y = 1.6;
        }
    }

    // Render
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// --- Initial Script Load Message ---
console.log("Showroom script (Module) loaded. Waiting for interaction.");   