#!/usr/bin/env python3
"""
Import the fixed n8n workflow into n8n
"""
import requests
import json
import subprocess

N8N_API = "http://localhost:5678/api/v1"
WORKFLOW_JSON = "/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/n8n-workflows/main-orchestrator.json"

def load_workflow():
    with open(WORKFLOW_JSON, 'r') as f:
        return json.load(f)

def import_workflow(workflow_data):
    """Import workflow to n8n"""
    
    # First, try to get workflows to see if it exists
    print("Getting existing workflows...")
    try:
        r = requests.get(f"{N8N_API}/workflows", timeout=10)
        if r.status_code == 200:
            workflows = r.json()
            print(f"Found {len(workflows)} workflows")
            main_orchestrator = next((w for w in workflows if w.get('name') == 'Main Orchestrator'), None)
            if main_orchestrator:
                print(f"Found existing Main Orchestrator (ID: {main_orchestrator['id']})")
                print("Note: Updating workflows via API requires authentication")
                return False
        else:
            print(f"API returned {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"Error checking workflows: {e}")
    
    print("\n⚠️  n8n API requires authentication to modify workflows")
    print("Options:")
    print("1. Import manually via n8n UI: http://localhost:5678")
    print("2. Delete the old workflow in UI and reimport")
    print("3. Or restart n8n with --clean flag")
    return False

if __name__ == "__main__":
    print("Loading workflow from:", WORKFLOW_JSON)
    workflow = load_workflow()
    print(f"Workflow name: {workflow.get('name')}")
    print(f"Number of nodes: {len(workflow.get('nodes', []))}")
    
    import_workflow(workflow)
