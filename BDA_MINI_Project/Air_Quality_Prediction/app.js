// ===== API Base URL =====
const API_URL = 'http://localhost:5000/api';

// ===== State Management =====
let currentPage = 1;
let totalPages = 1;
let statusCheckInterval = null;
let hourlyChart = null;
let categoryChart = null;
let zoneComparisonChart = null;

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initRunAnalysis();
    initFilters();
    checkInitialStatus();
});

// ===== Navigation =====
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.section');
    const pageTitle = document.getElementById('pageTitle');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const sectionId = this.dataset.section;
            switchToSection(sectionId);
            
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    menuToggle?.addEventListener('click', () => sidebar.classList.toggle('active'));
}

function switchToSection(sectionId) {
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.section');
    const pageTitle = document.getElementById('pageTitle');
    
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
    
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');
    
    const titles = {
        'dashboard': 'Run Analysis',
        'results': 'Results',
        'predictions': 'Predictions',
        'zones': 'Risk Zones',
        'about': 'About'
    };
    pageTitle.textContent = titles[sectionId] || sectionId;
}

// ===== Run Analysis =====
function initRunAnalysis() {
    const runBtn = document.getElementById('runAnalysisBtn');
    runBtn?.addEventListener('click', startAnalysis);
}

async function startAnalysis() {
    const runBtn = document.getElementById('runAnalysisBtn');
    const progressContainer = document.getElementById('progressContainer');
    const analysisStatus = document.getElementById('analysisStatus');
    
    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Starting...</span>';
    progressContainer.style.display = 'block';
    
    try {
        const response = await fetch(`${API_URL}/run-analysis`, { method: 'POST' });
        const data = await response.json();
        
        if (data.status === 'started' || data.status === 'already_running') {
            startStatusPolling();
            analysisStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> <span>Analysis is running...</span>';
            analysisStatus.className = 'analysis-status running';
        }
    } catch (error) {
        console.error('Error starting analysis:', error);
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fas fa-play"></i> <span>Run Analysis</span>';
        analysisStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Error: Could not connect to server. Make sure Flask is running.</span>';
        analysisStatus.className = 'analysis-status error';
        progressContainer.style.display = 'none';
    }
}

function startStatusPolling() {
    if (statusCheckInterval) clearInterval(statusCheckInterval);
    statusCheckInterval = setInterval(checkStatus, 1000);
}

async function checkStatus() {
    try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        
        updateProgress(data.progress, data.message);
        updateStages(data.progress);
        updateHeaderStatus(data.status);
        
        if (data.status === 'completed') {
            clearInterval(statusCheckInterval);
            onAnalysisComplete();
        } else if (data.status === 'error') {
            clearInterval(statusCheckInterval);
            onAnalysisError(data.message);
        }
    } catch (error) {
        console.error('Status check error:', error);
    }
}

async function checkInitialStatus() {
    try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        
        updateHeaderStatus(data.status);
        
        if (data.status === 'running') {
            document.getElementById('progressContainer').style.display = 'block';
            document.getElementById('runAnalysisBtn').disabled = true;
            document.getElementById('runAnalysisBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Running...</span>';
            startStatusPolling();
        } else if (data.status === 'completed') {
            loadAllResults();
        }
    } catch (error) {
        console.log('Server not running yet');
    }
}

function updateProgress(percent, message) {
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressMessage').textContent = message;
}

function updateStages(progress) {
    const stageThresholds = [15, 25, 45, 55, 70, 85, 95];
    stageThresholds.forEach((threshold, index) => {
        const stage = document.getElementById(`stage${index + 1}`);
        if (stage) {
            if (progress >= threshold) {
                stage.classList.add('completed');
                stage.classList.remove('active');
            } else if (progress >= threshold - 10) {
                stage.classList.add('active');
                stage.classList.remove('completed');
            }
        }
    });
}

function updateHeaderStatus(status) {
    const statusIndicator = document.getElementById('headerStatus');
    const sidebarStatus = document.getElementById('sidebarStatus');
    const dot = statusIndicator?.querySelector('.status-dot');
    const text = statusIndicator?.querySelector('.status-text');
    
    if (dot && text) {
        dot.className = 'status-dot ' + status;
        const statusTexts = {
            'idle': 'Ready',
            'running': 'Running...',
            'completed': 'Completed',
            'error': 'Error'
        };
        text.textContent = statusTexts[status] || status;
    }
    
    if (sidebarStatus) {
        if (status === 'completed') {
            sidebarStatus.textContent = '✓ Ready';
            sidebarStatus.style.color = '#38ef7d';
        } else if (status === 'running') {
            sidebarStatus.textContent = 'Running...';
            sidebarStatus.style.color = '#ffd93d';
        } else if (status === 'error') {
            sidebarStatus.textContent = 'Error';
            sidebarStatus.style.color = '#ff6b6b';
        }
    }
}

async function onAnalysisComplete() {
    const runBtn = document.getElementById('runAnalysisBtn');
    const analysisStatus = document.getElementById('analysisStatus');
    
    runBtn.disabled = false;
    runBtn.innerHTML = '<i class="fas fa-redo"></i> <span>Run Again</span>';
    analysisStatus.innerHTML = '<i class="fas fa-check-circle"></i> <span>Analysis completed! View results in other sections.</span>';
    analysisStatus.className = 'analysis-status success';
    
    await loadAllResults();
}

function onAnalysisError(message) {
    const runBtn = document.getElementById('runAnalysisBtn');
    const analysisStatus = document.getElementById('analysisStatus');
    const progressContainer = document.getElementById('progressContainer');
    
    runBtn.disabled = false;
    runBtn.innerHTML = '<i class="fas fa-play"></i> <span>Try Again</span>';
    analysisStatus.innerHTML = `<i class="fas fa-times-circle"></i> <span>${message}</span>`;
    analysisStatus.className = 'analysis-status error';
    progressContainer.style.display = 'none';
}

// ===== Load Results =====
async function loadAllResults() {
    try {
        const [metrics, summary, importance, hourly, categories, zones, pollutants] = await Promise.all([
            fetch(`${API_URL}/metrics`).then(r => r.json()),
            fetch(`${API_URL}/data-summary`).then(r => r.json()),
            fetch(`${API_URL}/feature-importance`).then(r => r.json()),
            fetch(`${API_URL}/hourly-pattern`).then(r => r.json()),
            fetch(`${API_URL}/category-distribution`).then(r => r.json()),
            fetch(`${API_URL}/zones`).then(r => r.json()),
            fetch(`${API_URL}/pollutant-stats`).then(r => r.json())
        ]);
        
        if (metrics && Object.keys(metrics).length > 0) {
            showResultsContent();
            updateStats(metrics, summary);
            updateFeatureImportance(importance);
            updateHourlyChart(hourly);
            updateCategoryChart(categories);
            updateAQIDisplay(summary, pollutants);
            updateZones(zones);
            loadPredictions();
        }
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

function showResultsContent() {
    document.getElementById('noResultsMessage')?.style.setProperty('display', 'none');
    document.getElementById('resultsContent')?.style.setProperty('display', 'block');
    document.getElementById('noPredictionsMessage')?.style.setProperty('display', 'none');
    document.getElementById('predictionsContent')?.style.setProperty('display', 'block');
    document.getElementById('noZonesMessage')?.style.setProperty('display', 'none');
    document.getElementById('zonesContent')?.style.setProperty('display', 'block');
}

function updateStats(metrics, summary) {
    document.getElementById('totalRecords').textContent = summary.total_records?.toLocaleString() || '-';
    document.getElementById('r2Score').textContent = metrics.accuracy_percent ? `${metrics.accuracy_percent}%` : '-';
    document.getElementById('rmseScore').textContent = metrics.rmse || '-';
    document.getElementById('featuresCount').textContent = summary.features_count || '-';
}

function updateFeatureImportance(importance) {
    const container = document.getElementById('featureBars');
    if (!container || !importance?.length) return;
    
    const maxImportance = importance[0]?.importance || 100;
    const colors = [
        'linear-gradient(90deg, #667eea, #764ba2)',
        'linear-gradient(90deg, #11998e, #38ef7d)',
        'linear-gradient(90deg, #fc4a1a, #f7b733)',
        'linear-gradient(90deg, #00c6ff, #0072ff)',
        'linear-gradient(90deg, #f953c6, #b91d73)',
        'linear-gradient(90deg, #a855f7, #6366f1)',
        'linear-gradient(90deg, #22c55e, #16a34a)',
        'linear-gradient(90deg, #f59e0b, #d97706)',
        'linear-gradient(90deg, #ef4444, #dc2626)',
        'linear-gradient(90deg, #06b6d4, #0891b2)'
    ];
    
    container.innerHTML = importance.slice(0, 10).map((item, index) => `
        <div class="feature-bar">
            <div class="feature-info">
                <span class="feature-name">${formatFeatureName(item.feature)}</span>
                <span class="feature-value">${item.importance.toFixed(2)}%</span>
            </div>
            <div class="bar-container">
                <div class="bar" style="width: ${(item.importance / maxImportance * 100)}%; background: ${colors[index % colors.length]};"></div>
            </div>
        </div>
    `).join('');
}

function formatFeatureName(name) {
    const nameMap = {
        'pm25': 'PM2.5',
        'pm10': 'PM10',
        'pm25_lag1': 'PM2.5 Lag (1hr)',
        'pm25_lag3': 'PM2.5 Lag (3hr)',
        'pm10_lag1': 'PM10 Lag (1hr)',
        'aqi_lag1': 'AQI Lag (1hr)',
        'pm25_rolling_avg': 'PM2.5 Rolling Avg',
        'temp_humidity_interaction': 'Temp × Humidity',
        'wind_pm25_interaction': 'Wind × PM2.5',
        'hour_sin': 'Hour (sin)',
        'hour_cos': 'Hour (cos)',
        'day_of_week': 'Day of Week',
        'no2': 'NO₂',
        'so2': 'SO₂',
        'o3': 'O₃',
        'co': 'CO',
        'temp': 'Temperature',
        'rh': 'Humidity',
        'wind': 'Wind Speed'
    };
    return nameMap[name] || name;
}

function updateHourlyChart(data) {
    const ctx = document.getElementById('hourlyChart');
    if (!ctx || !data?.length) return;
    
    if (hourlyChart) hourlyChart.destroy();
    
    const labels = data.map(d => `${String(d.hour).padStart(2, '0')}:00`);
    const values = data.map(d => d.avg_aqi);
    
    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Predicted AQI',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#6c757d', maxRotation: 45 } },
                y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#6c757d' } }
            }
        }
    });
}

function updateCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx || !data?.length) return;
    
    if (categoryChart) categoryChart.destroy();
    
    const colorMap = {
        'Good': '#00e400',
        'Moderate': '#ffd93d',
        'Unhealthy for Sensitive Groups': '#ff9f43',
        'Unhealthy': '#ff6b6b',
        'Very Unhealthy': '#a55eea',
        'Hazardous': '#7e0023'
    };
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.aqi_category),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: data.map(d => colorMap[d.aqi_category] || '#999'),
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 10 } }
                }
            }
        }
    });
}

function updateAQIDisplay(summary, pollutants) {
    const avgAqi = summary.avg_aqi || 0;
    document.getElementById('avgAqi').textContent = Math.round(avgAqi);
    
    let category = 'Good';
    let cardClass = 'good';
    if (avgAqi > 300) { category = 'Hazardous'; cardClass = 'hazardous'; }
    else if (avgAqi > 200) { category = 'Very Unhealthy'; cardClass = 'very-unhealthy'; }
    else if (avgAqi > 150) { category = 'Unhealthy'; cardClass = 'unhealthy'; }
    else if (avgAqi > 100) { category = 'Unhealthy for Sensitive Groups'; cardClass = 'sensitive'; }
    else if (avgAqi > 50) { category = 'Moderate'; cardClass = 'moderate'; }
    
    document.getElementById('aqiCategoryText').textContent = category;
    document.getElementById('aqiCard').className = 'aqi-card ' + cardClass;
    
    const pollutantGrid = document.getElementById('pollutantGrid');
    if (pollutantGrid && pollutants && Object.keys(pollutants).length > 0) {
        const icons = {
            pm25: 'fa-smog', pm10: 'fa-cloud', no2: 'fa-industry',
            co: 'fa-car', so2: 'fa-fire', o3: 'fa-sun'
        };
        const units = {
            pm25: 'μg/m³', pm10: 'μg/m³', no2: 'ppb',
            co: 'mg/m³', so2: 'ppb', o3: 'ppb'
        };
        const names = {
            pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂',
            co: 'CO', so2: 'SO₂', o3: 'O₃'
        };
        
        pollutantGrid.innerHTML = Object.entries(pollutants).map(([key, val]) => `
            <div class="pollutant-card">
                <div class="pollutant-icon"><i class="fas ${icons[key]}"></i></div>
                <div class="pollutant-name">${names[key]}</div>
                <div class="pollutant-value">${val.mean} <span>${units[key]}</span></div>
            </div>
        `).join('');
    }
}

function updateZones(zones) {
    const grid = document.getElementById('zonesGrid');
    if (!grid || !zones?.length) return;
    
    grid.innerHTML = zones.map(zone => {
        const riskClass = zone.risk_level?.toLowerCase() || 'moderate';
        return `
            <div class="zone-card" data-risk="${riskClass}">
                <div class="zone-header">
                    <h3><i class="fas fa-map-pin"></i> ${zone.zone?.replace('_', ' ')}</h3>
                    <span class="risk-badge ${riskClass}">${zone.risk_level}</span>
                </div>
                <div class="zone-stats">
                    <div class="zone-stat"><span class="label">Avg AQI</span><span class="value">${zone.avg_aqi || '-'}</span></div>
                    <div class="zone-stat"><span class="label">Max AQI</span><span class="value">${zone.max_aqi || '-'}</span></div>
                    <div class="zone-stat"><span class="label">Min AQI</span><span class="value">${zone.min_aqi || '-'}</span></div>
                    <div class="zone-stat"><span class="label">Records</span><span class="value">${zone.count?.toLocaleString() || '-'}</span></div>
                </div>
            </div>
        `;
    }).join('');
    
    updateZoneChart(zones);
}

function updateZoneChart(zones) {
    const ctx = document.getElementById('zoneComparisonChart');
    if (!ctx || !zones?.length) return;
    
    if (zoneComparisonChart) zoneComparisonChart.destroy();
    
    zoneComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: zones.map(z => z.zone?.replace('_', ' ')),
            datasets: [
                {
                    label: 'Avg AQI',
                    data: zones.map(z => z.avg_aqi),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderRadius: 8
                },
                {
                    label: 'Max AQI',
                    data: zones.map(z => z.max_aqi),
                    backgroundColor: 'rgba(252, 74, 26, 0.8)',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle' } } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(0,0,0,0.05)' } }
            }
        }
    });
}

// ===== Predictions Table =====
function initFilters() {
    document.getElementById('applyFilters')?.addEventListener('click', () => {
        currentPage = 1;
        loadPredictions();
    });
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; loadPredictions(); }
    });
    document.getElementById('nextPage')?.addEventListener('click', () => {
        if (currentPage < totalPages) { currentPage++; loadPredictions(); }
    });
}

async function loadPredictions() {
    const zone = document.getElementById('zoneFilter')?.value || 'all';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    
    try {
        const response = await fetch(`${API_URL}/predictions?page=${currentPage}&per_page=15&zone=${zone}&category=${category}`);
        const data = await response.json();
        
        totalPages = data.pages || 1;
        document.getElementById('pageInfo').textContent = `Page ${data.page} of ${totalPages}`;
        
        const tbody = document.getElementById('predictionsBody');
        if (!tbody) return;
        
        if (!data.data?.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No predictions available</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.map(row => {
            const catClass = getCategoryClass(row.aqi_category);
            return `
                <tr>
                    <td>${row.datetime || '-'}</td>
                    <td>${row.zone?.replace('_', ' ') || '-'}</td>
                    <td>${row.pm25 || '-'}</td>
                    <td>${row.pm10 || '-'}</td>
                    <td>${row.actual_aqi || '-'}</td>
                    <td>${row.predicted_aqi || '-'}</td>
                    <td>${row.error || '-'}</td>
                    <td><span class="category-badge ${catClass}">${row.aqi_category || '-'}</span></td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading predictions:', error);
    }
}

function getCategoryClass(category) {
    const classes = {
        'Good': 'good',
        'Moderate': 'moderate',
        'Unhealthy for Sensitive Groups': 'sensitive',
        'Unhealthy': 'unhealthy',
        'Very Unhealthy': 'very-unhealthy',
        'Hazardous': 'hazardous'
    };
    return classes[category] || 'moderate';
}

// ===== Add Dynamic Styles =====
const dynamicStyles = document.createElement('style');
dynamicStyles.textContent = `
    .category-badge {
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
    }
    .category-badge.good { background: rgba(0, 228, 0, 0.2); color: #00a000; }
    .category-badge.moderate { background: rgba(255, 217, 61, 0.3); color: #b8860b; }
    .category-badge.sensitive { background: rgba(255, 159, 67, 0.2); color: #cc6600; }
    .category-badge.unhealthy { background: rgba(255, 107, 107, 0.2); color: #cc0000; }
    .category-badge.very-unhealthy { background: rgba(165, 94, 234, 0.2); color: #7a2980; }
    .category-badge.hazardous { background: rgba(126, 0, 35, 0.2); color: #7e0023; }
    
    .risk-badge.minimal { background: rgba(0, 228, 0, 0.2); color: #00a000; }
    .risk-badge.low { background: rgba(255, 217, 61, 0.2); color: #b8860b; }
    .risk-badge.moderate { background: rgba(255, 159, 67, 0.2); color: #cc6600; }
    .risk-badge.high { background: rgba(255, 107, 107, 0.2); color: #cc0000; }
    .risk-badge.critical { background: rgba(126, 0, 35, 0.2); color: #7e0023; }
    
    .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: var(--gray-light);
        border-radius: 20px;
    }
    .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #6c757d;
    }
    .status-dot.idle { background: #6c757d; }
    .status-dot.running { background: #ffd93d; animation: pulse 1s infinite; }
    .status-dot.completed { background: #38ef7d; }
    .status-dot.error { background: #ff6b6b; }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    .aqi-card.good { background: linear-gradient(135deg, #00e400, #00a000); }
    .aqi-card.moderate { background: linear-gradient(135deg, #ffd93d, #f0c000); }
    .aqi-card.sensitive { background: linear-gradient(135deg, #ff9f43, #ff7e00); }
    .aqi-card.unhealthy { background: linear-gradient(135deg, #ff6b6b, #ff0000); }
    .aqi-card.very-unhealthy { background: linear-gradient(135deg, #a55eea, #8f3f97); }
    .aqi-card.hazardous { background: linear-gradient(135deg, #7e0023, #4a0015); }
`;
document.head.appendChild(dynamicStyles);
