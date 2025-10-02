const rules = [
  ['AI & Emerging Tech', /\bAI\b|artificial intelligence|chatgpt|openai|machine learning|\bLLM\b|neural|deep learning/i],
  ['General Tech & Reviews', /\btech\b|review|gadget|iphone|android|mac|windows|linux|pc|hardware|software/i],
  ['Photography & Cameras', /photograph|\bcamera\b|\blens\b|canon|nikon|sony|fuji|fujifilm|leica|videograph|\bdrone\b|gopro/i],
  ['Video Editing & Creative Tools', /final cut|premiere|davinci|resolve|after effects|\bmotion\b|editor|editing|colorist|color grade|audio|pro audio|plugin|vfx/i],
  ['Business, Startups & Marketing', /business|startup|saas|marketing|sales|growth|bootstrap|entrepreneur/i],
  ['Podcasts & Longform', /podcast|longform|interview|conversation|talks?/i],
  ['News & Commentary', /\bnews\b|politic|geopolitic|world|commentary|analysis|military|defense|army|navy|air force/i],
  ['DIY, Home & Crafts', /\bDIY\b|do-?\s?it-?\s?yourself|\bhome\b|\bgarage\b|reno|renovat|craft|wood|metal|concrete|tool/i],
  ['Gardening & Outdoors', /garden|gardening|lawn|landscap|homestead/i],
  ['Travel & RV Lifestyle', /\bRV\b|vanlife|travel vlog|camp|nomad|overland/i],
  ['Aviation & Transport', /aviation|pilot|flight|boeing|airbus|aircraft|737|a320|train|rail|locomotive|railway/i],
  ['Weather & Storms', /weather|storm|tornado|hurricane|meteorology/i],
  ['Music & Musicians', /\bmusic\b|guitar|piano|drums|bass|vocal|singer|producer|mix|master|dj/i],
  ['Fitness, Health & Science', /health|fitness|workout|nutrition|diet|science|neuroscience|medical|doctor/i],
  ['Pools & Builders', /pool|plunge|spa|hot tub|above-?\s?ground/i],
  ['General / Misc', /.*/]
];

function assignClusterLabel(ch) {
  const text = `${ch.title} ${ch.desc || ''}`;
  const hit = rules.find(([label, re]) => re.test(text));
  return hit ? hit[0] : 'General / Misc';
}

module.exports = { assignClusterLabel };
