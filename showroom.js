// --- Basic Setup ---
const scene = new THREE.Scene();
// Use Red background for high visibility if nothing renders
scene.background = new THREE.Color(0xff0000); // Bright Red

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- SET INITIAL CAMERA POSITION AND ORIENTATION ---
// Place the camera at a known reasonable spot
camera.position.set(0, 1.6, 5); // x=0, y=eye height, z=5 units back from center

// Make the camera look towards the center of the scene (origin)
camera.lookAt(0, 0, 0); // Look at point (0,0,0)

// IMPORTANT: Update the camera's matrices after setting position/lookAt
camera.updateMatrixWorld();
console.log("Initial Camera Position Set:", camera.position);
console.log("Initial Camera Target Set using lookAt(0,0,0)");
// --- END OF INITIAL CAMERA SETUP ---

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// --- Lighting (Keep simple lighting) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);
scene.add(directionalLight.target);

// --- Controls (Pointer Lock for Mouse Look) ---
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const controls = new THREE.PointerLockControls(camera, renderer.domElement);

// Basic click listener - just tries to lock
instructions.addEventListener('click', () => {
    console.log("Instructions clicked! Attempting lock...");
    controls.lock(); // Directly attempt lock
});

// Basic lock/unlock listeners - just hide/show overlay
controls.addEventListener('lock', () => {
    console.log("Controls Locked");
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    console.log("Controls Unlocked");
    blocker.style.display = 'flex';
    instructions.style.display = '';
});

// Add camera object managed by controls to scene
scene.add(controls.getObject());

// --- Input Handling (Keep basic structure) ---
const keyStates = {};
document.addEventListener('keydown', (event) => { keyStates[event.code] = true; if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); } });
document.addEventListener('keyup', (event) => { keyStates[event.code] = false; });
const moveSpeed = 5.0;

// --- Simplified Environment Setup ---
const roomSize = { width: 30, height: 5, depth: 30 };

// Floor (KEEP)
const floorGeometry = new THREE.PlaneGeometry(roomSize.width, roomSize.depth);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.2 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// --- Add ONE Visible Object ---
const testBoxGeometry = new THREE.BoxGeometry(1, 1, 1); // Simple 1x1x1 cube
const testBoxMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00, // Bright Green
    roughness: 0.7,
});
const testBox = new THREE.Mesh(testBoxGeometry, testBoxMaterial);
testBox.position.set(0, 0.5, 0); // Place at origin, sitting on the floor
testBox.castShadow = true;
testBox.receiveShadow = true;
scene.add(testBox);
console.log("Test box added at:", testBox.position);

// --- Animation Loop (Simplified - No NaN checks for now) ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // --- Handle Movement (Basic) ---
    if (controls.isLocked === true) {
        const moveDirection = {
            forward: Number(keyStates['KeyW'] || keyStates['ArrowUp']) - Number(keyStates['KeyS'] || keyStates['ArrowDown']),
            right: Number(keyStates['KeyD'] || keyStates['ArrowRight']) - Number(keyStates['KeyA'] || keyStates['ArrowLeft'])
        };
        const moveDistanceForward = moveDirection.forward * moveSpeed * delta;
        const moveDistanceRight = moveDirection.right * moveSpeed * delta;
        if (moveDistanceForward !== 0) controls.moveForward(moveDistanceForward);
        if (moveDistanceRight !== 0) controls.moveRight(moveDistanceRight);

        // Simple floor constraint - USE controls.getObject()
        controls.getObject().position.y = Math.max(0.5, controls.getObject().position.y); // Prevent going below floor slightly

        // Basic boundary checks - Optional for now
        // const camPos = controls.getObject().position;
        // const padding = 1.0;
        // camPos.x = Math.max(-roomSize.width / 2 + padding, Math.min(roomSize.width / 2 - padding, camPos.x));
        // camPos.z = Math.max(-roomSize.depth / 2 + padding, Math.min(roomSize.depth / 2 - padding, camPos.z));
    }

    // --- Rendering ---
    try { // Keep basic try-catch for rendering errors
      renderer.render(scene, camera);
    } catch(renderError) {
      console.error("Renderer error:", renderError);
    }
}

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// --- Start the Loop ---
animate();
console.log("Showroom script loaded and simplified. Initial camera set.");
