from http.server import BaseHTTPRequestHandler
import json
import csv
import os
from urllib.parse import parse_qs, urlparse

# Path to data files (relative to project root)
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

def load_csv(filename):
    """Load a CSV file and return as list of dicts."""
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def build_graph_data(group_filter=None):
    """
    Build graph data from CSV files.

    Expected CSV structure:
    - nodes.csv: id, label, group (1=Commissioner, 2=MEP, 3=Lobbyist, etc.)
    - edges.csv: source, target, value (meeting count)
    """
    nodes = load_csv('nodes.csv')
    edges = load_csv('edges.csv')

    # If no CSV files exist yet, return mock data
    if not nodes or not edges:
        return get_mock_data(group_filter)

    # Convert group to int
    for node in nodes:
        node['group'] = int(node.get('group', 1))

    # Convert value to int
    for edge in edges:
        edge['value'] = int(edge.get('value', 1))

    # Apply group filter if specified
    if group_filter is not None:
        # Get nodes in the selected group
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

def get_mock_data(group_filter=None):
    """Return mock data when CSV files don't exist yet."""
    nodes = [
        {"id": "Commissioner_A", "label": "Commissioner A", "group": 1},
        {"id": "Commissioner_B", "label": "Commissioner B", "group": 1},
        {"id": "Commissioner_C", "label": "Commissioner C", "group": 1},
        {"id": "MEP_EPP_1", "label": "MEP EPP-1", "group": 2},
        {"id": "MEP_EPP_2", "label": "MEP EPP-2", "group": 2},
        {"id": "MEP_EPP_3", "label": "MEP EPP-3", "group": 2},
        {"id": "MEP_SD_1", "label": "MEP S&D-1", "group": 3},
        {"id": "MEP_SD_2", "label": "MEP S&D-2", "group": 3},
        {"id": "MEP_Renew_1", "label": "MEP Renew-1", "group": 4},
        {"id": "MEP_Renew_2", "label": "MEP Renew-2", "group": 4},
        {"id": "MEP_Greens_1", "label": "MEP Greens-1", "group": 5},
        {"id": "Lobbyist_A", "label": "Lobbyist A", "group": 6},
        {"id": "Lobbyist_B", "label": "Lobbyist B", "group": 6},
    ]

    links = [
        {"source": "Commissioner_A", "target": "MEP_EPP_1", "value": 5},
        {"source": "Commissioner_A", "target": "MEP_EPP_2", "value": 3},
        {"source": "Commissioner_A", "target": "MEP_SD_1", "value": 2},
        {"source": "Commissioner_B", "target": "MEP_Renew_1", "value": 4},
        {"source": "Commissioner_B", "target": "MEP_Greens_1", "value": 2},
        {"source": "Commissioner_C", "target": "MEP_EPP_3", "value": 3},
        {"source": "MEP_EPP_1", "target": "MEP_EPP_2", "value": 6},
        {"source": "MEP_EPP_2", "target": "MEP_EPP_3", "value": 4},
        {"source": "MEP_SD_1", "target": "MEP_SD_2", "value": 5},
        {"source": "MEP_Renew_1", "target": "MEP_Renew_2", "value": 4},
        {"source": "Lobbyist_A", "target": "Commissioner_A", "value": 3},
        {"source": "Lobbyist_A", "target": "MEP_EPP_1", "value": 2},
        {"source": "Lobbyist_B", "target": "Commissioner_B", "value": 2},
        {"source": "Lobbyist_B", "target": "MEP_SD_1", "value": 1},
        {"source": "MEP_EPP_1", "target": "MEP_SD_1", "value": 2},
        {"source": "MEP_Renew_1", "target": "MEP_Greens_1", "value": 3},
    ]

    if group_filter is not None:
        filtered_node_ids = {n['id'] for n in nodes if n['group'] == group_filter}
        for link in links:
            if link['source'] in filtered_node_ids or link['target'] in filtered_node_ids:
                filtered_node_ids.add(link['source'])
                filtered_node_ids.add(link['target'])

        nodes = [n for n in nodes if n['id'] in filtered_node_ids]
        links = [l for l in links if l['source'] in filtered_node_ids and l['target'] in filtered_node_ids]

    return {'nodes': nodes, 'links': links}


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
        return
