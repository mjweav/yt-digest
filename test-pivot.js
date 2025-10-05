import('./server/autoOrganize/builder.js').then(async (module) => {
  console.log('Testing AO Parent/Subcluster Pivot...');

  try {
    const { loadChannels, loadOverrides, buildAutoOrganize } = module;
    const channels = await loadChannels();
    const overrides = await loadOverrides();

    console.log(`Loaded ${channels.length} channels`);

    const result = await buildAutoOrganize({ channels, overrides, debug: true });
    console.log(`Built ${result.clusters.length} clusters`);
    console.log(`Debug rows: ${result.debugRows.length}`);

    if (result.parentMetrics) {
      console.log('Parent metrics:');
      for (const [parent, metrics] of Object.entries(result.parentMetrics)) {
        console.log(`  ${parent}: N=${metrics.N}, subclusters=${metrics.numSubclusters}, avgSize=${metrics.avgSize}`);
      }
    }

    // Check cluster structure
    if (result.clusters.length > 0) {
      const sampleCluster = result.clusters[0];
      console.log('Sample cluster structure:');
      console.log(`  id: ${sampleCluster.id}`);
      console.log(`  label: ${sampleCluster.label}`);
      console.log(`  parent: ${sampleCluster.parent}`);
      console.log(`  channels: ${sampleCluster.channels?.length || 0}`);
      console.log(`  size: ${sampleCluster.size}`);
      console.log(`  has clusterId: ${!!sampleCluster.clusterId}`);
      console.log(`  has topTerms: ${!!sampleCluster.topTerms}`);
      console.log(`  has exemplarId: ${!!sampleCluster.exemplarId}`);
    }

    console.log('✅ AO Parent/Subcluster Pivot test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}).catch(console.error);
