document.addEventListener('DOMContentLoaded', () => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registered successfully!', reg.scope))
                .catch(err => console.error('Service Worker registration failed: ', err));
        });
    }

    // 2. Handle PWA Before Install Prompt (Android)
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        console.log('beforeinstallprompt fired and saved.');
    });

    // 3. Detect OS Context
    const isIOS = () => {
        return [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod'
        ].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    };

    // 4. Inject Modal HTML into DOM
    const modalHTML = `
    <div class="pwa-modal-overlay" id="pwaModal">
        <div class="pwa-modal-content highlight-card">
            <button class="pwa-close-btn" id="pwaCloseBtn">&times;</button>
            <div class="pwa-logo-container">
                <img src="assets/star-logo.svg" alt="Stack Arena Logo" class="pwa-logo">
            </div>
            <h2 class="pwa-title">Install <span class="highlight-orange">StackArena</span> App</h2>
            
            <div class="pwa-features">
                <div class="pwa-feature"><i class="fas fa-bolt icon-orange"></i><span>Faster</span></div>
                <div class="pwa-feature"><i class="fas fa-wifi icon-blue"></i><span>Offline</span></div>
                <div class="pwa-feature"><i class="fas fa-bell icon-gold"></i><span>Alerts</span></div>
            </div>

            <div class="pwa-actions-container" id="pwaActionsContainer">
                <!-- Injected dynamically based on OS -->
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const pwaModal = document.getElementById('pwaModal');
    const pwaCloseBtn = document.getElementById('pwaCloseBtn');
    const pwaActionsContainer = document.getElementById('pwaActionsContainer');

    // Setup Close Behavior
    pwaCloseBtn.addEventListener('click', () => {
        pwaModal.classList.remove('show');
    });

    pwaModal.addEventListener('click', (e) => {
        if(e.target === pwaModal) {
            pwaModal.classList.remove('show');
        }
    });

    // Handle "Download App" button clicks
    const downloadBtns = document.querySelectorAll('.nav-download-btn, .download-btn');
    downloadBtns.forEach(btn => {
        // Remove inline onclick handler to prevent standard alerts
        btn.removeAttribute('onclick');
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Build UI based on OS
            if (isIOS()) {
                pwaActionsContainer.innerHTML = `
                    <div class="ios-prompt-guide">
                        <p class="ios-guide-title">To install StackArena on iOS:</p>
                        <ol class="ios-steps">
                            <li>Tap <strong>Share</strong> <i class="fas fa-share-square"></i> in Safari's bottom menu.</li>
                            <li>Scroll and select <strong>Add to Home Screen</strong> <i class="far fa-plus-square"></i>.</li>
                            <li>Tap <strong>Add</strong> in the top right corner.</li>
                        </ol>
                    </div>
                `;
            } else {
                // Default / Android
                pwaActionsContainer.innerHTML = `
                    <button class="btn btn-primary full-width pwa-install-btn" id="pwaInstallBtn">
                        <i class="fas fa-download"></i> Install Now
                    </button>
                    ${!deferredPrompt ? '<p class="pwa-fallback-text" style="font-size:0.75rem; color:var(--text-muted); margin-top:15px; line-height:1.4;">Open browser menu and select "Install app" if the button is unresponsive.</p>' : ''}
                `;

                // Re-bind click listener for the Android Install Now button
                const pwaInstallBtn = document.getElementById('pwaInstallBtn');
                if (pwaInstallBtn) {
                    pwaInstallBtn.addEventListener('click', async () => {
                        if (deferredPrompt) {
                            // Show the install prompt
                            deferredPrompt.prompt();
                            // Wait for the user to respond to the prompt
                            const { outcome } = await deferredPrompt.userChoice;
                            console.log('User response to the install prompt: ', outcome);
                            // We've used the prompt, and can't use it again, throw it away
                            deferredPrompt = null;
                            pwaModal.classList.remove('show');
                        }
                    });
                }
            }

            pwaModal.classList.add('show');
        });
    });
});
