// workers/orchestrator/src/intent.smoke.js
// Smoke test for intent.js — run with: node intent.smoke.js

import { resolveIntent, getRoutingTable, ROUTING_TABLE } from './intent.js';

const MOCK_AI = {
  async run(model, { messages }) {
    const userMsg = messages.find((m) => m.role === 'user')?.content || '';
    const q = userMsg.replace('User query: "', '').replace('"\n\nReturn JSON only.', '');

    // Mock responses based on query keywords
    if (q.includes('weather')) {
      return { response: JSON.stringify({ intent: 'weather', confidence: 0.95, suggested_plugins: ['weather', 'gemini-flash'] }) };
    }
    if (q.includes('news')) {
      return { response: JSON.stringify({ intent: 'news_brief', confidence: 0.88, suggested_plugins: ['news', 'brave-search', 'gemini-flash'] }) };
    }
    if (q.includes('academic') || q.includes('paper')) {
      return { response: JSON.stringify({ intent: 'academic_research', confidence: 0.92, suggested_plugins: ['semantic-scholar', 'arxiv', 'pubmed', 'gemini-flash'] }) };
    }
    if (q.includes('code') || q.includes('github')) {
      return { response: JSON.stringify({ intent: 'tech_scout', confidence: 0.85, suggested_plugins: ['github-public', 'hackernews', 'brave-search', 'gemini-flash'] }) };
    }
    return { response: JSON.stringify({ intent: 'general', confidence: 0.6, suggested_plugins: ['brave-search', 'wikipedia', 'gemini-flash'] }) };
  },
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) { passed++; console.log(`✅ ${msg}`); }
    else { failed++; console.error(`❌ ${msg}`); }
  }

  console.log('\n─── Intent Resolution Smoke Tests ───\n');

  // Test 1: Weather query
  const t1 = await resolveIntent('What is the weather in Tokyo?', MOCK_AI);
  assert(t1.intent === 'weather', 'T1: Weather intent detected');
  assert(t1.suggested_plugins.includes('weather'), 'T1: weather plugin suggested');
  assert(t1.suggested_plugins.includes('gemini-flash'), 'T1: gemini-flash last');

  // Test 2: News query
  const t2 = await resolveIntent('Latest tech news today', MOCK_AI);
  assert(t2.intent === 'news_brief', 'T2: News intent detected');
  assert(t2.suggested_plugins.includes('news'), 'T2: news plugin suggested');

  // Test 3: Academic query
  const t3 = await resolveIntent('Recent papers on transformer architectures', MOCK_AI);
  assert(t3.intent === 'academic_research', 'T3: Academic intent detected');
  assert(t3.suggested_plugins.includes('semantic-scholar'), 'T3: semantic-scholar suggested');

  // Test 4: Code query
  const t4 = await resolveIntent('Show me trending repos on GitHub', MOCK_AI);
  assert(t4.intent === 'tech_scout', 'T4: Tech scout intent detected');
  assert(t4.suggested_plugins.includes('github-public'), 'T4: github-public suggested');

  // Test 5: Invalid query (empty)
  try {
    await resolveIntent('', MOCK_AI);
    assert(false, 'T5: Empty query throws TypeError');
  } catch (e) {
    assert(e instanceof TypeError, 'T5: Empty query throws TypeError');
  }

  // Test 6: Missing AI binding
  try {
    await resolveIntent('test', {});
    assert(false, 'T6: Missing env.AI throws TypeError');
  } catch (e) {
    assert(e instanceof TypeError, 'T6: Missing env.AI throws TypeError');
  }

  // Test 7: getRoutingTable returns subset
  const table = getRoutingTable(['weather', 'news', 'nonexistent']);
  assert(table.length === 2, 'T7: getRoutingTable filters invalid slugs');
  assert(table.some((p) => p.slug === 'weather'), 'T7: weather in table');
  assert(table.some((p) => p.slug === 'news'), 'T7: news in table');

  // Test 8: ROUTING_TABLE has 22 entries
  assert(ROUTING_TABLE.length === 22, 'T8: ROUTING_TABLE has 22 plugins');

  // Test 9: Fallback keyword search (AI unavailable)
  const brokenAI = { async run() { throw new Error('down'); } };
  const t9 = await resolveIntent('weather in London', brokenAI);
  assert(t9.intent === 'keyword_fallback', 'T9: AI failure falls back to keyword');
  assert(t9.suggested_plugins.includes('weather'), 'T9: fallback suggests weather');

  console.log(`\n─── Results: ${passed} passed, ${failed} failed ───\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
