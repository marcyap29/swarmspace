// swarmspaceDiscoveryAgent.ts
//
// Natural language discovery endpoint. Users describe what they need,
// the agent maps intent to the best plugin or workflow chain.
// Works WITHOUT authentication (onRequest, not onCall).
// Rate-limited by IP (10 requests/hour).

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_TURNS = 3;

// ── Plugin & Chain catalogue (embedded for prompt) ──────────────────────────

const PLUGIN_CATALOGUE = `
FREE TIER PLUGINS (available to all users):
- brave-search: Privacy-focused web search [web_search, general]
- semantic-scholar: Academic paper and citation search [academic_search, research, papers]
- weather: Current weather and forecasts [weather, real_time]
- wikipedia: Wikipedia knowledge base [knowledge, encyclopedia, general]
- currency: Currency exchange rates [currency, exchange_rates, real_time]
- news: Latest news and headlines via NewsData.io [news, real_time, headlines]
- arxiv: Scientific preprints from arXiv [academic_search, preprints, research]
- pubmed: Biomedical literature from PubMed/NCBI [biomedical, research, clinical]
- nominatim: Geocoding via OpenStreetMap [geocoding, location, maps]
- rest-countries: Country data and geography [geography, country_data, reference]
- github-public: Public GitHub repo and developer data [developer_tools, repositories, open_source]
- hackernews: Tech community discussions from Hacker News [tech_news, community, discussions]
- dictionary-api: Word definitions and etymology [language, definitions, reference]
- jina-reader: Fetch and extract any URL content [url_fetch, content_extraction, reading]
- gemini-flash: Fast AI synthesis for writing and drafting [llm, synthesis, writing]

STANDARD TIER PLUGINS ($15/mo):
- vision-ocr: Extract text (OCR) or understand images [vision, ocr, image_understanding]
- url-reader: Fetch and extract content from URLs [url_fetch, content_extraction, reading]
- media-upload: Upload image and get a public URL [media_host, image_upload]
- tavily-search: AI-optimized search for research [web_search, ai_optimized, research]
- social-publisher: Publish to LinkedIn, Bluesky, Threads via Late.com [social_publish, social_schedule]

PREMIUM TIER PLUGINS:
- exa-search: Neural semantic search [neural_search, semantic, research]
- perplexity-sonar: Real-time answer synthesis from the web [web_search, answer_synthesis, research]
`;

const CHAIN_CATALOGUE = `
READY-MADE WORKFLOWS (curated chains):
1. /research — Deep Research: brave-search → wikipedia → semantic-scholar → gemini-flash
2. /competitor — Competitive Analysis: brave-search → news → hackernews → gemini-flash
3. /marketing — Marketing Brief: brave-search → news → gemini-flash
4. /plugins — Plugin Discovery: brave-search → github-public → gemini-flash
5. /academic — Academic Research: semantic-scholar → arxiv → pubmed → gemini-flash
6. /news-brief — News Brief: news → hackernews → brave-search → gemini-flash
7. /market-scan — Market Scan: brave-search → news → currency → gemini-flash
8. /location-brief — Location Brief: nominatim → weather → rest-countries → wikipedia → gemini-flash
9. /health-research — Health Research: pubmed → semantic-scholar → wikipedia → gemini-flash
10. /tech-scout — Tech Scout: github-public → hackernews → brave-search → arxiv → gemini-flash
11. /fact-check — Fact Check: brave-search → wikipedia → semantic-scholar → dictionary-api → gemini-flash
12. /content-brief — Content Brief: brave-search → wikipedia → news → gemini-flash
`;

const SYSTEM_PROMPT = `You are SwarmSpace's discovery agent. Your job is to understand what a user wants to accomplish and propose the best plugin or workflow chain from SwarmSpace's catalogue.

${PLUGIN_CATALOGUE}

${CHAIN_CATALOGUE}

INSTRUCTIONS:
1. Analyze the user's natural language request
2. If it matches a ready-made workflow, recommend that workflow
3. If not, compose a custom chain from available plugins
4. Always explain what each plugin does in the chain and why it's included
5. Note which tier is required (free, standard, or premium)

Respond ONLY with valid JSON matching this schema. No preamble, no markdown fences:

{
  "intent": "One sentence summary of what the user wants",
  "suggested_chain": {
    "plugins": ["plugin-id-1", "plugin-id-2", "plugin-id-3"],
    "description": "What this chain does end-to-end",
    "matches_workflow": "/route-name or null if custom",
    "workflow_name": "Human name or null",
    "requires_paid": false,
    "paid_plugins": []
  },
  "alternatives": [
    { "plugins": ["alt-plugin-1", "alt-plugin-2"], "description": "Alternative approach" }
  ],
  "cta": "Sign up to run this chain — it's entirely free"
}`;

// ── CORS helper ─────────────────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

// ── IP Rate Limiting ────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const db = getFirestore();
  const ipHash = hashIp(ip);
  const ref = db.collection("discovery_rate_limits").doc(ipHash);

  const doc = await ref.get();
  const now = Date.now();

  if (!doc.exists) {
    await ref.set({ count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  const data = doc.data()!;
  const elapsed = now - (data.windowStart || 0);

  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    await ref.set({ count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (data.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  await ref.update({ count: FieldValue.increment(1) });
  return { allowed: true, remaining: RATE_LIMIT_MAX - data.count - 1 };
}

// ── Session Management ──────────────────────────────────────────────────────

interface SessionMessage {
  role: "user" | "model";
  content: string;
}

async function loadSession(sessionId: string): Promise<SessionMessage[]> {
  const db = getFirestore();
  const ref = db.collection("discovery_sessions").doc(sessionId);
  const doc = await ref.get();

  if (!doc.exists) return [];

  const data = doc.data()!;
  const elapsed = Date.now() - (data.updatedAt || 0);

  if (elapsed > SESSION_TTL_MS) {
    await ref.delete();
    return [];
  }

  return data.messages || [];
}

async function saveSession(sessionId: string, messages: SessionMessage[]): Promise<void> {
  const db = getFirestore();
  const ref = db.collection("discovery_sessions").doc(sessionId);
  await ref.set({ messages, updatedAt: Date.now() });
}

// ── JSON Response Parser ────────────────────────────────────────────────────

function parseDiscoveryResponse(raw: string): Record<string, unknown> | null {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(raw);
    if (parsed.intent && parsed.suggested_chain) return parsed;
  } catch {
    // Fall through
  }

  // Try extracting JSON from markdown fences or surrounding text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.intent && parsed.suggested_chain) return parsed;
    } catch {
      // Fall through
    }
  }

  return null;
}

// ── Main Handler ────────────────────────────────────────────────────────────

export const swarmspaceDiscoveryAgent = onRequest(
  { secrets: [GEMINI_API_KEY], cors: false },
  async (req, res) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.set(corsHeaders());
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.set(corsHeaders());
      res.status(405).json({ error: "POST required" });
      return;
    }

    res.set(corsHeaders());

    // Rate limit
    const clientIp = req.ip || req.headers["x-forwarded-for"] as string || "unknown";
    const rateCheck = await checkRateLimit(clientIp);

    if (!rateCheck.allowed) {
      res.status(429).json({
        error: "Rate limit exceeded. Sign up for unlimited discovery.",
        signup_url: "/signup.html",
      });
      return;
    }

    // Parse body
    const { message, session_id } = req.body || {};

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const sessionId = session_id || createHash("sha256")
      .update(`${clientIp}-${Date.now()}`)
      .digest("hex")
      .slice(0, 16);

    try {
      // Load session history
      const history = await loadSession(sessionId);

      // Check turn limit
      const userTurnCount = history.filter(m => m.role === "user").length;
      if (userTurnCount >= MAX_TURNS) {
        res.status(200).json({
          intent: "Session limit reached",
          suggested_chain: null,
          cta: "Sign up for unlimited discovery and to run your chains.",
          signup_url: "/signup.html",
          session_id: sessionId,
          turns_remaining: 0,
          signup_gate: true,
        });
        return;
      }

      // Call Gemini Flash
      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        throw new Error("Gemini API key not configured");
      }

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      // Build chat with system prompt and history
      const chatHistory = [
        { role: "user" as const, parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model" as const, parts: [{ text: "Ready. Send me a user request and I will return a structured chain proposal as JSON." }] },
        ...history.map(m => ({
          role: m.role === "user" ? "user" as const : "model" as const,
          parts: [{ text: m.content }],
        })),
      ];

      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message.trim());
      const responseText = result.response.text();

      // Parse response
      const parsed = parseDiscoveryResponse(responseText);

      if (!parsed) {
        logger.warn("Failed to parse discovery response", { raw: responseText.slice(0, 500) });
        res.status(200).json({
          intent: "I understand your request but had trouble formatting the response.",
          suggested_chain: null,
          raw_suggestion: responseText.slice(0, 1000),
          cta: "Try rephrasing, or sign up to explore all plugins.",
          session_id: sessionId,
          turns_remaining: MAX_TURNS - userTurnCount - 1,
        });
        return;
      }

      // Save session
      const updatedHistory: SessionMessage[] = [
        ...history,
        { role: "user", content: message.trim() },
        { role: "model", content: responseText },
      ];
      await saveSession(sessionId, updatedHistory);

      // Return enriched response
      res.status(200).json({
        ...parsed,
        session_id: sessionId,
        turns_remaining: MAX_TURNS - userTurnCount - 1,
        rate_limit_remaining: rateCheck.remaining,
      });

    } catch (err) {
      logger.error("Discovery agent error", { error: String(err) });
      res.status(500).json({
        error: "Discovery agent encountered an error. Please try again.",
        session_id: sessionId,
      });
    }
  }
);
