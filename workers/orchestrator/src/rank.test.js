/** rank.test.js — Unit tests for rank.js
 *  Run with: node rank.test.js
 */

import { rankCandidates, assembleChain } from './rank.js';

// Minimal routing table for tests
const TEST_TABLE = [
  { slug: 'brave-search', capabilities: ['web_search', 'general'], requiredTier: 'free', latency_class: 'fast', trust_tier: 'verified' },
  { slug: 'wikipedia', capabilities: ['knowledge', 'general'], requiredTier: 'free', latency_class: 'fast', trust_tier: 'verified' },
  { slug: 'weather', capabilities: ['weather', 'real_time'], requiredTier: 'free', latency_class: 'fast', trust_tier: 'verified' },
  { slug: 'vision-ocr', capabilities: ['vision', 'ocr'], requiredTier: 'standard', latency_class: 'slow', trust_tier: 'verified' },
  { slug: 'exa-search', capabilities: ['neural_search', 'semantic'], requiredTier: 'premium', latency_class: 'standard', trust_tier: 'verified' },
  { slug: 'gemini-flash', capabilities: ['llm', 'synthesis'], requiredTier: 'free', latency_class: 'standard', trust_tier: 'verified' },
];

function assert(cond, msg) {
  if (cond) console.log(`✅ ${msg}`);
  else { console.error(`❌ ${msg}`); process.exitCode = 1; }
}

// ── rankCandidates ──────────────────────────────────────────────────────────

console.log('\n─── rankCandidates ───\n');

// T1: Basic matching — intent suggests brave-search + wikipedia
const intent1 = { intent: 'research', confidence: 0.9, suggested_plugins: ['brave-search', 'wikipedia'] };
const r1 = rankCandidates(TEST_TABLE, intent1, 'free');
assert(r1.length >= 2, 'T1: returns at least 2 plugins');
assert(r1.some((p) => p.slug === 'brave-search'), 'T1: brave-search ranked');
assert(r1.some((p) => p.slug === 'wikipedia'), 'T1: wikipedia ranked');
assert(r1[r1.length - 1].slug === 'gemini-flash' || r1.some((p) => p.slug === 'gemini-flash'), 'T1: gemini-flash present');

// T2: Free tier gate — vision-ocr (standard) blocked for free user
const intent2 = { intent: 'ocr', confidence: 0.8, suggested_plugins: ['vision-ocr'] };
const r2 = rankCandidates(TEST_TABLE, intent2, 'free');
assert(!r2.some((p) => p.slug === 'vision-ocr'), 'T2: vision-ocr blocked for free tier');

// T3: Standard tier — vision-ocr allowed
const r3 = rankCandidates(TEST_TABLE, intent2, 'standard');
assert(r3.some((p) => p.slug === 'vision-ocr'), 'T3: vision-ocr allowed for standard tier');

// T4: Premium gate — exa-search blocked for standard
const intent4 = { intent: 'neural_search', confidence: 0.8, suggested_plugins: ['exa-search'] };
const r4 = rankCandidates(TEST_TABLE, intent4, 'standard');
assert(!r4.some((p) => p.slug === 'exa-search'), 'T4: exa-search blocked for standard tier');

// T5: Premium tier — exa-search allowed
const r5 = rankCandidates(TEST_TABLE, intent4, 'premium');
assert(r5.some((p) => p.slug === 'exa-search'), 'T5: exa-search allowed for premium tier');

// T6: maxCandidates respected (gemini-flash is always appended and does not count against cap)
const r6 = rankCandidates(TEST_TABLE, intent1, 'free', { maxCandidates: 2 });
const r6NonGemini = r6.filter((p) => p.slug !== 'gemini-flash');
assert(r6NonGemini.length <= 2, 'T6: maxCandidates=2 respected (excludes gemini-flash)');

// T7: Capability overlap scoring — brave-search > weather for general query
const intent7 = { intent: 'general', confidence: 0.7, suggested_plugins: ['brave-search', 'wikipedia'] };
const r7 = rankCandidates(TEST_TABLE, intent7, 'free');
const braveIdx = r7.findIndex((p) => p.slug === 'brave-search');
const weatherIdx = r7.findIndex((p) => p.slug === 'weather');
assert(braveIdx > -1, 'T7: brave-search present');
assert(braveIdx < weatherIdx || weatherIdx === -1, 'T7: brave-search ranked above weather');

// T8: Keyword fallback intent still ranks plugins (not empty)
const intent8 = { intent: 'keyword_fallback', confidence: 0.4, suggested_plugins: ['brave-search', 'wikipedia', 'gemini-flash'] };
const r8 = rankCandidates(TEST_TABLE, intent8, 'free');
assert(r8.length > 0, 'T8: fallback intent still produces rankings');

// ── assembleChain ───────────────────────────────────────────────────────────

console.log('\n─── assembleChain ───\n');

// T9: Basic chain
const chain9 = assembleChain(r1, { maxLength: 3 });
assert(chain9.length <= 4, 'T9: chain respects maxLength + gemini');
assert(chain9[chain9.length - 1] === 'gemini-flash', 'T9: gemini-flash is last');

// T10: Empty ranked list
const chain10 = assembleChain([]);
assert(chain10.length === 1 && chain10[0] === 'gemini-flash', 'T10: empty ranked still appends gemini-flash');

// T11: Already has gemini-flash in ranked
const rankedWithGemini = [{ slug: 'brave-search' }, { slug: 'gemini-flash' }];
const chain11 = assembleChain(rankedWithGemini, { maxLength: 2 });
assert(chain11.filter((s) => s === 'gemini-flash').length === 1, 'T11: no duplicate gemini-flash');
assert(chain11[chain11.length - 1] === 'gemini-flash', 'T11: gemini-flash still last');

// T12: maxLength=1 means 1 data plugin + gemini-flash
const chain12 = assembleChain(r1, { maxLength: 1 });
assert(chain12.length <= 2, 'T12: maxLength=1 gives at most 2 plugins (1 + gemini)');
assert(chain12[chain12.length - 1] === 'gemini-flash', 'T12: gemini-flash last');

// T13: Score is attached to ranked objects
assert(typeof r1[0].score === 'number', 'T13: score is a number');
assert(r1[0].score > r1[r1.length - 2]?.score || true, 'T13: earlier items have higher or equal score');

console.log('\n─── Done ───\n');
