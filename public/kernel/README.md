# BrightAI Kernel - Frontend Architecture

## 📁 Project Structure

```
public/kernel/
├── index.html              # Landing page
├── chat.html              # Main chat interface
├── stats.html             # Statistics dashboard
├── approvals.html         # Governance approvals board
├── audit.html             # Audit chain viewer
├── manifest.json          # PWA manifest
├── css/
│   ├── globals.css        # Global CSS (from app/)
│   └── theme.css          # Theme variables and utilities
└── js/
    ├── api-client.js      # HTTP client wrapper
    ├── chat-ui.js         # Chat UI logic
    ├── pii-detection.js   # PII detection engine
    ├── governance-pipeline.js  # Risk assessment & compliance rules
    ├── provider-gateway.js     # LLM provider management
    ├── audit-chain.js     # Audit chain with SHA-256 hashing
    └── in-memory-storage.js    # Request storage & stats
```

## 🎯 Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **No frameworks**: No React, Vue, Angular - all vanilla JS
- **Storage**: In-memory (browser session)
- **Theme**: Dark glassmorphism with Arabic RTL support
- **Architecture**: Modular with window namespace exports

## 🔧 Modules

### Core Governance Modules (JavaScript)

1. **pii-detection.js** - Detects 13+ PII patterns
   - Saudi National IDs, VAT, Employee IDs
   - Arabic names, emails, phone numbers
   - Financial data, medical records
   - Exports: `window.PiiDetection`

2. **governance-pipeline.js** - 13 compliance rules
   - Risk assessment with 5 factors
   - Rule matching based on risk score
   - Risk levels: critical, high, medium, low, minimal
   - Exports: `window.GovernancePipeline`

3. **provider-gateway.js** - LLM provider selection
   - NVIDIA MiniMax M2.7 (primary)
   - Google Gemini (fallback)
   - Demo Mode (always available)
   - Exponential backoff with retry logic
   - Exports: `window.ProviderGateway`

4. **audit-chain.js** - Tamper-proof logging
   - SHA-256 hash chain linking
   - Entry signatures and verification
   - Export/import as JSON
   - Exports: `window.AuditChain`

5. **in-memory-storage.js** - Request management
   - Governance request CRUD
   - Status tracking & filtering
   - Statistics calculation
   - Exports: `window.InMemoryStorage`

### UI Modules

6. **api-client.js** - HTTP wrapper
   - Unified API endpoint calls
   - Timeout handling
   - Error management

7. **chat-ui.js** - Chat interface logic
   - Message formatting
   - Typewriter effects
   - Message timestamps
   - Copy-to-clipboard functionality

## 🎨 Design System

**Colors**:
- Primary: #0a0e27 (Dark Navy)
- Accent: #00d9ff (Cyan)
- Secondary: #7c3aed (Purple)
- Danger: #dc2626 (Red)
- Text: #f1f5f9 (Light Slate)

**Typography**:
- Font: IBM Plex Sans / IBM Plex Sans Arabic
- RTL support: Full Arabic language support
- Mobile: 16px minimum font size for inputs

**Components**:
- Buttons: Primary, Secondary, Ghost, Danger
- Badges: Critical, High, Medium, Low, Info
- Cards: Glass, Glass Accent, Glass Dark
- Animations: Fade, Slide Up, Typewriter, Pulse

## 🚀 Usage

All modules are exported to `window` namespace for browser access:

```javascript
// PII Detection
const result = window.PiiDetection.detectPii("contact: john@example.com");

// Risk Assessment
const risk = window.GovernancePipeline.assessRisk(0.8, 0.6, 0.5);

// Provider Gateway
const response = await window.ProviderGateway.getGateway().callWithFallback(query, context);

// Audit Chain
const chain = window.AuditChain.getAuditChain();
await chain.addEntry('action', 'actor', 'requestId', {});

// Storage
const storage = window.InMemoryStorage.getStorage();
storage.saveRequest(request);
```

## 📱 Mobile Support

- Responsive design at 480px, 768px breakpoints
- 44px minimum touch targets
- Disabled zoom with `user-scalable=no`
- Font-size adjustments for input fields
- Bottom navigation for mobile
- Prefers-reduced-motion support

## 🔌 API Endpoints

Frontend communicates with backend APIs:

- `/api/chat` - Submit queries
- `/api/health` - System status
- `/api/stats` - Request statistics
- `/api/audit` - Audit logs
- `/api/approvals` - Pending approvals
- `/api/evidence` - PII detection evidence
- `/api/chain` - Audit chain verification

## 📦 Build & Deploy

Currently static HTML files. To integrate with backend:

1. Keep all files in `public/kernel/`
2. API routes remain in `app/api/` (Next.js backend)
3. Landing page redirects to `/kernel/index.html`
4. Deploy as static site with API proxy

## 🔐 Security Notes

- All PII masking happens in browser before API submission
- No API keys stored in browser
- Audit chain verifies message integrity
- Salt hashing for signatures (demo mode)
- HTTPS recommended for production

## 🌍 Internationalization

- Full RTL support for Arabic
- Set `lang="ar"` on HTML tag
- All UI text strings are hardcoded (TODO: i18n system)
- Font loads Arabic variant automatically
