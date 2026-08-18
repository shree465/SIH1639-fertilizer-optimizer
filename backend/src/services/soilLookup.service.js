import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let shcMockData = [];
try {
  const dataPath = path.join(__dirname, '../data/shcMock.json');
  if (fs.existsSync(dataPath)) {
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    shcMockData = raw.cards || [];
  }
} catch (e) {
  console.warn('Could not load shcMock.json:', e.message);
}

export const getSoilCardById = (cardId) => {
  if (!cardId) return null;
  const cleanId = String(cardId).trim().toUpperCase();

  const foundCard = shcMockData.find(
    (card) => card.card_id.toUpperCase() === cleanId || card.card_id.toUpperCase().includes(cleanId)
  );

  if (foundCard) {
    return {
      cardId: foundCard.card_id,
      issuedDate: foundCard.issued_date,
      farmerName: foundCard.farmer_name,
      village: foundCard.village,
      taluka: foundCard.taluka,
      district: foundCard.district,
      state: foundCard.state,
      surveyNumber: foundCard.survey_number,
      soilType: foundCard.soil_type,
      irrigation: foundCard.irrigation,
      results: {
        ph: foundCard.results.ph,
        ecDsPerM: foundCard.results.ec_ds_per_m,
        organicCarbonPercent: foundCard.results.organic_carbon_percent,
        availableN: foundCard.results.available_n_kg_per_ha,
        availableP: foundCard.results.available_p_kg_per_ha,
        availableK: foundCard.results.available_k_kg_per_ha,
        sulphurKgPerHa: foundCard.results.sulphur_kg_per_ha,
        zincPpm: foundCard.results.zinc_ppm,
        boronPpm: foundCard.results.boron_ppm,
      },
      nutrientGrades: foundCard.nutrient_grades,
      recommendationsText: foundCard.recommendations_text,
    };
  }

  // Fallback demo mock card generator if not found in mock array
  return {
    cardId: cleanId,
    issuedDate: '2024-04-10',
    farmerName: 'Sample Farmer (Simulated)',
    village: 'Sample Village',
    district: 'Ahmednagar',
    state: 'Maharashtra',
    surveyNumber: '101/1',
    soilType: 'Medium Black Soil',
    irrigation: 'Irrigated',
    results: {
      ph: 7.4,
      ecDsPerM: 0.4,
      organicCarbonPercent: 0.48,
      availableN: 210.0,
      availableP: 18.5,
      availableK: 275.0,
      sulphurKgPerHa: 14.0,
      zincPpm: 0.75,
      boronPpm: 0.45,
    },
    nutrientGrades: {
      n: 'low',
      p: 'low',
      k: 'high',
      organic_carbon: 'low',
    },
    recommendationsText: 'Soil Card retrieved from demo database. Low available nitrogen and organic carbon detected.',
  };
};

export default {
  getSoilCardById,
};
