/**
 * BrightAI Kernel - Chat Client Module
 * Advanced chat interface with streaming, typewriter effect, and governance integration
 * Supports both English and Arabic (RTL)
 */

(function (global) {
  'use strict';

  const KernelChatClient = {
    // Configuration
    config: {
      apiEndpoint: '/api/kernel/chat',
      maxRetries: 3,
      retryDelay: 1000,
      streamChunkDelay: 50,
      typewriterSpeed: 30, // ms per character
      messageHistoryLimit: 100,
      sessionId: null,
    },

    // State
    state: {
      messages: [],
      isLoading: false,
      currentStream: null,
      pendingApproval: null,
      governance: {
        riskLevel: 'low',
        piiDetected: false,
        requiresApproval: false,
      },
    },

    // Initialize chat
    init() {
      this.state.sessionId = this.generateSessionId();
      this.setupEventListeners();
      this.loadMessageHistory();
      this.logEvent('[CHAT] Initialized', { sessionId: this.state.sessionId });
    },

    // Setup event listeners
    setupEventListeners() {
      const sendBtn = document.getElementById('send-btn');
      const inputField = document.getElementById('query-input');
      const clearBtn = document.getElementById('clear-btn');
      const approveBtn = document.getElementById('approve-btn');
      const rejectBtn = document.getElementById('reject-btn');

      if (sendBtn) {
        sendBtn.addEventListener('click', () => this.sendMessage());
        sendBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.sendMessage();
        });
      }

      if (inputField) {
        inputField.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });

        // Set minimum font size for iOS
        inputField.style.fontSize = '16px';
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearHistory());
      }

      if (approveBtn) {
        approveBtn.addEventListener('click', () => this.approveRequest());
      }

      if (rejectBtn) {
        rejectBtn.addEventListener('click', () => this.rejectRequest());
      }
    },

    // Send message
    async sendMessage() {
      const inputField = document.getElementById('query-input');
      const message = inputField?.value?.trim();

      if (!message) return;

      // Clear input
      if (inputField) inputField.value = '';

      // Add user message to display
      this.addMessageToUI(message, 'user');
      this.state.messages.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
      });

      // Set loading state
      this.state.isLoading = true;
      this.updateLoadingUI(true);

      try {
        const response = await this.fetchWithRetry(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            sessionId: this.state.sessionId,
            messageHistory: this.state.messages.slice(-10), // Last 10 messages for context
          }),
        });

        const data = await response.json();

        if (data.requiresApproval) {
          this.handleApprovalRequired(data);
        } else {
          this.handleStreamResponse(data);
        }
      } catch (error) {
        this.logError('Failed to send message', error);
        this.addMessageToUI('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.', 'error');
      } finally {
        this.state.isLoading = false;
        this.updateLoadingUI(false);
      }
    },

    // Handle streaming response with typewriter effect
    handleStreamResponse(data) {
      const { response, metadata } = data;

      // Update governance state
      if (metadata) {
        this.state.governance = {
          riskLevel: metadata.riskLevel || 'low',
          piiDetected: metadata.piiDetected || false,
          requiresApproval: false,
        };
      }

      // Add AI response with typewriter effect
      this.addMessageToUI('', 'ai');
      const messages = document.querySelectorAll('.message.ai');
      const lastMessage = messages[messages.length - 1];

      if (lastMessage) {
        this.typewriterEffect(response, lastMessage);
      }

      // Add to state
      this.state.messages.push({
        role: 'assistant',
        content: response,
        metadata: metadata,
        timestamp: Date.now(),
      });

      this.saveMessageHistory();
    },

    // Handle approval required
    handleApprovalRequired(data) {
      this.state.pendingApproval = data;
      const approvalPanel = document.getElementById('approval-panel');

      if (approvalPanel) {
        const reasonEl = document.getElementById('approval-reason');
        const riskEl = document.getElementById('approval-risk');

        if (reasonEl) reasonEl.textContent = data.reason || 'محتوى يتطلب موافقة إدارية';
        if (riskEl) {
          riskEl.textContent = `مستوى الخطر: ${this.getRiskLabel(data.riskLevel)}`;
          riskEl.className = `risk-badge risk-${data.riskLevel}`;
        }

        approvalPanel.style.display = 'block';
      }

      this.addMessageToUI('تم اكتشاف محتوى حساس. يتطلب موافقة إدارية.', 'governance');
    },

    // Approve request
    async approveRequest() {
      if (!this.state.pendingApproval) return;

      try {
        const response = await this.fetchWithRetry('/api/kernel/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: this.state.pendingApproval.requestId,
            action: 'approve',
            sessionId: this.state.sessionId,
          }),
        });

        const data = await response.json();
        if (data.success) {
          this.addMessageToUI('✓ تمت الموافقة. معالجة الطلب...', 'system');
          this.handleStreamResponse({
            response: data.response,
            metadata: data.metadata,
          });
        }
      } catch (error) {
        this.logError('Failed to approve', error);
      }

      this.clearApprovalPanel();
    },

    // Reject request
    async rejectRequest() {
      if (!this.state.pendingApproval) return;

      try {
        await this.fetchWithRetry('/api/kernel/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: this.state.pendingApproval.requestId,
            action: 'reject',
            sessionId: this.state.sessionId,
          }),
        });

        this.addMessageToUI('✗ تم رفض الطلب.', 'system');
      } catch (error) {
        this.logError('Failed to reject', error);
      }

      this.clearApprovalPanel();
    },

    // Typewriter effect
    typewriterEffect(text, container) {
      let index = 0;
      const contentEl = container.querySelector('.message-content') || container;

      const type = () => {
        if (index < text.length) {
          contentEl.textContent += text[index++];
          setTimeout(type, this.config.typewriterSpeed);
        }
      };

      type();
    },

    // Add message to UI
    addMessageToUI(content, type = 'system') {
      const messagesContainer = document.getElementById('messages');
      if (!messagesContainer) return;

      const messageEl = document.createElement('div');
      messageEl.className = `message ${type}`;

      const contentEl = document.createElement('div');
      contentEl.className = 'message-content';
      contentEl.textContent = content;

      messageEl.appendChild(contentEl);
      messagesContainer.appendChild(messageEl);

      // Scroll to bottom
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 0);
    },

    // Update loading UI
    updateLoadingUI(isLoading) {
      const sendBtn = document.getElementById('send-btn');
      const inputField = document.getElementById('query-input');

      if (sendBtn) {
        sendBtn.disabled = isLoading;
        sendBtn.textContent = isLoading ? 'جاري المعالجة...' : 'إرسال';
      }

      if (inputField) {
        inputField.disabled = isLoading;
      }
    },

    // Clear approval panel
    clearApprovalPanel() {
      const approvalPanel = document.getElementById('approval-panel');
      if (approvalPanel) {
        approvalPanel.style.display = 'none';
      }
      this.state.pendingApproval = null;
    },

    // Clear history
    clearHistory() {
      const messagesContainer = document.getElementById('messages');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
      }
      this.state.messages = [];
      localStorage.removeItem(`brightai-chat-${this.state.sessionId}`);
    },

    // Save message history to localStorage
    saveMessageHistory() {
      try {
        const key = `brightai-chat-${this.state.sessionId}`;
        localStorage.setItem(key, JSON.stringify(this.state.messages));
      } catch (e) {
        console.error('[CHAT] Failed to save history:', e);
      }
    },

    // Load message history from localStorage
    loadMessageHistory() {
      try {
        const key = `brightai-chat-${this.state.sessionId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          this.state.messages = JSON.parse(saved);
          const messagesContainer = document.getElementById('messages');
          if (messagesContainer) {
            messagesContainer.innerHTML = '';
            this.state.messages.forEach((msg) => {
              this.addMessageToUI(msg.content, msg.role === 'user' ? 'user' : 'ai');
            });
          }
        }
      } catch (e) {
        console.error('[CHAT] Failed to load history:', e);
      }
    },

    // Fetch with retry logic
    async fetchWithRetry(url, options = {}, retries = this.config.maxRetries) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response;
      } catch (error) {
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, this.config.retryDelay));
          return this.fetchWithRetry(url, options, retries - 1);
        }
        throw error;
      }
    },

    // Generate session ID
    generateSessionId() {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // Get risk label
    getRiskLabel(level) {
      const labels = {
        low: 'منخفض',
        medium: 'متوسط',
        high: 'مرتفع',
      };
      return labels[level] || level;
    },

    // Logging
    logEvent(message, data = {}) {
      console.log(`[CHAT] ${message}`, data);
    },

    logError(message, error) {
      console.error(`[CHAT ERROR] ${message}`, error);
    },
  };

  // Export to global scope
  global.KernelChatClient = KernelChatClient;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      KernelChatClient.init();
    });
  } else {
    KernelChatClient.init();
  }
})(window);
