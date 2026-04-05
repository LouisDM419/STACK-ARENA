// StackArena Enhanced JavaScript

// Simulated Auth State removed. Real session check applied.
let currentUserProfile = null;

async function initSessionCheck() {
    try {
        if (window.api && window.api.myProfile) {
            const profileData = await window.api.myProfile();
            if (profileData && profileData.myProfile) {
                const profile = profileData.myProfile;
                currentUserProfile = profile;
                const btnLoginNav = document.getElementById('btn-login-nav');
                const btnSignupNav = document.getElementById('btn-signup-nav');
                const profileNav = document.getElementById('user-profile-nav');

                if (btnLoginNav) btnLoginNav.style.display = 'none';
                if (btnSignupNav) btnSignupNav.style.display = 'none';
                if (profileNav) {
                    profileNav.style.display = 'flex';
                    const nameEl = profileNav.querySelector('.profile-name');
                    if (nameEl) nameEl.innerText = profile.gamerTag || 'Player';
                    const balEl = profileNav.querySelector('.profile-bal');
                    if (balEl) {
                        const r = profile.realSc || 0;
                        const b = profile.bonusSc || 0;
                        balEl.innerText = `${r + b} SC`;
                    }
                }
                return true;
            }
        }
    } catch (e) {
        console.log("No authentic session.");
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    initSessionCheck();
    // 1. Counter Animation for Stats Strip
    const counters = document.querySelectorAll('.counter');
    const speed = 250;

    const animateCounters = () => {
        counters.forEach(counter => {
            const updateCount = () => {
                const targetStr = counter.getAttribute('data-target');
                if (!targetStr) return;

                const target = +targetStr;
                const currentText = counter.innerText.replace(/,/g, '');
                const count = +currentText;

                const inc = target / speed;

                if (count < target) {
                    let nextCount = Math.ceil(count + inc);
                    if (counter.classList.contains('currency')) {
                        counter.innerText = nextCount.toLocaleString();
                    } else {
                        counter.innerText = nextCount.toLocaleString();
                    }
                    setTimeout(updateCount, 15);
                } else {
                    counter.innerText = target.toLocaleString();
                }
            };
            updateCount();
        });
    }

    const statsSection = document.querySelector('.stats-strip');
    if (statsSection && window.IntersectionObserver) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                animateCounters();
                observer.disconnect();
            }
        });
        observer.observe(statsSection);
    } else {
        animateCounters();
    }

    // 2. Navbar Background on Scroll
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // 3. Modal logic
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('auth-modal').classList.remove('active');
        });
    }

    // Mobile Menu
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navContainer = document.querySelector('.nav-container');
    if (mobileMenuBtn && navContainer) {
        mobileMenuBtn.addEventListener('click', () => {
            navContainer.classList.toggle('mobile-active');
        });
    }
});

// Routing Logic & Authentication
function handleAuthRoute(event, action) {
    if (event) event.preventDefault();

    if (action === 'signup') {
        window.location.href = 'signup.html';
        return;
    } else if (action === 'login') {
        window.location.href = 'login.html';
        return;
    }

    if (!currentUserProfile) {
        window.location.href = 'login.html';
    } else {
        if (action === 'ranked') window.location.href = 'playground.html';
        if (action === 'free') window.location.href = 'playground.html';
        if (action === 'wallet') window.location.href = 'wallet.html';
        if (action === 'spectate') showToast("Connecting to live match spectator view...");
    }
}

function executeLogout() {
    showToast("Logging out...");
    setTimeout(() => {
        window.location.href = 'index.html'; // Or clear tokens
    }, 1000);
}

function showToast(message, success = true) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.innerText = message;
    toast.style.background = success ? '#25D366' : '#ff4444';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Notification Toggle Logic
function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    let overlay = document.querySelector('.notif-overlay');

    if (dropdown) {
        dropdown.classList.toggle('active');

        if (dropdown.classList.contains('active')) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'notif-overlay';
                const layout = document.querySelector('.dashboard-layout');
                if (layout) layout.appendChild(overlay);
                else document.body.appendChild(overlay);
                // clicking overlay closes notifications
                overlay.addEventListener('click', toggleNotifications);
            }
            setTimeout(() => overlay.classList.add('active'), 10);
        } else {
            if (overlay) {
                overlay.classList.remove('active');
                setTimeout(() => {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 300);
            }
        }
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const notifWrapper = document.querySelector('.notification-wrapper');
    const dropdown = document.getElementById('notification-dropdown');
    let overlay = document.querySelector('.notif-overlay');

    if (dropdown && dropdown.classList.contains('active') && notifWrapper && !notifWrapper.contains(e.target)) {
        dropdown.classList.remove('active');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
        }
    }
});

async function loadNotifications() {
    const notifBody = document.querySelector('.notif-body');
    const req = await window.api.myNotifications();

    if (req && req.myNotifications && req.myNotifications.length > 0) {
        notifBody.innerHTML = req.myNotifications.map(n => `
            <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <strong style="color: var(--accent-orange);">${n.title}</strong>
                <p style="font-size: 0.85rem; margin: 5px 0;">${n.message}</p>
            </div>
        `).join('');
    }
}

function performLogout() {
    localStorage.clear();
    sessionStorage.clear();

    document.cookie.split(";").forEach(function (c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    window.location.href = 'index.html';
}

// Sidebar Toggle Logic for Dashboard Layout
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    let overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) {
        sidebar.classList.toggle('sidebar-open');

        if (sidebar.classList.contains('sidebar-open')) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                const layout = document.querySelector('.dashboard-layout');
                if (layout) layout.appendChild(overlay);
                else document.body.appendChild(overlay);
                overlay.addEventListener('click', toggleSidebar);
            }
            setTimeout(() => overlay.classList.add('active'), 10);
        } else {
            if (overlay) {
                overlay.classList.remove('active');
                setTimeout(() => {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 300);
            }
        }
    }
}

// -----------------------------------------
// Create Match Feature Logic (V2)
// -----------------------------------------
const playerState = {
    realBalance: 0,
    bonusBalance: 0,
    dailyLimit: 5,
    matchesCreatedToday: 0
};

const minStakeObj = { value: 50 };
let currentMatchType = 'ranked'; // 'practice', 'ranked', 'hybrid'

function openCreateMatch() {
    const modal = document.getElementById('create-match-modal');
    if (modal) modal.classList.add('active');

    // Auto Selection Engine
    if (playerState.realBalance === 0 && playerState.bonusBalance > 0) {
        selectMatchType('practice');
    } else {
        selectMatchType('ranked');
    }

    // Hybrid Mode visibility
    const hybridCard = document.getElementById('type-card-hybrid');
    if (hybridCard) {
        if (playerState.realBalance > 0 && playerState.bonusBalance > 0) {
            hybridCard.style.display = 'block';
        } else {
            hybridCard.style.display = 'none';
        }
    }

    // Top Level Warning Banner (Only Bonus)
    const banner = document.getElementById('bonus-only-banner');
    if (banner) {
        if (playerState.realBalance === 0) {
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }
    }

    // Limit Check UI
    const limitWarning = document.getElementById('cm-limit-warning');
    if (limitWarning) {
        if (playerState.matchesCreatedToday >= playerState.dailyLimit) {
            limitWarning.style.display = 'block';
        } else {
            limitWarning.style.display = 'none';
        }
    }

    // Reset Waiting state just in case
    const waitState = document.getElementById('cm-waiting-state');
    if (waitState) waitState.classList.remove('active');

    calculateSummary();
}

function selectMatchType(type) {
    currentMatchType = type;
    document.querySelectorAll('.cm-type-card').forEach(c => c.classList.remove('active'));
    const targetCard = document.getElementById('type-card-' + type);
    if (targetCard) targetCard.classList.add('active');

    // Locked Earnings Notice
    const notice = document.getElementById('locked-earnings-notice');
    if (notice) {
        if (type === 'practice' || type === 'hybrid') {
            notice.style.display = 'flex';
        } else {
            notice.style.display = 'none';
        }
    }

    // Dynamic Button Text
    const btn = document.getElementById('btn-submit-challenge');
    if (btn) {
        if (type === 'practice') btn.innerHTML = 'Create Practice Match';
        if (type === 'ranked') btn.innerHTML = 'Create Ranked Match';
        if (type === 'hybrid') btn.innerHTML = 'Create Hybrid Match';
    }

    calculateSummary();
}

function closeCreateMatch() {
    const modal = document.getElementById('create-match-modal');
    if (modal) modal.classList.remove('active');

    const btn = document.getElementById('btn-submit-challenge');
    if (btn) btn.classList.remove('btn-loading');

    const stakeInput = document.getElementById('cm-stake-input');
    if (stakeInput) stakeInput.disabled = false;

    const waitState = document.getElementById('cm-waiting-state');
    if (waitState) waitState.classList.remove('active');
}

function adjustStake(amount) {
    const stakeInput = document.getElementById('cm-stake-input');
    if (!stakeInput) return;
    let current = parseInt(stakeInput.value);
    if (isNaN(current)) current = 0;
    stakeInput.value = Math.max(0, current + amount);
    calculateSummary();
}

function setQuickStake(amount) {
    const stakeInput = document.getElementById('cm-stake-input');
    if (!stakeInput) return;
    stakeInput.value = amount;
    calculateSummary();
}

document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'cm-stake-input') {
        calculateSummary();
    }
});

function calculateSummary() {
    const stakeInput = document.getElementById('cm-stake-input');
    if (!stakeInput) return;
    let val = parseInt(stakeInput.value);
    const submitBtn = document.getElementById('btn-submit-challenge');
    const errorText = document.getElementById('cm-error-text');

    if (!submitBtn || !errorText) return;

    // Balance Source Logic
    let activeBal = 0;
    const availBalEl = document.getElementById('cm-available-bal');
    const riskBadge = document.getElementById('sum-risk-badge');

    if (currentMatchType === 'practice') {
        activeBal = playerState.bonusBalance;
        if (availBalEl) availBalEl.innerHTML = `<i class="fas fa-gift text-blue"></i> ${activeBal} Bonus SC`;
        if (riskBadge) {
            riskBadge.className = 'risk-indicator risk-low';
            riskBadge.innerText = 'Low Risk';
        }
    } else if (currentMatchType === 'ranked') {
        activeBal = playerState.realBalance;
        if (availBalEl) availBalEl.innerHTML = `<i class="fas fa-coins text-gold"></i> ${activeBal} Real SC`;
        if (riskBadge) {
            riskBadge.className = 'risk-indicator risk-standard';
            riskBadge.innerText = 'Standard Risk';
        }
    } else {
        activeBal = playerState.realBalance + playerState.bonusBalance;
        if (availBalEl) availBalEl.innerHTML = `<i class="fas fa-coins text-purple"></i> ${activeBal} Mixed SC`;
        if (riskBadge) {
            riskBadge.className = 'risk-indicator risk-adjusted';
            riskBadge.innerText = 'Adjusted Risk';
        }
    }

    // High Stakes Indicator
    const hsBadge = document.getElementById('high-stakes-badge');
    const summaryPanel = document.getElementById('cm-summary-panel');
    const winnerEl = document.getElementById('sum-winner');

    if (val >= 500) {
        if (hsBadge) hsBadge.style.display = 'inline-block';
        if (summaryPanel) summaryPanel.classList.add('high-stakes-panel');
        if (winnerEl) winnerEl.classList.add('high-stakes-glow');
    } else {
        if (hsBadge) hsBadge.style.display = 'none';
        if (summaryPanel) summaryPanel.classList.remove('high-stakes-panel');
        if (winnerEl) winnerEl.classList.remove('high-stakes-glow');
    }

    let hasError = false;

    // Limits Validation
    if (playerState.matchesCreatedToday >= playerState.dailyLimit) {
        hasError = true;
    }

    if (isNaN(val) || val < minStakeObj.value) {
        errorText.innerHTML = 'Minimum stake is ' + minStakeObj.value + ' SC';
        errorText.style.display = 'block';
        hasError = true;
    } else if (val > activeBal) {
        errorText.innerHTML = 'Insufficient balance <a href="wallet.html" style="color:var(--accent-blue); margin-left:10px; text-decoration:underline;">Deposit Now</a>';
        errorText.style.display = 'block';
        hasError = true;
    } else {
        errorText.style.display = 'none';
    }

    if (hasError) {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-disabled');
        resetSummaryUI();
        return;
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-disabled');
    }

    const oppStake = val;
    let totalPool = val + oppStake;
    let platformFee = Math.floor(totalPool * 0.10);
    let winnerGets = totalPool - platformFee;

    document.getElementById('sum-your-stake').innerText = val + ' SC';
    document.getElementById('sum-opp-stake').innerText = oppStake + ' SC';

    const hybridRow = document.getElementById('sum-hybrid-row');
    if (hybridRow) {
        if (currentMatchType === 'hybrid') {
            hybridRow.style.display = 'flex';
            platformFee = Math.floor(totalPool * 0.05); // Simulated reduced fee in hybrid
            winnerGets = totalPool - platformFee;
            document.getElementById('sum-hybrid-text').innerText = 'Mixed Mode: Rewards adjusted, Risk mitigated.';
        } else {
            hybridRow.style.display = 'none';
        }
    }

    document.getElementById('sum-total-pool').innerText = totalPool + ' SC';
    document.getElementById('sum-fee').innerText = '-' + platformFee + ' SC';
    if (winnerEl) {
        winnerEl.innerText = winnerGets + ' SC';
        winnerEl.style.transform = 'scale(1.05)';
        setTimeout(() => winnerEl.style.transform = 'scale(1)', 150);
    }
}

function resetSummaryUI() {
    document.getElementById('sum-your-stake').innerText = '-';
    document.getElementById('sum-opp-stake').innerText = '-';
    document.getElementById('sum-total-pool').innerText = '-';
    document.getElementById('sum-fee').innerText = '-';
    document.getElementById('sum-winner').innerText = '-';
    const hr = document.getElementById('sum-hybrid-row');
    if (hr) hr.style.display = 'none';
}

async function submitChallenge() {
    const btn = document.getElementById('btn-submit-challenge');
    if (btn) btn.classList.add('btn-loading');

    const stakeInput = document.getElementById('cm-stake-input');
    if (stakeInput) stakeInput.disabled = true;

    const stake = parseInt(stakeInput.value) || 0;
    const mappedType = currentMatchType.toUpperCase();

    try {
        const result = await window.api.createMatch("CODM", stake, mappedType, "Quick Match", "", "");
        const matchData = result.createMatch || {};
        const matchId = matchData.id || "N/A";

        showToast("Challenge sent successfully!");

        setTimeout(() => {
            // Transition to waiting state
            const waitState = document.getElementById('cm-waiting-state');
            if (waitState) waitState.classList.add('active');
            if (btn) btn.classList.remove('btn-loading');

            // Background grid injection (silently)
            const grid = document.querySelector('.challenges-grid');
            if (grid) {
                if (document.getElementById('empty-state-container')) grid.innerHTML = '';
                const badgeClass = currentMatchType === 'ranked' ? 'badge-ranked' : (currentMatchType === 'practice' ? 'badge-practice' : 'badge-hybrid');
                const badgeText = currentMatchType.charAt(0).toUpperCase() + currentMatchType.slice(1);

                const newCardHTML = `
                <div class="challenge-card" style="animation: fadeIn 0.4s ease forwards; border-color: rgba(249, 109, 0, 0.4); box-shadow: 0 10px 30px rgba(249, 109, 0, 0.15);">
                    <div class="cc-header">
                        <div class="cc-player"><div class="avatar-sm"><i class="fas fa-user"></i></div><span class="player-name">You</span></div>
                        <span class="badge-tag ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="cc-body">
                        <div class="cc-detail"><span class="detail-label">Game Mode</span><span class="detail-value">CODM 1v1 (STAR-${matchId})</span></div>
                        <div class="cc-stake"><span class="stake-val"><i class="fas fa-coins text-gold"></i> ${stake} SC</span><span class="stake-label">Open Match</span></div>
                    </div>
                    <div class="cc-footer"><button class="btn btn-outline full-width" onclick="window.location.href='playground.html'">Waiting for opponent <i class="fas fa-spinner fa-spin ms-2"></i></button></div>
                </div>`;
                grid.insertAdjacentHTML('afterbegin', newCardHTML);
            }
        })
    }
    catch (err) {
        showToast(err.message || "Failed to submit challenge", false);
        if (btn) btn.classList.remove('btn-loading');
        if (stakeInput) stakeInput.disabled = false;
        const waitState = document.getElementById('cm-waiting-state');
        if (waitState) waitState.classList.remove('active');
    }
}

// Search Profile Routing
function openProfile(username) {
    if (username) {
        window.location.href = `profile.html?user=${encodeURIComponent(username)}`;
    }
}
