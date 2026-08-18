import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default MRP Prices (INR)
const DEFAULT_PRICES = {
  ureaPerBag: 242,   // 45 kg bag
  ureaBagWeight: 45,
  dapPerBag: 1350,   // 50 kg bag
  dapBagWeight: 50,
  mopPerBag: 1700,   // 50 kg bag
  mopBagWeight: 50,
};

let mrpData = DEFAULT_PRICES;
try {
  const dataPath = path.join(__dirname, '../data/mrp.json');
  if (fs.existsSync(dataPath)) {
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    if (raw.prices) {
      mrpData = {
        ureaPerBag: raw.prices.urea?.mrp_per_bag || DEFAULT_PRICES.ureaPerBag,
        ureaBagWeight: raw.prices.urea?.bag_size_kg || 45,
        dapPerBag: raw.prices.dap?.mrp_per_bag || DEFAULT_PRICES.dapPerBag,
        dapBagWeight: raw.prices.dap?.bag_size_kg || 50,
        mopPerBag: raw.prices.mop?.mrp_per_bag || DEFAULT_PRICES.mopPerBag,
        mopBagWeight: raw.prices.mop?.bag_size_kg || 50,
      };
    }
  }
} catch (e) {
  console.warn('Using default MRP fallback prices:', e.message);
}

const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

export const calculateEconomics = (payload) => {
  const {
    currentPractice = { ureaBags: 4, dapBags: 1.5, mopBags: 0.5 },
    recommendedProducts = null,
    landArea = 1.0,
    unit = 'acre',
  } = payload;

  const currentUreaBags = Number(currentPractice.ureaBags || currentPractice.urea_bags || 0);
  const currentDapBags = Number(currentPractice.dapBags || currentPractice.dap_bags || 0);
  const currentMopBags = Number(currentPractice.mopBags || currentPractice.mop_bags || 0);

  // Current practice cost calculation
  const currentUreaCost = currentUreaBags * mrpData.ureaPerBag;
  const currentDapCost = currentDapBags * mrpData.dapPerBag;
  const currentMopCost = currentMopBags * mrpData.mopPerBag;
  const totalCurrentCost = currentUreaCost + currentDapCost + currentMopCost;

  // Recommended plan cost calculation
  const recUreaBags = Number(recommendedProducts?.urea?.bags || recommendedProducts?.urea_bags || 0);
  const recDapBags = Number(recommendedProducts?.dap?.bags || recommendedProducts?.dap_bags || 0);
  const recMopBags = Number(recommendedProducts?.mop?.bags || recommendedProducts?.mop_bags || 0);

  const recUreaCost = recUreaBags * mrpData.ureaPerBag;
  const recDapCost = recDapBags * mrpData.dapPerBag;
  const recMopCost = recMopBags * mrpData.mopPerBag;
  const totalRecommendedCost = recUreaCost + recDapCost + recMopCost;

  const savingsInr = totalCurrentCost - totalRecommendedCost;
  const savingsPercent = totalCurrentCost > 0 ? round2((savingsInr / totalCurrentCost) * 100) : 0;

  return {
    currency: 'INR',
    pricesPerBag: {
      urea: mrpData.ureaPerBag,
      dap: mrpData.dapPerBag,
      mop: mrpData.mopPerBag,
    },
    currentCostBreakdown: {
      ureaBags: currentUreaBags,
      ureaCost: round2(currentUreaCost),
      dapBags: currentDapBags,
      dapCost: round2(currentDapCost),
      mopBags: currentMopBags,
      mopCost: round2(currentMopCost),
      totalCost: round2(totalCurrentCost),
    },
    recommendedCostBreakdown: {
      ureaBags: round2(recUreaBags),
      ureaCost: round2(recUreaCost),
      dapBags: round2(recDapBags),
      dapCost: round2(recDapCost),
      mopBags: round2(recMopBags),
      mopCost: round2(recMopCost),
      totalCost: round2(totalRecommendedCost),
    },
    financialSummary: {
      totalCurrentCost: round2(totalCurrentCost),
      totalRecommendedCost: round2(totalRecommendedCost),
      netSavingsInr: round2(savingsInr),
      netSavingsPercent: savingsPercent,
      isCostSaved: savingsInr > 0,
      costPerUnit: round2(totalRecommendedCost / Math.max(0.1, landArea)),
      unit,
    },
  };
};

export default {
  calculateEconomics,
};
