from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os
import io
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image
from ai_model import analyze_image
import base64

load_dotenv()

app = Flask(__name__)
CORS(app)


# ==========================================
# DATABASE CONNECTION
# ==========================================

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )


# ==========================================
# LOGIN
# ==========================================

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "message": "Email and password are required."
        }), 400

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT * FROM users
            WHERE email = %s
        """

        cursor.execute(query, (email,))
        user = cursor.fetchone()

        cursor.close()
        db.close()

        if not user:
            return jsonify({
                "message": "Invalid email or password."
            }), 401

        if not check_password_hash(user["password_hash"], password):
            return jsonify({
                "message": "Invalid email or password."
            }), 401

        return jsonify({
            "message": "Login successful!",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            }
        }), 200

    except Exception as e:
        return jsonify({
            "message": f"Login failed: {str(e)}"
        }), 500


# ==========================================
# HOME
# ==========================================

@app.route("/")
def home():
    return "Image Forensic AI Backend Running!"


# ==========================================
# TEST DATABASE
# ==========================================

@app.route("/test-db")
def test_db():
    try:
        db = get_db_connection()
        db.close()
        return "Database connected successfully!"
    except Exception as e:
        return f"Database connection failed: {e}", 500


# ==========================================
# REGISTER
# ==========================================

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({
            "message": "All fields are required."
        }), 400

    password_hash = generate_password_hash(password)

    try:
        db = get_db_connection()
        cursor = db.cursor()

        query = """
            INSERT INTO users
            (name, email, password_hash)
            VALUES (%s, %s, %s)
        """

        cursor.execute(
            query,
            (
                name,
                email,
                password_hash
            )
        )

        db.commit()

        cursor.close()
        db.close()

        return jsonify({
            "message": "Account created successfully!"
        }), 201

    except mysql.connector.IntegrityError:
        return jsonify({
            "message": "Email already exists."
        }), 409

    except Exception as e:
        return jsonify({
            "message": f"Registration failed: {str(e)}"
        }), 500


# ==========================================
# IMAGE ANALYSIS
# ==========================================

@app.route("/analyze", methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({
            "message": "No image uploaded."
        }), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({
            "message": "No image selected."
        }), 400

    user_id = request.form.get("user_id")

    if not user_id:
        return jsonify({
            "message": "User ID is required."
        }), 400

    try:
        original_bytes = file.read()
        file.seek(0)

        original_image = Image.open(file)
        image_format = original_image.format
        image = original_image.convert("RGB")

        analysis = analyze_image(
            image,
            original_bytes,
            image_format
        )

        results = analysis["results"]
        forensics = analysis["forensics"]
        prediction = analysis["prediction"]

        ela_image = analysis.get("ela_image")
        ela_base64 = None

        if ela_image:
            buffer = io.BytesIO()
            ela_image.save(buffer, format="JPEG")
            ela_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        result = prediction["label"]
        confidence = prediction["score"] * 100

        db = get_db_connection()
        cursor = db.cursor()

        query = """
            INSERT INTO analyses
            (user_id, image_path, result, confidence)
            VALUES (%s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                user_id,
                file.filename,
                result,
                confidence
            )
        )

        db.commit()

        cursor.close()
        db.close()

        response = {
            "results": results,
            "prediction": result,
            "confidence": round(confidence, 2),
            "forensics": forensics
        }

        if ela_base64 is not None:
            response["ela_image"] = ela_base64

        return jsonify(response), 200

    except Exception as e:
        return jsonify({
            "message": f"Image analysis failed: {str(e)}"
        }), 500


# ==========================================
# ANALYSIS HISTORY
# ==========================================

@app.route("/history/<int:user_id>", methods=["GET"])
def get_history(user_id):
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                id,
                image_path,
                result,
                confidence,
                created_at
            FROM analyses
            WHERE user_id = %s
            ORDER BY created_at DESC
        """

        cursor.execute(query, (user_id,))
        history = cursor.fetchall()

        cursor.close()
        db.close()

        return jsonify({
            "history": history
        }), 200

    except Exception as e:
        return jsonify({
            "message": f"Failed to load history: {str(e)}"
        }), 500


# ==========================================
# START SERVER
# ==========================================

if __name__ == "__main__":
    app.run(debug=True)