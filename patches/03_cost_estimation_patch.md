
# Patch 03 — Per-row & Total API Cost Estimation (usage-based)

**Goal:** Print estimated cost for each LLM call and the total at the end. Uses the `usage` field returned by OpenAI (prompt/completion tokens). Prices configurable via env with safe defaults.

## Files to edit
- `scripts/batch.run.js`

## Pricing env (configure in `.env`)
```env
# Dollars per 1M tokens (defaults are placeholders — set to your actual contract/pricing)
OPENAI_PRICE_INPUT_PER_MTOK=0.15
OPENAI_PRICE_OUTPUT_PER_MTOK=0.60
```
> If unset, the script will use the defaults above.

## Changes

### 1) Read prices and initialize accumulators
Near top (after args / before loop):
```js
const priceIn  = Number(process.env.OPENAI_PRICE_INPUT_PER_MTOK || 0.15);
const priceOut = Number(process.env.OPENAI_PRICE_OUTPUT_PER_MTOK || 0.60);
let totalInTok = 0, totalOutTok = 0;
let totalCost = 0;
```

### 2) Modify `callOpenAI` to return `usage`
Update the end of `callOpenAI`:
```js
const json = await res.json();
const content = json.choices?.[0]?.message?.content || "{}";
let parsed = {}; try { parsed = JSON.parse(content); } catch(e) { throw new Error("Failed to parse JSON from model"); }
const usage = json.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
return {
  label: String(parsed.label || ""),
  confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))),
  knowledge_source: parsed.knowledge_source === "world_knowledge" ? "world_knowledge" : "text_clues",
  evidence: String(parsed.evidence || "").slice(0, 100),
  usage
};
```

### 3) Use usage to track and print cost per row
After each call (success or fallback), add:
```js
const inTok = result.usage?.prompt_tokens || 0;
const outTok = result.usage?.completion_tokens || 0;
const rowCost = (inTok/1_000_000)*priceIn + (outTok/1_000_000)*priceOut;
totalInTok += inTok; totalOutTok += outTok; totalCost += rowCost;
if (verbose) console.log(`  tokens: in=${inTok} out=${outTok}  est=$${rowCost.toFixed(6)}`);
```

### 4) Add totals to end-of-run summary
Append to the summary block:
```js
console.log(`tokens: in=${totalInTok} out=${totalOutTok}`);
console.log(`est cost: $${totalCost.toFixed(4)}  (in @$${priceIn}/MTok, out @$${priceOut}/MTok)`);
```

### 5) (Optional) CSV columns
If you want cost in CSV, extend headers and rows accordingly (optional).
