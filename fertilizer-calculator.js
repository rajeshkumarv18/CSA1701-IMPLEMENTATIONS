/**
 * CropGuard AI - Fertilizer Ingredient Recommendation Engine
 * Calculates exact weight-based commercial fertilizer ingredients (Urea, SSP, MOP, DAP, etc.)
 * per acre or hectare based on crop target nutrition and soil test deficits.
 */

class FertilizerCalculator {
  constructor() {
    // Base recommended N-P-K (kg/acre) for high yield crops
    this.cropBaseNPK = {
      'Tomato': { N: 60, P: 40, K: 60, Ca: 15, Mg: 8 },
      'Corn / Maize': { N: 75, P: 35, K: 40, Ca: 10, Mg: 5 },
      'Wheat': { N: 50, P: 25, K: 25, Ca: 8, Mg: 4 },
      'Rice': { N: 55, P: 30, K: 35, Ca: 10, Mg: 5 },
      'Potato': { N: 70, P: 45, K: 75, Ca: 18, Mg: 10 },
      'Cotton': { N: 50, P: 20, K: 40, Ca: 12, Mg: 6 },
      'General Crop': { N: 50, P: 30, K: 40, Ca: 10, Mg: 5 }
    };
  }

  /**
   * Calculates specific ingredient dosages for a field.
   * @param {Object} params 
   * @returns {Object} Ingredient breakdown
   */
  calculateIngredients(params) {
    const {
      crop = 'Tomato',
      fieldArea = 1.0, // in acres
      areaUnit = 'acres',
      currentN = 'Medium', // Low (30% deficit), Medium (0% deficit), High (20% excess)
      currentP = 'Medium',
      currentK = 'Medium',
      diseaseContext = null // Disease object to adjust nutrients
    } = params;

    const areaMultiplier = areaUnit === 'hectares' ? fieldArea * 2.471 : fieldArea;
    const base = this.cropBaseNPK[crop] || this.cropBaseNPK['General Crop'];

    // Deficit multipliers
    const deficitMap = { 'Low': 1.4, 'Medium': 1.0, 'High': 0.5 };
    let targetN = base.N * (deficitMap[currentN] || 1.0);
    let targetP = base.P * (deficitMap[currentP] || 1.0);
    let targetK = base.K * (deficitMap[currentK] || 1.0);
    let targetCa = base.Ca;
    let targetMg = base.Mg;

    // Disease specific nutrient adjustment
    let note = 'Standard maintenance nutrient schedule.';
    if (diseaseContext) {
      if (diseaseContext.id === 'tomato_early_blight') {
        targetK *= 1.25; // Increase K by 25% for cell wall strength
        targetCa *= 1.30;
        note = 'Adjusted: +25% Potassium (K₂O) and +30% Calcium added to combat Alternaria fungal spot wall invasion.';
      } else if (diseaseContext.id === 'leaf_chlorosis_nitrogen_def') {
        targetN *= 1.40;
        note = 'Adjusted: +40% Nitrogen (N) boost to restore leaf chlorophyll synthesis.';
      } else if (diseaseContext.id === 'corn_common_rust') {
        targetK *= 1.20;
        targetP *= 1.15;
        note = 'Adjusted: Elevated K₂O and P₂O₅ to improve vascular rust resistance.';
      }
    }

    // Ingredient calculations
    // 1. Single Superphosphate (SSP 16% P2O5) or DAP
    // Let's use SSP (16% P2O5) + Urea (46% N) + Muriate of Potash (60% K2O)
    const sspNeededKg = (targetP / 0.16) * areaMultiplier;
    const mopNeededKg = (targetK / 0.60) * areaMultiplier;
    const ureaNeededKg = (targetN / 0.46) * areaMultiplier;
    const calciumNitrateKg = (targetCa / 0.19) * areaMultiplier;
    const epsomSaltKg = (targetMg / 0.098) * areaMultiplier;

    // Organic compost requirement (tonnes)
    const organicCompostTonnes = 2.5 * areaMultiplier;

    const ingredients = [
      {
        id: 'urea',
        name: 'Urea',
        formula: 'CO(NH₂)₂ • 46% N',
        symbol: 'N (Nitrogen)',
        dosageKg: Math.round(ureaNeededKg),
        bags50kg: (ureaNeededKg / 50).toFixed(1),
        application: 'Apply in 2 split doses: 50% at vegetative stage, 50% prior to flowering.'
      },
      {
        id: 'ssp',
        name: 'Single Superphosphate (SSP)',
        formula: 'Ca(H₂PO₄)₂ • 16% P₂O₅ + 12% S',
        symbol: 'P (Phosphorus)',
        dosageKg: Math.round(sspNeededKg),
        bags50kg: (sspNeededKg / 50).toFixed(1),
        application: '100% full basal application in soil during soil preparation.'
      },
      {
        id: 'mop',
        name: 'Muriate of Potash (MOP)',
        formula: 'KCl • 60% K₂O',
        symbol: 'K (Potassium)',
        dosageKg: Math.round(mopNeededKg),
        bags50kg: (mopNeededKg / 50).toFixed(1),
        application: 'Apply 50% at planting and 50% during tuber/fruit initiation.'
      },
      {
        id: 'calcium_nitrate',
        name: 'Calcium Nitrate',
        formula: 'Ca(NO₃)₂ • 15.5% N, 19% Ca',
        symbol: 'Ca (Calcium)',
        dosageKg: Math.round(calciumNitrateKg),
        bags50kg: (calciumNitrateKg / 50).toFixed(1),
        application: 'Foliar spray (5g/L) or drip fertigation to prevent blossom end rot & leaf tip burn.'
      },
      {
        id: 'epsom_salt',
        name: 'Epsom Salt (Magnesium Sulfate)',
        formula: 'MgSO₄ • 9.8% Mg, 12.9% S',
        symbol: 'Mg (Magnesium)',
        dosageKg: Math.round(epsomSaltKg),
        bags50kg: (epsomSaltKg / 50).toFixed(1),
        application: 'Foliar spray during active leaf canopy expansion.'
      }
    ];

    return {
      crop,
      fieldArea,
      areaUnit,
      note,
      ingredients,
      organicOption: {
        name: 'Azo-Phos Vermicompost Blend',
        quantityTonnes: organicCompostTonnes.toFixed(1),
        description: 'Incorporate well-rotted vermicompost enriched with Azotobacter and PSB bio-fertilizers.'
      }
    };
  }
}

// Global Export
window.FertilizerCalculator = new FertilizerCalculator();
