# BrightAI Kernel - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn or pnpm

### Installation

```bash
# Install dependencies
npm install

# Or with pnpm
pnpm install

# Or with yarn
yarn install
```

### Development Server

```bash
# Start the dev server
npm run dev

# The server will be available at:
# - Main app: http://localhost:3000
# - Kernel interface: http://localhost:3000/kernel/index.html
# - Chat interface: http://localhost:3000/kernel/chat.html
```

### Access Points

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/kernel/index.html` | Hero and navigation |
| Chat | `/kernel/chat.html` | Safe AI conversation |
| Approvals | `/kernel/approvals.html` | Pending approvals dashboard |
| Statistics | `/kernel/stats.html` | System metrics |
| Audit Log | `/kernel/audit.html` | Governance audit trail |
| Evidence | `/kernel/evidence.html` | Compliance evidence reports |
| Compliance | `/kernel/compliance.html` | Policy framework matrix |
| Scenarios | `/kernel/scenarios.html` | Test different risk scenarios |

## 📋 API Endpoints

All endpoints are available at `http://localhost:3000/api/kernel/`

### 1. Health Check
```bash
curl http://localhost:3000/api/kernel/health
```
Returns system status, provider configuration, and audit chain validity.

### 2. Process Chat (Auto or Approval)
```bash
curl -X POST http://localhost:3000/api/kernel/chat \
  -H "Content-Type: application/json" \
  -H "x-kernel-user-id: user@company" \
  -H "x-kernel-user-name: أحمد" \
  -d '{
    "query": "مرحبا",
    "compliancePackage": "general"
  }'
```

**Low-risk queries** return immediately with AI response.
**High-risk queries** (with PII) return `pending_approval` status.

### 3. Get Pending Approvals
```bash
curl http://localhost:3000/api/kernel/approvals
```
Lists all pending high-risk requests awaiting approval.

### 4. Approve or Reject Request
```bash
# Approve (executes the request)
curl -X POST http://localhost:3000/api/kernel/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req_xxx",
    "action": "approve",
    "approver": "manager@company.sa"
  }'

# Reject (discards the request)
curl -X POST http://localhost:3000/api/kernel/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req_xxx",
    "action": "reject",
    "approver": "manager@company.sa",
    "reason": "Sensitive content"
  }'
```

### 5. Statistics
```bash
curl http://localhost:3000/api/kernel/stats
```
Returns: request counts, risk distribution, PII detection rate.

### 6. Audit Log
```bash
curl "http://localhost:3000/api/kernel/audit?limit=50"
```
Returns recent audit entries with chain validation status.

### 7. Verify Chain
```bash
curl http://localhost:3000/api/kernel/chain
```
Returns: chain status (VALID/BROKEN), total blocks, last hash.

### 8. Evidence & Compliance Report
```bash
# Get evidence for specific request
curl "http://localhost:3000/api/kernel/evidence?requestId=req_xxx"

# Get list of all evidence records
curl http://localhost:3000/api/kernel/evidence
```

## 🔍 Test Scenarios

### Scenario 1: Safe Query (Auto-Process)
```bash
curl -X POST http://localhost:3000/api/kernel/chat \
  -H "Content-Type: application/json" \
  -H "x-kernel-user-id: user1" \
  -H "x-kernel-user-name: Ahmed" \
  -d '{
    "query": "كيف يمكنك مساعدتي في استخدام BrightAI Kernel؟",
    "compliancePackage": "general"
  }'
```
Expected: Immediate response with demo provider

### Scenario 2: PII Detection (Requires Approval)
```bash
curl -X POST http://localhost:3000/api/kernel/chat \
  -H "Content-Type: application/json" \
  -H "x-kernel-user-id: user2" \
  -H "x-kernel-user-name: Fatima" \
  -d '{
    "query": "رقم بطاقتي الائتمانية: 4532123456789012 والبريد: test@email.com",
    "compliancePackage": "PDPL"
  }'
```
Expected: `pending_approval` status with high risk score

### Scenario 3: Approve & Execute
```bash
# First, get pending approvals
curl http://localhost:3000/api/kernel/approvals

# Then approve (using requestId from previous response)
curl -X POST http://localhost:3000/api/kernel/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req_1780058189290_vo0k8su2f",
    "action": "approve",
    "approver": "security@company.sa"
  }'
```
Expected: Completed response with AI output and masked PII

### Scenario 4: Check System Health
```bash
curl http://localhost:3000/api/kernel/health | jq '.provider'
```
Shows whether NVIDIA MiniMax is configured or system is in demo mode.

## 🎯 Key Features to Test

### PII Detection
The system detects 13+ types of sensitive data:
- National ID: `1234567890`
- Credit Card: `4532123456789012`
- IBAN: `SA0123456789012345678901`
- Phone: `+966501234567`
- Medical ID: `MRN: 123456`
- And more...

### Risk Scoring
- **Low** (0-20): Safe queries
- **Medium** (20-40): Some PII
- **High** (40-70): Multiple PII or risk keywords
- **Critical** (70+): High-risk PII or sensitive operations

### Compliance Packages
Select from 11 frameworks:
```json
{
  "compliancePackage": "general|PDPL|NCA_ECC|NCA_CCC|SFDA|healthcare|procurement|SAMA_Cybersecurity|ISO_27001|ISO_42001|Vision_2030"
}
```

### Audit Chain
Every action is logged immutably:
- Request created
- PII detected
- Risk assessed
- Decision made
- Approval granted/rejected
- AI response generated
- All linked with hash chain

## 🔐 Production Setup

### 1. Set NVIDIA API Key
```bash
# .env.local
NVIDIA_API_KEY=your-nvidia-api-key-here
NVIDIA_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=minimaxai/minimax-m2.7
```

### 2. Configure Database
```bash
# Replace in-memory storage with Neon PostgreSQL
# See KERNEL_IMPLEMENTATION.md for details
```

### 3. Add Authentication
```bash
# Implement JWT or session-based auth
# Add RBAC for approvers vs. admins
```

### 4. Enable Rate Limiting
```bash
# Use Upstash Redis for rate limiting
# Configure per-user and per-IP limits
```

### 5. Set Up Monitoring
```bash
# Add Sentry for error tracking
# Configure logging to external service
# Set up alerting for approval SLA
```

## 🛠️ Customization

### Add Custom PII Pattern
Edit `lib/pii-detection.ts`:
```typescript
const PII_PATTERNS = [
  // ... existing patterns
  {
    type: 'custom_id',
    pattern: /\b[A-Z]{3}\d{6}\b/g,
    weight: 8
  }
];
```

### Add Compliance Package
Edit `lib/governance-pipeline.ts` - Add to Zod schema and risk assessment logic.

### Customize Risk Rules
Edit `lib/governance-pipeline.ts`:
- Adjust `RISK_THRESHOLDS`
- Modify `HIGH_RISK_PII_TYPES`
- Update `RISK_KEYWORDS`

### Change Provider
Edit `lib/provider-gateway.ts` to switch from demo to real API integration.

## 📊 Monitoring Dashboard

Access `/kernel/stats.html` to see:
- Total requests processed
- Risk distribution pie chart
- PII detection rate
- Provider performance metrics
- Request status breakdown

## 🐛 Troubleshooting

### Demo Mode Activated
If you see "وضع تجريبي" (Demo Mode) banner:
```bash
# Check if NVIDIA_API_KEY is set
echo $NVIDIA_API_KEY

# Verify health endpoint
curl http://localhost:3000/api/kernel/health | jq '.provider'
```

### Approval Not Executing
Ensure:
1. Request has `pending_approval` status
2. Risk score is above threshold
3. POST to `/api/kernel/approvals` with correct requestId
4. Check audit log for errors

### Audit Chain Invalid
Should not happen in normal operation. If it does:
```bash
# Verify chain with explicit check
curl -X POST http://localhost:3000/api/kernel/chain
```

### CORS Issues
The system serves static files and APIs from same origin.
No CORS configuration needed for same-domain requests.

## 📚 Additional Resources

- **Full Documentation**: See `KERNEL_IMPLEMENTATION.md`
- **API Examples**: Review the test scenarios above
- **Source Code**: Check `lib/` and `app/api/kernel/`
- **Frontend Code**: Inspect `public/kernel/` HTML/JS/CSS

## 🎓 Learning Path

1. **Start**: Review homepage and understand key concepts
2. **Explore**: Test chat with safe queries in `/kernel/chat.html`
3. **Understand**: Trigger PII detection with sample data
4. **Deep Dive**: Review approval workflow in `/kernel/approvals.html`
5. **Monitor**: Check audit trail in `/kernel/audit.html`
6. **Verify**: Validate chain integrity in `/kernel/chain` endpoint
7. **Advanced**: Explore compliance packages and risk customization

## 📞 Support

For issues or questions:
1. Check `KERNEL_IMPLEMENTATION.md` for detailed documentation
2. Review error messages in audit log
3. Check browser console for client-side errors
4. Verify environment variables and API connectivity

---

**Status**: Production Ready (with database migration needed)
**Latest Build**: May 29, 2026
**System Version**: 1.0.0
