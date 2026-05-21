// workers/orchestrator/src/chain.js
//
// Plugin execution helpers: callPlugin, parallel, executeChain.
// Moved from index.js to avoid circular imports with the dynamic pipeline.

/**
 * Call a single plugin via swarmspaceRouter.
 * @param {object} ctx — orchestrator context
 * @param {string} pluginId — plugin slug
 * @param {object} params — body to send
 */
export async function callPlugin(ctx, pluginId, params) {
  const data = { plugin_id: pluginId, params: { ...params, _prism_consent: true } };

  if (ctx.serviceToken && ctx.runAsUid) {
    data._service_token = ctx.serviceToken;
    data._run_as_uid = ctx.runAsUid;
  }
  if (ctx.viaMcp) data._via_mcp = true;

  const headers = { 'Content-Type': 'application/json' };
  if (!ctx.serviceToken) {
    headers['Authorization'] = ctx.token;
  }

  const res = await fetch(ctx.routerUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Plugin ${pluginId} failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.result || json;
}

/**
 * Run multiple plugin calls in parallel.
 * @param {object} ctx
 * @param {Array<[string,object]>} calls — [[pluginId, params], ...]
 */
export async function parallel(ctx, calls) {
  const results = await Promise.allSettled(
    calls.map(([pluginId, params]) => callPlugin(ctx, pluginId, params))
  );
  const out = {};
  calls.forEach(([pluginId], i) => {
    const r = results[i];
    out[pluginId] = r.status === 'fulfilled' ? r.value : { error: r.reason.message };
  });
  return out;
}

/**
 * Execute an assembled plugin chain sequentially.
 * Each plugin receives the accumulated results of previous plugins.
 * @param {object} ctx
 * @param {string[]} chain — ordered plugin slugs
 * @param {object} baseParams — starting params
 */
export async function executeChain(ctx, chain, baseParams = {}) {
  if (!Array.isArray(chain) || chain.length === 0) return {};

  const results = {};
  const accumulated = { ...baseParams };

  for (const slug of chain) {
    const params = slug === 'gemini-flash'
      ? { ...accumulated, prompt: buildSynthesisPrompt(ctx.query, results) }
      : { ...accumulated };

    try {
      const result = await callPlugin(ctx, slug, params);
      results[slug] = result;
      accumulated[`_${slug}_result`] = result;
    } catch (err) {
      results[slug] = { error: err.message };
    }
  }

  return results;
}

function buildSynthesisPrompt(query, results) {
  const parts = Object.entries(results)
    .filter(([, v]) => v && !v.error)
    .map(([slug, v]) => `[${slug}]: ${JSON.stringify(v).slice(0, 3000)}`);
  return `Synthesize a final answer for the query: "${query}"\n\nData collected from plugins:\n${parts.join('\n\n')}\n\nProvide a clear, well-structured response synthesizing all available information.`;
}
