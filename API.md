# SwarmSpace Backend API Documentation

SwarmSpace provides backend infrastructure for AI agent execution and plugin management.

## 🚀 **Core Services**

### **Plan Agent Service**
- **Endpoint**: `https://swarmspace-agent-worker.orbitalai.workers.dev`
- **Purpose**: Two-phase agent execution (plan → review → execute)

#### **POST /agent/plan**
Generate structured execution plan for a task.

**Request:**
```json
{
  "task": "Research the latest AI developments",
  "tier": "free" | "standard" | "premium"
}
```

**Response:**
```json
{
  "phase": "plan",
  "plan": {
    "goal": "Research latest AI developments using academic and web sources",
    "clarifications": [],
    "steps": [
      {
        "step": 1,
        "description": "Search academic papers on arXiv",
        "tool": "arxiv",
        "rationale": "Academic sources provide peer-reviewed research"
      }
    ],
    "tools_required": ["arxiv", "brave-search"],
    "estimated_tool_calls": 2,
    "requires_premium": false,
    "tier_gate": false
  }
}
```

#### **POST /agent/execute**
Execute an approved plan step-by-step.

**Request:**
```json
{
  "task": "Research the latest AI developments",
  "approved_plan": { /* plan object from /agent/plan */ },
  "tier": "free"
}
```

**Response:**
```json
{
  "phase": "execution",
  "result": {
    "goal": "Research latest AI developments",
    "steps": [/* execution results */],
    "total_duration_ms": 5430,
    "tools_called": 2,
    "tools_succeeded": 2,
    "tools_failed": 0,
    "synthesis": "Latest AI developments include..."
  }
}
```

### **Plugin Router Service**
- **Endpoint**: `https://us-central1-arc-epi.cloudfunctions.net/swarmspaceRouter`
- **Purpose**: Plugin invocation with tier enforcement and quota management

#### **POST /**
Invoke any SwarmSpace plugin.

**Request:**
```json
{
  "data": {
    "plugin_id": "brave-search",
    "params": {
      "query": "latest AI research"
    }
  }
}
```

## 🔒 **Authentication**

All requests require Firebase ID token:
```
Authorization: Bearer <firebase_id_token>
```

## 🎯 **Client Integration**

### **Flutter/Dart Client**
- **Repository**: [LUMARA](https://github.com/marcyap29/LUMARA.git)
- **Integration**: `lib/shared/swarmspace/swarmspace_client.dart`
- **Features**: Research agents, writing tools, plugin management UI

### **Web Client**
- **Dashboard**: Available at SwarmSpace web interface
- **Plugin Submission**: `submit-plugin.html`

## 📊 **Tier System**

| **Tier** | **Plugin Access** | **Daily Calls** |
|----------|------------------|----------------|
| Free | 15 plugins | 20 calls |
| Standard | 18 plugins | 200 calls |
| Premium | 20 plugins | 1000 calls |

## 🔌 **Available Plugins**

### **Free Tier**
- gemini-flash, brave-search, semantic-scholar, weather
- wikipedia, currency, news, arxiv, pubmed, nominatim
- rest-countries, github-public, hackernews, dictionary-api, jina-reader

### **Standard Tier**
- vision-ocr, url-reader, tavily-search

### **Premium Tier**
- exa-search, perplexity-sonar

---

**For client implementation examples, see the LUMARA repository.**