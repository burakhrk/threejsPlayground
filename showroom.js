console.log("Minimal test script running...");

// Wait for the DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed");

    const nextButton = document.getElementById('next-btn'); // Try finding one button
    console.log("Test: Next Button found:", nextButton);

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            console.log("Minimal Test: Next button clicked!");
            alert("Next button works!"); // Use alert for very obvious feedback
        });
        console.log("Minimal Test: Click listener added to next button.");
    } else {
        console.error("Minimal Test: Could not find next button.");
    }

    const firstEnterButton = document.querySelector('.enter-button'); // Try finding the first enter button
    console.log("Test: First Enter Button found:", firstEnterButton);
     if (firstEnterButton) {
        firstEnterButton.addEventListener('click', () => {
            console.log("Minimal Test: Enter button clicked!");
            alert("Enter button works!");
        });
         console.log("Minimal Test: Click listener added to first enter button.");
    } else {
        console.error("Minimal Test: Could not find any enter button.");
    }

});

console.log("Minimal test script finished initial execution.");
