// scripts/unclassified_report.js
// Analyzes unclassified channels from buildAutoOrganize to guide rule writing

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { buildAutoOrganize } from '../server/autoOrganize/builder.js';

// Stop words for filtering common words
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours',
  'ours', 'theirs', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
  'don', 'should', 'now', 've', 'll', 're'
]);

// Common indicator keywords for cluster hints
const CLUSTER_HINTS = {
  music: ['podcast', 'official', 'beats', 'guitar', 'bass', 'drums', 'piano', 'vocal', 'singer', 'songwriter', 'mix', 'master', 'daw', 'ableton', 'logic pro', 'pro tools', 'pedal', 'riff', 'chord', 'jazz'],
  photography: ['camera', 'photograph', 'lens', 'sony', 'canon', 'nikon', 'fujifilm', 'lightroom', 'photoshop', 'mirrorless'],
  ai: ['ai', 'artificial intelligence', 'gpt', 'chatgpt', 'llm', 'deep learning', 'machine learning', 'ml', 'generative', 'midjourney', 'stable diffusion', 'prompt', 'karpathy', 'openai', 'anthropic', 'llama', 'mistral'],
  health: ['doctor', 'dr', 'md', 'physician', 'medicine', 'medical', 'cardio', 'metabolic', 'endocrin', 'neuro', 'sleep', 'nutrition', 'diet', 'fasting', 'cholesterol', 'insulin', 'glucose', 'exercise physiology'],
  news: ['news', 'breaking', 'report', 'analysis', 'commentary', 'opinion', 'politics', 'geopolitics', 'world', 'international', 'global', 'dw news', 'cna', 'bbc', 'journalism', 'correspondents'],
  diy: ['diy', 'home', 'renovation', 'woodworking', 'craftsman', 'garage', 'concrete', 'builder'],
  gardening: ['garden', 'gardening', 'homestead', 'homesteading', 'compost', 'mulch', 'seed', 'seedling', 'raised bed', 'orchard', 'pruning', 'lawn', 'landscape', 'landscaping', 'organic food', 'grow food'],
  aviation: ['pilot', 'aviation', 'airliner', 'jet', 'cockpit', 'atc', 'boeing', 'airbus', '737', 'a320', 'sim', 'simulator', 'flight sim', 'mentour', 'airline', 'flight'],
  business: ['marketing', 'ads', 'adwords', 'funnels', 'funnel', 'sales', 'saas', 'ecommerce', 'brand', 'branding', 'agency', 'entrepreneur', 'entrepreneurship', 'startup', 'shopify', 'amazon fba'],
  tech: ['tech', 'review', 'unboxing', 'gadgets', 'apple', 'iphone', 'ipad', 'mac', 'android', 'windows', 'pc build', 'benchmark']
};

// Extract unigrams and bigrams from text
function extractTokens(text) {
  if (!text) return { unigrams: [], bigrams: [] };

  // Clean and tokenize
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').filter(word => word.length > 2 && !STOP_WORDS.has(word));

  // Generate unigrams
  const unigrams = words;

  // Generate bigrams
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }

  return { unigrams, bigrams };
}

// Extract domain and path tokens from URLs
function extractUrlTokens(url) {
  if (!url) return { domains: [], paths: [] };

  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase();

    // Extract domain parts
    const domainParts = hostname.split('.').slice(0, -1); // Remove TLD

    // Extract path tokens
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);

    return {
      domains: domainParts,
      paths: pathParts
    };
  } catch {
    return { domains: [], paths: [] };
  }
}

// Count token frequencies
function countFrequencies(tokens) {
  const counts = {};
  tokens.forEach(token => {
    counts[token] = (counts[token] || 0) + 1;
  });
  return counts;
}

// Get top N tokens by frequency
function getTopTokens(counts, n = 20) {
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, n)
    .map(([token, count]) => ({ token, count }));
}

// Analyze unclassified channels
async function analyzeUnclassified() {
  console.log('Running buildAutoOrganize with debug mode...');

  // Call buildAutoOrganize with debug mode
  const result = await buildAutoOrganize({ debug: true });

  if (!result || !result.debugRows) {
    console.error('No debug data available');
    return null;
  }

  // Filter unclassified channels
  const unclassifiedChannels = result.debugRows.filter(row => row.label === 'Unclassified');

  console.log(`Found ${unclassifiedChannels.length} unclassified channels`);

  if (unclassifiedChannels.length === 0) {
    console.log('No unclassified channels found');
    return null;
  }

  // Analyze tokens and patterns
  const allUnigrams = [];
  const allBigrams = [];
  const allDomains = [];
  const allPaths = [];
  const channelAnalyses = [];

  for (const channel of unclassifiedChannels) {
    const { unigrams, bigrams } = extractTokens(
      `${channel.title} ${channel.desc}`.toLowerCase()
    );

    const { domains, paths } = extractUrlTokens(channel.url);

    allUnigrams.push(...unigrams);
    allBigrams.push(...bigrams);
    allDomains.push(...domains);
    allPaths.push(...paths);

    // Analyze against cluster hints
    const hintScores = {};
    const reasonTokens = [];

    for (const [cluster, keywords] of Object.entries(CLUSTER_HINTS)) {
      let score = 0;
      const matchedTokens = [];

      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(channel.title) || regex.test(channel.desc)) {
          score++;
          matchedTokens.push(keyword);
        }
      }

      if (score > 0) {
        hintScores[cluster] = score;
        reasonTokens.push(...matchedTokens);
      }
    }

    channelAnalyses.push({
      id: channel.id,
      name: channel.title,
      reasonTokens: [...new Set(reasonTokens)], // Remove duplicates
      hintScores
    });
  }

  // Calculate totals
  const unigramCounts = countFrequencies(allUnigrams);
  const bigramCounts = countFrequencies(allBigrams);
  const domainCounts = countFrequencies(allDomains);
  const pathCounts = countFrequencies(allPaths);

  // Group by hint clusters
  const byHint = {};
  for (const [cluster] of Object.entries(CLUSTER_HINTS)) {
    const clusterChannels = channelAnalyses.filter(ch => ch.hintScores[cluster] > 0);
    if (clusterChannels.length > 0) {
      byHint[cluster] = {
        count: clusterChannels.length,
        avgScore: clusterChannels.reduce((sum, ch) => sum + ch.hintScores[cluster], 0) / clusterChannels.length,
        samples: clusterChannels.slice(0, 5).map(ch => ({
          id: ch.id,
          name: ch.name,
          reasonTokens: ch.reasonTokens.slice(0, 3) // Top 3 tokens
        }))
      };
    }
  }

  // Generate samples for each cluster
  const samples = {};
  for (const [cluster, data] of Object.entries(byHint)) {
    samples[cluster] = data.samples;
  }

  return {
    totals: {
      unclassifiedCount: unclassifiedChannels.length,
      uniqueTokens: Object.keys(unigramCounts).length,
      topTokens: getTopTokens(unigramCounts, 20),
      topBigrams: getTopTokens(bigramCounts, 15),
      topDomains: getTopTokens(domainCounts, 10),
      topPaths: getTopTokens(pathCounts, 10)
    },
    byHint,
    samples
  };
}

// Generate findings markdown
function generateFindingsMarkdown(report) {
  if (!report) return '# Unclassified Analysis Findings\n\nNo data available.';

  const { totals, byHint } = report;

  // Sort clusters by count (descending)
  const sortedClusters = Object.entries(byHint)
    .sort(([,a], [,b]) => b.count - a.count);

  let markdown = `# Unclassified Analysis Findings

Analysis of ${totals.unclassifiedCount} unclassified channels to guide rule writing.

## Summary
- **Total Unclassified**: ${totals.unclassifiedCount}
- **Unique Tokens**: ${totals.uniqueTokens}
- **Top Tokens**: ${totals.topTokens.slice(0, 10).map(t => t.token).join(', ')}
- **Top Bigrams**: ${totals.topBigrams.slice(0, 5).map(t => t.token).join(', ')}

## Ranked Rule Suggestions

`;

  sortedClusters.forEach(([cluster, data], index) => {
    markdown += `### ${index + 1}. ${cluster.toUpperCase()} (${data.count} channels)

**Expected impact**: ~${data.count} channels would move to "${cluster}" cluster

**Average confidence score**: ${data.avgScore.toFixed(1)}

**Sample channels**:
`;
    data.samples.forEach(sample => {
      markdown += `- ${sample.name} (${sample.reasonTokens.join(', ')})\n`;
    });

    markdown += `
**Suggested regex patterns** (case-insensitive, literal matches):
\`\`\`javascript
// Basic patterns - add these to heuristics2.js
"${cluster}": rx([
`;
    const keywords = CLUSTER_HINTS[cluster];
    const regexSeeds = keywords.slice(0, 8).map(keyword =>
      `  "${keyword.replace(/"/g, '\\"')}"`
    ).join(',\n');
    markdown += regexSeeds;
    markdown += `
])
\`\`\`

`;
  });

  markdown += `## Additional Patterns to Consider

### Domain-based Rules
`;
  totals.topDomains.slice(0, 5).forEach(domain => {
    markdown += `- Domain: "${domain.token}" → Consider cluster-specific rules\n`;
  });

  markdown += `
### Path-based Rules
`;
  totals.topPaths.slice(0, 5).forEach(path => {
    markdown += `- Path: "${path.token}" → May indicate specific content types\n`;
  });

  return markdown;
}

// Main execution
async function main() {
  try {
    console.log('Starting unclassified analysis...');

    const report = await analyzeUnclassified();

    if (!report) {
      console.log('No report generated');
      return;
    }

    // Write JSON report
    const jsonPath = 'data/ao_unclassified.report.json';
    await fsp.writeFile(jsonPath, JSON.stringify(report, null, 2));
    console.log(`Report written to ${jsonPath}`);

    // Write findings markdown
    const findingsPath = 'docs/ao_unclassified_findings.md';
    const findingsMarkdown = generateFindingsMarkdown(report);
    await fsp.writeFile(findingsPath, findingsMarkdown);
    console.log(`Findings written to ${findingsPath}`);

    console.log('Analysis complete!');
    console.log(`- Processed ${report.totals.unclassifiedCount} unclassified channels`);
    console.log(`- Found ${Object.keys(report.byHint).length} potential clusters`);
    console.log(`- Generated ${report.totals.topTokens.length} top token suggestions`);

  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeUnclassified, generateFindingsMarkdown };
