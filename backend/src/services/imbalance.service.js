import { FERTILIZER_SPECS } from './nutrientEngine.service.js';

const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

export const calculateImbalance = (payload) => {
  const {
    currentUsage = { ureaKg: 150, dapKg: 50, mopKg: 20 },
    recommendedPlan = null,
  } = payload;

  const currentUreaKg = Number(currentUsage.ureaKg || currentUsage.urea_kg || 0);
  const currentDapKg = Number(currentUsage.dapKg || currentUsage.dap_kg || 0);
  const currentMopKg = Number(currentUsage.mopKg || currentUsage.mop_kg || 0);

  // Calculate actual elemental N, P2O5, K2O supplied by current practice
  const currentN =
    currentUreaKg * FERTILIZER_SPECS.urea.nFraction +
    currentDapKg * FERTILIZER_SPECS.dap.nFraction;

  const currentP2O5 = currentDapKg * FERTILIZER_SPECS.dap.p2o5Fraction;
  const currentK2O = currentMopKg * FERTILIZER_SPECS.mop.k2oFraction;

  // Recommended N, P2O5, K2O
  const recN = recommendedPlan?.nutrientsRequiredKg?.n || 100;
  const recP2O5 = recommendedPlan?.nutrientsRequiredKg?.p2o5 || 50;
  const recK2O = recommendedPlan?.nutrientsRequiredKg?.k2o || 50;

  // Calculate Current NPK Ratio (normalized to P = 2 or P = 1, standard Indian benchmark N:P:K is 4:2:1)
  const currentPBase = currentP2O5 > 0 ? currentP2O5 : 1;
  const currentNRatio = round2((currentN / currentPBase) * 2);
  const currentPRatio = 2.0;
  const currentKRatio = round2((currentK2O / currentPBase) * 2);

  // Recommended NPK Ratio
  const recPBase = recP2O5 > 0 ? recP2O5 : 1;
  const recNRatio = round2((recN / recPBase) * 2);
  const recPRatio = 2.0;
  const recKRatio = round2((recK2O / recPBase) * 2);

  // Calculate Nitrogen Overuse Percentage
  const nDiff = currentN - recN;
  const overusePercent = recN > 0 ? round2(((currentN - recN) / recN) * 100) : 0;

  let severity = 'optimal';
  let severityMessage = 'Fertilizer application is balanced and close to optimal ratios.';

  if (overusePercent > 75) {
    severity = 'critical';
    severityMessage = 'CRITICAL UREA OVERUSE! Excessive nitrogen risks soil acidification, pest susceptibility, lodging, and groundwater nitrate pollution.';
  } else if (overusePercent > 40) {
    severity = 'severe';
    severityMessage = 'Severe nitrogen overuse detected. Urea application exceeds recommended levels significantly.';
  } else if (overusePercent > 15) {
    severity = 'moderate';
    severityMessage = 'Moderate nitrogen overuse. Adjusting to recommended plan will cut input costs with zero yield loss.';
  } else if (overusePercent < -20) {
    severity = 'under_application';
    severityMessage = 'Under-application of nitrogen. Crop yield may be constrained due to nutrient deficiency.';
  }

  return {
    currentNutrientsKg: {
      n: round2(currentN),
      p2o5: round2(currentP2O5),
      k2o: round2(currentK2O),
    },
    recommendedNutrientsKg: {
      n: round2(recN),
      p2o5: round2(recP2O5),
      k2o: round2(recK2O),
    },
    currentNpkRatio: `${currentNRatio}:${currentPRatio}:${currentKRatio}`,
    idealNpkRatio: `${recNRatio}:${recPRatio}:${recKRatio}`,
    standardIdealRatio: '4:2:1',
    ureaOverusePercentage: Math.max(0, overusePercent),
    excessNitrogenKg: round2(Math.max(0, nDiff)),
    severity,
    severityMessage,
  };
};

export default {
  calculateImbalance,
};
