#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function ok(flag, label) { return `${flag ? 'OK ' : 'FAIL'}  ${label}`; }

function main() {
  const metrics = load(path.join('data','umbrella_metrics.json'));
  const cfg     = load(path.join('data','umbrella_config.json'));

  const cov = metrics.totals.coverage || 0;
  const med = metrics.margins.median ?? 0;
  const noise = metrics.noise.rate ?? 0;

  // param locks (optional but recommended)
  const params = metrics.params || {};
  const locks = cfg.locks || {};
  let locked = true;
  if (locks.require_params) {
    for (const [k, v] of Object.entries(locks.require_params)) {
      if (params[k] !== v) locked = false;
    }
  }

  // guardrails
  const withinCoverage = cov >= cfg.targets.coverage_min && cov <= cfg.targets.coverage_max;
  const withinNoise    = noise <= cfg.targets.noise_rate_max;
  const withinMedian   = med >= cfg.targets.median_margin_min;

  // table
  console.log('=== Umbrella Metrics — Guardrail Check ===');
  console.log(`Date: ${metrics.when}`);
  console.log(`Channels: ${metrics.totals.channels}  Assigned: ${metrics.totals.assigned}  Coverage: ${(cov*100).toFixed(1)}%`);
  console.log(`Median margin: ${med.toFixed(3)}  p25: ${(metrics.margins.p25||0).toFixed(3)}  p75: ${(metrics.margins.p75||0).toFixed(3)}`);
  console.log(`Noise rate: ${(noise*100).toFixed(2)}%`);
  console.log(`Params: ${JSON.stringify(params)}`);
  console.log('---');
  console.log(ok(withinCoverage, `coverage in [${(cfg.targets.coverage_min*100).toFixed(0)}%, ${(cfg.targets.coverage_max*100).toFixed(0)}%]`));
  console.log(ok(withinMedian,   `median margin >= ${cfg.targets.median_margin_min}`));
  console.log(ok(withinNoise,    `noise <= ${cfg.targets.noise_rate_max}`));
  console.log(ok(locked,         `param locks respected`));

  const pass = withinCoverage && withinMedian && withinNoise && locked;
  process.exit(pass ? 0 : 2);
}

main();
