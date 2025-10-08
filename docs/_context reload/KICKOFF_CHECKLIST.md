# Phase 5 Kickoff Checklist (Short)

Context ready?
- [ ] Read DEV5_CONTEXT.md (this file’s sibling)
- [ ] Remember the SOP: no large JSON in context; use jq/rg
- [ ] Start prompts with “You are continuing work on YT-Digest (Phase 5).”

Run baseline (post-patch)
- [ ] node scripts/umbrella_fit.js --channels data/channels.json --topics data/umbrella_topics.json
- [ ] head -n 10 data/umbrella_summary.csv
- [ ] head -n 10 data/umbrella_channels.csv
- [ ] jq '.params' data/umbrella_debug.json

Quick QA
- [ ] Summary labels look obvious (even if fewer assigned)
- [ ] No timestamp/date/4k tokens in debug top3
- [ ] Spot-check 20 rows (balanced sample)

Optional sweep (fast)
- [ ] Try SCORE_MIN in {0.22,0.24,0.26}
- [ ] Try MARGIN_MIN in {0.08,0.10,0.12}
- [ ] Try TITLE_WEIGHT in {1.4,1.6}
- [ ] Record results in a tiny CSV (label coverage, mean margin)

Close each microstep
- [ ] Commit with concise message
- [ ] Update CHANGELOG.md accordingly
