import json
import requests
import time
import os
import sys

# Google Translate free API endpoint
def translate_batch(texts, sl='en', tl='ko'):
    if not texts:
        return []
    
    # Use a delimiter that is likely to be preserved by Google Translate
    delimiter = " . " # Period space is safer than symbols which might be stripped
    q = delimiter.join(texts)
    
    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        "client": "gtx",
        "sl": sl,
        "tl": tl,
        "dt": "t",
        "q": q
    }
    
    try:
        response = requests.get(url, params=params, timeout=15)
        if response.status_code == 200:
            result = response.json()
            translated_text = ""
            for part in result[0]:
                if part[0]:
                    translated_text += part[0]
            
            # Split back by delimiter. Google might return " . " or just "." depending on context
            # We try to split by what we sent and clean up
            translated_list = [t.strip() for t in translated_text.split(".")]
            
            # Remove empty strings at end if any
            translated_list = [t for t in translated_list if t]
            
            if len(translated_list) != len(texts):
                # Try another common split if count doesn't match
                # Sometimes it uses full-width dot or something else in Korean context?
                # But usually "." works.
                pass
            
            return translated_list
        else:
            return []
    except Exception as e:
        return []

def translate_one(text, sl='en', tl='ko'):
    if not text:
        return ""
    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        "client": "gtx",
        "sl": sl,
        "tl": tl,
        "dt": "t",
        "q": text
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            return response.json()[0][0][0]
    except:
        pass
    return ""

def main():
    file_path = "/Users/yunhyeongseob/dev/jprail/public/data/region_names.json"
    
    print(f"Loading {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Failed to load JSON: {e}")
        return

    adm2 = data.get("adm2", {})
    keys_to_translate = [k for k, v in adm2.items() if v.get("shapeName_en") and not v.get("shapeName_kr")]
    
    total = len(keys_to_translate)
    print(f"Found {total} items to translate in adm2.")
    
    if total == 0:
        print("Nothing to translate.")
        return

    count = 0
    start_time = time.time()
    
    batch_size = 30 # Safer size
    
    try:
        for i in range(0, total, batch_size):
            batch_keys = keys_to_translate[i : i + batch_size]
            batch_texts = [adm2[k]["shapeName_en"] for k in batch_keys]
            
            sys.stdout.write(f"\rProgress: {i + len(batch_keys)}/{total} ")
            sys.stdout.flush()
            
            translated_batch = translate_batch(batch_texts)
            
            if len(translated_batch) == len(batch_keys):
                for k, kr_name in zip(batch_keys, translated_batch):
                    adm2[k]["shapeName_kr"] = kr_name
                    count += 1
            else:
                # Fallback to one by one for this batch
                print(f"\n[Batch {i//batch_size + 1}] Size mismatch ({len(translated_batch)} vs {len(batch_keys)}). Falling back...")
                for k in batch_keys:
                    en_name = adm2[k]["shapeName_en"]
                    kr_name = translate_one(en_name)
                    if kr_name:
                        adm2[k]["shapeName_kr"] = kr_name
                        count += 1
                    time.sleep(0.3)
            
            # Save every batch
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
            
            time.sleep(1.0)
            
    except KeyboardInterrupt:
        print("\nTranslation interrupted by user.")
    
    # Final save
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    
    end_time = time.time()
    duration = end_time - start_time
    print(f"\nFinished translation.")
    print(f"Translated: {count} items.")
    print(f"Total time: {duration:.2f} seconds.")

if __name__ == "__main__":
    main()
