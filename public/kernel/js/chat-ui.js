/**
 * Chat UI Module
 * Manages chat interface interactions and formatting
 */

class ChatUI {
  constructor() {
    this.messageContainer = document.getElementById('messages');
    this.inputField = document.getElementById('query-input');
    this.sendButton = document.getElementById('send-btn');
    this.isLoading = false;
  }

  scrollToBottom() {
    if (this.messageContainer) {
      this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }
  }

  addMessage(text, type = 'system', metadata = {}) {
    if (!this.messageContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';

    // Format text with line breaks
    if (typeof text === 'string') {
      contentEl.textContent = text;
    } else {
      contentEl.appendChild(text);
    }

    messageEl.appendChild(contentEl);

    // Add metadata if provided
    if (Object.keys(metadata).length > 0) {
      const metadataEl = document.createElement('div');
      metadataEl.className = 'message-metadata';
      metadataEl.style.cssText = 'font-size: 11px; color: var(--text-secondary); margin-top: 8px; opacity: 0.7;';
      metadataEl.textContent = Object.entries(metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' • ');
      contentEl.appendChild(metadataEl);
    }

    this.messageContainer.appendChild(messageEl);
    this.scrollToBottom();

    return messageEl;
  }

  formatRiskBadge(riskLevel) {
    const colors = {
      critical: { bg: '#dc2626', text: '#fca5a5' },
      high: { bg: '#ea580c', text: '#fdba74' },
      medium: { bg: '#f59e0b', text: '#fde047' },
      low: { bg: '#10b981', text: '#86efac' },
      minimal: { bg: '#06b6d4', text: '#cffafe' },
    };

    const color = colors[riskLevel] || colors.medium;
    return `<span style="background: ${color.bg}20; color: ${color.text}; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${riskLevel.toUpperCase()}</span>`;
  }

  formatPiiMatches(matches) {
    if (!matches || matches.length === 0) return '✓ No PII detected';

    const summary = {};
    for (const match of matches) {
      summary[match.type] = (summary[match.type] || 0) + 1;
    }

    return '⚠️ PII Detected:\n' + Object.entries(summary)
      .map(([type, count]) => `  • ${type}: ${count}`)
      .join('\n');
  }

  formatResponse(data) {
    let html = '';

    if (data.status === 'pending_approval') {
      html += `
        <div style="margin-bottom: 12px;">
          <strong>⚠️ Pending Approval</strong><br>
          Risk Level: ${this.formatRiskBadge(data.riskLevel)}<br>
          Risk Score: ${data.riskScore}%<br>
          Required Approvals: ${data.requiredApprovals}
        </div>
        ${data.hasPii ? '<div style="margin-bottom: 12px; color: #fdba74;">' + this.formatPiiMatches(data.piiMatches) + '</div>' : ''}
        <strong>Matched Rules:</strong><br>
        ${data.matchedRules.map(r => `• ${r.name}`).join('<br>')}
      `;
    } else if (data.status === 'completed') {
      html += `
        <div style="margin-bottom: 16px;">${data.response}</div>
        <div style="font-size: 12px; color: var(--text-secondary); border-top: 1px solid rgba(0,217,255,0.1); padding-top: 8px;">
          ✓ Completed | Provider: ${data.provider} | Tokens: ${data.tokensUsed} | Latency: ${data.latencyMs}ms
        </div>
      `;
    } else {
      html += data.response || 'No response';
    }

    return html;
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    if (this.sendButton) {
      this.sendButton.disabled = isLoading;
      this.sendButton.textContent = isLoading ? '⏳ Sending...' : 'Send';
    }
    if (this.inputField) {
      this.inputField.disabled = isLoading;
    }
  }

  clearMessages() {
    if (this.messageContainer) {
      this.messageContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <p>Start a new conversation</p>
        </div>
      `;
    }
  }

  showError(message) {
    this.addMessage(
      `❌ Error: ${message}`,
      'error',
      { severity: 'high' }
    );
  }

  showWarning(message) {
    this.addMessage(
      `⚠️ ${message}`,
      'warning'
    );
  }

  showInfo(message) {
    this.addMessage(
      `ℹ️ ${message}`,
      'system'
    );
  }
}

// Create global instance
window.chatUI = new ChatUI();

console.log('[v0] Chat UI initialized');
