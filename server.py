#!/usr/bin/env python3
"""
Local development server that wraps bip.py functionality.
Exposes all filter parameters via REST API.

Run with: python server.py
Then access: http://localhost:5001/api/graph?mode=full
"""

import os
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

# Import bip.py functions
from api.bip import (
    load_orgs_table,
    load_ep_lookup,
    attach_party_country,
    infer_commission_unmatched_org_nodes,
    guess_timestamp_column,
    filter_bipartite_by_degree,
    bipartite_k_core_prune,
    filter_edges_by_weight,
    build_d3_bipartite,
    MEETINGS_JSON,
    COMMISSION_CSV,
)
import pandas as pd

app = Flask(__name__)
CORS(app)


def build_graph(
    mode='full',
    org_min_degree=2,
    actor_min_degree=1,
    bipartite_k_core=0,
    min_edge_weight=1,
    keep_isolates=False,
):
    """Build graph data with specified filters."""

    # Load data
    orgs_df = load_orgs_table()
    meetings_df = pd.read_json(MEETINGS_JSON)
    commission_df = pd.read_csv(COMMISSION_CSV)

    # ORG nodes (master)
    org_nodes = orgs_df.copy()
    if "eu_transparency_register_id" in org_nodes.columns:
        org_nodes = org_nodes.rename(columns={"eu_transparency_register_id": "register_id"})
    if "register_id" not in org_nodes.columns:
        org_nodes["register_id"] = None
    if "interests_represented" not in org_nodes.columns:
        org_nodes["interests_represented"] = None

    org_nodes["type"] = "org"
    org_nodes["id"] = org_nodes["id"].astype(str)
    org_nodes["label"] = org_nodes["name"].astype(str)

    # Timestamps
    meetings_ts_col = guess_timestamp_column(meetings_df)
    commission_ts_col = guess_timestamp_column(commission_df)

    # Build nodes/edges per mode
    mep_nodes = pd.DataFrame()
    commission_nodes = pd.DataFrame()
    new_org_nodes = pd.DataFrame(columns=["id", "type", "name", "label"])

    if mode in ("mep", "full"):
        if "source_data" in meetings_df.columns:
            meetings_df["mep_name"] = meetings_df["source_data"].apply(
                lambda x: x.get("mep_name") if isinstance(x, dict) else None
            )
        elif "mep_name" not in meetings_df.columns:
            meetings_df["mep_name"] = None

        mep_nodes = meetings_df[["mep_id", "mep_name"]].drop_duplicates().rename(columns={"mep_id": "id"})
        mep_nodes["type"] = "mep"
        mep_nodes = attach_party_country(mep_nodes)
        mep_nodes["id"] = mep_nodes["id"].astype(str)
        mep_nodes["label"] = mep_nodes["mep_name"].fillna("").astype(str)

    if mode in ("commission", "full"):
        commission_df["OrgId"] = commission_df["OrgId"].astype(str)

        commission_nodes = pd.DataFrame({
            "id": commission_df["Host"].astype(str).drop_duplicates().values,
            "type": "commission_employee",
            "name": commission_df["Host"].astype(str).drop_duplicates().values,
            "label": commission_df["Host"].astype(str).drop_duplicates().values,
        })

        new_org_nodes = infer_commission_unmatched_org_nodes(commission_df, org_nodes)
        if len(new_org_nodes):
            new_org_nodes["id"] = new_org_nodes["id"].astype(str)

    # Build edges
    if mode == "mep":
        nodes = pd.concat([
            org_nodes[["id", "type", "name", "label", "interests_represented", "register_id"]],
            mep_nodes[["id", "type", "mep_name", "label", "party", "country"]],
        ], ignore_index=True)

        edges = meetings_df[["mep_id", "organization_id"]].rename(columns={"mep_id": "source", "organization_id": "target"})
        if meetings_ts_col and meetings_ts_col in meetings_df.columns:
            edges["timestamp"] = meetings_df[meetings_ts_col]
            ts_col = "timestamp"
        else:
            ts_col = None
        actor_label = "MEP"

    elif mode == "commission":
        nodes = pd.concat([
            org_nodes[["id", "type", "name", "label", "interests_represented", "register_id"]],
            new_org_nodes[["id", "type", "name", "label"]] if len(new_org_nodes) else pd.DataFrame(columns=["id","type","name","label"]),
            commission_nodes[["id", "type", "name", "label"]],
        ], ignore_index=True)

        edges = commission_df[["Host", "OrgId"]].rename(columns={"Host": "source", "OrgId": "target"})
        if commission_ts_col and commission_ts_col in commission_df.columns:
            edges["timestamp"] = commission_df[commission_ts_col]
            ts_col = "timestamp"
        else:
            ts_col = None
        actor_label = "Commission"

    else:  # full
        nodes = pd.concat([
            org_nodes[["id", "type", "name", "label", "interests_represented", "register_id"]],
            new_org_nodes[["id", "type", "name", "label"]] if len(new_org_nodes) else pd.DataFrame(columns=["id","type","name","label"]),
            mep_nodes[["id", "type", "mep_name", "label", "party", "country"]],
            commission_nodes[["id", "type", "name", "label"]],
        ], ignore_index=True)

        edges_mep = meetings_df[["mep_id", "organization_id"]].rename(columns={"mep_id": "source", "organization_id": "target"})
        if meetings_ts_col and meetings_ts_col in meetings_df.columns:
            edges_mep["timestamp"] = meetings_df[meetings_ts_col]

        edges_com = commission_df[["Host", "OrgId"]].rename(columns={"Host": "source", "OrgId": "target"})
        if commission_ts_col and commission_ts_col in commission_df.columns:
            edges_com["timestamp"] = commission_df[commission_ts_col]

        edges = pd.concat([edges_mep, edges_com], ignore_index=True)
        ts_col = "timestamp" if "timestamp" in edges.columns else None
        actor_label = "Actor"

    # Apply structural filtering
    edges = filter_bipartite_by_degree(
        edges,
        org_min_degree=org_min_degree,
        actor_min_degree=actor_min_degree,
        verbose=False,
        actor_label=actor_label,
    )

    if bipartite_k_core > 1:
        edges = bipartite_k_core_prune(edges, k=bipartite_k_core, verbose=False, actor_label=actor_label)

    # Edge weight filtering
    edges_agg = filter_edges_by_weight(
        edges,
        min_weight=min_edge_weight,
        ts_col=ts_col,
        verbose=False,
    )

    # Build D3 graph
    graph = build_d3_bipartite(
        nodes_df=nodes,
        edges_df=edges_agg,
        ts_col=None,  # Already aggregated
        keep_isolates=keep_isolates,
        verbose=False,
    )

    # Ensure data consistency: create missing org nodes for edges
    node_ids = {n['id'] for n in graph['nodes']}
    missing_orgs = set()
    for link in graph['links']:
        if link['source'] not in node_ids:
            missing_orgs.add(link['source'])
        if link['target'] not in node_ids:
            missing_orgs.add(link['target'])

    # Add placeholder nodes for missing organizations
    for org_id in missing_orgs:
        graph['nodes'].append({
            'id': org_id,
            'type': 'org',
            'label': org_id,  # Use ID as label since we don't have the name
            'name': org_id,
        })

    return graph


@app.route('/api/graph')
def get_graph():
    """
    GET /api/graph

    Query parameters:
    - mode: 'mep', 'commission', or 'full' (default: 'full')
    - org_min_degree: int (default: 2)
    - actor_min_degree: int (default: 1)
    - bipartite_k_core: int (default: 0)
    - min_edge_weight: int (default: 1)
    - keep_isolates: bool (default: false)
    """
    try:
        mode = request.args.get('mode', 'full')
        if mode not in ('mep', 'commission', 'full'):
            mode = 'full'

        org_min_degree = int(request.args.get('org_min_degree', 2))
        actor_min_degree = int(request.args.get('actor_min_degree', 1))
        bipartite_k_core = int(request.args.get('bipartite_k_core', 0))
        min_edge_weight = int(request.args.get('min_edge_weight', 1))
        keep_isolates = request.args.get('keep_isolates', 'false').lower() == 'true'

        graph = build_graph(
            mode=mode,
            org_min_degree=org_min_degree,
            actor_min_degree=actor_min_degree,
            bipartite_k_core=bipartite_k_core,
            min_edge_weight=min_edge_weight,
            keep_isolates=keep_isolates,
        )

        return jsonify(graph)

    except Exception as e:
        return jsonify({
            'error': str(e),
            'nodes': [],
            'links': []
        }), 500


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    print("Starting local development server...")
    print("API endpoint: http://localhost:5001/api/graph")
    print("\nAvailable parameters:")
    print("  mode: mep, commission, full (default: full)")
    print("  org_min_degree: int (default: 2)")
    print("  actor_min_degree: int (default: 1)")
    print("  bipartite_k_core: int (default: 0)")
    print("  min_edge_weight: int (default: 1)")
    print("  keep_isolates: true/false (default: false)")
    print("\nExample: http://localhost:5001/api/graph?mode=mep&org_min_degree=3")
    app.run(host='0.0.0.0', port=5001, debug=True)
