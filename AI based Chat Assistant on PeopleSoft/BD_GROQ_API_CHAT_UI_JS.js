// BD AI Assistant Chat Overlay
(function() {
    'use strict';
    
    console.log('BD AI Assistant Chat Overlay script loading...');

    // Configuration
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const MODEL = 'llama-3.3-70b-versatile';
    const STORAGE_KEY = 'bd_chat_api_key';
    const HISTORY_KEY_PREFIX = 'bd_chat_history_';
    const THEME_KEY = 'bd_chat_theme';
    const CHAT_WIDTH_KEY = 'bd_chat_width';
    const MIN_CHAT_WIDTH = 350;
    const MAX_CHAT_WIDTH = 800;
    const DEFAULT_CHAT_WIDTH = 450;

    // Theme configurations
    const THEMES = {
        default: {
            name: 'Default',
            primary: '#667eea',
            secondary: '#764ba2',
            bgColor: '#ffffff',
            textColor: '#333333',
            bubbleUser: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            bubbleAssistant: '#ffffff',
            icon: '💬',
            description: 'General Purpose'
        },
        learning: {
            name: 'Learning',
            primary: '#10b981',
            secondary: '#059669',
            bgColor: '#f0fdf4',
            textColor: '#065f46',
            bubbleUser: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            bubbleAssistant: '#f0fdf4',
            icon: '📚',
            description: 'Learn something new'
        },
        troubleshooting: {
            name: 'Troubleshooting',
            primary: '#ef4444',
            secondary: '#dc2626',
            bgColor: '#fef2f2',
            textColor: '#7f1d1d',
            bubbleUser: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            bubbleAssistant: '#fef2f2',
            icon: '🔧',
            description: 'Debug and fix issues'
        },
        summary: {
            name: 'Summary',
            primary: '#f59e0b',
            secondary: '#d97706',
            bgColor: '#fffbeb',
            textColor: '#92400e',
            bubbleUser: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            bubbleAssistant: '#fffbeb',
            icon: '📝',
            description: 'Summarize and review'
        },
        creative: {
            name: 'Creative',
            primary: '#8b5cf6',
            secondary: '#7c3aed',
            bgColor: '#f5f3ff',
            textColor: '#5b21b6',
            bubbleUser: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            bubbleAssistant: '#f5f3ff',
            icon: '🎨',
            description: 'Creative work and ideas'
        }
    };

    // State
    let conversationHistory = [];
    let isProcessing = false;
    let autoScrollEnabled = false; // Changed to false to prevent auto-scroll
    let currentSessionId = '';
    let currentHistoryKey = '';
    let currentTheme = 'default';
    let currentChatWidth = DEFAULT_CHAT_WIDTH;
    let chatInitialized = false;
    let isResizing = false;

    // DOM Elements
    let chatToggleBtn, chatOverlay, closeChatBtn, clearChatBtn, themeBtn;
    let chatMessages, userInput, sendButton, apiKeyInput;
    let resizeHandle;

    // Check if chat is already initialized
    function isChatAlreadyInitialized() {
        return document.getElementById('bdChatOverlay') !== null || 
               document.getElementById('bdChatToggleBtn') !== null;
    }

    // Initialize the chat system
    function initChatOverlay() {
        console.log('Initializing BD AI Assistant Chat Overlay...');
        
        // Prevent multiple initializations
        if (isChatAlreadyInitialized()) {
            console.log('Chat already initialized, skipping...');
            return;
        }
        
        try {
            // Generate or retrieve session ID
            generateSessionId();
            
            // Load saved theme and width
            loadTheme();
            loadSavedWidth();
            
            createChatHTML();
            initializeElements();
            loadSavedData();
            setupEventListeners();
            
            chatInitialized = true;
            console.log('✅ BD AI Assistant Chat Overlay initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing chat overlay:', error);
        }
    }

    // Generate or retrieve session ID
    function generateSessionId() {
        currentSessionId = sessionStorage.getItem('bd_chat_session_id');
        
        if (!currentSessionId) {
            currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('bd_chat_session_id', currentSessionId);
        }
        
        currentHistoryKey = HISTORY_KEY_PREFIX + currentSessionId;
    }

    // Load saved theme
    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme && THEMES[savedTheme]) {
            currentTheme = savedTheme;
        }
    }

    // Load saved width
    function loadSavedWidth() {
        const savedWidth = localStorage.getItem(CHAT_WIDTH_KEY);
        if (savedWidth) {
            const width = parseInt(savedWidth, 10);
            if (width >= MIN_CHAT_WIDTH && width <= MAX_CHAT_WIDTH) {
                currentChatWidth = width;
            }
        }
    }

    // Apply theme to chat
    function applyTheme(themeName) {
        if (!THEMES[themeName]) return;
        
        currentTheme = themeName;
        localStorage.setItem(THEME_KEY, themeName);
        
        const theme = THEMES[themeName];
        
        // Update header
        const header = chatOverlay.querySelector('.bd-chat-header');
        if (header) {
            header.style.background = theme.bubbleUser;
        }
        
        // Update send button
        if (sendButton) {
            sendButton.style.background = theme.bubbleUser;
        }
        
        // Update theme button icon
        if (themeBtn) {
            themeBtn.innerHTML = theme.icon;
        }
        
        // Update assistant message bubbles
        const assistantBubbles = chatMessages.querySelectorAll('.bd-assistant-message .bd-message-bubble');
        assistantBubbles.forEach(bubble => {
            bubble.style.background = theme.bubbleAssistant;
            bubble.style.color = theme.textColor;
            bubble.style.borderColor = theme.primary + '20';
        });
        
        // Update code blocks
        const codeBlocks = chatMessages.querySelectorAll('.bd-code-block');
        codeBlocks.forEach(block => {
            block.style.borderColor = theme.primary + '20';
            block.querySelector('.bd-code-language').style.color = theme.primary;
        });
        
        // Update follow-up options
        const followupOptions = chatMessages.querySelectorAll('.bd-followup-option');
        followupOptions.forEach(option => {
            option.style.borderColor = theme.primary + '40';
            option.style.color = theme.primary;
        });
    }

    // Create chat HTML structure
    function createChatHTML() {
        console.log('Creating chat HTML elements...');
        
        try {
            // Create chat toggle button
            chatToggleBtn = document.createElement('button');
            chatToggleBtn.id = 'bdChatToggleBtn';
            chatToggleBtn.innerHTML = '💬';
            chatToggleBtn.title = 'Open AI Chat';
            chatToggleBtn.className = 'bd-chat-toggle';
            document.body.appendChild(chatToggleBtn);

            // Create chat overlay container
            chatOverlay = document.createElement('div');
            chatOverlay.id = 'bdChatOverlay';
            chatOverlay.className = 'bd-chat-overlay';
            
            chatOverlay.innerHTML = `
                <div class="bd-resize-handle-left"></div>
                <div class="bd-chat-header">
                    <h3>AI Assistant</h3>
                    <div class="bd-header-controls">
                        <button class="bd-header-btn bd-theme-btn" id="bdThemeBtn" title="Change Theme">${THEMES[currentTheme].icon}</button>
                        <button class="bd-header-btn" id="bdClearChatBtn" title="Clear Chat History">🗑️</button>
                        <button class="bd-header-btn" id="bdCloseChatBtn" title="Close Chat">×</button>
                    </div>
                </div>
                
                <div class="bd-api-key-container">
                    <input type="password" id="bdApiKeyInput" class="bd-api-key-input" 
                           placeholder="Enter your API key (stored locally in browser)"
                           autocomplete="off"
                           autocorrect="off"
                           autocapitalize="off"
                           spellcheck="false">
                    <div class="bd-api-key-note">
                        Your API key is stored locally in your browser and never sent to any server except Groq API.
                    </div>
                </div>
                
                <div class="bd-chat-input-area">
                    <div class="bd-input-wrapper">
                        <textarea id="bdUserInput" placeholder="Type your message here... (Shift+Enter for new line)" disabled rows="1"></textarea>
                        <button id="bdSendButton" disabled>Send</button>
                    </div>
                </div>
            `;
            
            // Create chat messages container
            chatMessages = document.createElement('div');
            chatMessages.id = 'bdChatMessages';
            chatMessages.className = 'bd-chat-messages';
            chatOverlay.insertBefore(chatMessages, chatOverlay.querySelector('.bd-chat-input-area'));
            
            document.body.appendChild(chatOverlay);

            // Add theme selector menu
            const themeMenu = document.createElement('div');
            themeMenu.id = 'bdThemeMenu';
            themeMenu.className = 'bd-theme-menu';
            themeMenu.innerHTML = `
                <div class="bd-theme-menu-header">Select Theme</div>
                <div class="bd-theme-options">
                    ${Object.entries(THEMES).map(([key, theme]) => `
                        <div class="bd-theme-option ${key === currentTheme ? 'active' : ''}" data-theme="${key}">
                            <span class="bd-theme-icon">${theme.icon}</span>
                            <span class="bd-theme-name">${theme.name}</span>
                            <span class="bd-theme-desc">${theme.description}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            chatOverlay.appendChild(themeMenu);

            // Set initial width
            chatOverlay.style.width = currentChatWidth + 'px';

            // Add CSS styles
            addChatStyles();
            
        } catch (error) {
            console.error('❌ Error creating chat HTML:', error);
        }
    }

    // Add CSS styles for the chat
    function addChatStyles() {
        const style = document.createElement('style');
        style.id = 'bd-chat-styles';
        style.textContent = `
            /* Chat Toggle Button */
            #bdChatToggleBtn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #667eea;
                color: white;
                border: none;
                cursor: pointer;
                font-size: 24px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                z-index: 999999;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #bdChatToggleBtn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            }

            /* Chat Overlay */
            #bdChatOverlay {
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 450px;
                min-width: 350px;
                max-width: 800px;
                height: 650px;
                max-height: calc(90vh - 100px);
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                display: none;
                flex-direction: column;
                z-index: 999998;
                overflow: hidden;
                border: 1px solid #e1e5e9;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                resize: none;
            }

            #bdChatOverlay.bd-active {
                display: flex;
                animation: bdSlideUp 0.3s ease;
            }

            @keyframes bdSlideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Left Side Resize Handle */
            .bd-resize-handle-left {
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                width: 8px;
                cursor: col-resize;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.2s;
            }

            #bdChatOverlay:hover .bd-resize-handle-left {
                opacity: 0.5;
            }

            .bd-resize-handle-left:hover,
            .bd-resize-handle-left.resizing {
                opacity: 1;
                background: linear-gradient(90deg, rgba(102, 126, 234, 0.3), rgba(102, 126, 234, 0.1));
            }

            /* Chat Header */
            .bd-chat-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                user-select: none;
            }

            .bd-chat-header h3 {
                font-size: 16px;
                font-weight: 600;
                margin: 0;
            }

            .bd-header-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .bd-header-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .bd-header-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }

            /* Theme Menu */
            #bdThemeMenu {
                position: absolute;
                top: 60px;
                right: 10px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                padding: 12px;
                width: 280px;
                display: none;
                z-index: 1000000;
                border: 1px solid #e1e5e9;
            }

            #bdThemeMenu.bd-show {
                display: block;
                animation: bdFadeIn 0.2s ease;
            }

            .bd-theme-menu-header {
                font-size: 12px;
                font-weight: 600;
                color: #666;
                margin-bottom: 8px;
                padding-bottom: 4px;
                border-bottom: 1px solid #e1e5e9;
            }

            .bd-theme-options {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .bd-theme-option {
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.2s;
                border: 1px solid transparent;
            }

            .bd-theme-option:hover {
                background: #f8f9fa;
                border-color: #e1e5e9;
            }

            .bd-theme-option.active {
                background: #f0f2f5;
                border-color: #667eea;
            }

            .bd-theme-icon {
                font-size: 18px;
                width: 24px;
                text-align: center;
            }

            .bd-theme-name {
                font-weight: 500;
                color: #333;
                flex: 1;
            }

            .bd-theme-desc {
                font-size: 11px;
                color: #666;
            }

            /* Messages Container */
            #bdChatMessages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
                display: flex;
                flex-direction: column;
            }

            .bd-message {
                margin-bottom: 16px;
                max-width: 100%;
                animation: bdFadeIn 0.3s ease;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }

            @keyframes bdFadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .bd-user-message {
                align-self: flex-end;
                margin-left: auto;
            }

            .bd-message-bubble {
                padding: 12px 16px;
                border-radius: 18px;
                line-height: 1.5;
                word-wrap: break-word;
                overflow-wrap: break-word;
                max-width: 100%;
                white-space: pre-wrap;
            }

            .bd-user-message .bd-message-bubble {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-bottom-right-radius: 4px;
            }

            .bd-assistant-message .bd-message-bubble {
                background: white;
                color: #333;
                border: 1px solid #e1e5e9;
                border-bottom-left-radius: 4px;
            }

            .bd-message-time {
                font-size: 11px;
                color: #999;
                margin-top: 4px;
                padding: 0 4px;
            }

            .bd-user-message .bd-message-time {
                text-align: right;
            }

            /* API Key Input */
            .bd-api-key-container {
                padding: 16px;
                background: #f0f2f5;
                border-bottom: 1px solid #e1e5e9;
                flex-shrink: 0;
            }

            .bd-api-key-input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #e1e5e9;
                border-radius: 6px;
                font-size: 13px;
                margin-bottom: 8px;
                box-sizing: border-box;
                background: white;
                font-family: monospace;
            }

            .bd-api-key-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
            }

            .bd-api-key-note {
                font-size: 11px;
                color: #666;
                line-height: 1.4;
            }

            /* Input Area */
            .bd-chat-input-area {
                padding: 16px;
                border-top: 1px solid #e1e5e9;
                background: white;
                flex-shrink: 0;
            }

            .bd-input-wrapper {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            #bdUserInput {
                width: 100%;
                padding: 12px 16px;
                border: 1px solid #e1e5e9;
                border-radius: 12px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
                resize: none;
                font-family: inherit;
                min-height: 44px;
                max-height: 120px;
                overflow-y: auto;
                line-height: 1.4;
                background: white;
            }

            #bdUserInput:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
            }

            #bdSendButton {
                padding: 12px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
                align-self: flex-end;
            }

            #bdSendButton:hover:not(:disabled) {
                opacity: 0.9;
                transform: translateY(-1px);
            }

            #bdSendButton:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            /* Code Blocks */
            .bd-code-block {
                background: #f7f7f7;
                border: 1px solid #e1e5e9;
                border-radius: 6px;
                padding: 12px;
                margin: 8px 0;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 13px;
                line-height: 1.4;
                overflow-x: auto;
                max-width: 100%;
            }

            .bd-code-block pre {
                margin: 0;
                white-space: pre-wrap;
                word-break: break-word;
                max-width: 100%;
            }

            .bd-code-block .bd-code-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                padding-bottom: 4px;
                border-bottom: 1px solid #e1e5e9;
                font-size: 12px;
                color: #666;
            }

            .bd-code-block .bd-code-language {
                font-weight: 600;
                color: #667eea;
            }

            .bd-code-block .bd-copy-btn {
                background: #e1e5e9;
                border: none;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                color: #666;
                transition: all 0.2s;
            }

            .bd-code-block .bd-copy-btn:hover {
                background: #667eea;
                color: white;
            }

            /* Follow-up Questions */
            .bd-followup-questions {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px dashed #e1e5e9;
            }

            .bd-followup-title {
                font-size: 12px;
                color: #666;
                margin-bottom: 8px;
                font-weight: 600;
            }

            .bd-followup-option {
                display: inline-block;
                background: #f0f2f5;
                border: 1px solid #e1e5e9;
                border-radius: 16px;
                padding: 6px 12px;
                margin: 4px 4px 4px 0;
                font-size: 13px;
                color: #667eea;
                cursor: pointer;
                transition: all 0.2s;
                max-width: 100%;
                word-break: break-word;
            }

            .bd-followup-option:hover {
                background: #667eea;
                color: white;
                border-color: #667eea;
                transform: translateY(-1px);
            }

            /* Typing Indicator */
            .bd-typing-indicator {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 12px 16px;
                background: white;
                border-radius: 18px;
                border: 1px solid #e1e5e9;
                width: fit-content;
                margin-bottom: 16px;
                align-self: flex-start;
            }

            .bd-typing-dot {
                width: 8px;
                height: 8px;
                background: #667eea;
                border-radius: 50%;
                animation: bdTypingAnimation 1.4s infinite ease-in-out;
            }

            .bd-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .bd-typing-dot:nth-child(3) { animation-delay: 0.4s; }

            @keyframes bdTypingAnimation {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-6px); }
            }

            /* Error Message */
            .bd-error-message {
                background: #fee;
                color: #c33;
                padding: 12px 16px;
                border-radius: 8px;
                border-left: 4px solid #c33;
                margin-bottom: 16px;
                font-size: 14px;
                word-break: break-word;
            }

            /* Scrollbar */
            #bdChatMessages::-webkit-scrollbar {
                width: 6px;
            }

            #bdChatMessages::-webkit-scrollbar-track {
                background: #f1f1f1;
            }

            #bdChatMessages::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }

            #bdChatMessages::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }

            /* Responsive */
            @media (max-width: 480px) {
                #bdChatOverlay {
                    right: 10px !important;
                    left: 10px !important;
                    bottom: 80px;
                    width: auto !important;
                    min-width: unset !important;
                    max-width: calc(100vw - 20px) !important;
                    max-height: calc(100vh - 100px);
                }

                #bdChatToggleBtn {
                    right: 10px;
                    bottom: 10px;
                }
                
                .bd-resize-handle-left {
                    display: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Initialize DOM element references
    function initializeElements() {
        userInput = document.getElementById('bdUserInput');
        sendButton = document.getElementById('bdSendButton');
        apiKeyInput = document.getElementById('bdApiKeyInput');
        closeChatBtn = document.getElementById('bdCloseChatBtn');
        clearChatBtn = document.getElementById('bdClearChatBtn');
        themeBtn = document.getElementById('bdThemeBtn');
        resizeHandle = chatOverlay.querySelector('.bd-resize-handle-left');
    }

    // Setup event listeners
    function setupEventListeners() {
        // API key input handler
        apiKeyInput.addEventListener('input', () => {
            const apiKey = apiKeyInput.value.trim();
            if (apiKey.length > 0) {
                localStorage.setItem(STORAGE_KEY, apiKey);
                enableInput();
            } else {
                disableInput();
                localStorage.removeItem(STORAGE_KEY);
            }
        });

        // Toggle chat window
        chatToggleBtn.addEventListener('click', () => {
            chatOverlay.classList.toggle('bd-active');
            if (chatOverlay.classList.contains('bd-active')) {
                userInput.focus();
            }
        });

        // Close chat
        closeChatBtn.addEventListener('click', () => {
            chatOverlay.classList.remove('bd-active');
            hideThemeMenu();
        });

        // Clear chat history
        clearChatBtn.addEventListener('click', clearChatHistory);

        // Theme button
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const themeMenu = document.getElementById('bdThemeMenu');
            themeMenu.classList.toggle('bd-show');
        });

        // Theme selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.bd-theme-option')) {
                const themeOption = e.target.closest('.bd-theme-option');
                const themeName = themeOption.dataset.theme;
                applyTheme(themeName);
                hideThemeMenu();
                
                document.querySelectorAll('.bd-theme-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                themeOption.classList.add('active');
            }
            
            if (!e.target.closest('#bdThemeMenu') && !e.target.closest('#bdThemeBtn')) {
                hideThemeMenu();
            }
        });

        // Send message
        sendButton.addEventListener('click', sendMessage);

        // Textarea handling
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            if (this.scrollHeight > 120) {
                this.style.overflowY = 'auto';
                this.style.height = '120px';
            } else {
                this.style.overflowY = 'hidden';
            }
        });

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
            
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 1;
                this.dispatchEvent(new Event('input'));
            }
        });

        // Close chat when clicking outside
        document.addEventListener('click', (e) => {
            if (!chatOverlay.contains(e.target) && 
                e.target !== chatToggleBtn && 
                chatOverlay.classList.contains('bd-active')) {
                chatOverlay.classList.remove('bd-active');
                hideThemeMenu();
            }
        });

        // Setup resize handle
        setupResizeHandle();

        // Prevent browser password manager
        apiKeyInput.setAttribute('autocomplete', 'new-password');
        apiKeyInput.setAttribute('data-lpignore', 'true');
        apiKeyInput.setAttribute('data-form-type', 'other');
        apiKeyInput.setAttribute('readonly', 'true');
        apiKeyInput.addEventListener('focus', function() {
            this.removeAttribute('readonly');
        });

        // Prevent text selection during resize
        document.addEventListener('selectstart', function(e) {
            if (isResizing) {
                e.preventDefault();
            }
        });
    }

    // Setup left-side resize handle
    function setupResizeHandle() {
        resizeHandle.addEventListener('mousedown', startResize);
        
        function startResize(e) {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            resizeHandle.classList.add('resizing');
            
            const startX = e.clientX;
            const startWidth = parseInt(getComputedStyle(chatOverlay).width, 10);
            const startRight = parseInt(getComputedStyle(chatOverlay).right, 10);
            const viewportWidth = window.innerWidth;
            
            function onMouseMove(e) {
                if (!isResizing) return;
                
                const dx = e.clientX - startX;
                let newWidth = Math.min(
                    Math.max(startWidth - dx, MIN_CHAT_WIDTH), 
                    MAX_CHAT_WIDTH
                );
                
                // Prevent going beyond right edge
                const maxAllowedWidth = viewportWidth - 40; // 20px padding on both sides
                newWidth = Math.min(newWidth, maxAllowedWidth);
                
                // Calculate new right position
                const widthDiff = startWidth - newWidth;
                const newRight = startRight + widthDiff;
                
                // Ensure we don't go off-screen
                if (newRight >= 20 && (newRight + newWidth) <= (viewportWidth - 20)) {
                    chatOverlay.style.width = newWidth + 'px';
                    chatOverlay.style.right = newRight + 'px';
                }
            }
            
            function onMouseUp() {
                isResizing = false;
                resizeHandle.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                // Save the new width
                const finalWidth = parseInt(getComputedStyle(chatOverlay).width, 10);
                currentChatWidth = finalWidth;
                localStorage.setItem(CHAT_WIDTH_KEY, finalWidth.toString());
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        }
    }

    // Hide theme menu
    function hideThemeMenu() {
        const themeMenu = document.getElementById('bdThemeMenu');
        themeMenu.classList.remove('bd-show');
    }

    // Load saved data from localStorage
    function loadSavedData() {
        // Load API key
        const savedApiKey = localStorage.getItem(STORAGE_KEY);
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            enableInput();
        }

        // Load chat history for current session
        if (currentHistoryKey) {
            const savedHistory = localStorage.getItem(currentHistoryKey);
            if (savedHistory) {
                try {
                    const history = JSON.parse(savedHistory);
                    if (Array.isArray(history) && history.length > 0) {
                        chatMessages.innerHTML = '';
                        history.forEach(msg => {
                            if (msg.role === 'user') {
                                addMessageToChat('user', msg.content);
                            } else if (msg.role === 'assistant') {
                                addFormattedMessageToChat('assistant', msg.content);
                            }
                        });
                        conversationHistory = history;
                    }
                } catch (e) {
                    localStorage.removeItem(currentHistoryKey);
                }
            } else {
                // Only add welcome message if no history exists
                addWelcomeMessage();
            }
        } else {
            addWelcomeMessage();
        }
        
        // Apply current theme
        applyTheme(currentTheme);
    }

    // Add welcome message
    function addWelcomeMessage() {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'bd-message bd-assistant-message';
        welcomeDiv.innerHTML = `
            <div class="bd-message-bubble">
                Hi! I'm your AI Assistant for Oracle PeopleSoft Application. Ask anything related to PeopleSoft, and I'll help you with the best responses.
            </div>
            <div class="bd-message-time">Just now</div>
        `;
        chatMessages.appendChild(welcomeDiv);
    }

    // Save chat history to localStorage
    function saveChatHistory() {
        if (currentHistoryKey && conversationHistory.length > 0) {
            localStorage.setItem(currentHistoryKey, JSON.stringify(conversationHistory));
        }
    }

    // Clear chat history for current session
    function clearChatHistory() {
        if (confirm('Clear chat history for this session?')) {
            conversationHistory = [];
            chatMessages.innerHTML = '';
            
            if (currentHistoryKey) {
                localStorage.removeItem(currentHistoryKey);
            }
            
            addWelcomeMessage();
        }
    }

    // Enable/disable input
    function enableInput() {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.placeholder = "Type your message here... (Shift+Enter for new line)";
        userInput.focus();
    }

    function disableInput() {
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = "Enter API key above to enable chat";
    }

    // Send message
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message || isProcessing) return;

        userInput.value = '';
        userInput.style.height = 'auto';
        
        addMessageToChat('user', message);
        conversationHistory.push({ role: 'user', content: message });
        saveChatHistory();
        
        showTypingIndicator();
        isProcessing = true;
        sendButton.disabled = true;
        
        try {
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) throw new Error('Please enter your API key');
            
            const response = await callGroqAPI(apiKey, conversationHistory);
            removeTypingIndicator();
            addFormattedMessageToChat('assistant', response);
            conversationHistory.push({ role: 'assistant', content: response });
            saveChatHistory();
            
        } catch (error) {
            removeTypingIndicator();
            showErrorMessage(error.message || 'An error occurred. Please try again.');
            console.error('API Error:', error);
        } finally {
            isProcessing = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    // Call API
    async function callGroqAPI(apiKey, messages) {
        const requestBody = {
            messages: messages,
            model: MODEL,
            temperature: 0.7,
            max_tokens: 1024
        };

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || 
                `API request failed with status ${response.status}`
            );
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response content';
    }

    // Chat message functions
    function addFormattedMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `bd-message bd-${role}-message`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const bubbleContent = document.createElement('div');
        bubbleContent.className = 'bd-message-bubble';
        bubbleContent.innerHTML = formatContent(content);
        
        messageDiv.appendChild(bubbleContent);
        
        const timeSpan = document.createElement('div');
        timeSpan.className = 'bd-message-time';
        timeSpan.textContent = time;
        messageDiv.appendChild(timeSpan);
        
        chatMessages.appendChild(messageDiv);
        setupInteractiveElements(bubbleContent);
        
        // DO NOT auto-scroll - let user scroll manually
    }

    function addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `bd-message bd-${role}-message`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const bubbleContent = document.createElement('div');
        bubbleContent.className = 'bd-message-bubble';
        bubbleContent.textContent = content;
        
        messageDiv.appendChild(bubbleContent);
        
        const timeSpan = document.createElement('div');
        timeSpan.className = 'bd-message-time';
        timeSpan.textContent = time;
        messageDiv.appendChild(timeSpan);
        
        chatMessages.appendChild(messageDiv);
        // DO NOT auto-scroll - let user scroll manually
    }

    // Formatting functions
    function formatContent(content) {
        let formatted = escapeHtml(content);
        
        // Process code blocks
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        formatted = formatted.replace(codeBlockRegex, (match, language, code) => {
            const lang = language || 'code';
            const escapedCode = escapeHtml(code.trim());
            return `<div class="bd-code-block">
                <div class="bd-code-header">
                    <span class="bd-code-language">${lang}</span>
                    <button class="bd-copy-btn">Copy</button>
                </div>
                <pre>${escapedCode}</pre>
            </div>`;
        });
        
        // Basic markdown formatting
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br>');
        
        // URLs to links
        const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
        formatted = formatted.replace(urlRegex, (url) => {
            const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`;
        });
        
        return formatted;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Interactive elements setup
    function setupInteractiveElements(container) {
        container.querySelectorAll('.bd-followup-option').forEach(option => {
            option.addEventListener('click', () => {
                const question = option.textContent.trim();
                userInput.value = question;
                userInput.dispatchEvent(new Event('input'));
                setTimeout(() => sendMessage(), 100);
            });
        });
        
        container.querySelectorAll('.bd-copy-btn').forEach(button => {
            button.addEventListener('click', () => {
                const codeElement = button.closest('.bd-code-block').querySelector('pre');
                if (codeElement) {
                    navigator.clipboard.writeText(codeElement.textContent);
                    button.textContent = 'Copied!';
                    setTimeout(() => button.textContent = 'Copy', 2000);
                }
            });
        });
        
        container.querySelectorAll('a').forEach(link => {
            if (!link.target) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
        });
    }

    // UI helper functions
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'bdTypingIndicator';
        typingDiv.className = 'bd-typing-indicator';
        typingDiv.innerHTML = `
            <div class="bd-typing-dot"></div>
            <div class="bd-typing-dot"></div>
            <div class="bd-typing-dot"></div>
        `;
        chatMessages.appendChild(typingDiv);
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('bdTypingIndicator');
        if (typingIndicator) typingIndicator.remove();
    }

    function showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bd-error-message';
        errorDiv.textContent = message;
        chatMessages.appendChild(errorDiv);
    }

    // Public API
    window.BDChatOverlay = {
        init: initChatOverlay,
        open: function() {
            chatOverlay.classList.add('bd-active');
            userInput.focus();
        },
        close: function() {
            chatOverlay.classList.remove('bd-active');
            hideThemeMenu();
        },
        setApiKey: function(key) {
            apiKeyInput.value = key;
            localStorage.setItem(STORAGE_KEY, key);
            enableInput();
        },
        setTheme: function(themeName) {
            if (THEMES[themeName]) {
                applyTheme(themeName);
            }
        },
        getThemes: function() {
            return Object.keys(THEMES);
        },
        getCurrentTheme: function() {
            return currentTheme;
        },
        resetWidth: function() {
            currentChatWidth = DEFAULT_CHAT_WIDTH;
            chatOverlay.style.width = DEFAULT_CHAT_WIDTH + 'px';
            chatOverlay.style.right = '20px';
            localStorage.removeItem(CHAT_WIDTH_KEY);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatOverlay);
    } else {
        setTimeout(initChatOverlay, 100);
    }

})();