
import json
import re
import unicodedata

def normalize(text):
    return unicodedata.normalize('NFKC', text).strip()

def main():
    graph_path = '/Users/yunhyeongseob/dev/jprail/public/rail/platform_graph.json'
    results_path = '/Users/yunhyeongseob/dev/jprail/smart_analysis_results.txt'
    stations_path = '/Users/yunhyeongseob/dev/jprail/public/rail/stations_master.json'

    print("Loading data...")
    with open(graph_path, 'r', encoding='utf-8') as f:
        graph = json.load(f)
    
    with open(stations_path, 'r', encoding='utf-8') as f:
        stations = json.load(f)

    # Name to ID mapping (normalized)
    name_to_ids = {}
    for sid, sdata in stations.items():
        name = normalize(sdata['name'])
        if name not in name_to_ids:
            name_to_ids[name] = []
        name_to_ids[name].append(sid)

    # Parse results
    auto_fill_pattern = re.compile(r'\[AUTO-FILL\] 역: (.*?) -> (.*?) 연결에 (.*?)를 skipped로 추가')

    updates_count = 0
    skipped_count = 0
    
    print("Parsing analysis results...")
    with open(results_path, 'r', encoding='utf-8') as f:
        for line in f:
            match = auto_fill_pattern.search(line)
            if match:
                from_name = normalize(match.group(1))
                to_name = normalize(match.group(2))
                skipped_name = normalize(match.group(3))

                from_ids = name_to_ids.get(from_name, [])
                to_ids = name_to_ids.get(to_name, [])
                skipped_ids = name_to_ids.get(skipped_name, [])

                if not from_ids or not to_ids or not skipped_ids:
                    # print(f"DEBUG: Missing IDs for {from_name} -> {to_name} (skipped: {skipped_name})")
                    skipped_count += 1
                    continue

                # Find specific connection
                found_match = False
                for fid in from_ids:
                    if fid in graph:
                        for pid, conn_list in graph[fid].items():
                            for conn in conn_list:
                                if 'neighbors' not in conn: continue
                                for neighbor in conn['neighbors']:
                                    n_id = neighbor['station_id']
                                    n_name = normalize(neighbor.get('name', ''))
                                    
                                    # Match by ID or Name
                                    if n_id in to_ids or n_name == to_name:
                                        if 'skipped' not in neighbor:
                                            neighbor['skipped'] = []
                                        
                                        changed = False
                                        for skid in skipped_ids:
                                            if skid not in neighbor['skipped']:
                                                neighbor['skipped'].append(skid)
                                                updates_count += 1
                                                changed = True
                                        if changed:
                                            found_match = True
                                        else:
                                            # Already exists, still count as match
                                            found_match = True
                
                if not found_match:
                    # Try reverse? No, analyzer is directional.
                    # But maybe the graph is directional in a way we don't expect?
                    # Let's check reverse just in case as a fallback.
                    for fid in to_ids:
                        if fid in graph:
                            for pid, conn_list in graph[fid].items():
                                for conn in conn_list:
                                    if 'neighbors' not in conn: continue
                                    for neighbor in conn['neighbors']:
                                        n_id = neighbor['station_id']
                                        n_name = normalize(neighbor.get('name', ''))
                                        if n_id in from_ids or n_name == from_name:
                                            if 'skipped' not in neighbor:
                                                neighbor['skipped'] = []
                                            changed = False
                                            for skid in skipped_ids:
                                                if skid not in neighbor['skipped']:
                                                    neighbor['skipped'].append(skid)
                                                    updates_count += 1
                                                    changed = True
                                            if changed:
                                                found_match = True
                                            else:
                                                found_match = True

                if not found_match:
                    skipped_count += 1

    print(f"Applied {updates_count} updates. Failed to match {skipped_count} entries.")
    
    print("Saving graph...")
    with open(graph_path, 'w', encoding='utf-8') as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)
    print("Done.")

if __name__ == "__main__":
    main()
