import json
import os
import requests
import firebase_admin
from firebase_admin import credentials, storage, firestore

# --- CONFIGURATION ---
# Unsplash API Access Key
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "YOUR_ACCESS_KEY_HERE")
# Path to Firebase Service Account JSON
SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccountKey.json")
# Firebase Storage Bucket Name (usually project-id.appspot.com or project-id.firebasestorage.app)
BUCKET_NAME = "pplan-52a07.firebasestorage.app"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'region')

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred, {
        'storageBucket': BUCKET_NAME
    })

db = firestore.client()
bucket = storage.bucket()

def fetch_unsplash_image(query):
    url = f"https://api.unsplash.com/search/photos?query={query}&per_page=1"
    headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        results = response.json().get("results", [])
        if results:
            return results[0]["urls"]["regular"], results[0]["id"]
    except Exception as e:
        print(f"Error fetching Unsplash for {query}: {e}")
    return None, None

def upload_to_storage(image_url, destination_path):
    try:
        response = requests.get(image_url, stream=True)
        response.raise_for_status()
        
        blob = bucket.blob(destination_path)
        blob.upload_from_string(response.content, content_type='image/jpeg')
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"Error uploading to storage: {e}")
    return None

def process_countries():
    path = os.path.join(DATA_DIR, 'countries.json')
    with open(path, 'r', encoding='utf-8') as f:
        countries = json.load(f)

    for country in countries:
        name = country.get('name') # English name
        id_ = country.get('id')
        
        print(f"Processing Country: {name} (ID: {id_})")
        # Check if already exists in Firestore to skip
        # ... logic to skip ...
        
        img_url, img_id = fetch_unsplash_image(f"{name} landmarks travel")
        if img_url:
            storage_path = f"regions/country/{id_}.jpg"
            public_url = upload_to_storage(img_url, storage_path)
            if public_url:
                # Update Firestore
                db.collection("region_metadata").document(f"country_{id_}").set({
                    "name_en": name,
                    "image_url": public_url,
                    "unsplash_id": img_id,
                    "type": "country",
                    "region_id": id_
                }, merge=True)
                print(f"  Success: {public_url}")

if __name__ == "__main__":
    if UNSPLASH_ACCESS_KEY == "YOUR_ACCESS_KEY_HERE":
        print("Please set your UNSPLASH_ACCESS_KEY in environment or script.")
    elif not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"Firebase Service Account JSON not found at {SERVICE_ACCOUNT_PATH}")
    else:
        process_countries()
        # Add process_prefectures() and process_cities() if needed
