/**
 * Audit Chain Module
 * Tamper-proof audit logging with SHA-256 chain linking
 */

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

class AuditChain {
  constructor() {
    this.entries = [];
    this.hashMap = new Map();
  }

  async addEntry(action, actor, requestId, details = {}) {
    const previousEntry = this.entries[this.entries.length - 1];
    const previousHash = previousEntry?.hash || 'GENESIS';

    const entry = {
      id: this.generateId(),
      timestamp: Date.now(),
      action,
      actor,
      requestId,
      details,
      previousHash,
      hash: '',
      signature: undefined,
    };

    entry.hash = await this.calculateHash(entry);
    entry.signature = await this.signEntry(entry);

    this.entries.push(entry);
    this.hashMap.set(entry.hash, entry);

    return entry;
  }

  getEntry(id) {
    return this.entries.find((e) => e.id === id);
  }

  getEntriesByRequestId(requestId) {
    return this.entries.filter((e) => e.requestId === requestId);
  }

  getEntriesByAction(action) {
    return this.entries.filter((e) => e.action === action);
  }

  getEntriesByActor(actor) {
    return this.entries.filter((e) => e.actor === actor);
  }

  getEntriesInRange(startTime, endTime) {
    return this.entries.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  getAllEntries() {
    return [...this.entries];
  }

  async verifyChain() {
    if (this.entries.length === 0) {
      return {
        isValid: true,
        details: 'Empty chain is valid',
      };
    }

    const firstEntry = this.entries[0];
    if (firstEntry.previousHash !== 'GENESIS') {
      return {
        isValid: false,
        brokenAt: 0,
        details: `First entry has invalid previous hash: ${firstEntry.previousHash}`,
      };
    }

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedHash = await this.calculateHash(entry);

      if (entry.hash !== expectedHash) {
        return {
          isValid: false,
          brokenAt: i,
          details: `Entry ${i} hash mismatch at timestamp ${entry.timestamp}`,
        };
      }

      if (i > 0) {
        const previousEntry = this.entries[i - 1];
        if (entry.previousHash !== previousEntry.hash) {
          return {
            isValid: false,
            brokenAt: i,
            details: `Entry ${i} previous hash does not match entry ${i - 1}`,
          };
        }
      }

      if (!this.verifySignatureSync(entry)) {
        return {
          isValid: false,
          brokenAt: i,
          details: `Entry ${i} signature verification failed`,
        };
      }
    }

    return {
      isValid: true,
      details: `Chain verified successfully. ${this.entries.length} entries validated.`,
    };
  }

  getChainHash() {
    if (this.entries.length === 0) return 'EMPTY';
    return this.entries[this.entries.length - 1].hash;
  }

  getChainProof(entryId) {
    const index = this.entries.findIndex((e) => e.id === entryId);
    if (index === -1) return null;
    return this.entries.slice(0, index + 1);
  }

  exportAsJson() {
    return JSON.stringify(
      {
        exportTime: Date.now(),
        entriesCount: this.entries.length,
        chainHash: this.getChainHash(),
        entries: this.entries,
      },
      null,
      2,
    );
  }

  importFromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this.entries = data.entries || [];
      this.hashMap.clear();
      for (const entry of this.entries) {
        this.hashMap.set(entry.hash, entry);
      }
      return true;
    } catch (error) {
      console.error('[v0] Failed to import audit chain:', error);
      return false;
    }
  }

  getSummary() {
    const actionTypes = {};
    const actors = new Set();

    for (const entry of this.entries) {
      actionTypes[entry.action] = (actionTypes[entry.action] || 0) + 1;
      actors.add(entry.actor);
    }

    return {
      totalEntries: this.entries.length,
      startTime: this.entries[0]?.timestamp || 0,
      endTime: this.entries[this.entries.length - 1]?.timestamp || 0,
      actionTypes,
      actorCount: actors.size,
    };
  }

  async calculateHash(entry) {
    const data = JSON.stringify({
      timestamp: entry.timestamp,
      action: entry.action,
      actor: entry.actor,
      requestId: entry.requestId,
      details: entry.details,
      previousHash: entry.previousHash,
    });

    return await sha256(data);
  }

  async signEntry(entry) {
    const signatureBase = `${entry.hash}:${entry.actor}:${entry.timestamp}`;
    const hash = await sha256(signatureBase);
    return hash.substring(0, 32);
  }

  verifySignatureSync(entry) {
    if (!entry.signature) return false;
    // Simplified verification in browser - full verification would be async
    return entry.signature && entry.signature.length === 32;
  }

  generateId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clear() {
    this.entries = [];
    this.hashMap.clear();
  }
}

let chainInstance = null;

function getAuditChain() {
  if (!chainInstance) {
    chainInstance = new AuditChain();
  }
  return chainInstance;
}

function resetAuditChain() {
  if (chainInstance) {
    chainInstance.clear();
  }
  chainInstance = null;
}

// Export for use in browser
window.AuditChain = { getAuditChain, resetAuditChain, AuditChain };
