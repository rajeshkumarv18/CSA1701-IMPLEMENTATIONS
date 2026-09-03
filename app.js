/**
 * CropGuard AI - Main Application & State Manager
 * Coordinates UI tabs, image loading, canvas drawing, disease diagnosis,
 * water stress telemetry, fertilizer calculation, and Cloud Database synchronization.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Application State
  const state = {
    activeTab: 'dashboard',
    theme: localStorage.getItem('cropguard_theme') || 'dark',
    selectedCrop: 'Tomato',
    fieldArea: 1.0,
    areaUnit: 'acres',
    currentDiagnosis: null,
    currentTelemetry: null,
    linkedPlotId: null,
    plots: [],
    logs: []
  };

  // Initialize Cloud Database Service
  const db = window.CloudDatabaseService;

  // DOM Element References
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const cloudStatusBadge = document.getElementById('cloudStatusBadge');
  const globalFieldSelector = document.getElementById('globalFieldSelector');
  const globalLinkToast = document.getElementById('globalLinkToast');
  const toastMessage = document.getElementById('toastMessage');
  const brandLink = document.querySelector('.brand');

  // Scanner Elements
  const imageInput = document.getElementById('imageInput');
  const dropzone = document.getElementById('dropzone');
  const leafCanvas = document.getElementById('leafCanvas');
  const scanOverlay = document.getElementById('scanOverlay');
  const ctx = leafCanvas.getContext('2d');
  const presetChips = document.querySelectorAll('.preset-chip');
  const toggleHeatmapBtn = document.getElementById('toggleHeatmapBtn');

  // Result UI Elements
  const diseaseNameEl = document.getElementById('diseaseName');
  const diseasePathogenEl = document.getElementById('diseasePathogen');
  const diseaseCategoryEl = document.getElementById('diseaseCategory');
  const severityBadgeEl = document.getElementById('severityBadge');
  const confidenceValEl = document.getElementById('confidenceVal');
  const confidenceBarEl = document.getElementById('confidenceBar');
  const symptomListEl = document.getElementById('symptomList');
  const chemicalTreatmentEl = document.getElementById('chemicalTreatment');
  const organicTreatmentEl = document.getElementById('organicTreatment');
  const fertilizerActionEl = document.getElementById('fertilizerAction');

  // Hero Banner Elements
  const heroMetrics = document.querySelectorAll('.metric-pill .value');

  // Telemetry Inputs
  const cropSelect = document.getElementById('cropSelect');
  const moistureRange = document.getElementById('moistureRange');
  const moistureVal = document.getElementById('moistureVal');
  const phRange = document.getElementById('phRange');
  const phVal = document.getElementById('phVal');
  const tempRange = document.getElementById('tempRange');
  const tempVal = document.getElementById('tempVal');
  const humidityRange = document.getElementById('humidityRange');
  const humidityVal = document.getElementById('humidityVal');

  // Telemetry Outputs
  const waterStatusEl = document.getElementById('waterStatus');
  const waterActionEl = document.getElementById('waterAction');
  const phStatusEl = document.getElementById('phStatus');
  const phWarningEl = document.getElementById('phWarning');
  const fungalRiskPercentEl = document.getElementById('fungalRiskPercent');
  const fungalRiskLevelEl = document.getElementById('fungalRiskLevel');
  const gaugeMeterPath = document.getElementById('gaugeMeterPath');

  // Fertilizer Inputs & Outputs
  const fertAreaInput = document.getElementById('fertAreaInput');
  const fertUnitSelect = document.getElementById('fertUnitSelect');
  const fertGrid = document.getElementById('fertGrid');
  const fertNoteEl = document.getElementById('fertNote');
  const organicCompostEl = document.getElementById('organicCompost');

  // Dashboard & Logs
  const plotsTableBody = document.getElementById('plotsTableBody');
  const historyLogsBody = document.getElementById('historyLogsBody');
  const addPlotBtn = document.getElementById('addPlotBtn');
  const exportReportBtn = document.getElementById('exportReportBtn');

  // ──────────────────────────────────────────────────────────────────
  // TOAST NOTIFICATION HELPER
  // ──────────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(message) {
    if (!globalLinkToast || !toastMessage) return;
    toastMessage.textContent = message;
    globalLinkToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => globalLinkToast.classList.remove('show'), 3000);
  }

  // ──────────────────────────────────────────────────────────────────
  // TAB SWITCHING HELPER
  // ──────────────────────────────────────────────────────────────────
  function switchTab(tabId) {
    navTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    const targetBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    const targetPanel = document.getElementById(`${tabId}Tab`);
    if (targetPanel) targetPanel.classList.add('active');
    state.activeTab = tabId;
  }

  // ──────────────────────────────────────────────────────────────────
  // 1. GLOBAL FIELD SELECTOR — POPULATE & LINK
  // ──────────────────────────────────────────────────────────────────
  function populateGlobalFieldSelector() {
    if (!globalFieldSelector) return;
    // Keep the "All" option, remove the rest
    const allOption = globalFieldSelector.querySelector('option[value="all"]');
    globalFieldSelector.innerHTML = '';
    if (allOption) globalFieldSelector.appendChild(allOption);

    state.plots.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.crop})`;
      globalFieldSelector.appendChild(opt);
    });

    // Restore previous selection if still valid
    if (state.linkedPlotId) {
      globalFieldSelector.value = state.linkedPlotId;
    }
  }

  function setGlobalField(plotId) {
    state.linkedPlotId = plotId;

    if (plotId === 'all') {
      // Reset to defaults
      updateHeroBanner(null);
      globalFieldSelector.classList.remove('active-global');
      showToast('Global link cleared — viewing all farm fields.');
    } else {
      const plot = state.plots.find(p => p.id === plotId);
      if (!plot) return;

      globalFieldSelector.classList.add('active-global');

      // Sync crop type to Telemetry
      const cropMap = {
        'Tomato': 'Tomato',
        'Corn / Maize': 'Corn / Maize',
        'Wheat': 'Wheat',
        'Rice': 'Rice',
        'Potato': 'Potato',
        'Cotton': 'Cotton'
      };
      const mappedCrop = cropMap[plot.crop] || plot.crop;
      if (cropSelect) {
        for (const opt of cropSelect.options) {
          if (opt.value === mappedCrop) {
            cropSelect.value = mappedCrop;
            break;
          }
        }
      }

      // Sync field area to Fertilizer Lab
      const areaMatch = plot.area ? plot.area.match(/([\d.]+)\s*(Acres|Hectares)?/i) : null;
      if (areaMatch && fertAreaInput) {
        fertAreaInput.value = parseFloat(areaMatch[1]);
        if (areaMatch[2] && fertUnitSelect) {
          fertUnitSelect.value = areaMatch[2].toLowerCase();
        }
      }

      // Update Hero Banner with selected plot data
      updateHeroBanner(plot);

      // Refresh dependent panels
      updateTelemetryUI();
      updateFertilizerLab();

      showToast(`Globally linked: ${plot.name} (${plot.crop})`);
    }

    // Re-render tables to show linked row highlight
    renderPlotsTable();
  }

  function updateHeroBanner(plot) {
    if (heroMetrics.length < 3) return;
    if (plot) {
      heroMetrics[0].textContent = `${plot.health}%`;
      heroMetrics[0].style.color = plot.health > 80 ? '' : (plot.health > 60 ? 'var(--accent-amber)' : 'var(--accent-rose)');
      heroMetrics[2].textContent = plot.area || '—';
    } else {
      // Aggregate across all plots
      if (state.plots.length) {
        const avgHealth = Math.round(state.plots.reduce((s, p) => s + p.health, 0) / state.plots.length);
        heroMetrics[0].textContent = `${avgHealth}%`;
        heroMetrics[0].style.color = avgHealth > 80 ? '' : 'var(--accent-amber)';
        const totalAcres = state.plots.reduce((s, p) => {
          const m = p.area ? p.area.match(/([\d.]+)/) : null;
          return s + (m ? parseFloat(m[1]) : 0);
        }, 0);
        heroMetrics[2].textContent = `${totalAcres.toFixed(1)} Ac`;
      }
    }
  }

  if (globalFieldSelector) {
    globalFieldSelector.addEventListener('change', () => {
      setGlobalField(globalFieldSelector.value);
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. CLOUD DATABASE LOAD & STATUS
  // ──────────────────────────────────────────────────────────────────
  async function loadCloudData() {
    if (db) {
      state.plots = await db.getCollection('farm_plots');
      state.logs = await db.getCollection('action_logs');
    }
    populateGlobalFieldSelector();
    renderPlotsTable();
    renderHistoryLogs();
    updateCloudStatusBadge();
    updateHeroBanner(null);
  }

  function updateCloudStatusBadge() {
    if (!cloudStatusBadge || !db) return;
    const status = db.getHealthStatus();
    cloudStatusBadge.innerHTML = `<i class="fas fa-database" style="color:var(--emerald-primary);"></i> <span>Cloud Firestore: <strong>${status.totalRecords} Records Synced</strong> (${status.latencyMs}ms)</span>`;
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. THEME MANAGEMENT
  // ──────────────────────────────────────────────────────────────────
  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    themeToggleBtn.innerHTML = state.theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }

  themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cropguard_theme', state.theme);
    initTheme();
  });

  // ──────────────────────────────────────────────────────────────────
  // 4. NAVIGATION TABS
  // ──────────────────────────────────────────────────────────────────
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Brand logo click → go to Dashboard
  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('dashboard');
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. CANVAS & IMAGE LOADING
  // ──────────────────────────────────────────────────────────────────
  let activeImageObj = null;
  let activeDiagnosis = null;
  let isHeatmapActive = false;

  function loadImageToCanvas(src) {
    scanOverlay.classList.add('scanning');
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      activeImageObj = img;
      leafCanvas.width = img.width;
      leafCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Perform Analysis after 700ms scanning delay for user visual effect
      setTimeout(() => {
        scanOverlay.classList.remove('scanning');
        runDiseaseAnalysis();
      }, 700);
    };
    img.src = src;
  }

  // Handle Preset Chip Selection (from BOTH Dashboard & Diagnostics tabs)
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.style.borderColor = 'var(--border-color)');
      chip.style.borderColor = 'var(--emerald-primary)';
      const presetSrc = chip.dataset.src;

      // If we're not already on the diagnostics tab, switch to it
      if (state.activeTab !== 'diagnostics') {
        switchTab('diagnostics');
      }

      loadImageToCanvas(presetSrc);
    });
  });

  // Handle Drag & Drop / File Input
  dropzone.addEventListener('click', () => imageInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => loadImageToCanvas(evt.target.result);
      reader.readAsDataURL(file);
    }
  });

  imageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => loadImageToCanvas(evt.target.result);
      reader.readAsDataURL(file);
    }
  });

  // Heatmap Overlay Toggle Button
  toggleHeatmapBtn.addEventListener('click', () => {
    if (!activeDiagnosis || !activeImageObj) return;
    isHeatmapActive = !isHeatmapActive;

    if (isHeatmapActive && activeDiagnosis.heatmapData) {
      ctx.putImageData(activeDiagnosis.heatmapData, 0, 0);
      toggleHeatmapBtn.innerHTML = '<i class="fas fa-leaf"></i> Original View';
    } else {
      ctx.drawImage(activeImageObj, 0, 0);
      toggleHeatmapBtn.innerHTML = '<i class="fas fa-layer-group"></i> Heatmap Overlay';
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // 6. DISEASE ANALYSIS ENGINE & CLOUD DB SAVE
  // ──────────────────────────────────────────────────────────────────
  async function runDiseaseAnalysis() {
    if (!window.DiseaseEngine) return;
    activeDiagnosis = window.DiseaseEngine.analyzeCanvas(leafCanvas, ctx);
    state.currentDiagnosis = activeDiagnosis;

    // Populate Diagnostic UI
    const prof = activeDiagnosis.profile;
    diseaseNameEl.textContent = prof.name;
    diseasePathogenEl.textContent = `${prof.crop} • ${prof.pathogen}`;
    if (diseaseCategoryEl) diseaseCategoryEl.textContent = prof.category;

    severityBadgeEl.textContent = activeDiagnosis.severity;
    severityBadgeEl.className = `severity-badge severity-${activeDiagnosis.severity.toLowerCase()}`;

    confidenceValEl.textContent = `${activeDiagnosis.confidence}% Match`;
    confidenceBarEl.style.width = `${activeDiagnosis.confidence}%`;

    // Render Symptoms
    symptomListEl.innerHTML = prof.symptoms.map(s => `<li><i class="fas fa-check-circle" style="color:var(--emerald-primary); margin-right:6px;"></i>${s}</li>`).join('');

    chemicalTreatmentEl.textContent = prof.chemicalTreatment;
    organicTreatmentEl.textContent = prof.organicTreatment;
    fertilizerActionEl.textContent = prof.fertilizerAction;

    // Persist scan to Cloud Database
    if (db) {
      await db.saveDocument('diagnostic_scans', {
        diseaseName: prof.name,
        crop: prof.crop,
        pathogen: prof.pathogen,
        severity: activeDiagnosis.severity,
        confidence: activeDiagnosis.confidence,
        chemicalTreatment: prof.chemicalTreatment,
        organicTreatment: prof.organicTreatment
      });
    }

    // Log diagnostic action automatically
    await logAction('Cloud Scan Diagnostic', `Detected ${prof.name} (${activeDiagnosis.severity} Severity)`);

    // Recalculate Fertilizer Lab with disease context
    updateFertilizerLab();
  }

  // ──────────────────────────────────────────────────────────────────
  // 7. WATER STRESS & SOIL TELEMETRY
  // ──────────────────────────────────────────────────────────────────
  async function updateTelemetryUI() {
    if (!window.TelemetryEngine) return;
    const inputs = {
      crop: cropSelect.value,
      moisture: parseFloat(moistureRange.value),
      ph: parseFloat(phRange.value),
      temp: parseFloat(tempRange.value),
      humidity: parseFloat(humidityRange.value)
    };

    moistureVal.textContent = `${inputs.moisture}%`;
    phVal.textContent = inputs.ph.toFixed(1);
    tempVal.textContent = `${inputs.temp}°C`;
    humidityVal.textContent = `${inputs.humidity}%`;

    const res = window.TelemetryEngine.evaluateTelemetry(inputs);
    state.currentTelemetry = res;

    waterStatusEl.textContent = res.waterStatus;
    waterStatusEl.className = `severity-badge ${res.colorClass}`;
    waterActionEl.textContent = res.waterAction;

    phStatusEl.textContent = res.phStatus;
    if (res.phWarning) {
      phWarningEl.style.display = 'block';
      phWarningEl.textContent = res.phWarning;
    } else {
      phWarningEl.style.display = 'none';
    }

    fungalRiskPercentEl.textContent = `${res.fungalRiskPercent}%`;
    fungalRiskLevelEl.textContent = res.fungalRiskLevel;

    // Update SVG Stress Gauge (stroke-dashoffset range 0-283)
    const offset = 283 - (res.stressIndex / 100) * 283;
    gaugeMeterPath.style.strokeDashoffset = offset;
    gaugeMeterPath.style.stroke = res.stressIndex > 75 || res.stressIndex < 25 ? '#f43f5e' : (res.stressIndex > 60 || res.stressIndex < 40 ? '#f59e0b' : '#10b981');

    // Save telemetry log to Cloud DB
    if (db) {
      await db.saveDocument('telemetry_logs', {
        crop: inputs.crop,
        moisture: inputs.moisture,
        ph: inputs.ph,
        waterStatus: res.waterStatus,
        fungalRiskPercent: res.fungalRiskPercent
      });
    }
  }

  [cropSelect, moistureRange, phRange, tempRange, humidityRange].forEach(el => {
    el.addEventListener('input', updateTelemetryUI);
  });

  // ──────────────────────────────────────────────────────────────────
  // 8. FERTILIZER LAB RECOMMENDATION ENGINE
  // ──────────────────────────────────────────────────────────────────
  async function updateFertilizerLab() {
    if (!window.FertilizerCalculator) return;
    const params = {
      crop: cropSelect.value,
      fieldArea: parseFloat(fertAreaInput.value) || 1.0,
      areaUnit: fertUnitSelect.value,
      diseaseContext: state.currentDiagnosis ? state.currentDiagnosis.profile : null
    };

    const res = window.FertilizerCalculator.calculateIngredients(params);

    fertNoteEl.textContent = res.note;
    organicCompostEl.textContent = `${res.organicOption.quantityTonnes} Tonnes ${res.organicOption.name} - ${res.organicOption.description}`;

    fertGrid.innerHTML = res.ingredients.map(ing => `
      <div class="fert-card">
        <span class="fert-symbol">${ing.symbol}</span>
        <div class="fert-name">${ing.name}</div>
        <div class="fert-formula">${ing.formula}</div>
        <div>
          <span class="fert-dose">${ing.dosageKg}</span> <span class="fert-unit">kg (${ing.bags50kg} bags)</span>
        </div>
        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.5rem;">${ing.application}</div>
      </div>
    `).join('');
  }

  fertAreaInput.addEventListener('input', updateFertilizerLab);
  fertUnitSelect.addEventListener('change', updateFertilizerLab);

  // ──────────────────────────────────────────────────────────────────
  // 9. DASHBOARD & MAINTENANCE LOG MANAGER
  // ──────────────────────────────────────────────────────────────────
  function renderPlotsTable() {
    plotsTableBody.innerHTML = state.plots.map(p => {
      const isLinked = state.linkedPlotId === p.id;
      return `
      <tr class="plot-row ${isLinked ? 'active-linked' : ''}" data-plot-id="${p.id}">
        <td style="font-weight:600;">
          <i class="fas fa-seedling" style="color:var(--emerald-primary); margin-right:8px;"></i>${p.name}
          ${isLinked ? '<span class="linked-badge"><i class="fas fa-link"></i> LINKED</span>' : ''}
        </td>
        <td>${p.crop}</td>
        <td>${p.area}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
              <div style="width:${p.health}%; height:100%; background:${p.health > 80 ? '#10b981' : (p.health > 60 ? '#f59e0b' : '#f43f5e')};"></div>
            </div>
            <span style="font-weight:700; font-size:0.85rem;">${p.health}%</span>
          </div>
        </td>
        <td><span class="severity-badge ${p.health > 80 ? 'severity-healthy' : 'severity-medium'}">${p.status}</span></td>
        <td style="color:var(--text-muted); font-size:0.82rem;">${p.lastScan}</td>
      </tr>`;
    }).join('');

    // Add click-to-link handlers on plot rows
    plotsTableBody.querySelectorAll('.plot-row').forEach(row => {
      row.addEventListener('click', () => {
        const plotId = row.dataset.plotId;
        if (globalFieldSelector) globalFieldSelector.value = plotId;
        setGlobalField(plotId);
      });
    });
  }

  function renderHistoryLogs() {
    historyLogsBody.innerHTML = state.logs.map(l => `
      <tr>
        <td style="color:var(--text-muted); font-size:0.82rem; white-space:nowrap;">${l.date}</td>
        <td style="font-weight:600;">${l.plot}</td>
        <td><span class="severity-badge severity-low">${l.event}</span></td>
        <td style="font-size:0.85rem;">${l.action}</td>
      </tr>
    `).join('');
  }

  async function logAction(event, action) {
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const newLog = {
      date: dateStr,
      plot: state.plots[0] ? state.plots[0].name : 'Main Farm Field',
      event,
      action
    };
    state.logs.unshift(newLog);

    if (db) {
      await db.saveDocument('action_logs', newLog);
    }
    renderHistoryLogs();
    updateCloudStatusBadge();
  }

  addPlotBtn.addEventListener('click', async () => {
    const name = prompt('Enter new field/plot name:', 'West Soybean Field #3');
    if (!name) return;
    const crop = prompt('Enter crop type:', 'Soybean') || 'General Crop';
    const area = prompt('Enter area (e.g. 2.5 Acres):', '2.5 Acres') || '2.0 Acres';

    const newPlot = {
      name,
      crop,
      area,
      health: 92,
      status: 'Optimal',
      lastScan: new Date().toISOString().substring(0, 10)
    };

    if (db) {
      const saved = await db.saveDocument('farm_plots', newPlot);
      state.plots.unshift(saved);
    } else {
      state.plots.unshift(newPlot);
    }

    // Refresh the global field selector so the new plot is immediately available
    populateGlobalFieldSelector();
    renderPlotsTable();
    await logAction('Cloud Field Added', `Registered new farm plot: ${name} (${area})`);
  });

  exportReportBtn.addEventListener('click', () => {
    window.print();
  });

  // Listen for Cloud Sync Events
  window.addEventListener('cloudDBSync', () => {
    updateCloudStatusBadge();
  });

  // ──────────────────────────────────────────────────────────────────
  // INITIAL EXECUTION
  // ──────────────────────────────────────────────────────────────────
  initTheme();
  await loadCloudData();
  updateTelemetryUI();

  // Load initial sample tomato image into canvas
  loadImageToCanvas('assets/sample-tomato-blight.png');
});
