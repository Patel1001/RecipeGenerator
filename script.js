// Fetch and display categorized ingredients for "Find Recipes"
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("ingredients-list")) {
        fetch("/ingredients")
            .then(response => response.json())
            .then(categories => {
                const container = document.getElementById("ingredients-list");
                categories.forEach(category => {
                    const table = document.createElement("table");
                    table.style.border = "1px solid #ccc";
                    table.style.margin = "10px";
                    table.style.padding = "10px";

                    const header = document.createElement("thead");
                    const headerRow = document.createElement("tr");
                    const headerCell = document.createElement("th");
                    headerCell.textContent = category.category;
                    headerRow.appendChild(headerCell);
                    header.appendChild(headerRow);
                    table.appendChild(header);

                    const body = document.createElement("tbody");
                    category.items.forEach(item => {
                        const row = document.createElement("tr");
                        const cell = document.createElement("td");

                        const checkbox = document.createElement("input");
                        checkbox.type = "checkbox";
                        checkbox.value = item;
                        checkbox.id = `ingredient-${item}`;

                        const label = document.createElement("label");
                        label.htmlFor = `ingredient-${item}`;
                        label.textContent = item;

                        cell.appendChild(checkbox);
                        cell.appendChild(label);
                        row.appendChild(cell);
                        body.appendChild(row);
                    });
                    table.appendChild(body);
                    container.appendChild(table);
                });
            })
            .catch(error => {
                console.error("Error fetching ingredients:", error);
                document.getElementById("ingredients-list").innerHTML = "Error loading ingredients.";
            });
    }

    // Ensure fetchRecipes runs only on the Browse Recipes page
    if (document.getElementById("recipe-list")) {
        fetchRecipes();
    }
});

// "Find Recipes" form submission
document.getElementById("recipe-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const type = document.querySelector("input[name='type']:checked").value;
    const selectedIngredients = Array.from(document.querySelectorAll("#ingredients-list input:checked"))
                                     .map(input => input.value);

    fetch("/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ingredients: selectedIngredients })
    })
    .then(response => response.json())
    .then(recipes => {
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "<h2>Recipes Found:</h2>";

        recipes.forEach(recipe => {
            const link = document.createElement("a");
            link.href = "#";
            link.textContent = recipe.name;
            link.addEventListener("click", (event) => {
                event.preventDefault();
                fetchRecipeDetails(recipe.id, "results");
            });
            resultsDiv.appendChild(link);
            resultsDiv.appendChild(document.createElement("br"));
        });
    })
    .catch(error => {
        console.error("Error:", error);
        document.getElementById("results").innerHTML = "Error finding recipes.";
    });
});

// Fetch and display recipe details
function fetchRecipeDetails(recipeId, targetDivId = `recipe-details-${recipeId}`) {
    fetch(`/recipe/${recipeId}`)
        .then(response => response.json())
        .then(recipe => {
            const detailsDiv = document.getElementById(targetDivId);
            if (!detailsDiv) {
                console.error("Recipe details div not found!");
                return;
            }

            detailsDiv.innerHTML = `
                <h3>${recipe.name}</h3>
                <h4>Type: ${recipe.type}</h4>
                <h3>Ingredients:</h3>
                <ul>${recipe.ingredients.map(ing => `<li>${ing}</li>`).join("")}</ul>
                <h3>Steps:</h3>
                <ol>${recipe.steps.map(step => `<li>${step}</li>`).join("")}</ol>
            `;
        })
        .catch(error => {
            console.error("Error fetching recipe details:", error);
        });
}

// Fetch and display all recipes for "Browse Recipes"
function fetchRecipes() {
    fetch("/recipes/all")
        .then(response => response.json())
        .then(recipes => {
            const list = document.getElementById("recipe-list");
            list.innerHTML = "";

            if (recipes.length === 0) {
                list.innerHTML = "<p>No recipes found.</p>";
                return;
            }

            recipes.forEach(recipe => {
                const recipeDiv = document.createElement("div");
                recipeDiv.style.marginBottom = "20px";
                recipeDiv.innerHTML = `
                    <a href="#" onclick="fetchRecipeDetails(${recipe.id}, 'recipe-details-${recipe.id}')">${recipe.name}</a>
                    <button onclick="deleteRecipe(${recipe.id})">Delete</button>
                    <div id="recipe-details-${recipe.id}"></div>
                `;
                list.appendChild(recipeDiv);
            });
        })
        .catch(error => {
            console.error("Error fetching recipes:", error);
            document.getElementById("recipe-list").innerHTML = "Error loading recipes.";
        });
}

// Delete a recipe
function deleteRecipe(recipeId) {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    fetch(`/recipe/delete/${recipeId}`, { method: "DELETE" })
        .then(response => response.json())
        .then(() => {
            alert("Recipe deleted successfully!");
            fetchRecipes();
        })
        .catch(error => {
            console.error("Error deleting recipe:", error);
        });
}

// Function to handle "Make a Recipe" form submission
function setupMakeRecipeForm() {
    const form = document.getElementById("recipe-form");
    if (!form) return; // Ensure the form exists

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const recipeNameInput = document.getElementById("recipe-name");
        const recipeTypeInput = document.querySelector("input[name='recipe-type']:checked");
        const selectedIngredients = Array.from(document.querySelectorAll("#ingredients-list input:checked"))
                                         .map(input => input.value);
        const recipeSteps = Array.from(document.querySelectorAll(".step"))
                                 .map(input => input.value.trim())
                                 .filter(step => step !== ""); // Ignore empty steps

        // Ensure all required fields are filled
        if (!recipeNameInput.value.trim()) {
            document.getElementById("message").innerHTML = "<p style='color: red;'>Please enter a recipe name!</p>";
            return;
        }
        if (!recipeTypeInput) {
            document.getElementById("message").innerHTML = "<p style='color: red;'>Please select a recipe type!</p>";
            return;
        }
        if (selectedIngredients.length === 0) {
            document.getElementById("message").innerHTML = "<p style='color: red;'>Please select at least one ingredient!</p>";
            return;
        }
        if (recipeSteps.length === 0) {
            document.getElementById("message").innerHTML = "<p style='color: red;'>Please enter at least one recipe step!</p>";
            return;
        }

        fetch("/recipe/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: recipeNameInput.value.trim(),
                type: recipeTypeInput.value,
                ingredients: selectedIngredients,
                steps: recipeSteps
            })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById("message").innerHTML = `<p style="color: green;">${data.message}</p>`;
            form.reset();
        })
        .catch(error => {
            console.error("Error:", error);
            document.getElementById("message").innerHTML = "<p style='color: red;'>Error saving recipe.</p>";
        });
    });
}

// Function to add more recipe steps dynamically
function addStep() {
    const stepsDiv = document.getElementById("recipe-steps");
    const textarea = document.createElement("textarea");
    textarea.className = "step";
    textarea.placeholder = "Enter a step";
    stepsDiv.appendChild(document.createElement("br"));
    stepsDiv.appendChild(textarea);
}

// Ensure "Make a Recipe" script runs correctly
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("recipe-form")) {
        console.log("Attaching event listener for Make Recipe form");
        setupMakeRecipeForm();
    }
});

function setupMakeRecipeForm() {
    const form = document.getElementById("recipe-form");
    if (!form) return; // Ensure the form exists

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const recipeName = document.getElementById("recipe-name").value.trim();
        const recipeType = document.querySelector("input[name='recipe-type']:checked")?.value;
        const ingredients = Array.from(document.querySelectorAll("#ingredients-list input:checked"))
                                 .map(input => input.value);
        const steps = Array.from(document.querySelectorAll(".step"))
                           .map(input => input.value.trim())
                           .filter(step => step !== "");

        if (!recipeName || !recipeType || ingredients.length === 0 || steps.length === 0) {
            alert("All fields are required!");
            return;
        }

        fetch("/recipe/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: recipeName, type: recipeType, ingredients, steps })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Recipe saved successfully!");
                form.reset();
            } else {
                alert("Failed to save recipe: " + data.error);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error saving recipe. Check console for details.");
        });
    });
}

