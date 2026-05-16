import firebase_admin
from firebase_admin import credentials, firestore

def migrate_collection(source_project, dest_project, collection_name):
    print(f"Migrating {collection_name} from {source_project} to {dest_project}...")
    
    # Initialize Source
    source_app = firebase_admin.initialize_app(
        credentials.ApplicationDefault(), 
        name='source',
        options={'projectId': source_project}
    )
    source_db = firestore.client(app=source_app)
    
    # Initialize Destination
    dest_app = firebase_admin.initialize_app(
        credentials.ApplicationDefault(),
        name='dest',
        options={'projectId': dest_project}
    )
    dest_db = firestore.client(app=dest_app)
    
    # Get documents
    docs = source_db.collection(collection_name).stream()
    
    count = 0
    for doc in docs:
        dest_db.collection(collection_name).document(doc.id).set(doc.to_dict())
        count += 1
    
    print(f"Finished. Migrated {count} documents.")

if __name__ == "__main__":
    # Example usage:
    # migrate_collection('jprail', 'p-plan', 'users')
    pass
