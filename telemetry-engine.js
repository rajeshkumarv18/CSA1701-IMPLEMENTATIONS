/**
 * CropGuard AI - Soil & Water Stress Telemetry Engine
 * Calculates real-time crop water stress, soil moisture deficit, pH lockout risk,
 * and microclimate fungal disease probability.
 */

class TelemetryEngine {
  constructor() {
    this.cropProfiles = {
      'Tomato': { minMoisture: 45, maxMoisture: 75, optPhMin: 6.0, optPhMax: 6.8, ecLimit: 2.5 },
      'Corn / Maize': { minMoisture: 40, maxMoisture: 70, optPhMin: 5.8, optPhMax: 7.0, ecLimit: 2.0 },
      'Wheat': { minMoisture: 35, maxMoisture: 65, optPhMin: 6.0, optPhMax: 7.2, ecLimit: 3.0 },
      'Rice': { minMoisture: 60, maxMoisture: 90, optPhMin: 5.5, optPhMax: 6.5, ecLimit: 1.5 },
      'Potato': { minMoisture: 50, maxMoisture: 80, optPhMin: 5.2, optPhMax: 6.2, ecLimit: 1.7 },
      'Cotton': { minMoisture: 30, maxMoisture: 60, optPhMin: 5.8, optPhMax: 7.5, ecLimit: 4.0 },
      'General Crop': { minMoisture: 40, maxMoisture: 70, optPhMin: 6.0, optPhMax: 7.0, ecLimit: 2.5 }
    };
  }

  /**
   * Evaluates soil moisture, pH, EC, and climate telemetry.
   * @param {Object} inputs 
   * @returns {Object} Analytical summary
   */
  evaluateTelemetry(inputs) {
    const { crop = 'Tomato', moisture = 50, ph = 6.5, temp = 26, humidity = 75, ec = 1.2 } = inputs;
    const profile = this.cropProfiles[crop] || this.cropProfiles['General Crop'];

    // 1. Water Stress Index (0 = Severe Drought, 50 = Optimal, 100 = Severe Waterlogged)
    let waterStatus = 'Optimal Moisture';
    let stressIndex = 50;
    let waterAction = 'Maintain current drip irrigation schedule.';
    let colorClass = 'severity-healthy';

    if (moisture < profile.minMoisture) {
      const deficit = profile.minMoisture - moisture;
      if (deficit > 20) {
        waterStatus = 'Critical Drought Stress';
        stressIndex = Math.max(5, 50 - deficit * 2);
        waterAction = `URGENT: Soil moisture is below permanent wilting point! Apply immediate deep irrigation of ~25-30 mm (${(deficit * 1.2).toFixed(0)} L/m²).`;
        colorClass = 'severity-high';
      } else {
        waterStatus = 'Mild Water Stress';
        stressIndex = 50 - deficit * 1.5;
        waterAction = 'Moisture levels are dipping below optimal field capacity. Schedule irrigation within 12 hours.';
        colorClass = 'severity-medium';
      }
    } else if (moisture > profile.maxMoisture) {
      const surplus = moisture - profile.maxMoisture;
      if (surplus > 15) {
        waterStatus = 'Severe Waterlogging / Root Hypoxia';
        stressIndex = Math.min(95, 50 + surplus * 2);
        waterAction = 'HAZARD: Excessive soil water content! Halt all irrigation immediately and check field drainage to prevent Pythium root rot.';
        colorClass = 'severity-high';
      } else {
        waterStatus = 'High Moisture Level';
        stressIndex = 50 + surplus * 1.2;
        waterAction = 'Soil is near saturation. Postpone next irrigation turn to allow soil aeration.';
        colorClass = 'severity-medium';
      }
    }

    // 2. Soil pH & Nutrient Lockout Status
    let phStatus = 'Optimal pH Range';
    let phWarning = null;

    if (ph < profile.optPhMin) {
      phStatus = 'Acidic Soil (Nutrient Lockout Risk)';
      phWarning = `Soil pH (${ph}) is below optimal for ${crop} (${profile.optPhMin}-${profile.optPhMax}). Phosphorus, Calcium, and Magnesium availability is reduced. Apply agricultural lime (CaCO₃) at 150-200 kg/acre.`;
    } else if (ph > profile.optPhMax) {
      phStatus = 'Alkaline Soil (Micronutrient Lockout Risk)';
      phWarning = `Soil pH (${ph}) is above optimal for ${crop} (${profile.optPhMin}-${profile.optPhMax}). Iron (Fe), Zinc (Zn), and Manganese (Mn) are rendered insoluble. Apply elemental sulfur or agricultural gypsum.`;
    }

    // 3. Electrical Conductivity (Salinity / Nutrient Density)
    let ecStatus = 'Balanced Salinity';
    if (ec > profile.ecLimit) {
      ecStatus = `High Salinity Warning (${ec} dS/m)`;
    }

    // 4. Microclimate Fungal & Bacterial Outbreak Risk
    let fungalRiskPercent = 20;
    let fungalRiskLevel = 'Low';

    if (humidity > 70 && temp >= 18 && temp <= 30) {
      fungalRiskPercent = Math.min(98, (humidity - 50) * 1.8 + (temp > 22 ? 20 : 10));
      if (fungalRiskPercent > 75) {
        fungalRiskLevel = 'High Risk (Fungal Outbreak Hazard)';
      } else if (fungalRiskPercent > 45) {
        fungalRiskLevel = 'Moderate Risk';
      }
    }

    return {
      waterStatus,
      stressIndex: Math.round(stressIndex),
      waterAction,
      colorClass,
      phStatus,
      phWarning,
      ecStatus,
      fungalRiskPercent: Math.round(fungalRiskPercent),
      fungalRiskLevel,
      targetCrop: crop
    };
  }
}

// Global Export
window.TelemetryEngine = new TelemetryEngine();
