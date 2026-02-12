import json
import csv
import os

def load_csv(filename):
    """Load a CSV file and return as list of dicts."""
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

    for node in nodes:
        node['group'] = int(node.get('group', 1))

    for edge in edges:
        edge['value'] = int(edge.get('value', 1))

    if group_filter is not None:
        filtered_node_ids = {n['id'] for n in nodes if n['group'] == group_filter}

        for edge in edges:
            if edge['source'] in filtered_node_ids or edge['target'] in filtered_node_ids:
                filtered_node_ids.add(edge['source'])
                filtered_node_ids.add(edge['target'])

        nodes = [n for n in nodes if n['id'] in filtered_node_ids]
        edges = [e for e in edges if e['source'] in filtered_node_ids and e['target'] in filtered_node_ids]

    return {'nodes': nodes, 'links': edges}


def handler(request):
    """Vercel serverless function handler."""
    from urllib.parse import parse_qs, urlparse

    # Parse query parameters
    parsed = urlparse(request.url if hasattr(request, 'url') else request.path)
    params = parse_qs(parsed.query)

    group_filter = None
    if 'group' in params:
        try:
            group_filter = int(params['group'][0])
        except (ValueError, IndexError):
            pass

    data = build_graph_data(group_filter)

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps(data)
    }
