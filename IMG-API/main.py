import cv2
import numpy as np
from flask import Flask, request, jsonify
from deepface import DeepFace
import os

app = Flask(__name__)

@app.route('/extract-embedding', methods=['POST'])
def extract_embedding():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    file_bytes = np.frombuffer(image_file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({'error': 'Invalid image'}), 400

    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    try:
        embedding = DeepFace.represent(rgb_img, enforce_detection=True)[0]["embedding"]
        return jsonify({'embedding': embedding})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def home():
    return "API is running!", 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)