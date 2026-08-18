import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load ICAR tables reference data
let icarTables = null;
try {
  const dataPath = path.join(__dirname, '../data/icarTables.json');
  if (fs.existsSync(dataPath)) {
    icarTables = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load icarTables.json:', e.message);
}

// Product Constants
export const FERTILIZER_SPECS = {
  urea: { nFraction: 0.46, p2o5Fraction: 0.0, k2oFraction: 0.0, bagSizeKg: 45 },
  dap: { nFraction: 0.18, p2o5Fraction: 0.46, k2oFraction: 0.0, bagSizeKg: 50 },
  mop: { nFraction: 0.0, p2o5Fraction: 0.0, k2oFraction: 0.60, bagSizeKg: 50 },
};

export const HECTARE_TO_ACRE = 2.4710538;

/**
 * Standard Blanket Recommended Doses of Fertilizer (RDF) in kg/ha
 */
export const DEFAULT_RDF = {
  rice: { n: 100, p2o5: 50, k2o: 50 },
  wheat: { n: 120, p2o5: 60, k2o: 40 },
  maize: { n: 120, p2o5: 60, k2o: 40 },
  cotton: { n: 100, p2o5: 50, k2o: 50 },
  sugarcane: { n: 250, p2o5: 115, k2o: 115 },
  default: { n: 100, p2o5: 50, k2o: 50 },
};

/**
 * Helper to round floats cleanly to 2 decimal places
 */
const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

/**
 * Main Nutrient Recommendation Engine
 */
export const calculateRecommendation = (payload) => {
  const {
    crop = 'rice',
    mode = 'blanket_rdf',
    landArea = 1.0,
    unit = 'acre', // 'acre' or 'hectare'
    soilTest = null,
    targetYieldQPerHa = 50,
  } = payload;

  // Convert area to hectares for standard agronomic formula calculations
  const areaInHa = unit === 'acre' ? landArea / HECTARE_TO_ACRE : landArea;

  let nReqKgPerHa = 0;
  let p2o5ReqKgPerHa = 0;
  let k2oReqKgPerHa = 0;
  let calculationNote = '';
  let notices = [];

  // Determine N, P2O5, K2O requirements per hectare based on mode
  if (mode === 'stcr' && soilTest && soilTest.availableN && soilTest.availableK) {
    // STCR targeted yield equations (Rahuri transplanted rice benchmark)
    // FN = 4.25 * T - 0.45 * SN
    // FK2O = 2.10 * T - 0.38 * SK
    const SN = Number(soilTest.availableN); // kg N/ha
    const SK = Number(soilTest.availableK); // kg K/ha
    const T = Number(targetYieldQPerHa);    // quintal/ha

    nReqKgPerHa = Math.max(0, 4.25 * T - 0.45 * SN);
    k2oReqKgPerHa = Math.max(0, 2.10 * T - 0.38 * SK);

    // Guard R2A for P2O5 under STCR
    p2o5ReqKgPerHa = DEFAULT_RDF[crop.toLowerCase()]?.p2o5 || 50;
    calculationNote = `STCR targeted yield mode (${T} q/ha). P2O5 supplied via standard recommended dose due to R2A phosphorus conversion guard.`;
    notices.push({
      code: 'R2A_SP_BASIS_UNRESOLVED',
      message: 'P2O5 dose calculated from blanket RDF fallback as STCR phosphorus basis is protected.',
    });
  } else if (mode === 'rating_based' && soilTest) {
    const baseRdf = DEFAULT_RDF[crop.toLowerCase()] || DEFAULT_RDF.default;

    // Adjust N based on soil test N grade
    let nFactor = 1.0;
    if (soilTest.nGrade === 'low' || (soilTest.availableN && soilTest.availableN < 280)) nFactor = 1.25;
    else if (soilTest.nGrade === 'high' || (soilTest.availableN && soilTest.availableN > 560)) nFactor = 0.75;

    // Adjust P based on soil test P grade
    let pFactor = 1.0;
    if (soilTest.pGrade === 'low' || (soilTest.availableP && soilTest.availableP < 10)) pFactor = 1.25;
    else if (soilTest.pGrade === 'high' || (soilTest.availableP && soilTest.availableP > 25)) pFactor = 0.75;

    // Adjust K based on soil test K grade
    let kFactor = 1.0;
    if (soilTest.kGrade === 'low' || (soilTest.availableK && soilTest.availableK < 108)) kFactor = 1.25;
    else if (soilTest.kGrade === 'high' || (soilTest.availableK && soilTest.availableK > 280)) kFactor = 0.75;

    nReqKgPerHa = baseRdf.n * nFactor;
    p2o5ReqKgPerHa = baseRdf.p2o5 * pFactor;
    k2oReqKgPerHa = baseRdf.k2o * kFactor;
    calculationNote = 'Rating-based soil test adjustment applied (low: +25%, high: -25%).';
  } else {
    // Blanket RDF mode
    const baseRdf = DEFAULT_RDF[crop.toLowerCase()] || DEFAULT_RDF.default;
    nReqKgPerHa = baseRdf.n;
    p2o5ReqKgPerHa = baseRdf.p2o5;
    k2oReqKgPerHa = baseRdf.k2o;
    calculationNote = 'Standard State Agricultural University (SAU) Recommended Dose of Fertilizer (RDF).';
  }

  // Calculate total elemental nutrient requirements for the farm plot
  const totalNReqKg = nReqKgPerHa * areaInHa;
  const totalP2O5ReqKg = p2o5ReqKgPerHa * areaInHa;
  const totalK2OReqKg = k2oReqKgPerHa * areaInHa;

  // STEP 1: Sizing DAP for Phosphate requirement
  // DAP is 46% P2O5 -> dapKg = totalP2O5ReqKg / 0.46
  const dapKg = totalP2O5ReqKg / FERTILIZER_SPECS.dap.p2o5Fraction;

  // STEP 2: DAP Nitrogen Deduction
  // DAP carries 18% N -> dapN = dapKg * 0.18
  const dapNSuppliedKg = dapKg * FERTILIZER_SPECS.dap.nFraction;

  // STEP 3: Remaining N requirement to be fulfilled by Urea
  const netNKg = Math.max(0, totalNReqKg - dapNSuppliedKg);
  const ureaKg = netNKg / FERTILIZER_SPECS.urea.nFraction;

  // STEP 4: MOP for Potash requirement
  // MOP is 60% K2O -> mopKg = totalK2OReqKg / 0.60
  const mopKg = totalK2OReqKg / FERTILIZER_SPECS.mop.k2oFraction;

  // Calculate Bag Counts
  const ureaBags = ureaKg / FERTILIZER_SPECS.urea.bagSizeKg;
  const dapBags = dapKg / FERTILIZER_SPECS.dap.bagSizeKg;
  const mopBags = mopKg / FERTILIZER_SPECS.mop.bagSizeKg;

  // Split Application Schedule
  // Basal: 50% Urea (or all DAP + remaining basal Urea) + 100% DAP + 50% MOP
  // Top dress 1 (Tillering/30 DAT): 50% of Urea + 25% MOP
  // Top dress 2 (Panicle initiation/60 DAT): 50% of remaining Urea + 25% MOP
  const splitSchedule = [
    {
      stage: 'Basal (Sowing / Transplanting)',
      timing: 'Day 0',
      ureaKg: round2(ureaKg * 0.5),
      ureaBags: round2(ureaBags * 0.5),
      dapKg: round2(dapKg),
      dapBags: round2(dapBags),
      mopKg: round2(mopKg * 0.5),
      mopBags: round2(mopBags * 0.5),
      description: 'Apply full DAP dose, half of total Urea, and half of total MOP during land preparation/transplanting.',
    },
    {
      stage: 'First Top Dressing (Tillering)',
      timing: '21-30 Days After Transplanting (DAT)',
      ureaKg: round2(ureaKg * 0.25),
      ureaBags: round2(ureaBags * 0.25),
      dapKg: 0,
      dapBags: 0,
      mopKg: round2(mopKg * 0.25),
      mopBags: round2(mopBags * 0.25),
      description: 'Apply 25% Urea and 25% MOP after weeding, ensuring moist soil condition.',
    },
    {
      stage: 'Second Top Dressing (Panicle Initiation)',
      timing: '45-60 Days After Transplanting (DAT)',
      ureaKg: round2(ureaKg * 0.25),
      ureaBags: round2(ureaBags * 0.25),
      dapKg: 0,
      dapBags: 0,
      mopKg: round2(mopKg * 0.25),
      mopBags: round2(mopBags * 0.25),
      description: 'Apply final 25% Urea and 25% MOP prior to flowering stage.',
    },
  ];

  // Soil Amendments & Advisories
  const organicCarbon = soilTest?.organicCarbonPercent || soilTest?.organicCarbon || 0.5;
  const ph = soilTest?.ph || 7.0;

  const advisories = [];
  if (organicCarbon < 0.5) {
    advisories.push({
      type: 'Organic Matter',
      level: 'warning',
      title: 'Low Soil Organic Carbon (< 0.5%)',
      recommendation: `Apply Farm Yard Manure (FYM) or Well-rotted Compost @ ${round2(5 * areaInHa)} tonnes for your plot before plowing.`,
    });
  }

  if (ph < 6.0) {
    advisories.push({
      type: 'pH Correction (Acidic Soil)',
      level: 'action_required',
      title: `Acidic Soil (pH ${ph})`,
      recommendation: `Apply Agricultural Lime (Calcium Carbonate) @ ${round2(2.5 * areaInHa)} tonnes to raise soil pH and improve P availability.`,
    });
  } else if (ph > 8.5) {
    advisories.push({
      type: 'pH Correction (Alkaline/Saline Soil)',
      level: 'action_required',
      title: `Alkaline Soil (pH ${ph})`,
      recommendation: `Apply Agricultural Gypsum @ ${round2(2.5 * areaInHa)} tonnes to remediate sodicity and improve root nutrient uptake.`,
    });
  }

  return {
    crop,
    mode,
    landArea,
    unit,
    areaInHectares: round2(areaInHa),
    nutrientsRequiredKg: {
      n: round2(totalNReqKg),
      p2o5: round2(totalP2O5ReqKg),
      k2o: round2(totalK2OReqKg),
    },
    nutrientsRequiredPerHa: {
      n: round2(nReqKgPerHa),
      p2o5: round2(p2o5ReqKgPerHa),
      k2o: round2(k2oReqKgPerHa),
    },
    dapNitrogenDeduction: {
      dapKg: round2(dapKg),
      dapNitrogenSuppliedKg: round2(dapNSuppliedKg),
      netUreaNitrogenRequiredKg: round2(netNKg),
      savedUreaKg: round2((totalNReqKg / 0.46) - ureaKg),
    },
    products: {
      urea: {
        kg: round2(ureaKg),
        bags: round2(ureaBags),
        exactBags: Math.ceil(ureaBags),
        bagSizeKg: 45,
      },
      dap: {
        kg: round2(dapKg),
        bags: round2(dapBags),
        exactBags: Math.ceil(dapBags),
        bagSizeKg: 50,
      },
      mop: {
        kg: round2(mopKg),
        bags: round2(mopBags),
        exactBags: Math.ceil(mopBags),
        bagSizeKg: 50,
      },
    },
    splitSchedule,
    advisories,
    notices,
    calculationNote,
  };
};

export default {
  calculateRecommendation,
  FERTILIZER_SPECS,
  DEFAULT_RDF,
};
