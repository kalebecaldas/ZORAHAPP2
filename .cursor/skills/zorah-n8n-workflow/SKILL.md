---
name: zorah-n8n-workflow
description: Manage and debug the ZoraH n8n workflow via REST API. Use when modifying n8n workflow nodes, diagnosing execution errors, reading execution logs, updating node parameters, or fixing Code node crashes. Triggers on "n8n", "workflow", "node error", "Code node crash", "task runner", "guardrails error", "agente n8n", "fluxo n8n". Do NOT use for backend Express (use zorah-railway-deploy), database (use zorah-prisma-safe), or frontend tasks.
---

# ZoraH n8n Workflow Management

Manages the ZoraH bot workflow on the self-hosted n8n instance via REST API.

## Instance Configuration

| Property | Value |
|----------|-------|
| Host | `https://n8nserver.iaamazonas.com.br` |
| API Base | `/api/v1` |
| Workflow ID | `5xTy00n8X2mmwJ7z` |
| Workflow Name | `ZoraH Bot - Simple v2.2.4` |
| Total Nodes | 45 |

## Authentication

All API calls require the header:
```
X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0YWIyNDU1MC02ODhkLTQwNDQtOWRjMC1mZjMwZmY0OTU1NWYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Mzg2NTU4fQ.6A72dHBr-B-fJmzpQCkdu22c4HK-OZ7xZ1CTWWF5TgA
```

## Available API Endpoints

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/v1/workflows` | GET | List workflows; supports `?active=true&limit=N` |
| `/api/v1/workflows/:id` | GET | Full workflow JSON with nodes, connections, settings |
| `/api/v1/workflows/:id` | PUT | Update workflow (see PUT payload rules below) |
| `/api/v1/executions` | GET | List executions; supports `?workflowId=&status=error&limit=N` |
| `/api/v1/executions/:id` | GET | Execution details; add `?includeData=true` for run data and errors |
| `/api/v1/tags` | GET | List tags |

**Not available on this instance:** `/api/v1/credentials` (405), `/api/v1/variables` (403), `/api/v1/audit` (405)

### PUT Workflow — Allowed Top-Level Keys Only

The PUT `/api/v1/workflows/:id` endpoint rejects unknown top-level properties. Use exactly:
```json
{
  "name": "workflow name",
  "nodes": [...],
  "connections": {...},
  "settings": { "executionOrder": "v1", "callerPolicy": "workflowsFromSameOwner" },
  "staticData": null
}
```

## Python Template — Read & Update Workflow

This is the canonical pattern used in this project:

```python
import json, ssl, urllib.request, urllib.error

N8N_BASE = 'https://n8nserver.iaamazonas.com.br'
N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
WF_ID = '5xTy00n8X2mmwJ7z'
ctx = ssl.create_default_context()

# GET workflow
req = urllib.request.Request(
    f'{N8N_BASE}/api/v1/workflows/{WF_ID}',
    headers={'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json'},
)
with urllib.request.urlopen(req, context=ctx) as r:
    wf = json.loads(r.read().decode())

# Modify wf['nodes'] or wf['connections'] here...

# PUT workflow (only allowed keys)
payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': {'executionOrder': 'v1', 'callerPolicy': 'workflowsFromSameOwner'},
    'staticData': wf.get('staticData')
}
data = json.dumps(payload).encode()
put_req = urllib.request.Request(
    f'{N8N_BASE}/api/v1/workflows/{WF_ID}',
    data=data, method='PUT',
    headers={'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json', 'accept': 'application/json'}
)
try:
    with urllib.request.urlopen(put_req, context=ctx) as r:
        resp = json.loads(r.read().decode())
        print(f"Updated: {resp.get('id')}")
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode()[:500]}")
```

## Common Procedures

### 1. Diagnose Execution Error

```python
# List recent failed executions
GET /api/v1/executions?workflowId=5xTy00n8X2mmwJ7z&status=error&limit=5

# Get error detail with stack trace
GET /api/v1/executions/:id?includeData=true

# Key fields in response:
# data.resultData.error           → top-level error message + stack
# data.resultData.lastNodeExecuted → which node failed
# data.resultData.runData          → dict of node_name → [{executionTime, executionStatus, error}]
```

**Status values:** `success`, `error`, `running`, `waiting`, `canceled`

### 2. Find and Read a Node by Name

```python
with urllib.request.urlopen(req, context=ctx) as r:
    wf = json.loads(r.read().decode())

node = next((n for n in wf['nodes'] if n['name'] == 'My Node Name'), None)
print(node['type'], node['parameters'])
```

### 3. Update a Node Parameter

```python
for node in wf['nodes']:
    if node['name'] == 'Target Node':
        node['parameters']['jsCode'] = '// new code here'
        break
# Then PUT the workflow
```

### 4. Add a Set Node and Reconnect

Use `n8n-nodes-base.set` with `typeVersion: 3.4`. See "Set Node JSON Template" below.

To insert node B between existing nodes A and C:
1. Add new node to `wf['nodes']`
2. In `wf['connections']`, change `A → C` to `A → B` and add `B → C`
3. PUT the workflow

## Set Node JSON Template

**CRITICAL:** The correct format for `n8n-nodes-base.set` typeVersion 3.4 uses `assignments.assignments` — NOT `fields.values` (which is silently ignored and produces empty output).

```json
{
  "id": "unique-uuid-here",
  "name": "Set: Context Name",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [x, y],
  "parameters": {
    "mode": "manual",
    "includeOtherFields": false,
    "assignments": {
      "assignments": [
        {
          "id": "unique-uuid-for-field",
          "name": "fieldName",
          "value": "={{ $('Source Node').item.json.fieldName }}",
          "type": "string"
        },
        {
          "id": "unique-uuid-for-field-2",
          "name": "numericField",
          "value": "={{ $('Source Node').item.json.numericField }}",
          "type": "number"
        },
        {
          "id": "unique-uuid-for-field-3",
          "name": "boolField",
          "value": "={{ $('Source Node').item.json.boolField }}",
          "type": "boolean"
        },
        {
          "id": "unique-uuid-for-field-4",
          "name": "objectField",
          "value": "={{ $('Source Node').item.json.objectField }}",
          "type": "object"
        }
      ]
    }
  }
}
```

**Key rules:**
- Use `assignments.assignments` (NOT `fields.values`) — the latter is silently ignored
- Each assignment needs a unique `id` (UUID), a `name`, a `value` (expression), and a `type` (`string`, `boolean`, `number`, `object`, `array`)
- `includeOtherFields: false` means the output ONLY contains declared fields — use this to strip large `intermediateSteps` from agent outputs
- `includeOtherFields: true` keeps existing `$json` fields plus adds the declared ones
- Set nodes run in the **main n8n process** (not the task runner), so cross-node expressions are safe
- Always use `uuid.uuid4()` to generate unique IDs for each assignment when creating via API

## CRITICAL: Code Node Safety Rules

### The Task Runner OOM Problem

n8n Code nodes execute in a **separate subprocess** called the Task Runner, which communicates with the main n8n process via WebSocket. When a Code node uses a **cross-node reference** (`$('NodeName').item.json`), the task runner must request that data from the main process. If the referenced node produced large data (e.g., AI agent responses), this transfer causes OOM and the task runner disconnects.

**Crash signature:**
```
"message": "Node execution failed"
"stack": "at DefaultTaskRunnerDisconnectAnalyzer.toDisconnectError"
"runnerId": "2lfkQU3IU_c-H7Xgl4e9Y"
```
The node shows `executionTime` of 100s+ before failing.

### Anti-patterns (never use inside Code nodes)

```javascript
// These ALL cause Task Runner OOM:
const data = $('Some Node').item.json;          // ❌
const items = $items('Some Node')[0]?.json;     // ❌
const first = $('Some Node').first().json;      // ❌
```

### Safe Pattern

```javascript
// Code nodes should ONLY access:
const data = $json;               // ✅ current item — pre-loaded by task runner
const all = $input.all();         // ✅ all items from previous node
const first = $input.first().json; // ✅ first item from previous node
```

### Fix Pattern: Set Node for Context Injection

When a Code node needs data from a node that is not its immediate predecessor:

1. Insert a **Set node** (runs in main process) before the Code node
2. In the Set node, map the required fields using cross-node expressions
3. The Code node reads everything from `$json` — no cross-node refs needed

```
[Source Node] → [Set: Inject Context] → [Code Node reads $json]
```

## ZoraH Workflow Architecture (Main Flow)

```
Webhook Start
  └── Extract Data (Code)
        └── Lookup & Parse Patient (Code — fetch Clínica Ágil + parse)
              └── Upsert Patient ZoraH (HTTP POST /api/patients/upsert-from-bot)
                    └── [Set: Intent Context]          ← context injection
                          └── Intent Classifier Agent (Gemini)
                                └── Parse Intent Response (Code — reads $json only)
                                      └── Intent Router (Switch)
                                            ├── INFORMACAO → Information Agent (Gemini)
                                            │       └── [Set: Info Context]
                                            │             └── Parse Information Response (Code)
                                            │                   └── [Set: Format Context]
                                            │                         └── Format Final Response (Code)
                                            │                               └── Prepare Analytics → Send to System → Webhook Response
                                            ├── AGENDAR → [Set: Appt Context]
                                            │       └── Handle Appointment Request (Code)
                                            │             └── Format Final Response (Code)
                                            ├── FALAR_ATENDENTE → Send to System → Webhook Response
                                            └── PEDIR_UNIDADE → Webhook Response
```

**Parallel "1" branch** (legacy/separate flow): `Extract Data1 → Intent Classifier Agent1 → Parse Intent Response1 → Intent Router1 → ...`

## Context Fields Carried Through the Workflow

The following fields must be available at every Code node in the main flow. They originate from `Lookup & Parse Patient` and must be injected via Set nodes where needed:

| Field | Type | Source |
|-------|------|--------|
| `chatInput` | string | User's message |
| `phone` | string | WhatsApp/Instagram phone |
| `conversationId` | string | ZoraH DB conversation ID |
| `sessionId` | string | Postgres memory session key |
| `platform` | string | `whatsapp` or `instagram` |
| `patientName` | string \| null | From Clínica Ágil API |
| `patientFound` | boolean | Whether patient was identified |
| `patient` | object | Full patient record |
| `convenioId` | string \| null | Patient insurance ID |
| `needsPhone` | boolean | Whether phone collection needed |
| `messageReceivedAt` | string | ISO timestamp |
| `context` | object | Additional context |
| `appointmentFlow` | object | Scheduling flow state |

## Node ID Reference (Main Flow)

| Node Name | ID | Position |
|-----------|----|----------|
| `Intent Classifier Agent` | `ef05b1f9-a3ca-402d-b58f-d4f5a9f62723` | `[18816, 13376]` |
| `Parse Intent Response` | `aa22d26b-dcbf-4ca0-8229-fe6f1bfbc3b1` | `[19104, 13392]` |
| `Information Agent` | `e617a874-e0fd-41d3-92fe-07cb93628459` | `[19664, 12816]` |
| `Parse Information Response` | `ec48645c-3e77-401d-b0b1-e7cd7649cc41` | `[20400, 12896]` |
| `Handle Appointment Request` | `2f564920-9c34-4eaa-8a3d-a43fe7b06989` | `[19632, 13424]` |
| `Format Final Response` | `3facf87f-c290-4205-97a2-7e29af6ab5ef` | `[21440, 13392]` |
| `Send to System` | `f7db9d45-7478-43af-baa4-cedcc09c3b57` | `[21648, 13392]` |

## Safety Rules

1. **Never add cross-node refs inside Code nodes** — use the Set node injection pattern
2. **Always backup workflow JSON locally** before applying changes via API
3. **Update the local file** `n8n/Zorah bot n8n ativo.json` after every API change
4. **Test via a manual execution** after each change (check `/api/v1/executions?status=error`)
5. **The "1" branch nodes** (Extract Data1, Intent Classifier Agent1, etc.) are a separate legacy flow — do not mix them with the main flow
6. **Never change `typeVersion`** of existing nodes — use the same version already in the workflow
