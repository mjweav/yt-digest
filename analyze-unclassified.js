// Script to analyze unclassified channels and mine terms for corpus-driven categorization
import fs from 'fs';
import path from 'path';

// Simple tokenizer and stopwords for TF-IDF (matching the one in builder.js)
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
  'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'have', 'had', 'has', 'do',
  'does', 'did', 'but', 'or', 'not', 'no', 'yes', 'this', 'these', 'those', 'they', 'them',
  'their', 'there', 'here', 'where', 'when', 'why', 'how', 'what', 'which', 'who', 'whom',
  'i', 'me', 'my', 'you', 'your', 'we', 'us', 'our', 'she', 'her', 'he', 'him', 'his',
  'it', 'its', 'they', 'them', 'their', 'channel', 'video', 'videos', 'subscribe', 'like',
  'comment', 'share', 'watch', 'new', 'latest', 'today', 'daily', 'weekly', 'monthly'
]);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOPWORDS.has(word))
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
}

function analyzeUnclassifiedChannels() {
  try {
    // Load the autoOrganize.json data
    const data = JSON.parse(fs.readFileSync('data/autoOrganize.json', 'utf8'));

    // Find unclassified cluster
    const unclassifiedCluster = data.clusters.find(c => c.label === 'Unclassified');

    if (!unclassifiedCluster) {
      console.log('No Unclassified cluster found');
      return;
    }

    console.log(`Found ${unclassifiedCluster.channels.length} unclassified channels`);

    // Filter channels with descriptions >= 20 characters
    const normalDescChannels = unclassifiedCluster.channels.filter(ch => ch.descLen >= 20);

    console.log(`${normalDescChannels.length} channels have descriptions >= 20 characters`);
    console.log('Sample titles:');
    normalDescChannels.slice(0, 10).forEach((ch, i) => {
      console.log(`${i+1}. "${ch.title}" (${ch.descLen} chars)`);
    });

    // Mine terms from these channels
    const allTokens = {};
    const channelTexts = [];

    for (const ch of normalDescChannels) {
      const text = `${ch.title} ${ch.desc}`.toLowerCase();
      const tokens = tokenize(text);
      channelTexts.push({ id: ch.id, title: ch.title, tokens });

      // Aggregate token frequencies
      for (const [token, freq] of Object.entries(tokens)) {
        allTokens[token] = (allTokens[token] || 0) + freq;
      }
    }

    // Get top 30 terms by frequency
    const topTerms = Object.entries(allTokens)
      .filter(([term]) => term.length >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    console.log('\nTop 30 mined terms:');
    topTerms.forEach(([term, freq], i) => {
      console.log(`${i+1}. "${term}" (${freq})`);
    });

    // Save detailed analysis
    const analysis = {
      totalUnclassified: unclassifiedCluster.channels.length,
      normalDescChannels: normalDescChannels.length,
      topTerms,
      sampleChannels: normalDescChannels.slice(0, 10).map(ch => ({
        id: ch.id,
        title: ch.title,
        descLen: ch.descLen,
        desc: ch.desc.substring(0, 100) + '...'
      }))
    };

    fs.writeFileSync('unclassified-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\nDetailed analysis saved to unclassified-analysis.json');

    return analysis;

  } catch (error) {
    console.error('Error analyzing unclassified channels:', error);
  }
}

analyzeUnclassifiedChannels();
