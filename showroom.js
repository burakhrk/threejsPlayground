// --- Global Variables for 3D Scene ---
let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock(); // Ensure clock is declared only once here
let animationFrameId = null; // To potentially stop the animation loop if needed

// --- Carousel Logic ---
console.log("Script start: Getting carousel elements...");

const carouselContainer = document.getElementById('carousel-container');
const showroomContainer = document.getElementById('showroom-container');
const slider = document.getElementById('card-slider');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const enterButtons = document.querySelectorAll('.enter-button'); // Get buttons

// --- DETAILED LOGGING ---
console.log("Carousel Container found:", carouselContainer);
console.log("Showroom Container found:", showroomContainer);
console.log("Slider found:", slider);
console.log("Prev Button found:", prevBtn);
console.log("Next Button found:", nextBtn);
console.log("Enter Buttons found (NodeList):", enterButtons); // Should show a list
// --- END LOGGING ---


const numCards = 3; // Total number of cards
const cardWidthPercentage = 100 / numCards;
let currentCardIndex = 0;
let isShowroomInitialized = false; // Flag to prevent multiple initializations

function updateSliderPosition() {
    if (!slider) { // Add check if slider exists
        console.error("Slider element not found in updateSliderPosition");
        return;
    }
    const offset = -currentCardIndex * cardWidthPercentage;
    slider.style.transform = `translateX(${offset}%)`;

    // Update arrow disabled state (Add checks for buttons)
    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCardIndex === numCards - 1;
}

// Check if buttons exist before adding listeners
if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        console.log("Prev button clicked"); // Log click
        if (currentCardIndex > 0) {
            currentCardIndex--;
            updateSliderPosition();
        }
    });
} else {
    console.error("Previous button not found, cannot add listener.");
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        console.log("Next button clicked"); // Log click
        if (currentCardIndex < numCards - 1) {
            currentCardIndex++;
            updateSliderPosition();
        }
    });
} else {
    console.error("Next button not found, cannot add listener.");
}

// Check if enterButtons were found and iterate
if (enterButtons && enterButtons.length > 0) {
    console.log(`Found ${enterButtons.length} enter buttons. Attaching listeners...`);
    enterButtons.forEach((button, index) => {
        console.log(`Attaching listener to Enter button #${index}`);
        button.addEventListener('click', () => {
            // --- DETAILED LOGGING INSIDE CLICK HANDLER ---
            console.log(`Enter button #${index} CLICKED!`);
            // ---
            const sceneId = button.getAttribute('data-scene-id');
            console.log(`Entering scene: ${sceneId}`);

            if (carouselContainer) {
                 console.log("Hiding carousel...");
                 carouselContainer.classList.add('hidden');
            } else {
                 console.error("Cannot hide carousel - element not found.");
                 return; // Stop if container is missing
            }


            setTimeout(() => {
                console.log("Timeout executing...");
                 if (showroomContainer) {
                     console.log("Showing showroom container...");
                     showroomContainer.style.display = 'block';
                 } else {
                     console.error("Cannot show showroom - element not found.");
                     return; // Stop if container is missing
                 }


                console.log("Checking if init needed. isShowroomInitialized =", isShowroomInitialized);
                if (!isShowroomInitialized) {
                    console.log("Calling initShowroom()...");
                    try {
                        initShowroom(); // Call the 3D initialization
                        console.log("initShowroom() call appears complete (check for internal errors).");
                        isShowroomInitialized = true;
                    } catch(initError) {
                        console.error("ERROR occurred during initShowroom() call:", initError);
                    }
                } else {
                    console.log("Showroom already initialized.");
                     // Optional: Maybe re-lock controls if needed or reset camera
                     // resetShowroomState();
                }
            }, 500); // Match the CSS transition duration (0.5s)
        });
    });
} else {
    console.error("Could not find any elements with class 'enter-button'. Listeners not attached.");
}

// Initialize slider position on load (check elements first)
if (slider && prevBtn && nextBtn) {
     console.log("Initializing slider position.");
     updateSliderPosition();
} else {
     console.warn("Skipping initial slider update as some carousel elements were not found.");
}


// --- 3D Showroom Initialization and Animation ---

function initShowroom() {
    console.log("Initializing Showroom (Inside initShowroom function)...");

    // Get the container for the 3D view
    const container = document.getElementById('showroom-container');
    // Get blocker/instructions which are now inside the container
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    // --- CSS Reminder ---
    // Make sure your CSS includes:
    // #blocker { flex-direction: column; /* ... other styles */ }
    // #back-to-menu-button { margin-top: 25px; /* ... other styles */ }
    // And ensure the .enter-button styles are defined as previously discussed.
    // --- End CSS Reminder ---


    // Add checks for these elements too
    console.log("initShowroom: Container found:", container);
    console.log("initShowroom: Blocker found:", blocker);
    console.log("initShowroom: Instructions found:", instructions);

    if (!container || !blocker || !instructions) {
        console.error("Crucial elements for initShowroom not found inside initShowroom! Aborting init.");
        if (carouselContainer) carouselContainer.classList.remove('hidden');
        if (showroomContainer) showroomContainer.style.display = 'none';
        return; // Prevent initialization if elements are missing
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);
    scene.fog = new THREE.Fog(0xdddddd, 0, 75);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // Eye level
    camera.position.z = 5;  // Start back
    console.log("initShowroom: 3D Camera Position:", camera.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    console.log("initShowroom: Renderer created and appended.");

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    scene.add(directionalLight.target);
    console.log("initShowroom: Lighting added.");

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);
    console.log("initShowroom: PointerLockControls initialized.");

    // Make sure blocker/instructions are visible initially within the 3D view
    blocker.style.display = 'flex';
    instructions.style.display = '';

    // --- Helper function for removing the back button ---
    function removeBackButton() {
        const existingBackButton = document.getElementById('back-to-menu-button');
        if (existingBackButton) {
            console.log("Removing existing 'Back to Menu' button.");
            existingBackButton.remove();
        }
    }
    // --- End Helper function ---


    instructions.addEventListener('click', function () {
        console.log("3D Instructions clicked, requesting lock...");
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        console.log("3D Controls Locked.");
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        removeBackButton(); // Remove back button when locking (or re-locking)
    });

    controls.addEventListener('unlock', function () {
        console.log("3D Controls Unlocked.");
        blocker.style.display = 'flex'; // Show blocker overlay
        instructions.style.display = ''; // Show instructions text

        // --- Add the "Back to Menu" button ---
        removeBackButton(); // Remove any previous one first (safety check)

        const backButton = document.createElement('button');
        backButton.id = 'back-to-menu-button';
        backButton.textContent = 'Back to Menu';
        backButton.classList.add('enter-button'); // Apply the fancy style

        // Add click listener for the back button
        backButton.addEventListener('click', () => {
            console.log("'Back to Menu' button clicked.");

            if (showroomContainer) {
                console.log("Hiding showroom...");
                showroomContainer.style.display = 'none'; // Hide 3D view
                // Optional: Could stop animation loop here too
                // if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
            }
            if (carouselContainer) {
                console.log("Showing carousel...");
                carouselContainer.classList.remove('hidden'); // Show carousel again
            }
            removeBackButton(); // Clean up the button itself
        });

        // Append the button inside the blocker
        blocker.appendChild(backButton);
        console.log("'Back to Menu' button added.");
        // --- End of adding button ---
    });

    // Input Listeners
    const onKeyDown = function (event) {
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
    console.log("initShowroom: Key listeners added.");

    // --- Simple Scene Content (Floor and Box) ---
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Green Box at Origin
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = 0.5; // Sit on the floor
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
    console.log("initShowroom: 3D floor and box added.");

    // Add Resize Listener
    window.addEventListener('resize', onWindowResize);

    console.log("initShowroom: Initialization function finished. Starting animation loop...");
    // Start the animation loop
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
    // Store the frame ID so we can cancel it if needed
    animationFrameId = requestAnimationFrame(animateShowroom);

    const delta = clock.getDelta();

    // Movement Logic (Only if controls are locked)
    if (controls && controls.isLocked === true) { // Check if controls exist
        velocity.x -= velocity.x * 10.0 * delta; // Damping
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        // Normalize ONLY if direction vector is not zero
        if (direction.lengthSq() > 0) { // Check squared length for efficiency
             direction.normalize();
        }


        const speed = 35.0; // Adjusted speed might be needed

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        // Check if controls methods exist before calling
        if (controls.moveRight) controls.moveRight(-velocity.x * delta);
        if (controls.moveForward) controls.moveForward(-velocity.z * delta);

        // Floor constraint (Check if getObject exists)
        const camObject = controls.getObject ? controls.getObject() : null;
        if (camObject && camObject.position.y < 1.6) {
             velocity.y = 0;
             camObject.position.y = 1.6;
        }
    }

    // Render (Check if renderer exists)
    if (renderer && scene && camera) {
         try {
             renderer.render(scene, camera);
         } catch(renderError) {
             console.error("Renderer error:", renderError);
             // cancelAnimationFrame(animationFrameId); // Option: Stop loop on error
         }
    }
}

// Only log this once at the end of the script parsing
console.log("Main script loaded (Full version with logs). Waiting for user interaction.");
// initShowroom() is NOT called here, it waits for the button click.
