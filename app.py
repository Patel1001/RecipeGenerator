from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

# Function to get database connection
def get_db_connection():
    conn = sqlite3.connect('recipes.db')
    conn.row_factory = sqlite3.Row  # Enables dictionary-like access
    return conn

# Home route
@app.route("/")
def home():
    return render_template("index.html")

# Browse Recipes route
@app.route("/browse")
def browse():
    return render_template("browse.html")

# Find a Recipe route
@app.route("/find")
def find():
    return render_template("find.html")

# Make a Recipe route
@app.route("/make")
def make():
    return render_template("make.html")

# API to fetch categorized ingredients
@app.route("/ingredients", methods=["GET"])
def get_ingredients():
    conn = get_db_connection()
    ingredients = conn.execute("SELECT category, GROUP_CONCAT(name, ', ') AS items FROM ingredients GROUP BY category").fetchall()
    conn.close()
    return jsonify([{"category": row["category"], "items": row["items"].split(", ")} for row in ingredients])

# API to find recipes based on selected ingredients
@app.route("/recipes", methods=["POST"])
def find_recipes():
    data = request.json
    recipe_type = data.get('type')  # Veg, Non-Veg, or Both
    selected_ingredients = data.get('ingredients', [])

    if not selected_ingredients:
        return jsonify([])  # No ingredients selected

    conn = get_db_connection()

    # Adjust recipe type condition
    type_condition = "1=1"  # Default for "Both" to include all recipes
    params = selected_ingredients  # Initialize params for selected ingredients

    if recipe_type in ["Veg", "Non-Veg"]:
        type_condition = "r.type = ?"
        params = [recipe_type] + params

    # SQL query to find recipes where all required ingredients are available
    sql = f"""
    SELECT r.id, r.name
    FROM recipes r
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE {type_condition} 
      AND ri.ingredient_id IN (
          SELECT id FROM ingredients WHERE name IN ({", ".join(["?"] * len(selected_ingredients))})
      )
    GROUP BY r.id
    HAVING COUNT(DISTINCT ri.ingredient_id) = (
        SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id
    );
    """

    recipes = conn.execute(sql, params).fetchall()
    conn.close()

    return jsonify([{"id": row["id"], "name": row["name"]} for row in recipes])

# API to fetch all recipes
@app.route("/recipes/all", methods=["GET"])
def get_all_recipes():
    conn = get_db_connection()
    recipes = conn.execute("SELECT id, name FROM recipes").fetchall()
    conn.close()
    return jsonify([{"id": row["id"], "name": row["name"]} for row in recipes])

# API to fetch recipe details
@app.route("/recipe/<int:recipe_id>", methods=["GET"])
def get_recipe_details(recipe_id):
    conn = get_db_connection()
    recipe = conn.execute("SELECT name, type FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
    ingredients = conn.execute("SELECT i.name FROM ingredients i JOIN recipe_ingredients ri ON i.id = ri.ingredient_id WHERE ri.recipe_id = ?", (recipe_id,)).fetchall()
    steps = conn.execute("SELECT step FROM recipe_steps WHERE recipe_id = ?", (recipe_id,)).fetchall()
    conn.close()

    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404

    return jsonify({
        "name": recipe["name"],
        "type": recipe["type"],
        "ingredients": [row["name"] for row in ingredients],
        "steps": [row["step"] for row in steps]
    })

# API to delete a recipe
@app.route("/recipe/delete/<int:recipe_id>", methods=["DELETE"])
def delete_recipe(recipe_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM recipe_steps WHERE recipe_id = ?", (recipe_id,))
    conn.execute("DELETE FROM recipe_ingredients WHERE recipe_id = ?", (recipe_id,))
    conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Recipe deleted successfully."})

# API to update a recipe
@app.route("/recipe/update/<int:recipe_id>", methods=["POST"])
def update_recipe(recipe_id):
    data = request.json
    new_ingredients = data.get("ingredients", [])
    new_steps = data.get("steps", [])

    conn = get_db_connection()
    conn.execute("DELETE FROM recipe_ingredients WHERE recipe_id = ?", (recipe_id,))
    for ingredient in new_ingredients:
        ingredient_id = conn.execute("SELECT id FROM ingredients WHERE name = ?", (ingredient,)).fetchone()
        if ingredient_id:
            conn.execute("INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES (?, ?)", (recipe_id, ingredient_id["id"]))

    conn.execute("DELETE FROM recipe_steps WHERE recipe_id = ?", (recipe_id,))
    for step in new_steps:
        conn.execute("INSERT INTO recipe_steps (recipe_id, step) VALUES (?, ?)", (recipe_id, step))

    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Recipe updated successfully."})

# API to add a new recipe
@app.route("/recipe/add", methods=["POST"])
def add_recipe():
    data = request.json
    recipe_name = data.get("name")
    recipe_type = data.get("type")
    ingredients = data.get("ingredients", [])
    steps = data.get("steps", [])

    if not recipe_name or not recipe_type or not ingredients or not steps:
        return jsonify({"error": "All fields are required!"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Insert new recipe
    cursor.execute("INSERT INTO recipes (name, type) VALUES (?, ?)", (recipe_name, recipe_type))
    recipe_id = cursor.lastrowid  # Get the ID of the newly inserted recipe

    # Insert ingredients
    for ingredient in ingredients:
        ingredient_id = cursor.execute("SELECT id FROM ingredients WHERE name = ?", (ingredient,)).fetchone()
        if ingredient_id:
            cursor.execute("INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES (?, ?)", (recipe_id, ingredient_id["id"]))

    # Insert steps
    for step in steps:
        cursor.execute("INSERT INTO recipe_steps (recipe_id, step) VALUES (?, ?)", (recipe_id, step))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Recipe added successfully!"})


if __name__ == "__main__":
    app.run(debug=True)
