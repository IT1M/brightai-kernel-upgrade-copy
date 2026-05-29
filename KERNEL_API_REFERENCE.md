# BrightAI Kernel - API Reference

## Base URL
```
http://localhost:3000/api/kernel
```

All timestamps are ISO 8601 format.

---

## Endpoints

### Health Check

**GET** `/health`

Returns system operational status and configuration.

**Response:**
```json
{
  "status": "operational",
  "timestamp": "2026-05-29T12:36:15.667Z",
  "system": {
    "uptime": "running",
    "version": "1.0.0",
    "environment": "development"
  },
  "provider": {
    "name": "demo|nvidia",
    "model": "demo-v1|minimaxai/minimax-m2.7",
    "status": "demo-mode|operational",
    "configured": true|false,
    "averageLatency": 715
  },
  "stats": {
    "totalRequests": 2,
    "successfulRequests": 2,
    "failedRequests": 0
  },
  "audit": {
    "totalBlocks": 8,
    "valid": true,
    "lastHash": "18eeba48"
  },
  "governance": {
    "totalRules": 13,
    "systemReady": true
  }
}
```

---

### Chat - Process Query

**POST** `/chat`

Processes a user query through the governance pipeline. Returns immediate response for low-risk queries or pending approval status for high-risk ones.

**Headers:**
```
Content-Type: application/json
x-kernel-user-id: string (user identifier)
x-kernel-user-name: string (user display name)
```

**Request Body:**
```json
{
  "query": "string, required, 1-4000 characters",
  "context": "string, optional, up to 2000 characters",
  "compliancePackage": "general|PDPL|NCA_ECC|NCA_CCC|SFDA|healthcare|procurement|SAMA_Cybersecurity|ISO_27001|ISO_42001|Vision_2030"
}
```

**Response (Low Risk - Auto-Process):**
```json
{
  "success": true,
  "requestId": "req_1780058184524_w3j7wtt4j",
  "status": "completed",
  "response": "تم تحليل طلبك بنجاح...",
  "riskLevel": "low|medium|high|critical",
  "riskScore": 0,
  "hasPii": false,
  "piiMatches": [],
  "provider": "demo|nvidia",
  "model": "demo-v1|minimaxai/minimax-m2.7",
  "latencyMs": 732,
  "tokensUsed": 7,
  "matchedPolicies": [],
  "chainHash": "6ce44de0"
}
```

**Response (High Risk - Approval Required):**
```json
{
  "success": true,
  "requestId": "req_1780058189290_vo0k8su2f",
  "status": "pending_approval",
  "message": "تم وضع الطلب في قائمة الانتظار للمراجعة بسبب قواعد الحوكمة",
  "riskLevel": "high|critical",
  "riskScore": 75,
  "hasPii": true,
  "piiMatches": [
    {
      "type": "credit_card|saudi_id|email|...",
      "masked": true
    }
  ],
  "matchedPolicies": [
    "High-risk PII detected",
    "Multiple PII types"
  ],
  "chainHash": "4dd91eed"
}
```

**Status Codes:**
- `200 OK` - Request processed
- `400 Bad Request` - Validation error
- `500 Internal Server Error` - Processing error

---

### Approvals - Get Pending

**GET** `/approvals`

Returns list of pending high-risk requests awaiting approval.

**Response:**
```json
{
  "timestamp": "2026-05-29T12:36:33.077Z",
  "pending": [
    {
      "id": "req_1780058189290_vo0k8su2f",
      "query": "هذا هو رقم بطاقتي...",
      "riskLevel": "high|critical",
      "riskScore": 75,
      "requiredApprovals": 2,
      "createdAt": 1780058189290,
      "matchedRules": [
        {
          "id": "high_risk_pii",
          "name": "High-Risk PII Policy"
        }
      ],
      "piiMatches": [
        {
          "type": "credit_card",
          "masked": true
        }
      ],
      "user": {
        "id": "user456",
        "name": "فاطمة"
      }
    }
  ],
  "summary": {
    "totalPending": 1,
    "criticalCount": 0,
    "highCount": 1
  }
}
```

---

### Approvals - Take Action

**POST** `/approvals`

Approve or reject a pending request.

**Request Body:**
```json
{
  "requestId": "string, required",
  "action": "approve|reject, required",
  "approver": "string, required, email or user ID",
  "reason": "string, optional, required for reject"
}
```

**Response (Approved):**
```json
{
  "success": true,
  "requestId": "req_1780058189290_vo0k8su2f",
  "status": "completed",
  "response": "تم تحليل طلبك بنجاح...",
  "riskLevel": "high",
  "riskScore": 75,
  "hasPii": true,
  "piiMatches": [
    {
      "type": "credit_card",
      "masked": true
    }
  ],
  "provider": "demo",
  "model": "demo-v1",
  "latencyMs": 697,
  "tokensUsed": 16,
  "matchedPolicies": [
    "High-risk PII detected"
  ]
}
```

**Response (Rejected):**
```json
{
  "success": true,
  "requestId": "req_1780058189290_vo0k8su2f",
  "status": "rejected",
  "message": "The request was rejected."
}
```

---

### Statistics

**GET** `/stats`

Returns aggregated system statistics.

**Response:**
```json
{
  "timestamp": "2026-05-29T12:36:33.077Z",
  "requests": {
    "total": 2,
    "pending": 0,
    "approved": 0,
    "executed": 0,
    "completed": 2
  },
  "provider": {
    "totalRequests": 2,
    "successfulRequests": 2,
    "failedRequests": 0,
    "averageLatency": 715
  },
  "riskDistribution": {
    "critical": 0,
    "high": 1,
    "medium": 0,
    "low": 1
  },
  "piiDetectionRate": 50
}
```

---

### Audit Log

**GET** `/audit?limit=50`

Returns recent audit trail entries.

**Query Parameters:**
- `limit` (optional, default: 50) - Number of entries to return

**Response:**
```json
{
  "timestamp": "2026-05-29T12:36:33.077Z",
  "auditLog": [
    {
      "id": "audit_1780058189290",
      "action": "request_created|approval_granted|request_completed|...",
      "timestamp": "2026-05-29T12:36:33.077Z",
      "index": 0,
      "hash": "6ce44de0",
      "data": {
        "requestId": "req_xxx",
        "userId": "user@company",
        "hasPii": true,
        "riskLevel": "high"
      }
    }
  ],
  "chainVerification": {
    "valid": true,
    "brokenAt": null,
    "totalBlocks": 8,
    "lastHash": "18eeba48"
  },
  "summary": {
    "totalBlocks": 8,
    "actions": [
      "request_created",
      "request_completed",
      "approval_required",
      "approval_granted",
      "request_executed_after_approval"
    ]
  }
}
```

---

### Chain Verification

**GET** `/chain`

Returns complete audit chain with verification status.

**Response:**
```json
{
  "timestamp": "2026-05-29T12:36:33.077Z",
  "chainStatus": "VALID|BROKEN",
  "chainHash": "18eeba48",
  "verification": {
    "valid": true,
    "brokenAt": null
  },
  "totalEntries": 8,
  "entries": [
    {
      "id": "audit_1780058189290",
      "timestamp": "2026-05-29T12:36:33.077Z",
      "action": "request_created",
      "index": 0,
      "hash": "6ce44de0",
      "previousHash": "00000000",
      "verified": true
    }
  ],
  "summary": {
    "totalBlocks": 8,
    "chainValid": true
  }
}
```

**POST** `/chain`

Explicitly verify chain integrity.

**Response:**
```json
{
  "timestamp": "2026-05-29T12:36:33.077Z",
  "verified": true,
  "chainStatus": "VALID|BROKEN",
  "chainHash": "18eeba48",
  "brokenAt": null,
  "totalBlocks": 8
}
```

---

### Evidence & Reports

**GET** `/evidence?requestId=req_xxx`

Get detailed evidence for a specific request (for compliance audits).

**Query Parameters:**
- `requestId` (optional) - Returns evidence for specific request
- If omitted, returns list of all completed requests

**Response (Specific Request):**
```json
{
  "timestamp": "2026-05-29T12:36:33.077Z",
  "evidence": {
    "requestId": "req_1780058189290_vo0k8su2f",
    "createdAt": 1780058189290,
    "completedAt": 1780058194000,
    "status": "completed|rejected",
    "riskLevel": "high",
    "riskScore": 75,
    "compliancePackage": "PDPL",
    "hasPii": true,
    "piiTypes": ["credit_card"],
    "matchedPolicies": [
      {
        "id": "high_risk_pii",
        "name": "High-Risk PII Policy"
      }
    ],
    "provider": "demo",
    "model": "demo-v1",
    "latencyMs": 697,
    "auditTrail": [
      {
        "timestamp": "2026-05-29T12:36:33.077Z",
        "action": "request_created",
        "index": 0,
        "hash": "6ce44de0"
      }
    ],
    "chainHash": "18eeba48",
    "generatedAt": 1780058194000
  }
}
```

**Response (List of Evidence):**
```json
{
  "timestamp": "2026-05-29T12:36:33.077Z",
  "total": 50,
  "evidence": [
    {
      "requestId": "req_1780058189290_vo0k8su2f",
      "createdAt": 1780058189290,
      "completedAt": 1780058194000,
      "status": "completed",
      "riskLevel": "high",
      "riskScore": 75,
      "hasPii": true,
      "piiCount": 1,
      "policyCount": 1,
      "provider": "demo"
    }
  ],
  "chainStatus": "VALID",
  "chainHash": "18eeba48"
}
```

---

## Data Types & Enums

### Risk Level
```
"low" | "medium" | "high" | "critical"
```

### Compliance Package
```
"general"
"PDPL"                 # Personal Data Protection Law
"NCA_ECC"             # NCA E-Commerce Code
"NCA_CCC"             # NCA Consumer Protection Code
"SFDA"                # Saudi FDA (Healthcare)
"healthcare"          # General Healthcare
"procurement"         # Government Procurement
"SAMA_Cybersecurity"  # SAMA Cybersecurity Framework
"ISO_27001"           # ISO Information Security
"ISO_42001"           # ISO AI Management
"Vision_2030"         # Saudi Vision 2030 Compliance
```

### PII Types Detected
```
"saudi_id"           # Saudi National ID
"saudi_iban"         # Saudi Bank Account IBAN
"saudi_phone"        # Saudi Mobile Number
"email"              # Email Address
"credit_card"        # Credit Card Number
"ip_address"         # IP Address
"passport"           # Passport Number
"date_of_birth"      # Date of Birth
"arabic_name"        # Arabic Personal Name
"medical_id"         # Medical Record Number
"vehicle_plate"      # Vehicle License Plate
"tax_id"             # Tax ID / VAT Number
"bank_account"       # Bank Account Number
```

### Request Status
```
"pending"      # Initial state
"approved"     # Approved, ready to execute
"rejected"     # Rejected by approver
"executed"     # Currently executing
"completed"    # Completed successfully
```

### Approval Status
```
"pending_approval"           # Awaiting approver decision
"approved"                   # Approved
"rejected"                   # Rejected
"executed_after_approval"    # Executing after approval
"completed"                  # Completed
"expired"                    # SLA exceeded
"escalated"                  # Escalated to admin
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "error message in Arabic or English",
  "requestId": "req_xxx",
  "details": "optional additional context",
  "statusCode": 400
}
```

### Common Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | خطأ في التحقق من البيانات | Invalid request body |
| 404 | Request not found | Invalid requestId |
| 500 | حدث خطأ في معالجة الطلب | Server error |

---

## Rate Limiting

Currently not enforced. Production setup should implement:
- Per-user: 100 requests/minute
- Per-IP: 1000 requests/minute
- Per-approval: 10 approvals/minute

---

## Authentication

Currently not enforced. Recommended for production:
- Use JWT tokens
- Add user ID to request headers
- Implement role-based access control

---

## Examples

### Example 1: Simple Greeting (Auto-Execute)
```bash
curl -X POST http://localhost:3000/api/kernel/chat \
  -H "Content-Type: application/json" \
  -H "x-kernel-user-id: user123" \
  -H "x-kernel-user-name: أحمد محمد" \
  -d '{
    "query": "السلام عليكم ورحمة الله وبركاته",
    "compliancePackage": "general"
  }'
```

### Example 2: Medical Query with PII (Requires Approval)
```bash
curl -X POST http://localhost:3000/api/kernel/chat \
  -H "Content-Type: application/json" \
  -H "x-kernel-user-id: doctor001" \
  -H "x-kernel-user-name: د. فاطمة" \
  -d '{
    "query": "رقم الملف الطبي: MRN-123456 للمريض أحمد علي، تاريخ الميلاد: 15/03/1990",
    "compliancePackage": "SFDA"
  }'
```

### Example 3: Complete Approval Workflow
```bash
# Step 1: Submit request
REQUEST=$(curl -s -X POST http://localhost:3000/api/kernel/chat \
  -H "Content-Type: application/json" \
  -H "x-kernel-user-id: user2" \
  -H "x-kernel-user-name: Fatima" \
  -d '{
    "query": "رقم بطاقتي: 4532123456789012",
    "compliancePackage": "PDPL"
  }')

REQUEST_ID=$(echo $REQUEST | jq -r '.requestId')

# Step 2: List pending approvals
curl http://localhost:3000/api/kernel/approvals

# Step 3: Approve the request
curl -X POST http://localhost:3000/api/kernel/approvals \
  -H "Content-Type: application/json" \
  -d "{
    \"requestId\": \"$REQUEST_ID\",
    \"action\": \"approve\",
    \"approver\": \"security@company.sa\"
  }"

# Step 4: Get evidence
curl "http://localhost:3000/api/kernel/evidence?requestId=$REQUEST_ID"
```

---

## Webhooks (Future)

Planned for production:
- `approval.created` - New approval pending
- `approval.executed` - Approval executed successfully
- `approval.expired` - SLA exceeded
- `request.completed` - Request completed
- `pii.detected` - PII detected in request

---

## Versioning

Current API Version: **1.0.0**

Future versions will maintain backward compatibility.
Version specified in response header: `X-API-Version: 1.0.0`

---

**Last Updated**: May 29, 2026
**Status**: Production Ready
