# IKIP — Industrial Knowledge Intelligence Platform
### Enterprise-Grade GenAI-Powered Brain for Heavy Industrial Assets

IKIP is a multi-agent industrial intelligence platform designed to integrate document silos, monitor regulatory compliance, query asset subgraphs, diagnose machine failures, and assist field engineers with a grounded RAG Copilot.

---

## 🚀 Key Features

*   **Semantic Hybrid RAG Copilot**: Combines dense embeddings (`text-embedding-004`) and sparse keyword queries inside Qdrant, fused via Reciprocal Rank Fusion (RRF) and validated by a multi-stage LangGraph Copilot agent.
*   **Active Knowledge Graph**: Stores industrial ontology relations (Assets, Incidents, Documents, Clauses) in Neo4j, enabling graph-traversal searches and visual Cytoscape maps.
*   **LangGraph RCA 5-Whys Agent**: Automates failure diagnostics on corrective maintenance tickets using structured iterative root-cause inquiry.
*   **Compliance Radar Scan**: Scans standard operating procedures (SOPs) against OISD-118, PESO, and the Factory Act, flagging non-conformity gaps and compiling PDF evidence packages.
*   **Offline-First Field Scanner**: Mobile PWA featuring mock QR camera scanning, manual asset lookups, and IndexedDB data caching for offline technicians.

---

## 📂 Repository Architecture

```
ikip/
├── README.md                           # Platform Documentation (This File)
├── docker-compose.yml                  # Redis & Local Database Containers
├── .env                                # Central Environment Configurations
├── packages/
│   ├── shared/                         # Unified TypeScript Interface Definitions
│   ├── backend/                        # Express API & BullMQ Background Workers
│   └── frontend/                       # React 18 SPA + Zustand + Cytoscape (PWA)
└── ai-services/
    ├── requirements.txt                # Python Dependencies
    ├── main.py                         # FastAPI Router Entrypoint
    └── services/
        ├── ingestion/                  # PDF Ingestion, OCR & Graph Linker
        ├── rag/                        # Dense/Sparse Hybrid RRF Search
        ├── rca_agent/                  # 5-Whys Diagnostics LangGraph Workflow
        ├── compliance_agent/           # Regulation Clause SOP Scanner
        └── lessons_engine/             # Incident Pattern Warning Generator
```

---

## 🛠️ Setup & Run

### 1. Prerequisites
Ensure the following are installed:
*   Node.js (v20+) & npm
*   Python (v3.11+)
*   Docker (Optional, for running local Redis)

### 2. Environment Setup
Create a `.env` file in the root directory. Paste the following configuration, filling in the target service credentials:

```bash
# --- GENERAL ---
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# --- DATABASE CREDENTIALS ---
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=ikip_production
REDIS_URL=redis://localhost:6379

# --- NEO4J ---
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=4f4c4742
NEO4J_PASSWORD=8eoz_sMytBSXyaeo5IK4BtsSf_rBvy1vmPNhSSePWjI

# --- QDRANT ---
QDRANT_URL=https://<cluster-endpoint>.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
QDRANT_COLLECTION_NAME=ikip_chunks

# --- GOOGLE AI ---
GOOGLE_AI_API_KEY=AQ.Ab8RN6L8Yyib51IkEzOq...
GEMINI_MODEL=gemini-1.5-pro
GEMINI_EMBEDDING_MODEL=text-embedding-004

# --- AUTH & SERVICES ---
JWT_SECRET=super_secret_session_jwt_key_12345
AI_SERVICES_URL=http://localhost:8000
AI_SERVICES_API_KEY=secret_ai_token_key_here
```

### 3. Install Monorepo Dependencies
From the project root:
```bash
# Install node packages (workspace dependencies)
npm install

# Build shared types package
npm run build --workspace=packages/shared
```

### 4. Setup Python Virtual Environment
Navigate to `ai-services`:
```bash
cd ai-services
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## ⚡ Running the Platform

To start all three components locally, open three terminal sessions:

### Terminal 1: Node.js Backend API
Runs the Express routing server and connects background worker processes.
```bash
npm run dev --workspace=packages/backend
```

### Terminal 2: Python AI microservices
Launches the FastAPI LangGraph router and DB interface layer.
```bash
cd ai-services
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 3: React Frontend Client
Hosts the Vite local dev server.
```bash
npm run dev --workspace=packages/frontend
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Testing & Verification Guide

### 1. Automated System Tests

#### Backend Services Integration Tests
Verify authentication routes, file upload handoff, and socket connections:
```bash
npm run test --workspace=packages/backend
```

#### AI Pipelines Unit Tests
Test chunking, OCR, hybrid RRF search, and graph mappings:
```bash
cd ai-services
pytest tests/
```

---

### 2. Manual End-to-End Testing

Ensure all service servers are running, then perform these manual verifications in order:

#### Flow A: Document Upload & Ingestion
1.  Navigate to **Document Library** (`/documents`).
2.  Drag and drop an operations manual PDF or OEM datasheet into the ingestion box.
3.  Fill in the Title and Select the document type (e.g., `SOP`, `OEMManual`).
4.  Click **Start Ingestion Job**.
5.  *Expected Result*: A processing toast notification appears. The file enters the queue, triggers text extraction, and pushes graph connections. A green "Ingested" badge appears on completion.

#### Flow B: Grounded RAG Query
1.  Navigate to **AI Copilot** (`/copilot`).
2.  Type a grounded question (e.g., *"What is the startup procedure for Pump P-101?"*).
3.  Press **Send** or click the **Mic** button to speak.
4.  *Expected Result*: The answer streams token-by-token into the chat box. Citations citing target documents are listed beneath the answer with an AI confidence rating.

#### Flow C: Cypher Graph Querying
1.  Navigate to **Knowledge Graph** (`/kg`).
2.  Select **Cypher Console** mode.
3.  Choose a preset like *"Piping Loops & Instruments"* or enter:
    `MATCH (e:Equipment)-[r]-(m) RETURN e, r, m LIMIT 15`
4.  Click **Execute Cypher**.
5.  *Expected Result*: Cytoscape renders nodes in distinct colours based on their class (Blue for Equipment, Orange for Documents, etc.). Selecting a node opens the properties sidebar.

#### Flow D: Maintenance Passport & AI RCA
1.  Navigate to **Maintenance Intel** (`/maintenance`).
2.  Select an asset tag (e.g., `P-101`).
3.  Navigate to the **Work Orders** tab.
4.  Select a completed corrective maintenance ticket and click **Run 5-Whys**.
5.  *Expected Result*: The diagnostic loader spins. A markdown list tracing the failure progression back to the root cause appears with remediation recommendations.

#### Flow E: Offline field Caching
1.  Navigate to **Field Tag Scanner** (`/scanner`).
2.  Look up an asset tag (e.g., `P-101`) to cache it.
3.  Click **Force Offline** in the header.
4.  Clear your search and look up `P-101` again.
5.  *Expected Result*: The page displays cached specs and safety rules with an active *"Viewing Offline Cache"* warning, fetched directly from IndexedDB.
