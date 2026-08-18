import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let schemesData = [];
try {
  const dataPath = path.join(__dirname, '../data/schemes.json');
  if (fs.existsSync(dataPath)) {
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    schemesData = raw.schemes || [];
  }
} catch (e) {
  console.warn('Could not load schemes.json:', e.message);
}

export const matchSchemes = (payload) => {
  const {
    isLandholding = true,
    state = 'Maharashtra',
    crop = 'rice',
    landArea = 1.0,
  } = payload;

  const matched = schemesData.map((scheme) => {
    let eligible = true;
    let reasons = [];

    if (scheme.eligibility.is_landholding && !isLandholding) {
      eligible = false;
      reasons.push('Requires landholding documentation');
    }

    if (scheme.eligibility.states !== 'all') {
      const allowedStates = Array.isArray(scheme.eligibility.states)
        ? scheme.eligibility.states.map((s) => s.toLowerCase())
        : [scheme.eligibility.states.toLowerCase()];

      if (!allowedStates.includes(state.toLowerCase())) {
        eligible = false;
        reasons.push(`Not currently notified in ${state}`);
      }
    }

    return {
      id: scheme.id,
      name: scheme.name,
      description: scheme.description,
      eligible,
      status: eligible ? 'Eligible' : 'Ineligible',
      reasons: eligible ? ['Eligible based on farmer landholding and region'] : reasons,
      exclusions: scheme.exclusions,
      howToApply: scheme.how_to_apply,
      sourceUrl: scheme.source_url,
    };
  });

  // Always include PM-PRANAM and Nano Urea advisory matching
  matched.push({
    id: 'pm-pranam',
    name: 'PM-PRANAM (Programme for Restoration, Awareness, Nourishment and Amelioration of Mother Earth)',
    description: 'Government incentive scheme for states that reduce chemical fertilizer consumption (Urea/DAP) by adopting bio-fertilizers and organic alternatives.',
    eligible: true,
    status: 'Recommended',
    reasons: ['Adopting balanced fertilizer recommendations directly aligns with PM-PRANAM targets.'],
    howToApply: 'Contact local Gram Panchayat or Department of Agriculture.',
    sourceUrl: 'https://pib.gov.in/',
  });

  matched.push({
    id: 'nano-urea',
    name: 'IFFCO Nano Urea (Liquid) Subsidy Initiative',
    description: 'Replaces 1 bag of conventional granular urea with a 500 ml bottle of Nano Urea, reducing logistics cost and nitrogen volatilization.',
    eligible: true,
    status: 'Eligible',
    reasons: ['Suitable for foliar application during tillering and panicle initiation stages.'],
    howToApply: 'Available at IFFCO centers, PACs, and authorized fertilizer dealers.',
    sourceUrl: 'https://nanourea.in/',
  });

  return {
    matchedSchemes: matched,
    totalMatched: matched.filter((s) => s.eligible).length,
  };
};

export default {
  matchSchemes,
};
