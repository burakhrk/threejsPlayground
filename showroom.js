let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock(); // Declare clock globally

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xff0000); // Red background for testing visibility
    scene.fog = new THREE.Fog(0xff0000, 0, 50); // Add fog matching background for distance fade

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // Eye level
    camera.position.z = 5;  // Start back
    console.log("Initial Camera Position:", camera.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    // No shadows for this simple test
    // directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Controls - Standard Setup
    controls = new THREE.PointerLockControls(camera, document.body); // Attach to document body

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', function () {
        console.log("Instructions clicked, requesting lock...");
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        console.log("Controls Locked.");
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
        console.log("Controls Unlocked.");
        blocker.style.display = 'flex';
        instructions.style.display = '';
    });

    // Add the controls object to the scene
    // NOTE: PointerLockControls *moves* the camera directly,
    // you don't typically add controls.getObject() to the scene unless
    // you are nesting it for specific reasons. Let's try without adding it first.
    // scene.add(controls.getObject()); // Let's comment this out for standard usage

    // Input Listeners
    const onKeyDown = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': moveForward = true; break;
            case 'ArrowLeft':
            case 'KeyA': moveLeft = true; break;
            case 'ArrowDown':
            case 'KeyS': moveBackward = true; break;
            case 'ArrowRight':
            case 'KeyD': moveRight = true; break;
        }
    };

    const onKeyUp = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': moveForward = false; break;
            case 'ArrowLeft':
            case 'KeyA': moveLeft = false; break;
            case 'ArrowDown':
            case 'KeyS': moveBackward = false; break;
            case 'ArrowRight':
            case 'KeyD': moveRight = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // --- Simplified Scene ---
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50); // Larger floor
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    // floor.receiveShadow = true;
    scene.add(floor);

    // Green Box at Origin
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = 0.5; // Sit on the floor
    // box.castShadow = true;
    scene.add(box);
    console.log("Green box added at origin.");

    // Handle Resize
    window.addEventListener('resize', onWindowResize);
    console.log("Initialization Complete.");
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Standard PointerLockControls Movement Logic
    if (controls.isLocked === true) {
        velocity.x -= velocity.x * 10.0 * delta; // Damping
        velocity.z -= velocity.z * 10.0 * delta;
        // velocity.y -= 9.8 * 100.0 * delta; // Gravity (optional, start without)

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // Ensures consistent movement speed in all directions

        const speed = 400.0; // Adjust speed factor as needed

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        // Move the controls object itself
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Simple floor constraint - prevent falling through floor
        if (controls.getObject().position.y < 1.6) {
             velocity.y = 0; // Stop downward velocity if hitting floor level
             controls.getObject().position.y = 1.6; // Reset to floor level
        }

    } else {
        // Optional: Reset velocity when controls are unlocked
        velocity.set(0, 0, 0);
    }

    // Render the scene
    try {
        renderer.render(scene, camera);
    } catch(renderError) {
        console.error("Renderer error:", renderError);
    }
}

console.log("Showroom script loaded (Simple Controls version).");
