/**
 * CropGuard AI - Disease Diagnostics & Computer Vision Engine
 * Analyzes crop leaf image pixels, detects color anomalies, chlorosis, and necrotic spots,
 * and matches against an agronomic plant pathology database.
 */

class DiseaseEngine {
  constructor() {
    this.diseaseDatabase = [
      {
        id: 'tomato_early_blight',
        crop: 'Tomato',
        name: 'Tomato Early Blight',
        pathogen: 'Alternaria solani',
        category: 'Fungal',
        matchConditions: { minBrown: 0.05, maxGreen: 0.70, minYellow: 0.10 },
        severityRules: { high: 0.15, medium: 0.08 },
        symptoms: [
          'Dark brown to black target-like concentric spots on older leaves',
          'Yellow halo surrounding necrotic leaf spots',
          'Premature defoliation starting from lower canopy'
        ],
        cause: 'Fungal spores surviving in plant debris; triggered by high humidity and warm temperatures (24-29°C).',
        chemicalTreatment: 'Apply Chlorothalonil, Mancozeb, or Difenoconazole at 7-14 day intervals.',
        organicTreatment: 'Spray Copper Octanoate (Copper soap) or Bacillus subtilis bio-fungicide weekly.',
        fertilizerAction: 'Increase Potassium (K₂O) and Calcium (Ca) to reinforce cell walls; avoid excess foliage Nitrogen (N).'
      },
      {
        id: 'corn_common_rust',
        crop: 'Corn / Maize',
        name: 'Corn Common Rust',
        pathogen: 'Puccinia sorghi',
        category: 'Fungal',
        matchConditions: { minRustRed: 0.04, minYellow: 0.12 },
        severityRules: { high: 0.12, medium: 0.06 },
        symptoms: [
          'Oval to elongate golden-brown to reddish-brown pustules on both leaf surfaces',
          'Pustules rupture epidermal tissue releasing powdery spores',
          'Chlorotic streaks around cluster pustules'
        ],
        cause: 'Windborne fungal urediniospores under cool (16-23°C) and humid weather conditions.',
        chemicalTreatment: 'Foliar application of Azoxystrobin + Propiconazole at early tassel stage.',
        organicTreatment: 'Foliar application of Sulfur dust or Neem seed oil (10,000 ppm azadirachtin).',
        fertilizerAction: 'Apply Muriate of Potash (60% K₂O) to boost rust resistance; balance N-P-K ratios.'
      },
      {
        id: 'leaf_chlorosis_nitrogen_def',
        crop: 'General Crop',
        name: 'Severe Nitrogen Chlorosis',
        pathogen: 'Nutritional Deficiency',
        category: 'Abiotic Stress',
        matchConditions: { minYellow: 0.22, maxBrown: 0.04 },
        severityRules: { high: 0.30, medium: 0.18 },
        symptoms: [
          'Uniform yellowing (chlorosis) starting from older lower leaves',
          'Stunted overall leaf growth and pale green upper leaves',
          'V-shaped yellowing extending along leaf midrib'
        ],
        cause: 'Low soil available Nitrogen, leaching due to heavy irrigation, or root damage.',
        chemicalTreatment: 'Immediate side-dressing with Urea (46% N) or Foliar spray of 2% Urea solution.',
        organicTreatment: 'Apply Blood meal, Fish hydrolysate, or Well-composted poultry manure.',
        fertilizerAction: 'Apply 40-60 kg/acre Urea (46% N) split into 2 fertigation doses.'
      },
      {
        id: 'rice_bacterial_blight',
        crop: 'Rice',
        name: 'Rice Bacterial Leaf Blight',
        pathogen: 'Xanthomonas oryzae pv. oryzae',
        category: 'Bacterial',
        matchConditions: { minYellow: 0.15, minBrown: 0.08 },
        severityRules: { high: 0.20, medium: 0.10 },
        symptoms: [
          'Water-soaked to yellowish wavy stripes along leaf margins',
          'Lesions turn white to grey with bacterial ooze drops under humid mornings',
          'Drying and wilting of entire leaf blades (Kresek phase)'
        ],
        cause: 'Bacterial infection through leaf wounds or hydathodes under high rainfall and tropical temp.',
        chemicalTreatment: 'Spray Copper Hydroxide + Streptomycin Sulfate (100 ppm) at early disease symptom onset.',
        organicTreatment: 'Foliar spray of fresh cow dung slurry extract (20%) or Pseudomonas fluorescens.',
        fertilizerAction: 'Split Nitrogen applications into 3 doses; top-dress with Potassium Nitrate.'
      },
      {
        id: 'powdery_mildew',
        crop: 'General Crop',
        name: 'Powdery Mildew',
        pathogen: 'Erysiphe spp. / Podosphaera spp.',
        category: 'Fungal',
        matchConditions: { minWhiteGrey: 0.15, maxBrown: 0.08 },
        severityRules: { high: 0.25, medium: 0.12 },
        symptoms: [
          'White to greyish talcum-powder-like spots on upper leaf surfaces',
          'Leaves curl upwards, turn yellow, and dry prematurely',
          'Stunted shoot growth'
        ],
        cause: 'Airborne fungal spores thriving in warm, dry climates with shade and high relative humidity at night.',
        chemicalTreatment: 'Apply Myclobutanil, Penconazole, or Wettable Sulfur 80% WP.',
        organicTreatment: 'Spray Potassium Bicarbonate (3g/L) or diluted milk solution (1:9 ratio).',
        fertilizerAction: 'Avoid excess foliage Nitrogen; ensure adequate Potassium and Silica supplementation.'
      },
      {
        id: 'healthy_leaf',
        crop: 'General Crop',
        name: 'Healthy Crop Leaf',
        pathogen: 'None (Healthy)',
        category: 'Optimal State',
        matchConditions: { minGreen: 0.65 },
        severityRules: { high: 0.0, medium: 0.0 },
        symptoms: [
          'Deep uniform green color with normal vascular vein structure',
          'No visible lesions, pustules, chlorosis, or necrotic spots',
          'Vigorous leaf cell turgidity'
        ],
        cause: 'Balanced nutrition, optimal moisture, and healthy soil microflora.',
        chemicalTreatment: 'No chemical treatment required. Maintain preventative monitoring.',
        organicTreatment: 'Apply preventative seaweed extract or humic acid foliar spray.',
        fertilizerAction: 'Maintain current maintenance NPK fertilization schedule.'
      }
    ];
  }

  /**
   * Scans a canvas element and extracts pixel color analytics.
   * @param {HTMLCanvasElement} canvas 
   * @param {CanvasRenderingContext2D} ctx 
   * @returns {Object} Analytical diagnosis
   */
  analyzeCanvas(canvas, ctx) {
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const totalPixels = width * height;

    let greenCount = 0;
    let yellowCount = 0;
    let brownCount = 0;
    let rustRedCount = 0;
    let whiteGreyCount = 0;

    // Create a copy of image data for heatmap highlight overlay
    const heatmapData = ctx.createImageData(width, height);
    const hPixels = heatmapData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // Copy base RGB
      hPixels[i] = r;
      hPixels[i + 1] = g;
      hPixels[i + 2] = b;
      hPixels[i + 3] = pixels[i + 3];

      const total = r + g + b + 1;
      const rRatio = r / total;
      const gRatio = g / total;
      const bRatio = b / total;
      const brightness = (r + g + b) / 3;

      // Color classification heuristics
      // Healthy Green
      if (gRatio > 0.38 && g > r && g > b) {
        greenCount++;
      } 
      // Yellow Chlorosis (High R & G, Low B)
      else if (r > 120 && g > 110 && b < 100 && Math.abs(r - g) < 50) {
        yellowCount++;
        // Highlight Chlorosis in bright cyan on heatmap
        hPixels[i] = 0;
        hPixels[i + 1] = 230;
        hPixels[i + 2] = 255;
      } 
      // Rust Red / Orange Pustules
      else if (r > 130 && r > g * 1.15 && b < 90) {
        rustRedCount++;
        // Highlight Rust in glowing red
        hPixels[i] = 255;
        hPixels[i + 1] = 50;
        hPixels[i + 2] = 0;
      } 
      // Brown / Black Necrotic Spots (Dark, low green ratio)
      else if (brightness < 90 && rRatio > 0.34 && gRatio < 0.38) {
        brownCount++;
        // Highlight Lesions in bright magenta
        hPixels[i] = 255;
        hPixels[i + 1] = 0;
        hPixels[i + 2] = 128;
      } 
      // White / Grey Powdery Spots
      else if (r > 180 && g > 180 && b > 180 && Math.max(r,g,b) - Math.min(r,g,b) < 25) {
        whiteGreyCount++;
        // Highlight Powdery Mildew in electric purple
        hPixels[i] = 180;
        hPixels[i + 1] = 0;
        hPixels[i + 2] = 255;
      }
    }

    const greenRatio = greenCount / totalPixels;
    const yellowRatio = yellowCount / totalPixels;
    const brownRatio = brownCount / totalPixels;
    const rustRedRatio = rustRedCount / totalPixels;
    const whiteGreyRatio = whiteGreyCount / totalPixels;
    const diseasedAreaRatio = yellowRatio + brownRatio + rustRedRatio + whiteGreyRatio;

    // Disease Selection Matching Logic
    let selectedProfile = this.diseaseDatabase.find(d => d.id === 'healthy_leaf');
    let maxScore = 0;

    for (const profile of this.diseaseDatabase) {
      if (profile.id === 'healthy_leaf') continue;
      let score = 0;
      const cond = profile.matchConditions;

      if (cond.minBrown && brownRatio >= cond.minBrown) score += brownRatio * 4;
      if (cond.minYellow && yellowRatio >= cond.minYellow) score += yellowRatio * 3;
      if (cond.minRustRed && rustRedRatio >= cond.minRustRed) score += rustRedRatio * 5;
      if (cond.minWhiteGrey && whiteGreyRatio >= cond.minWhiteGrey) score += whiteGreyRatio * 5;

      if (score > maxScore) {
        maxScore = score;
        selectedProfile = profile;
      }
    }

    // Determine severity
    let severity = 'Healthy';
    let confidence = 96.5;

    if (selectedProfile.id !== 'healthy_leaf') {
      const highThresh = selectedProfile.severityRules.high;
      const medThresh = selectedProfile.severityRules.medium;

      if (diseasedAreaRatio >= highThresh) {
        severity = 'High';
      } else if (diseasedAreaRatio >= medThresh) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }

      confidence = Math.min(98.8, Math.max(82.0, 75 + maxScore * 100));
    } else {
      if (greenRatio < 0.45) {
        // Fallback to chlorosis deficiency if green is low
        selectedProfile = this.diseaseDatabase.find(d => d.id === 'leaf_chlorosis_nitrogen_def');
        severity = 'Medium';
        confidence = 88.4;
      }
    }

    return {
      profile: selectedProfile,
      severity,
      confidence: confidence.toFixed(1),
      stats: {
        greenRatio: (greenRatio * 100).toFixed(1),
        yellowRatio: (yellowRatio * 100).toFixed(1),
        brownRatio: (brownRatio * 100).toFixed(1),
        rustRedRatio: (rustRedRatio * 100).toFixed(1),
        whiteGreyRatio: (whiteGreyRatio * 100).toFixed(1),
        diseasedAreaRatio: (diseasedAreaRatio * 100).toFixed(1)
      },
      heatmapData
    };
  }
}

// Global Export
window.DiseaseEngine = new DiseaseEngine();
