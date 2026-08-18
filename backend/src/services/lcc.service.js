const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

/**
 * Leaf Colour Chart (LCC) Nitrogen Advisor
 * LCC Shade Scores range from 1 (yellowish green / N deficient) to 5 (dark green / N sufficient).
 */
export const calculateLccRecommendation = (payload) => {
  const {
    crop = 'rice',
    shadeScore = 3,         // 1 to 5 scale
    growthStage = 'tillering',
    landArea = 1.0,
    unit = 'acre',
  } = payload;

  const score = Number(shadeScore);
  let ureaKgPerHa = 0;
  let status = 'Sufficient';
  let advice = '';

  if (score <= 2) {
    // Severe Deficiency
    ureaKgPerHa = 35; // 35 kg urea/ha top-dressing
    status = 'Severe Nitrogen Deficiency';
    advice = 'Leaves are pale yellow. Immediate top-dressing of Urea is required to prevent yield loss.';
  } else if (score === 3) {
    // Moderate Deficiency / Critical Threshold for Inbred Rice
    ureaKgPerHa = 25; // 25 kg urea/ha
    status = 'Moderate Deficient / Threshold';
    advice = 'Leaf color is at the critical threshold (Shade 3). Apply top-dressing of Urea immediately.';
  } else if (score >= 4) {
    // Sufficient / No Top-dressing required
    ureaKgPerHa = 0;
    status = 'Optimal Nitrogen Level';
    advice = 'Leaf color is dark green (Shade 4-5). Soil has sufficient nitrogen. DO NOT apply Urea at this stage to avoid pest outbreak and lodging.';
  }

  // Convert for land area
  const areaInHa = unit === 'acre' ? landArea / 2.4710538 : landArea;
  const totalUreaKg = ureaKgPerHa * areaInHa;
  const ureaBags = totalUreaKg / 45;

  return {
    crop,
    shadeScore: score,
    growthStage,
    status,
    ureaRecommendedKgPerHa: ureaKgPerHa,
    totalUreaRecommendedKg: round2(totalUreaKg),
    totalUreaBags: round2(ureaBags),
    nanoUreaAlternative: score <= 3 ? '1 bottle (500 ml) Nano Urea per acre as foliar spray' : 'Not required',
    advisory: advice,
    instruction: 'Take reading from 10 fully expanded top leaves between 8:00 AM and 10:00 AM without direct sunlight facing your eyes.',
  };
};

export default {
  calculateLccRecommendation,
};
