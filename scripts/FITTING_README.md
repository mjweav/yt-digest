 # Fitting Harness (Isolated)

Run lexical-only:
node scripts/fitting_harness.js --channels data/channels.json --labels data/master_labels.sample.json --out data/fitting_results.csv --use-ai=0 --topk=3

Enable AI tiebreak (requires OPENAI_API_KEY in env):
OPENAI_API_KEY=sk-... node scripts/fitting_harness.js --channels data/channels.json --labels data/master_labels.sample.json --out data/fitting_results.csv --use-ai=1 --topk=3

Limit rows for testing/tuning:
node scripts/fitting_harness.js --channels data/channels.json --labels data/master_labels.sample.json --out data/fitting_results.csv --use-ai=1 --topk=3 --rows=10

Parameters:
- `--channels`: Path to channels JSON file (default: data/channels.json)
- `--labels`: Path to labels JSON file (default: data/master_labels.sample.json)
- `--out`: Output CSV file path (default: data/fitting_results.csv)
- `--use-ai`: Enable AI tiebreaking (0=disabled, 1=enabled) (default: 0)
- `--topk`: Number of top labels to consider (default: 3)
- `--rows`: Limit processing to N rows (0=no limit) (default: 0)

Outputs:
- data/fitting_results.csv with columns: channelId, channelTitle, shortDesc, labels, method, topScore, margin, candidates
