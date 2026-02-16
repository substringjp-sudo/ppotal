import json
import networkx as nx
import sys
import os

def generate_topology(input_file, output_file):
    print(f"Loading {input_file}...")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {input_file} not found.")
        sys.exit(1)

    # 1. Group edges by Line ID
    lines = {}
    
    # Store station info for lookup
    stations_info = data.get('stations', {})
    
    for route in data.get('routes', []):
        line_id = route['id']
        if line_id not in lines:
            lines[line_id] = {
                'edges': [],
                'company': route['company'],
                'line': route['line']
            }
        
        for edge in route['edges']:
            lines[line_id]['edges'].append(edge)

    topology_data = {}

    print(f"Processing {len(lines)} lines...")

    for line_id, line_data in lines.items():
        # Build Graph for this line
        G = nx.Graph()
        
        # Add edges
        for edge in line_data['edges']:
            u = edge['from']
            v = edge['to']
            dist = edge['distance']
            # We use weight=1 for topological length (number of hops), 
            # but maybe actual distance is better for tie-breaking?
            # Let's use 1 for topology to find "longest chain of stations".
            G.add_edge(u, v, weight=1, distance=dist)

        if G.number_of_nodes() == 0:
            continue

        # Decompose into Main Line and Branches
        # Strategy:
        # 1. Find connected components (some lines might be disjoint in data errors, take largest)
        components = [G.subgraph(c).copy() for c in nx.connected_components(G)]
        largest_cc = max(components, key=len)
        
        # 2. Find diameter (longest shortest path) in the largest component
        try:
            # Diameter is expensive for large graphs, but line graphs are small-ish
            # For tree-like graphs, we can use 2-BFS/DFS to find diameter efficiently.
            # But cyclic graphs (loops) exist.
            # Convert to spanning tree? No, loops are important.
            
            # Heuristic for longest path:
            # 1. Get all nodes with degree 1 (endpoints).
            endpoints = [n for n, d in largest_cc.degree() if d == 1]
            
            longest_path = []
            
            if not endpoints:
                # Likely a full loop (e.g. Yamanote)
                # Pick arbitrary node, find path to self?
                # Cycles...
                try:
                    # Find cycle basis
                    cycles = nx.cycle_basis(largest_cc)
                    if cycles:
                        longest_cycle = max(cycles, key=len)
                        # Rotate to start at a "major" station if possible, or just arbitrary
                        longest_path = longest_cycle
                        # It's a loop.
                        line_type = "LOOP"
                    else:
                        # No cycle, no endpoints? Disconnected node?
                        line_type = "COMPLEX"
                        longest_path = list(largest_cc.nodes()) # Fallback
                except:
                     line_type = "COMPLEX"
            else:
                # Tree-like or linear with branches
                # Find path between all pairs of endpoints
                max_len = -1
                import itertools
                
                # if too many endpoints, this is slow. 
                # Optimization: Pick one endpoint, find farthest node (dfs), then from there find farthest.
                # (Standard tree diameter algorithm work reasonably well for sparse graphs)
                
                def get_farthest(start_node, graph):
                    lengths = nx.single_source_shortest_path_length(graph, start_node)
                    farthest = max(lengths, key=lengths.get)
                    return farthest, lengths[farthest]

                u, _ = get_farthest(endpoints[0], largest_cc)
                v, length = get_farthest(u, largest_cc)
                
                longest_path = nx.shortest_path(largest_cc, u, v)
                line_type = "LINEAR"

            # 3. Assess if it's main line + branches
            # Any node in largest_cc not in longest_path is on a branch.
            
            main_line_stations = longest_path
            main_line_set = set(longest_path)
            
            branches = []
            
            # Find nodes not in main line
            # actually, branches can be complex too. 
            # Simple approach: identifying "branching points" on main line.
            
            remaining_nodes = set(largest_cc.nodes()) - main_line_set
            
            # If there are remaining nodes, we have branches.
            if remaining_nodes:
                if line_type == "LINEAR":
                    line_type = "COMPLEX" # Linear with branches
                
                # Find connected components of remaining nodes?
                # No, better: iterate over main line nodes, check if they have neighbors not in main line.
                
                visited_branch_nodes = set()
                
                for station in main_line_stations:
                    neighbors = list(largest_cc.neighbors(station))
                    branch_neighbors = [n for n in neighbors if n not in main_line_set]
                    
                    for start_node in branch_neighbors:
                        if start_node in visited_branch_nodes:
                            continue
                            
                        # Traverse this branch
                        # We want a path starting from 'start_node' away from 'station'
                        # DFS/BFS on the subgraph of remaining nodes
                        
                        # Build subgraph of remaining + the junction (connection point)
                        # But simpler: just find paths in the subgraph of (remaining_nodes)
                        
                        # Let's perform a traversal from start_node restricted to remaining_nodes
                        # to find the "shape" of the branch.
                        # For visualization, we often just want linear branches.
                        
                        branch_path = [station] # Start at junction
                        
                        curr = start_node
                        prev = station
                        
                        # Simple greedy walk for branch? 
                        # Or find longest path in the branch component?
                        
                        # Extract the component of this branch
                        q = [start_node]
                        branch_component_nodes = {start_node}
                        visited_locally = {start_node}
                        while q:
                            curr_q = q.pop(0)
                            for n in largest_cc.neighbors(curr_q):
                                if n in remaining_nodes and n not in visited_locally:
                                    visited_locally.add(n)
                                    branch_component_nodes.add(n)
                                    q.append(n)
                        
                        visited_branch_nodes.update(branch_component_nodes)
                        
                        # Now find longest path in this component starting from 'start_node'
                        branch_subgraph = largest_cc.subgraph(branch_component_nodes)
                        
                        # Farthest from start_node
                        farthest_branch_node, _ = get_farthest(start_node, branch_subgraph)
                        
                        # Path from start_node to farthest
                        if farthest_branch_node == start_node:
                             path_in_branch = [start_node]
                        else:
                             path_in_branch = nx.shortest_path(branch_subgraph, start_node, farthest_branch_node)
                        
                        branches.append({
                            "junction": station,
                            "path": path_in_branch # Excludes junction, starts with first station on branch
                        })

            topology_data[line_id] = {
                "type": line_type,
                "main_line": main_line_stations,
                "branches": branches
            }
        except Exception as e:
            print(f"Skipping {line_id} due to error: {e}")
            topology_data[line_id] = {
                "type": "ERROR",
                "main_line": [],
                "branches": []
            }

    print(f"Saving topology to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(topology_data, f, ensure_ascii=False, indent=2)
    print("Done.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 generate_topology.py <input_json> <output_json>")
        sys.exit(1)
    
    generate_topology(sys.argv[1], sys.argv[2])
