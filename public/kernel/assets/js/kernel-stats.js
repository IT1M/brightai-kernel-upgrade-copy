/**
 * BrightAI Kernel - Statistics Module
 * Handles charts, metrics visualization, and real-time stats updates
 */

(function (global) {
  'use strict';

  const KernelStats = {
    // Configuration
    config: {
      refreshInterval: 30000, // 30 seconds
      animationDuration: 600,
      colors: {
        brand: '#00D4FF',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#8B5CF6',
        muted: '#64748B',
      },
      riskLevels: [
        { key: 'critical', label: 'حرج', color: '#EF4444' },
        { key: 'high', label: 'مرتفع', color: '#F97316' },
        { key: 'medium', label: 'متوسط', color: '#F59E0B' },
        { key: 'low', label: 'منخفض', color: '#22C55E' },
        { key: 'minimal', label: 'ضئيل', color: '#10B981' },
      ],
      statusTypes: [
        { key: 'pending', label: 'بانتظار المراجعة', color: 'rgba(245, 158, 11, 0.85)' },
        { key: 'approved', label: 'تمت الموافقة', color: 'rgba(0, 212, 255, 0.85)' },
        { key: 'executed', label: 'قيد التنفيذ', color: 'rgba(167, 139, 250, 0.85)' },
        { key: 'completed', label: 'مكتملة', color: 'rgba(16, 185, 129, 0.85)' },
        { key: 'rejected', label: 'مرفوضة', color: 'rgba(239, 68, 68, 0.85)' },
      ],
    },

    // State
    state: {
      refreshTimer: null,
      currentData: null,
      isLoading: false,
    },

    /**
     * Initialize statistics module
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
      this.config = { ...this.config, ...options };
      this.loadStats();
      this.startAutoRefresh();
    },

    /**
     * Start auto refresh timer
     */
    startAutoRefresh() {
      if (this.state.refreshTimer) {
        clearInterval(this.state.refreshTimer);
      }
      this.state.refreshTimer = setInterval(() => {
        this.loadStats();
      }, this.config.refreshInterval);
    },

    /**
     * Stop auto refresh
     */
    stopAutoRefresh() {
      if (this.state.refreshTimer) {
        clearInterval(this.state.refreshTimer);
        this.state.refreshTimer = null;
      }
    },

    /**
     * Load statistics from API
     */
    async loadStats() {
      if (this.state.isLoading) return;
      this.state.isLoading = true;

      try {
        const response = await fetch('/api/kernel/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const data = await response.json();
        this.state.currentData = data;
        this.renderStats(data);
      } catch (error) {
        console.log('[v0] Stats fetch failed, using demo data:', error);
        const demoData = this.generateDemoData();
        this.state.currentData = demoData;
        this.renderStats(demoData);
      } finally {
        this.state.isLoading = false;
        this.updateLastRefreshTime();
      }
    },

    /**
     * Generate demo data for offline mode
     * @returns {Object} Demo statistics
     */
    generateDemoData() {
      return {
        requests: {
          total: 247,
          pending: 12,
          approved: 8,
          executed: 5,
          completed: 198,
          rejected: 24,
        },
        provider: {
          averageLatency: 850,
          successRate: 98.5,
        },
        piiDetectionRate: 24,
        riskDistribution: {
          critical: 7,
          high: 19,
          medium: 63,
          low: 112,
          minimal: 46,
        },
        trends: {
          requestsChange: 12.5,
          riskChange: -3.2,
          complianceChange: 2.1,
        },
      };
    },

    /**
     * Render all statistics
     * @param {Object} data - Statistics data
     */
    renderStats(data) {
      if (typeof this.onDataUpdate === 'function') {
        this.onDataUpdate(data);
      }
    },

    /**
     * Update last refresh time display
     */
    updateLastRefreshTime() {
      const el = document.getElementById('last-update');
      if (el) {
        el.textContent = new Date().toLocaleTimeString('ar-SA');
      }
    },

    /**
     * Calculate average risk score from distribution
     * @param {Object} distribution - Risk distribution object
     * @returns {number} Average risk percentage
     */
    calculateAverageRisk(distribution) {
      const weights = { critical: 100, high: 75, medium: 50, low: 25, minimal: 10 };
      let total = 0;
      let weighted = 0;

      for (const [level, count] of Object.entries(distribution)) {
        const c = count || 0;
        total += c;
        weighted += c * (weights[level] || 0);
      }

      return total > 0 ? Math.round(weighted / total) : 0;
    },

    /**
     * Render SVG donut chart
     * @param {string} containerId - Container element ID
     * @param {Object} data - Chart data
     * @param {Object} options - Chart options
     */
    renderDonutChart(containerId, data, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const {
        size = 200,
        outerRadius = 85,
        innerRadius = 58,
        strokeWidth = 2,
        strokeColor = '#0B1628',
      } = options;

      const cx = size / 2;
      const cy = size / 2;

      // Filter and prepare data
      const chartData = Object.entries(data)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => {
          const config = this.config.statusTypes.find(s => s.key === key) || {};
          return {
            key,
            value,
            label: config.label || key,
            color: config.color || this.config.colors.muted,
          };
        });

      const total = chartData.reduce((sum, d) => sum + d.value, 0) || 1;

      // Generate paths
      let cumulativeAngle = -90;
      const paths = chartData.map(d => {
        const angle = (d.value / total) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + angle;
        cumulativeAngle = endAngle;

        const path = this.describeArc(cx, cy, outerRadius, innerRadius, startAngle, endAngle);
        return `<path d="${path}" fill="${d.color}" stroke="${strokeColor}" stroke-width="${strokeWidth}">
          <title>${d.label}: ${d.value}</title>
        </path>`;
      }).join('');

      // Center text
      const centerText = `
        <text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="#F8FAFC" font-size="24" font-weight="700" font-family="'IBM Plex Sans Arabic', sans-serif">${this.formatNumber(total)}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#64748B" font-size="11" font-family="'IBM Plex Sans Arabic', sans-serif">إجمالي</text>
      `;

      // Legend
      const legendItems = chartData.map(d => `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${d.color}"></span>
          <span style="color:#94A3B8;font-size:11px;">${d.label} (${d.value})</span>
        </div>
      `).join('');

      container.innerHTML = `
        <div style="display:flex;align-items:center;gap:24px;justify-content:center;height:100%;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            ${paths}
            ${centerText}
          </svg>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${legendItems}
          </div>
        </div>
      `;
    },

    /**
     * Render horizontal bar chart for risk distribution
     * @param {string} containerId - Container element ID
     * @param {Object} data - Risk distribution data
     */
    renderRiskBars(containerId, data) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const total = Object.values(data).reduce((sum, v) => sum + (v || 0), 0) || 1;

      const bars = this.config.riskLevels.map(({ key, label, color }) => {
        const count = data[key] || 0;
        const percent = (count / total) * 100;
        
        return `
          <div class="risk-bar-item">
            <div class="risk-bar-label">${label}</div>
            <div class="risk-bar-track">
              <div class="risk-bar-fill" data-level="${key}" style="width: ${percent}%; background: ${color};">
                ${percent > 15 ? Math.round(percent) + '%' : ''}
              </div>
            </div>
            <div class="risk-bar-count">${this.formatNumber(count)}</div>
          </div>
        `;
      }).join('');

      container.innerHTML = bars;

      // Animate bars
      setTimeout(() => {
        container.querySelectorAll('.risk-bar-fill').forEach(bar => {
          bar.style.transition = `width ${this.config.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        });
      }, 50);
    },

    /**
     * Describe SVG arc path for donut segment
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} outerR - Outer radius
     * @param {number} innerR - Inner radius
     * @param {number} startAngle - Start angle in degrees
     * @param {number} endAngle - End angle in degrees
     * @returns {string} SVG path description
     */
    describeArc(cx, cy, outerR, innerR, startAngle, endAngle) {
      const startOuter = this.polarToCartesian(cx, cy, outerR, startAngle);
      const endOuter = this.polarToCartesian(cx, cy, outerR, endAngle);
      const startInner = this.polarToCartesian(cx, cy, innerR, endAngle);
      const endInner = this.polarToCartesian(cx, cy, innerR, startAngle);

      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

      return [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
        `L ${startInner.x} ${startInner.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
        'Z',
      ].join(' ');
    },

    /**
     * Convert polar coordinates to Cartesian
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} r - Radius
     * @param {number} angle - Angle in degrees
     * @returns {Object} {x, y} coordinates
     */
    polarToCartesian(cx, cy, r, angle) {
      const rad = (angle - 90) * Math.PI / 180;
      return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
      };
    },

    /**
     * Animate number counting
     * @param {HTMLElement} element - Target element
     * @param {number} end - End value
     * @param {Object} options - Animation options
     */
    animateNumber(element, end, options = {}) {
      if (!element) return;

      const {
        start = 0,
        duration = this.config.animationDuration,
        suffix = '',
        formatter = this.formatNumber.bind(this),
      } = options;

      const startTime = performance.now();
      const diff = end - start;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + diff * easeOut);

        element.textContent = formatter(current) + suffix;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    },

    /**
     * Format number with Arabic locale
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber(num) {
      return new Intl.NumberFormat('ar-SA').format(num);
    },

    /**
     * Format percentage
     * @param {number} num - Number to format
     * @returns {string} Formatted percentage
     */
    formatPercent(num) {
      return `${Math.round(num)}%`;
    },

    /**
     * Create trend indicator
     * @param {number} value - Change value
     * @returns {string} HTML for trend indicator
     */
    createTrendIndicator(value) {
      const isPositive = value >= 0;
      const color = isPositive ? this.config.colors.success : this.config.colors.danger;
      const arrow = isPositive ? '↑' : '↓';
      
      return `
        <span class="trend-indicator" style="color: ${color};">
          ${arrow} ${Math.abs(value).toFixed(1)}%
        </span>
      `;
    },

    /**
     * Generate sparkline SVG
     * @param {Array<number>} data - Data points
     * @param {Object} options - Sparkline options
     * @returns {string} SVG HTML
     */
    createSparkline(data, options = {}) {
      const {
        width = 100,
        height = 30,
        color = this.config.colors.brand,
        fill = true,
      } = options;

      if (!data || data.length < 2) return '';

      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;

      const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      }).join(' ');

      const fillPath = fill ? `
        <polygon 
          points="0,${height} ${points} ${width},${height}" 
          fill="url(#sparkline-gradient)" 
          opacity="0.3"
        />
      ` : '';

      return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${fillPath}
          <polyline 
            points="${points}" 
            fill="none" 
            stroke="${color}" 
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      `;
    },

    /**
     * Cleanup and destroy
     */
    destroy() {
      this.stopAutoRefresh();
      this.state.currentData = null;
    },
  };

  // Export to global scope
  global.KernelStats = KernelStats;

})(typeof window !== 'undefined' ? window : this);
