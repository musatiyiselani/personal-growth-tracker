
// Get the reflection elements
const accomplishments = document.getElementById("accomplishments");
const learning = document.getElementById("learning");
const improvement = document.getElementById("improvement");
const saveButton = document.getElementById("save-reflection");

// Load previously saved reflection
function loadReflection() {
    const savedReflection = JSON.parse(
        localStorage.getItem("dailyReflection")
    );

    if (savedReflection) {
        accomplishments.value = savedReflection.accomplishments;
        learning.value = savedReflection.learning;
        improvement.value = savedReflection.improvement;
    }
}

// Save reflection
function saveReflection() {
    const reflection = {
        accomplishments: accomplishments.value,
        learning: learning.value,
        improvement: improvement.value,
        date: new Date().toLocaleDateString()
    };

    localStorage.setItem("dailyReflection", JSON.stringify(reflection));

    alert("Your reflection has been saved!");
}

// Button event
saveButton.addEventListener("click", saveReflection);

// Load saved information when the page opens
loadReflection();
