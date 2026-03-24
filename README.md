# 🚀 MCP + AI + Kubernetes (GKE)

Control your Kubernetes cluster using **natural language** with a local LLM (Ollama) and MCP server.

---

## 🧠 Overview

This project demonstrates how to:
- Use AI to interpret DevOps commands  
- Route actions via MCP (Express API)  
- Execute real Kubernetes operations  

---

## 🏗️ Architecture

User → AI Client → Ollama (Llama3) → MCP Server → Kubernetes Cluster

---

## 📦 Prerequisites

- Node.js
- npm
- kubectl
- Kubernetes cluster (GKE / Minikube / Docker Desktop)
- Ollama installed

---

## 📥 Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd mcp-k8s-ai
```

---

### 2. Setup MCP Server

```bash
cd mcp-server
npm init -y
npm install express @kubernetes/client-node js-yaml
```

curl -X POST http://localhost:3000/tools/hello

---

### 3. Setup AI Client

```bash
cd ../ai-client
npm init -y
```

```bash
npm install node-fetch
```

---

### 4. Add Module Type

In both folders (`mcp-server` and `ai-client`) add in package.json:

```json
"type": "module"
```

---

### 5. Install Ollama

Install from https://ollama.com

```bash
brew install ollama

ollama serve

ollama pull llama3
```

---

## ▶️ Run Application

### Start MCP Server

```bash
cd mcp-server
node index.js
```

---

### Start AI Client

```bash
cd ai-client
node ai-client-ollama.js
```

---

## 🧪 Example Commands

```
show me pods
how many pods running
restart pod demo-app-xxxx
create service
deploy nginx deployment
```

---

## 📁 Project Structure

```
mcp-k8s-ai/
├── mcp-server/
├── ai-client/
├── k8s/
└── README.md
```

---

## 🔧 MCP Endpoints

- POST /tools/get-pods  
- POST /tools/restart-pod  
- POST /tools/apply-manifest  

---

## 🔐 Security

- Runs fully local using Ollama  
- No external API calls  
- Uses kubeconfig for cluster access  

---

## 🚀 Features

- AI-based Kubernetes control  
- Local LLM integration  
- YAML deployment support  


