// --- Basic Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc); // Room background/fog color

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6; // Simulate average eye height
camera.position.z = 2; // Start slightly back from the center

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
renderer.outputEncoding = THREE.sRGBEncoding; // Correct color output
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // White light, moderate intensity
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 10); // Position the light source
directionalLight.castShadow = true;
// Configure shadow properties
directionalLight.shadow.mapSize.width = 2048; // Higher resolution shadows
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
scene.add(directionalLight);
scene.add(directionalLight.target); // Important for directing the light

// --- Controls (Pointer Lock for Mouse Look) ---
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const controls = new THREE.PointerLockControls(camera, renderer.domElement);

instructions.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    blocker.style.display = 'flex'; // Use flex again
    instructions.style.display = '';
});

scene.add(controls.getObject()); // Add the camera controlled by PointerLockControls

// --- Input Handling (WASD Movement) ---
const keyStates = {};
document.addEventListener('keydown', (event) => {
    keyStates[event.code] = true;
    // Prevent default browser actions for movement keys
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
    }
});
document.addEventListener('keyup', (event) => {
    keyStates[event.code] = false;
});

const moveSpeed = 5.0; // Units per second

// --- Environment Setup (Room) ---
const roomSize = { width: 30, height: 5, depth: 30 };

// Floor
const floorGeometry = new THREE.PlaneGeometry(roomSize.width, roomSize.depth);
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa, // Slightly darker floor
    roughness: 0.8,
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
floor.receiveShadow = true; // Floor should receive shadows
scene.add(floor);

// Ceiling
const ceilingGeometry = new THREE.PlaneGeometry(roomSize.width, roomSize.depth);
const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0, // Light ceiling
    side: THREE.DoubleSide, // Visible from below
    roughness: 0.9
});
const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
ceiling.position.y = roomSize.height;
ceiling.rotation.x = Math.PI / 2; // Rotate to face down
ceiling.receiveShadow = true; // Can receive bounced light (indirectly)
scene.add(ceiling);

// Walls
const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0, // Slightly warmer wall color
    side: THREE.DoubleSide, // Render both sides
    roughness: 0.9
});

const wallGeometryZ = new THREE.PlaneGeometry(roomSize.width, roomSize.height);
const wallBack = new THREE.Mesh(wallGeometryZ, wallMaterial);
wallBack.position.set(0, roomSize.height / 2, -roomSize.depth / 2);
wallBack.receiveShadow = true;
scene.add(wallBack);

const wallFront = new THREE.Mesh(wallGeometryZ, wallMaterial);
wallFront.position.set(0, roomSize.height / 2, roomSize.depth / 2);
wallFront.rotation.y = Math.PI;
wallFront.receiveShadow = true;
scene.add(wallFront);

const wallGeometryX = new THREE.PlaneGeometry(roomSize.depth, roomSize.height);
const wallLeft = new THREE.Mesh(wallGeometryX, wallMaterial);
wallLeft.position.set(-roomSize.width / 2, roomSize.height / 2, 0);
wallLeft.rotation.y = Math.PI / 2;
wallLeft.receiveShadow = true;
scene.add(wallLeft);

const wallRight = new THREE.Mesh(wallGeometryX, wallMaterial);
wallRight.position.set(roomSize.width / 2, roomSize.height / 2, 0);
wallRight.rotation.y = -Math.PI / 2;
wallRight.receiveShadow = true;
scene.add(wallRight);

// --- Texture Loading ---
const textureLoader = new THREE.TextureLoader();
// Add error handling for texture loading
function loadTexture(path, encoding = THREE.LinearEncoding) {
    return textureLoader.load(path,
        (tex) => { // onLoad callback
            tex.encoding = encoding;
            tex.needsUpdate = true;
            console.log(`Texture loaded: ${path}`);
        },
        undefined, // onProgress callback (optional)
        (err) => { // onError callback
            console.error(`Error loading texture: ${path}. Ensure the 'textures' folder exists at the root and contains the file.`, err);
            // Add a visual indicator maybe? Like making the object red.
        }
    );
}

// **IMPORTANT**: Make sure you have a 'textures' folder at the root of your
// deployed project (same level as index.html) and these files are inside it.
// If your filenames are different, change them here.
const towelTexture = loadTexture('textures/towel_placeholder_diffuse.jpg', THREE.sRGBEncoding);
towelTexture.wrapS = THREE.RepeatWrapping;
towelTexture.wrapT = THREE.RepeatWrapping;
towelTexture.repeat.set(2, 2);
const towelNormalMap = loadTexture('textures/towel_placeholder_normal.jpg');

const bathrobeTexture = loadTexture('textures/bathrobe_placeholder_diffuse.jpg', THREE.sRGBEncoding);

// --- Add Textile Items (Using Placeholders) ---

const foldedTowelGeometry = new THREE.BoxGeometry(0.8, 0.5, 0.5); // Width, Height, Depth
const foldedTowelMaterial = new THREE.MeshStandardMaterial({
    map: towelTexture, // Base color texture
    normalMap: towelNormalMap, // Adds bumpy detail
    roughness: 0.9, // Towels are usually not shiny
    metalness: 0.0, // Non-metallic
});
const foldedTowel = new THREE.Mesh(foldedTowelGeometry, foldedTowelMaterial);
foldedTowel.position.set(-3, 0.25, -4); // Position on the floor
foldedTowel.castShadow = true;
foldedTowel.receiveShadow = true;
scene.add(foldedTowel);

const hangingBathrobeGeometry = new THREE.PlaneGeometry(1, 1.5); // Simple plane
const hangingBathrobeMaterial = new THREE.MeshStandardMaterial({
    map: bathrobeTexture,
    side: THREE.DoubleSide, // Visible from both sides
    roughness: 0.85,
    metalness: 0.0,
    // Add normal map etc. for bathrobe if available
});
const hangingBathrobe = new THREE.Mesh(hangingBathrobeGeometry, hangingBathrobeMaterial);
hangingBathrobe.position.set(3, 1.6, -5); // Position it hanging
hangingBathrobe.castShadow = true;
scene.add(hangingBathrobe);

const standGeometry = new THREE.BoxGeometry(0.2, 1.2, 0.2);
const standMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4 });
const stand = new THREE.Mesh(standGeometry, standMaterial);
stand.position.set(0, 0.6, -6);
stand.castShadow = true;
stand.receiveShadow = true;
scene.add(stand);

const drapedTowelGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.5); // Draped towel shape
const drapedTowel = new THREE.Mesh(drapedTowelGeometry, foldedTowelMaterial); // Reuse towel material
drapedTowel.position.set(0, 1.15, -6); // Position on top of stand
drapedTowel.rotation.z = Math.PI / 16; // Slight angle
drapedTowel.castShadow = true;
drapedTowel.receiveShadow = true;
scene.add(drapedTowel);

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // --- Handle Movement ---
    if (controls.isLocked === true) {
        // Calculate movement direction based on keys pressed *this frame*
        const moveDirection = {
            forward: Number(keyStates['KeyW'] || keyStates['ArrowUp']) - Number(keyStates['KeyS'] || keyStates['ArrowDown']),
            right: Number(keyStates['KeyD'] || keyStates['ArrowRight']) - Number(keyStates['KeyA'] || keyStates['ArrowLeft'])
        };

        // Calculate distance to move this frame
        const moveDistanceForward = moveDirection.forward * moveSpeed * delta;
        const moveDistanceRight = moveDirection.right * moveSpeed * delta;

        // Apply movement using PointerLockControls methods
        if (moveDistanceForward !== 0) {
            controls.moveForward(moveDistanceForward);
        }
        if (moveDistanceRight !== 0) {
            controls.moveRight(moveDistanceRight);
        }

        // Simple floor constraint: Reset Y position after movement
        controls.getObject().position.y = 1.6;

        // Prevent moving outside the basic room boundaries
        const camPos = controls.getObject().position;
        const padding = 1.0; // How close to the wall you can get
        camPos.x = Math.max(-roomSize.width / 2 + padding, Math.min(roomSize.width / 2 - padding, camPos.x));
        camPos.z = Math.max(-roomSize.depth / 2 + padding, Math.min(roomSize.depth / 2 - padding, camPos.z));
    }

    // --- Rendering ---
    renderer.render(scene, camera);
}

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// --- Start the Loop ---
animate();

console.log("Showroom script loaded. Ensure 'textures' folder and image files exist.");
