// Script to validate the results of the auto-organize improvements
import fs from 'fs';

function validateResults() {
  try {
    // Load the debug data
    const debugData = JSON.parse(fs.readFileSync('data/autoOrganize.debug.json', 'utf8'));

    // Count unclassified channels
    const unclassifiedChannels = debugData.rows.filter(row => row.label === 'Unclassified');
    const totalChannels = debugData.rows.length;

    console.log(`Total channels: ${totalChannels}`);
    console.log(`Unclassified channels: ${unclassifiedChannels.length}`);
    console.log(`Unclassified percentage: ${((unclassifiedChannels.length / totalChannels) * 100).toFixed(1)}%`);

    // Analyze by method
    const methodStats = {};
    for (const row of debugData.rows) {
      const method = row.why?.method || 'unknown';
      methodStats[method] = (methodStats[method] || 0) + 1;
    }

    console.log('\nClassification methods:');
    for (const [method, count] of Object.entries(methodStats)) {
      console.log(`  ${method}: ${count}`);
    }

    // Focus on unclassified channels with normal descriptions
    const normalDescUnclassified = unclassifiedChannels.filter(ch => ch.descLen >= 20);
    console.log(`\nUnclassified channels with descriptions >= 20 chars: ${normalDescUnclassified.length}`);

    // Show sample of what got reclassified
    const reclassifiedChannels = debugData.rows.filter(row =>
      row.why?.method === 'tfidf-consensus' || row.why?.method === 'tfidf'
    );

    console.log(`\nChannels reclassified by TF-IDF methods: ${reclassifiedChannels.length}`);
    if (reclassifiedChannels.length > 0) {
      console.log('Sample reclassifications:');
      reclassifiedChannels.slice(0, 10).forEach((ch, i) => {
        console.log(`${i+1}. "${ch.title}" -> ${ch.label} (${ch.why.method})`);
      });
    }

    // Save validation report
    const report = {
      totalChannels,
      unclassifiedCount: unclassifiedChannels.length,
      unclassifiedPercentage: ((unclassifiedChannels.length / totalChannels) * 100).toFixed(1),
      methodStats,
      normalDescUnclassified: normalDescUnclassified.length,
      reclassifiedCount: reclassifiedChannels.length,
      sampleReclassifications: reclassifiedChannels.slice(0, 10).map(ch => ({
        title: ch.title,
        newLabel: ch.label,
        method: ch.why.method,
        confidence: ch.why.topSim || ch.why.avgSim || 0
      }))
    };

    fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
    console.log('\nValidation report saved to validation-report.json');

    return report;

  } catch (error) {
    console.error('Error validating results:', error);
  }
}

validateResults();
