// --- Global Variables for 3D Scene ---
let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();
let animationFrameId = null; // To potentially stop the animation loop if needed

// --- Carousel Logic ---
const carouselContainer = document.getElementById('carousel-container');
const showroomContainer = document.getElementById('showroom-container');
const slider = document.getElementById('card-slider');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const enterButtons = document.querySelectorAll('.enter-button');

const numCards = 3; // Total number of cards
const cardWidthPercentage = 100 / numCards;
let currentCardIndex = 0;
let isShowroomInitialized = false; // Flag to prevent multiple initializations

function updateSliderPosition() {
    const offset = -currentCardIndex * cardWidthPercentage;
    slider.style.transform = `translateX(${offset}%)`;

    // Update arrow disabled state
    prevBtn.disabled = currentCardIndex === 0;
    nextBtn.disabled = currentCardIndex === numCards - 1;
}

prevBtn.addEventListener('click', () => {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        updateSliderPosition();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentCardIndex < numCards - 1) {
        currentCardIndex++;
        updateSliderPosition();
    }
});

enterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const sceneId = button.getAttribute('data-scene-id'); // Get which card was clicked
        console.log(`Entering scene: ${sceneId}`); // You can use this later

        // Hide carousel smoothly
        carouselContainer.classList.add('hidden');

        // Use setTimeout to wait for fade-out transition before showing 3D view
        setTimeout(() => {
            // Show the 3D container
            showroomContainer.style.display = 'block';

            // Initialize the 3D scene ONLY if it hasn't been already
            if (!isShowroomInitialized) {
                initShowroom(); // Call the 3D initialization
                isShowroomInitialized = true;
            } else {
                // If already initialized, maybe just reset camera/state?
                // For now, we assume entering once is enough.
                 console.log("Showroom already initialized.");
                 // Optional: Maybe re-lock controls if needed or reset camera
                 // resetShowroomState();
            }
        }, 500); // Match the CSS transition duration (0.5s)
    });
});

// Initialize slider position on load
updateSliderPosition();


// --- 3D Showroom Initialization and Animation ---

function initShowroom() {
    console.log("Initializing Showroom...");

    // Get the container for the 3D view
    const container = document.getElementById('showroom-container');
    // Get blocker/instructions which are now inside the container
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');


    // Scene
    scene = new THREE.Scene();
    // Let's use a less jarring background color now
    scene.background = new THREE.Color(0xdddddd);
    scene.fog = new THREE.Fog(0xdddddd, 0, 75); // Adjust fog

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // Eye level
    camera.position.z = 5;  // Start back
    console.log("3D Camera Position:", camera.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding; // Use sRGB for better colors
    // Append renderer canvas to the showroom container, not body
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    // Re-enable shadows if desired
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024; // Adjust shadow quality
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    scene.add(directionalLight.target); // Add target for better control


    // Controls - Attach to the container now or body? Body might be safer for fullscreen lock
    controls = new THREE.PointerLockControls(camera, document.body);

    // Make sure blocker/instructions are visible initially within the 3D view
    blocker.style.display = 'flex';
    instructions.style.display = '';


    instructions.addEventListener('click', function () {
        console.log("3D Instructions clicked, requesting lock...");
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        console.log("3D Controls Locked.");
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
        console.log("3D Controls Unlocked.");
        blocker.style.display = 'flex'; // Show blocker when unlocked
        instructions.style.display = '';
    });

    // Input Listeners (These should only be active for the 3D view)
    const onKeyDown = function (event) {
        // Only process keys if controls are potentially locked or active
        // (Could add check: if (!showroomContainer.classList.contains('visible')) return;)
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': moveRight = true; break;
        }
    };
    const onKeyUp = function (event) {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': moveForward = false; break;
            case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': moveBackward = false; break;
            case 'ArrowRight': case 'KeyD': moveRight = false; break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);


    // --- Simple Scene Content (Floor and Box) ---
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
    floorMaterial.receiveShadow = true; // Shadows require Standard or Physical material
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true; // Let floor receive shadows
    scene.add(floor);

    // Green Box at Origin
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    // Use MeshStandardMaterial for shadows and realistic lighting
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = 0.5; // Sit on the floor
    box.castShadow = true; // Let box cast shadows
    box.receiveShadow = true;
    scene.add(box);
    console.log("3D Green box added at origin.");


    // Add Resize Listener specific to the 3D view
    window.addEventListener('resize', onWindowResize);

    console.log("Showroom Initialization Complete. Starting animation loop.");
    // Start the animation loop *after* initialization
    animateShowroom();
}

function onWindowResize() {
    // Check if camera/renderer exist before resizing (might be called early)
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function animateShowroom() {
    // Store the frame ID so we can cancel it if needed (e.g., exiting showroom)
    animationFrameId = requestAnimationFrame(animateShowroom);

    const delta = clock.getDelta();

    // Movement Logic (Only if controls are locked)
    if (controls && controls.isLocked === true) {
        velocity.x -= velocity.x * 10.0 * delta; // Damping
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // Ensures consistent movement speed

        const speed = 20.0; // Adjusted speed might be needed

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Floor constraint
        if (controls.getObject().position.y < 1.6) {
             velocity.y = 0;
             controls.getObject().position.y = 1.6;
        }
    }

    // Render
    if (renderer && scene && camera) {
         try {
             renderer.render(scene, camera);
         } catch(renderError) {
             console.error("Renderer error:", renderError);
             // cancelAnimationFrame(animationFrameId); // Option: Stop loop on error
         }
    }
}

console.log("Main script loaded. Waiting for user interaction.");
// Note: We don't call initShowroom() or animateShowroom() here anymore.
// They are triggered by the 'Enter' button click.
