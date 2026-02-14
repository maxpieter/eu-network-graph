import json
import os

def load_json(filename):
    """Load a JSON file from the json directory."""
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', 'json', filename),
        os.path.join(os.getcwd(), 'json', filename),
        os.path.join('/var/task', 'json', filename),
    ]

    for filepath in possible_paths:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    return None


def filter_by_type(data, type_filter):
    """Filter graph data by node type."""
    if not type_filter or not data:
        return data

    # Get nodes of the specified type and their connected nodes
    filtered_node_ids = {n['id'] for n in data['nodes'] if n.get('type') == type_filter}

    # Include nodes connected to filtered nodes
    for link in data['links']:
        if link['source'] in filtered_node_ids or link['target'] in filtered_node_ids:
            filtered_node_ids.add(link['source'])
            filtered_node_ids.add(link['target'])

    filtered_nodes = [n for n in data['nodes'] if n['id'] in filtered_node_ids]
    filtered_links = [
        l for l in data['links']
        if l['source'] in filtered_node_ids and l['target'] in filtered_node_ids
    ]

    return {'nodes': filtered_nodes, 'links': filtered_links}


def handler(request):
    """Vercel serverless function handler."""
    from urllib.parse import parse_qs, urlparse

    # Parse query parameters
    parsed = urlparse(request.url if hasattr(request, 'url') else request.path)
    params = parse_qs(parsed.query)

    # Get mode parameter (default: 'full')
    mode = 'full'
    if 'mode' in params:
        mode = params['mode'][0]
        if mode not in ('mep', 'commission', 'full'):
            mode = 'full'

    # Load pre-generated JSON from bip.py
    filename = f'bipartite_d3_{mode}.json'
    data = load_json(filename)

    if data is None:
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': f'Graph data not found. Run: python api/bip.py --mode {mode}',
                'nodes': [],
                'links': []
            })
        }

    # Optional type filter
    type_filter = None
    if 'type' in params:
        type_filter = params['type'][0]

    if type_filter:
        data = filter_by_type(data, type_filter)

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps(data)
    }
