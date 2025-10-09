# SOP — AI Single-Label Fitting (CommonJS)

## What this does
- Classifies each channel into **exactly one** umbrella from a curated labelbook.
- Uses **world knowledge** + title/description; closed-set single choice.
- Early triage drops low-info channels to `Unclassified (sparse)`.
- Sticky labels prevent flip-flops unless confidence improves by ≥ 0.15.

## Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--channels` | `data/channels.json` | Input channels data file |
| `--labels` | `data/labelbook.json` | Curated labelbook with umbrella categories |
| `--out` | `data/fitting_results.csv` | Output CSV file for results |
| `--jsonl` | `data/assignments.jsonl` | Output JSONL file for detailed assignments |
| `--prev` | `data/assignments.prev.jsonl` | Previous assignments file for comparison/resume |
| `--anchors` | `` | Optional anchor examples file |
| `--model` | `gpt-4o-mini` | OpenAI model to use |
| `--confFloor` | `0.40` | Minimum confidence threshold (0.0-1.0) |
| `--fresh` | `false` | Rotate previous outputs and start clean |
| `--resume` | `false` | Skip channels with existing non-Unclassified labels |
| `--verbose` | `false` | Enable detailed per-channel logging |

## Basic Usage

### NPM Scripts (Recommended)
```bash
# Run fitting with default settings
npm run fit:run

# Generate metrics summary
npm run fit:metrics
```
These npm scripts provide the standard workflow with sensible defaults.

### Direct Script Calls
```bash
# Standard run
node scripts/batch.run.js

# With custom options
node scripts/batch.run.js --fresh 1 --verbose 1
```
Direct calls allow full control over all options.

### Custom Files
```bash
node scripts/batch.run.js \
  --channels data/channels.json \
  --labels data/labelbook.json \
  --out data/fitting_results.csv \
  --jsonl data/assignments.jsonl
```

### With Anchors and Custom Model
```bash
node scripts/batch.run.js \
  --anchors data/anchors.json \
  --model gpt-4o \
  --verbose 1
```

## Advanced Usage Patterns

### Fresh Start (--fresh)
**When to use:** Starting a new fitting session, or when you want to completely restart classification.
```bash
node scripts/batch.run.js --fresh 1
```
**What it does:**
- Rotates current `assignments.jsonl` → `assignments.prev.jsonl`
- Truncates current output files to start clean
- Backs up CSV as `.prev.csv`
- Processes all channels from scratch

### Resume Mode (--resume)
**When to use:** Continuing after manual review/corrections, or when you want to preserve good existing classifications.
```bash
node scripts/batch.run.js --resume 1
```
**What it does:**
- Skips channels that already have non-Unclassified labels
- Only processes channels with Unclassified or missing labels
- Preserves existing good classifications
- Useful for incremental improvement

### Combined Workflow
**When to use:** Best practice for iterative refinement.
```bash
# First run - establish baseline
node scripts/batch.run.js --fresh 1

# Manual review and corrections in assignments.jsonl

# Second run - only process remaining unclassified
node scripts/batch.run.js --resume 1

# Repeat as needed for further refinement
```

### Confidence Threshold Adjustment
**When to use:** When you need stricter or more lenient classification.
```bash
# Stricter (fewer classifications, higher quality)
node scripts/batch.run.js --confFloor 0.60

# More lenient (more classifications, lower quality)
node scripts/batch.run.js --confFloor 0.20
```

## Output Files

### assignments.jsonl
- One JSON object per line with full assignment details
- Includes: channelId, label, confidence, evidence, timestamp
- Used for detailed analysis and resume functionality

### fitting_results.csv
- Human-readable format for review
- Columns: channelId, channelTitle, label, shortDesc, confidence, etc.
- Suitable for spreadsheet analysis

### Previous Files (.prev)
- `assignments.prev.jsonl` - backup of previous assignments
- `fitting_results.prev.csv` - backup of previous CSV
- Created automatically when using `--fresh 1`

## NPM Scripts Integration

### Available Scripts
The project includes two main npm scripts for the fitting workflow:

#### `npm run fit:run`
**What it does:** Runs the complete fitting process with standard parameters
```bash
npm run fit:run
# Equivalent to:
node scripts/batch.run.js --channels data/channels.json --labels data/labelbook.json --out data/fitting_results.csv --jsonl data/assignments.jsonl --anchors data/anchors.json
```

**When to use:**
- Standard fitting workflow
- First-time setup with default configuration
- When you want the standard anchor-based classification

#### `npm run fit:metrics`
**What it does:** Generates comprehensive metrics and comparison reports
```bash
npm run fit:metrics
# Equivalent to:
node scripts/metrics.summary.js --jsonl data/assignments.jsonl --prev data/assignments.prev.jsonl --out data/metrics.json
```

**When to use:**
- After completing a fitting run
- To compare current results with previous runs
- For quality assessment and progress tracking

### Workflow Integration
```bash
# Standard workflow using npm scripts
npm run fit:run        # Run fitting with defaults
npm run fit:metrics    # Analyze results

# Advanced workflow with custom options
node scripts/batch.run.js --fresh 1 --verbose 1  # Fresh start with logging
npm run fit:metrics                              # Analyze the fresh run

# Incremental refinement workflow
node scripts/batch.run.js --resume 1             # Process only unclassified
npm run fit:metrics                              # Check improvement
```

## Direct Script Usage

### Summary Metrics
```bash
node scripts/metrics.summary.js \
  --jsonl data/assignments.jsonl \
  --prev data/assignments.prev.jsonl
```

### Export for Analysis
```bash
# Export to CSV for spreadsheet analysis
node scripts/export_csv.js --jsonl data/assignments.jsonl

# Compare metrics between runs
node scripts/compare_metrics.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `OPENAI_BASE_URL` | No | Custom OpenAI API endpoint (optional) |

## Guardrails and Quality Controls

- **Temperature:** 0 (deterministic responses)
- **Response Format:** JSON-only (structured output)
- **Confidence Floor:** < 0.40 → `Unclassified (low confidence)`
- **Shortlist Validation:** Label must be in shortlist; else snap to shortlist[0]
- **Sticky Labels:** Won't change unless confidence improves by ≥ 0.15
- **Flip Rate Monitoring:** > 3% without confidence uplift → investigate

## Best Practices

### Workflow for New Labelbook
1. Start with `--fresh 1` to establish baseline
2. Review results in CSV, make manual corrections if needed
3. Use `--resume 1` for subsequent runs to only process remaining channels
4. Monitor flip rates and confidence scores

### Quality Assurance
- Always review a sample of results after parameter changes
- Use `--verbose 1` when debugging or tuning
- Check metrics between runs for unexpected changes
- Validate that confidence scores align with result quality

### Performance Optimization
- Use `--resume 1` for incremental work to save API costs
- Adjust `--confFloor` based on your quality vs. coverage needs
- Monitor token usage and processing time for large datasets
