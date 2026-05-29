/**
 * Audit Chain Module
 * Tamper-proof audit logging with SHA-256 chain linking
 */

import { createHash } from 'crypto';

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  actor: string;
  requestId: string;
  details: Record<string, any>;
  previousHash: string;
  hash: string;
  signature?: string;
}

export interface ChainVerification {
  isValid: boolean;
  brokenAt?: number;
  details: string;
}

export class AuditChain {
  private entries: AuditEntry[] = [];
  private hashMap: Map<string, AuditEntry> = new Map();

  addEntry(
    action: string,
    actor: string,
    requestId: string,
    details: Record<string, any> = {},
  ): AuditEntry {
    const previousEntry = this.entries[this.entries.length - 1];
    const previousHash = previousEntry?.hash || 'GENESIS';

    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      action,
      actor,
      requestId,
      details,
      previousHash,
      hash: '', // Will be calculated
      signature: undefined,
    };

    // Calculate hash
    entry.hash = this.calculateHash(entry);

    // Sign the entry
    entry.signature = this.signEntry(entry);

    this.entries.push(entry);
    this.hashMap.set(entry.hash, entry);

    return entry;
  }

  getEntry(id: string): AuditEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  getEntriesByRequestId(requestId: string): AuditEntry[] {
    return this.entries.filter((e) => e.requestId === requestId);
  }

  getEntriesByAction(action: string): AuditEntry[] {
    return this.entries.filter((e) => e.action === action);
  }

  getEntriesByActor(actor: string): AuditEntry[] {
    return this.entries.filter((e) => e.actor === actor);
  }

  getEntriesInRange(startTime: number, endTime: number): AuditEntry[] {
    return this.entries.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  getAllEntries(): AuditEntry[] {
    return [...this.entries];
  }

  verifyChain(): ChainVerification {
    if (this.entries.length === 0) {
      return {
        isValid: true,
        details: 'Empty chain is valid',
      };
    }

    // Verify first entry
    const firstEntry = this.entries[0];
    if (firstEntry.previousHash !== 'GENESIS') {
      return {
        isValid: false,
        brokenAt: 0,
        details: `First entry has invalid previous hash: ${firstEntry.previousHash}`,
      };
    }

    // Verify all subsequent entries
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedHash = this.calculateHash(entry);

      if (entry.hash !== expectedHash) {
        return {
          isValid: false,
          brokenAt: i,
          details: `Entry ${i} hash mismatch at timestamp ${entry.timestamp}`,
        };
      }

      // Verify chain link
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

      // Verify signature (basic verification)
      if (!this.verifySignature(entry)) {
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

  getChainHash(): string {
    if (this.entries.length === 0) return 'EMPTY';
    return this.entries[this.entries.length - 1].hash;
  }

  getChainProof(entryId: string): AuditEntry[] | null {
    const index = this.entries.findIndex((e) => e.id === entryId);
    if (index === -1) return null;

    // Return the entry and all its ancestors
    return this.entries.slice(0, index + 1);
  }

  exportAsJson(): string {
    return JSON.stringify(
      {
        exportTime: Date.now(),
        entriesCount: this.entries.length,
        chainHash: this.getChainHash(),
        entries: this.entries,
        verification: this.verifyChain(),
      },
      null,
      2,
    );
  }

  importFromJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      this.entries = data.entries || [];
      this.hashMap.clear();
      for (const entry of this.entries) {
        this.hashMap.set(entry.hash, entry);
      }

      const verification = this.verifyChain();
      return verification.isValid;
    } catch (error) {
      console.error('[v0] Failed to import audit chain:', error);
      return false;
    }
  }

  getSummary(): {
    totalEntries: number;
    startTime: number;
    endTime: number;
    actionTypes: Record<string, number>;
    actorCount: number;
    chainValid: boolean;
  } {
    const actionTypes: Record<string, number> = {};
    const actors = new Set<string>();

    for (const entry of this.entries) {
      actionTypes[entry.action] = (actionTypes[entry.action] || 0) + 1;
      actors.add(entry.actor);
    }

    const verification = this.verifyChain();

    return {
      totalEntries: this.entries.length,
      startTime: this.entries[0]?.timestamp || 0,
      endTime: this.entries[this.entries.length - 1]?.timestamp || 0,
      actionTypes,
      actorCount: actors.size,
      chainValid: verification.isValid,
    };
  }

  private calculateHash(entry: Partial<AuditEntry>): string {
    const data = JSON.stringify({
      timestamp: entry.timestamp,
      action: entry.action,
      actor: entry.actor,
      requestId: entry.requestId,
      details: entry.details,
      previousHash: entry.previousHash,
    });

    return createHash('sha256').update(data).digest('hex');
  }

  private signEntry(entry: AuditEntry): string {
    // In production, this would use actual cryptographic signing
    // For demo, we create a signature-like string
    const signatureBase = `${entry.hash}:${entry.actor}:${entry.timestamp}`;
    return createHash('sha256').update(signatureBase).digest('hex').substring(0, 32);
  }

  private verifySignature(entry: AuditEntry): boolean {
    if (!entry.signature) return false;

    const expectedSignature = createHash('sha256')
      .update(`${entry.hash}:${entry.actor}:${entry.timestamp}`)
      .digest('hex')
      .substring(0, 32);

    return entry.signature === expectedSignature;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clear(): void {
    this.entries = [];
    this.hashMap.clear();
  }
}

// Singleton instance
let chainInstance: AuditChain | null = null;

export function getAuditChain(): AuditChain {
  if (!chainInstance) {
    chainInstance = new AuditChain();
  }
  return chainInstance;
}

export function resetAuditChain(): void {
  if (chainInstance) {
    chainInstance.clear();
  }
  chainInstance = null;
}
