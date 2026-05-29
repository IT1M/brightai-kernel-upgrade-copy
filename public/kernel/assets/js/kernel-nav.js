/**
 * BrightAI Kernel - Navigation Module
 * Handles top nav, bottom nav, mobile drawer, and routing
 */

(function (global) {
  'use strict';

  const KernelNav = {
    // Configuration
    config: {
      pages: [
        { id: 'home', href: '/kernel/', label: 'الرئيسية', icon: 'home', showInBottomNav: true },
        { id: 'chat', href: '/kernel/chat.html', label: 'المحادثة', icon: 'chat', showInBottomNav: true },
        { id: 'stats', href: '/kernel/stats.html', label: 'الإحصائيات', icon: 'stats', showInBottomNav: true },
        { id: 'approvals', href: '/kernel/approvals.html', label: 'الموافقات', icon: 'approvals', showInBottomNav: true, showPending: true },
        { id: 'audit', href: '/kernel/audit.html', label: 'التدقيق', icon: 'audit', showInBottomNav: true },
        { id: 'evidence', href: '/kernel/evidence.html', label: 'الأدلة', icon: 'evidence', isNew: true },
        { id: 'reports', href: '/kernel/reports.html', label: 'التقارير', icon: 'reports', isNew: true },
        { id: 'scenarios', href: '/kernel/scenarios.html', label: 'السيناريوهات', icon: 'scenarios' },
        { id: 'compliance', href: '/kernel/compliance.html', label: 'الامتثال', icon: 'compliance' },
        { id: 'policies', href: '/kernel/policies.html', label: 'السياسات', icon: 'policies' },
        { id: 'connectors', href: '/kernel/connectors.html', label: 'الموصلات', icon: 'connectors' },
      ],
      moreMenuThreshold: 5, // Show 'More' menu after this many items
      pendingCheckInterval: 30000, // Check pending approvals every 30s
    },

    // State
    state: {
      pendingCount: 0,
      isDrawerOpen: false,
      isMoreMenuOpen: false,
      currentPage: null,
    },

    // Icons SVG paths
    icons: {
      home: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
      chat: '<path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
      stats: '<path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>',
      approvals: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      audit: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
      evidence: '<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
      reports: '<path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>',
      scenarios: '<path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>',
      compliance: '<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
      policies: '<path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>',
      connectors: '<path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>',
      menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      close: '<path d="M6 18L18 6M6 6l12 12"/>',
      chevronDown: '<path d="M19 9l-7 7-7-7"/>',
      shield: '<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
    },

    /**
     * Initialize navigation
     */
    init() {
      this.detectCurrentPage();
      this.render();
      this.bindEvents();
      this.startPendingCheck();
    },

    /**
     * Detect current page from URL
     */
    detectCurrentPage() {
      const path = window.location.pathname;
      const page = this.config.pages.find((p) => {
        if (p.href === '/kernel/' || p.href === '/kernel/index.html') {
          return path === '/kernel/' || path === '/kernel/index.html' || path === '/kernel';
        }
        return path.includes(p.href);
      });
      this.state.currentPage = page ? page.id : 'home';
    },

    /**
     * Create SVG icon
     * @param {string} name - Icon name
     * @param {string} className - Optional class name
     * @returns {string} SVG HTML
     */
    createIcon(name, className = '') {
      const path = this.icons[name] || this.icons.home;
      return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    },

    /**
     * Render all navigation components
     */
    render() {
      this.renderTopNav();
      this.renderBottomNav();
      this.renderMobileDrawer();
    },

    /**
     * Render top navigation
     */
    renderTopNav() {
      const topNav = document.createElement('header');
      topNav.className = 'top-nav';
      topNav.id = 'top-nav';

      const mainPages = this.config.pages.slice(0, this.config.moreMenuThreshold);
      const morePages = this.config.pages.slice(this.config.moreMenuThreshold);

      topNav.innerHTML = `
        <div class="container">
          <a href="/kernel/" class="logo" aria-label="الرئيسية">
            ${this.createIcon('shield', 'logo-icon')}
            <span>نواة BrightAI</span>
          </a>
          
          <nav class="nav-links" aria-label="التنقل الرئيسي">
            ${mainPages.map((page) => this.renderNavLink(page)).join('')}
            ${morePages.length > 0 ? this.renderMoreMenu(morePages) : ''}
          </nav>

          <button class="hamburger-btn" id="hamburger-btn" aria-label="القائمة" aria-expanded="false">
            ${this.createIcon('menu')}
          </button>
        </div>
      `;

      // Insert at beginning of body
      document.body.insertBefore(topNav, document.body.firstChild);
    },

    /**
     * Render single nav link
     * @param {Object} page - Page config
     * @returns {string} HTML
     */
    renderNavLink(page) {
      const isActive = this.state.currentPage === page.id;
      return `
        <a href="${page.href}" 
           class="nav-link ${isActive ? 'active' : ''}"
           ${isActive ? 'aria-current="page"' : ''}>
          ${page.label}
          ${page.isNew ? '<span class="badge badge-new">جديد</span>' : ''}
          ${page.showPending ? `<span class="pending-badge" id="pending-badge-top" style="display: none;">0</span>` : ''}
        </a>
      `;
    },

    /**
     * Render more menu dropdown
     * @param {Array} pages - Pages for dropdown
     * @returns {string} HTML
     */
    renderMoreMenu(pages) {
      return `
        <div class="nav-more" id="nav-more">
          <button class="nav-more-btn" id="nav-more-btn" aria-expanded="false" aria-haspopup="true">
            المزيد
            ${this.createIcon('chevronDown')}
          </button>
          <div class="nav-dropdown" id="nav-dropdown" role="menu">
            ${pages
              .map(
                (page) => `
              <a href="${page.href}" class="nav-dropdown-item" role="menuitem">
                ${this.createIcon(page.icon)}
                ${page.label}
                ${page.isNew ? '<span class="badge badge-new">جديد</span>' : ''}
              </a>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    },

    /**
     * Render bottom navigation for mobile
     */
    renderBottomNav() {
      const bottomNavPages = this.config.pages.filter((p) => p.showInBottomNav);

      const bottomNav = document.createElement('nav');
      bottomNav.className = 'bottom-nav';
      bottomNav.id = 'bottom-nav';
      bottomNav.setAttribute('aria-label', 'التنقل السفلي');

      bottomNav.innerHTML = `
        <div class="bottom-nav-inner">
          ${bottomNavPages
            .map((page) => {
              const isActive = this.state.currentPage === page.id;
              return `
              <a href="${page.href}" 
                 class="bottom-nav-item ${isActive ? 'active' : ''}"
                 ${isActive ? 'aria-current="page"' : ''}>
                ${this.createIcon(page.icon)}
                <span>${page.label}</span>
                ${page.showPending ? '<span class="pending-dot" id="pending-dot-bottom" style="display: none;"></span>' : ''}
              </a>
            `;
            })
            .join('')}
        </div>
      `;

      document.body.appendChild(bottomNav);
    },

    /**
     * Render mobile drawer
     */
    renderMobileDrawer() {
      // Backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      backdrop.id = 'drawer-backdrop';
      document.body.appendChild(backdrop);

      // Drawer
      const drawer = document.createElement('aside');
      drawer.className = 'mobile-drawer';
      drawer.id = 'mobile-drawer';
      drawer.setAttribute('aria-label', 'قائمة التنقل');

      drawer.innerHTML = `
        <div class="drawer-header">
          <a href="/kernel/" class="logo">
            ${this.createIcon('shield', 'logo-icon')}
            <span>نواة BrightAI</span>
          </a>
          <button class="drawer-close" id="drawer-close" aria-label="إغلاق القائمة">
            ${this.createIcon('close')}
          </button>
        </div>
        <nav class="drawer-nav">
          ${this.config.pages
            .map((page) => {
              const isActive = this.state.currentPage === page.id;
              return `
              <a href="${page.href}" 
                 class="drawer-link ${isActive ? 'active' : ''}">
                ${this.createIcon(page.icon)}
                ${page.label}
                ${page.isNew ? '<span class="badge badge-new">جديد</span>' : ''}
              </a>
            `;
            })
            .join('')}
        </nav>
      `;

      document.body.appendChild(drawer);
    },

    /**
     * Bind all event listeners
     */
    bindEvents() {
      // Hamburger button
      const hamburgerBtn = document.getElementById('hamburger-btn');
      if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => this.toggleDrawer());
      }

      // Drawer close button
      const drawerClose = document.getElementById('drawer-close');
      if (drawerClose) {
        drawerClose.addEventListener('click', () => this.closeDrawer());
      }

      // Backdrop click
      const backdrop = document.getElementById('drawer-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => this.closeDrawer());
      }

      // More menu
      const moreBtn = document.getElementById('nav-more-btn');
      if (moreBtn) {
        moreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleMoreMenu();
        });
      }

      // Close more menu on outside click
      document.addEventListener('click', (e) => {
        const moreMenu = document.getElementById('nav-more');
        if (moreMenu && !moreMenu.contains(e.target)) {
          this.closeMoreMenu();
        }
      });

      // ESC key to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeDrawer();
          this.closeMoreMenu();
        }
      });

      // Handle resize
      const mediaQuery = window.matchMedia('(min-width: 768px)');
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.closeDrawer();
        }
      });
    },

    /**
     * Toggle mobile drawer
     */
    toggleDrawer() {
      this.state.isDrawerOpen = !this.state.isDrawerOpen;
      const drawer = document.getElementById('mobile-drawer');
      const backdrop = document.getElementById('drawer-backdrop');
      const hamburgerBtn = document.getElementById('hamburger-btn');

      if (drawer) drawer.classList.toggle('open', this.state.isDrawerOpen);
      if (backdrop) backdrop.classList.toggle('open', this.state.isDrawerOpen);
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', this.state.isDrawerOpen);

      // Prevent body scroll when drawer is open
      document.body.style.overflow = this.state.isDrawerOpen ? 'hidden' : '';
    },

    /**
     * Close mobile drawer
     */
    closeDrawer() {
      if (!this.state.isDrawerOpen) return;
      this.state.isDrawerOpen = false;
      
      const drawer = document.getElementById('mobile-drawer');
      const backdrop = document.getElementById('drawer-backdrop');
      const hamburgerBtn = document.getElementById('hamburger-btn');

      if (drawer) drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    },

    /**
     * Toggle more menu
     */
    toggleMoreMenu() {
      this.state.isMoreMenuOpen = !this.state.isMoreMenuOpen;
      const moreContainer = document.getElementById('nav-more');
      const moreBtn = document.getElementById('nav-more-btn');

      if (moreContainer) moreContainer.classList.toggle('open', this.state.isMoreMenuOpen);
      if (moreBtn) moreBtn.setAttribute('aria-expanded', this.state.isMoreMenuOpen);
    },

    /**
     * Close more menu
     */
    closeMoreMenu() {
      if (!this.state.isMoreMenuOpen) return;
      this.state.isMoreMenuOpen = false;
      
      const moreContainer = document.getElementById('nav-more');
      const moreBtn = document.getElementById('nav-more-btn');

      if (moreContainer) moreContainer.classList.remove('open');
      if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
    },

    /**
     * Start checking for pending approvals
     */
    startPendingCheck() {
      this.checkPendingCount();
      setInterval(() => this.checkPendingCount(), this.config.pendingCheckInterval);
    },

    /**
     * Check pending approvals count
     */
    async checkPendingCount() {
      try {
        const response = await fetch('/api/kernel/approvals');
        if (!response.ok) return;
        
        const data = await response.json();
        const count = data.summary?.totalPending || 0;
        this.updatePendingBadge(count);
      } catch (error) {
        // Silently fail - not critical
      }
    },

    /**
     * Update pending badges
     * @param {number} count - Pending count
     */
    updatePendingBadge(count) {
      this.state.pendingCount = count;

      // Top nav badge
      const topBadge = document.getElementById('pending-badge-top');
      if (topBadge) {
        topBadge.textContent = count;
        topBadge.style.display = count > 0 ? 'flex' : 'none';
        topBadge.classList.toggle('pulse', count > 0);
      }

      // Bottom nav dot
      const bottomDot = document.getElementById('pending-dot-bottom');
      if (bottomDot) {
        bottomDot.style.display = count > 0 ? 'block' : 'none';
        bottomDot.classList.toggle('pulse', count > 0);
      }
    },
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KernelNav.init());
  } else {
    KernelNav.init();
  }

  // Export to global scope
  global.KernelNav = KernelNav;

})(typeof window !== 'undefined' ? window : this);
