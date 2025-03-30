// --- Global Variables for 3D Scene ---
let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();
let animationFrameId = null;

// --- Carousel Logic ---
console.log("Script start: Getting carousel elements...");

const carouselContainer = document.getElementById('carousel-container');
const showroomContainer = document.getElementById('showroom-container');
const slider = document.getElementById('card-slider');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const enterButtons = document.querySelectorAll('.enter-button'); // Get buttons

// --- ADD LOGGING HERE ---
console.log("Carousel Container found:", carouselContainer);
console.log("Showroom Container found:", showroomContainer);
console.log("Slider found:", slider);
console.log("Prev Button found:", prevBtn);
console.log("Next Button found:", nextBtn);
console.log("Enter Buttons found (NodeList):", enterButtons); // Should show a list
// --- END LOGGING ---


const numCards = 3;
const cardWidthPercentage = 100 / numCards;
let currentCardIndex = 0;
let isShowroomInitialized = false;

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
            // --- ADD LOGGING INSIDE CLICK HANDLER ---
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
                        initShowroom();
                        console.log("initShowroom() appears complete.");
                        isShowroomInitialized = true;
                    } catch(initError) {
                        console.error("ERROR occurred during initShowroom():", initError);
                    }
                } else {
                    console.log("Showroom already initialized.");
                }
            }, 500);
        });
    });
} else {
    console.error("Could not find any elements with class 'enter-button'.");
}

// Initialize slider position on load (check elements first)
if (slider && prevBtn && nextBtn) {
     console.log("Initializing slider position.");
     updateSliderPosition();
} else {
     console.warn("Skipping initial slider update as some elements were not found.");
}


// --- 3D Showroom Initialization and Animation (Keep the rest of the code as is) ---

function initShowroom() {
    // ... (rest of initShowroom function remains the same) ...
    console.log("Initializing Showroom...");

    const container = document.getElementById('showroom-container');
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    // Add checks for these elements too
    console.log("initShowroom: Container found:", container);
    console.log("initShowroom: Blocker found:", blocker);
    console.log("initShowroom: Instructions found:", instructions);

    if (!container || !blocker || !instructions) {
        console.error("Crucial elements for initShowroom not found!");
        return; // Prevent initialization if elements are missing
    }

    // ... (rest of initShowroom function) ...
}

// ... (animateShowroom, onWindowResize, etc. remain the same) ...

console.log("Main script loaded. Waiting for user interaction.");
