// workers/orchestrator/src/rank.js
//
// Rank plugin candidates based on intent, policy, and metadata.
// Two-phase routing: rank → assemble → execute.

/**
 * Score a plugin against an intent classification.
 * Higher score = better fit.
 * @param {object} plugin — from ROUTING_TABLE
 * @param {object} intent — { intent:string, confidence:number, suggested_plugins:string[] }
 * @param {string} userTier — 'free' | 'standard' | 'premium'
 */
function scorePlugin(plugin, intent, userTier) {
  let score = 0;

  // Tier gate: free users never get standard/premium plugins
  if (userTier === 'free' && plugin.requiredTier !== 'free') {
    return -Infinity;
  }
  if (userTier === 'standard' && plugin.requiredTier === 'premium') {
    return -Infinity;
  }

  // Capability overlap with AI-suggested plugins
  const capabilityMatch = plugin.capabilities.filter((c) =>
    intent.suggested_plugins.some((s) => c.includes(s) || s.includes(c))
  );
  score += capabilityMatch.length * 2;

  // Direct slug match with AI suggestion
  if (intent.suggested_plugins.includes(plugin.slug)) {
    score += 10 * intent.confidence;
  }

  // Latency bonus: fast plugins get +1, slow get -1
  if (plugin.latency_class === 'fast') score += 1;
  if (plugin.latency_class === 'slow') score -= 1;

  // Trust bonus: verified plugins get +0.5
  if (plugin.trust_tier === 'verified') score += 0.5;

  // Diversity bonus: if this plugin adds a capability no other candidate has
  // (computed externally in rankCandidates, applied here via a flag)

  return score;
}

/**
 * Rank all candidate plugins for a given intent.
 * @param {object[]} routingTable — ROUTING_TABLE from intent.js
 * @param {object} intent — result from resolveIntent()
 * @param {string} userTier
 * @param {object} opts
 * @param {number} opts.maxCandidates — max plugins to return (default 4)
 * @param {boolean} opts.includeGemini — whether gemini-flash is already in the pool (default true)
 * @returns {object[]} — ranked plugins, highest score first
 */
export function rankCandidates(routingTable, intent, userTier, opts = {}) {
  const { maxCandidates = 4, includeGemini = true } = opts;

  // Score every plugin
  const scored = routingTable.map((plugin) => ({
    ...plugin,
    score: scorePlugin(plugin, intent, userTier),
  }));

  // Filter out gated plugins (-Infinity score)
  const viable = scored.filter((p) => p.score > -Infinity);

  // Sort by score descending
  viable.sort((a, b) => b.score - a.score);

  // Deduplicate by capability (if two plugins share >= 70% capabilities, keep higher-scored)
  const deduped = [];
  for (const candidate of viable) {
    const tooSimilar = deduped.some((d) => {
      const shared = candidate.capabilities.filter((c) => d.capabilities.includes(c));
      const overlap = shared.length / Math.max(candidate.capabilities.length, d.capabilities.length);
      return overlap >= 0.7;
    });
    if (!tooSimilar) deduped.push(candidate);
    if (deduped.length >= maxCandidates) break;
  }

  // Ensure gemini-flash is present as the final synthesis step
  const hasGemini = deduped.some((p) => p.slug === 'gemini-flash');
  if (!hasGemini && includeGemini) {
    const gemini = routingTable.find((p) => p.slug === 'gemini-flash');
    if (gemini && scorePlugin(gemini, intent, userTier) > -Infinity) {
      deduped.push(gemini);
    }
  }

  return deduped;
}

/**
 * Assemble a plugin chain from ranked candidates.
 * Returns an ordered list of plugin slugs ready for executeChain().
 * gemini-flash is always last, never counted against maxCandidates.
 * @param {object[]} ranked — output from rankCandidates()
 * @param {number} opts.maxLength — default 4
 * @returns {string[]} — ordered slugs
 */
export function assembleChain(ranked, opts = {}) {
  const { maxLength = 4 } = opts;

  // Separate gemini-flash (always last)
  const withoutGemini = ranked.filter((p) => p.slug !== 'gemini-flash');

  // Cap at maxLength (excluding gemini)
  const selected = withoutGemini.slice(0, maxLength);
  const chain = selected.map((p) => p.slug);

  // Always append gemini-flash last (synthesis step)
  chain.push('gemini-flash');

  return chain;
}
