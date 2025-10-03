// Order matters: specific → general. First match wins.
const rules = [
  // Health & Medicine (doctors, metabolic, nutrition, physiology)
  ['Health & Medicine', /\b(dr\.?|doctor|md|physician|cardio|endocrin|metaboli[c|sm]|insulin|glucose|cholesterol|keto|fasting|longevity|nutrition|diet|obesity|autophagy|neur(o|al)|brain health|physical therapy|PT|rehab)\b/i],

  // Fitness & Training
  ['Fitness & Training', /\bworkout|strength|hypertrophy|athlean|mobility|stretch|fitness|exercise|calisthenics|HIIT|CrossFit|coach\b/i],

  // Law, Crime & Justice
  ['Law, Crime & Justice', /\blaw\b|attorney|lawyer|court|trial|indict|crime|forensic|evidence|jur(y|or)/i],

  // Finance & Investing
  ['Finance & Investing', /\bfinance|invest|stock|etf|portfolio|dividend|trading|crypto|bitcoin|options|broker|market\b/i],

  // Business, Startups & Marketing
  ['Business, Startups & Marketing', /\bstartup|saas|business|entrepreneur|bootstrap|marketing|brand|ads?|funnels?|copywriting|growth\b/i],

  // News & Commentary / Geopolitics
  ['News & Commentary', /\bnews|politic|geopolitic|world affairs?|commentary|opinion|international|diplomacy|war|military|conflict|election\b/i],

  // AI & Emerging Tech
  ['AI & Emerging Tech', /\bAI\b|artificial intelligence|machine learning|\bML\b|\bLLM\b|neural|deep learning|chatgpt|openai|agents?\b/i],

  // General Tech & Reviews
  ['General Tech & Reviews', /\btech\b|review|gadget|iphone|android|mac|windows|linux|\bpc\b|hardware|software|teardown|engineering\b/i],

  // Programming & Dev
  ['Programming & Dev', /\bprogramming|coding|developer|typescript|javascript|python|rust|go(lang)?|java|react|node|api|devops|docker|kubernetes|sqlite|postgres|database\b/i],

  // Photography & Cameras
  ['Photography & Cameras', /photograph|camera|lens|canon|nikon|sony|fuji|fujifilm|leica|videograph|drone|gopro|lightroom|photoshop|capture one/i],

  // Video Editing & Creative Tools
  ['Video Editing & Creative Tools', /final cut|premiere|after effects|davinci|resolve|\bmotion\b|vfx|editor|editing|color(ist| grade)|audio|pro audio|plug-?ins?/i],

  // DIY, Home & Crafts
  ['DIY, Home & Crafts', /\bDIY\b|do-?\s?it-?\s?yourself|\bhome\b|garage|reno|renovat|craft|woodwork|metalwork|concrete|tool review|\bmaker\b/i],

  // Gardening & Outdoors
  ['Gardening & Outdoors', /garden|gardening|lawn|landscap|homestead|permaculture|soil|compost/i],

  // Aviation & Transport
  ['Aviation & Transport', /aviation|pilot|flight|boeing|airbus|aircraft|737|a320|airline|mentour|atc|train|rail|locomotive|railway|subway|bus|auto\b/i],

  // Weather & Storms
  ['Weather & Storms', /weather|storm|tornado|hurricane|cyclone|severe weather|meteorolog/i],

  // Music & Musicians
  ['Music & Musicians', /\bmusic\b|guitar|piano|drums|bass|vocal|singer|cover|band|orchestra|producer|mix|master|dj|synth|ableton|logic pro/i],

  // Pools & Builders
  ['Pools & Builders', /\bpool|plunge|spa|hot tub|above-?\s?ground\b/i],

  // Travel & RV Lifestyle
  ['Travel & RV Lifestyle', /\bRV\b|vanlife|camp(er|ing)|overland|nomad|travel vlog/i],

  // Podcasts & Longform
  ['Podcasts & Longform', /\bpodcast|longform|interview|conversation|talks?\b/i],

  // Fallbacks
  ['Science & Education', /\bscience|physics|chemistry|biology|astronomy|cosmos|space|math|education|lecture|university|explainer\b/i],
  ['Lifestyle & Vlogs', /\bvlog|lifestyle|daily|family|home life|minimalism|productivity\b/i],

  // Last resort
  ['General / Misc', /.*/]
];

function assignClusterLabel(ch) {
  const text = `${ch.title || ''} ${ch.desc || ''}`;
  const hit = rules.find(([label, re]) => re.test(text));
  return hit ? hit[0] : 'General / Misc';
}

// Optional: explain first pattern that matched (for debug UI/QA)
function explainLabel(ch) {
  const text = `${ch.title || ''} ${ch.desc || ''}`;
  for (const [label, re] of rules) {
    const m = text.match(re);
    if (m) return { label, pattern: re.toString(), match: m[0] };
  }
  return { label: 'General / Misc', pattern: null, match: null };
}

module.exports = { assignClusterLabel, explainLabel };
