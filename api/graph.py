from http.server import BaseHTTPRequestHandler
import json
import csv
import os
from urllib.parse import parse_qs, urlparse

def load_csv(filename):
    """Load a CSV file and return as list of dicts."""
    # Try multiple paths for the data directory
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', 'data', filename),
        os.path.join(os.getcwd(), 'data', filename),
        os.path.join('/var/task', 'data', filename),
    ]

    for filepath in possible_paths:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                return list(reader)

    return []


def build_graph_data(group_filter=None):
    """Build graph data from CSV files."""
    nodes = load_csv('nodes.csv')
    edges = load_csv('edges.csv')

    # Convert group to int
    for node in nodes:
        node['group'] = int(node.get('group', 1))

    # Convert value to int
    for edge in edges:
        edge['value'] = int(edge.get('value', 1))

    # Apply group filter if specified
    if group_filter is not None:
        filtered_node_ids = {n['id'] for n in nodes if n['group'] == group_filter}

        # Include connected nodes
        for edge in edges:
            if edge['source'] in filtered_node_ids or edge['target'] in filtered_node_ids:
                filtered_node_ids.add(edge['source'])
                filtered_node_ids.add(edge['target'])

        nodes = [n for n in nodes if n['id'] in filtered_node_ids]
        edges = [e for e in edges if e['source'] in filtered_node_ids and e['target'] in filtered_node_ids]

    return {
        'nodes': nodes,
        'links': edges
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query parameters
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        # Get group filter (optional)
        group_filter = None
        if 'group' in params:
            try:
                group_filter = int(params['group'][0])
            except (ValueError, IndexError):
                pass

        # Build response
        data = build_graph_data(group_filter)

        # Send response
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
