let currentChallengedPlayer = null;

const appState = {
    currentUser: null,
    mode: "RANKED", // REAL -> RANKED, BONUS -> PRACTICE (backend maps)
    currentView: "lobby",
    lobbyFilter: "Pending",
    currentMatchId: null,
    myMatches: [],
    openMatches: []
};


const app = {
    async init() {
        try {
            const res = await window.api.myProfile();
            appState.currentUser = res?.myProfile || res;
            this.updateBalances();
            await this.refreshMatches();
            window.api.subscribeToUserEvents((eventData) => {
                if (eventData.type === 'match.redirect') {
                    this.showToast("Match Found! Redirecting to opponent...", "success");
                    this.refreshMatches().then(() => {
                        this.viewMatchDetails(eventData.match_id || eventData.matchId);
                    });
                }
            });
            this.navigate('lobby');
            const urlParams = new URLSearchParams(window.location.search);
            const challengeTarget = urlParams.get('challenge');

            // if (challengeTarget) {
            //     window.history.replaceState({}, document.title, window.location.pathname);

            //     currentChallengedPlayer = challengeTarget;

            //     app.navigate('create');
            //     const banner = document.getElementById('cm-direct-challenge-banner');
            //     const targetText = document.getElementById('cm-target-user');
            //     if (banner && targetText) {
            //         banner.style.display = 'block';
            //         targetText.innerText = challengeTarget;
            //     }
            // }

            if (challengeTarget) {
                window.history.replaceState({}, document.title, window.location.pathname);

                try {
                    const searchRes = await window.api.searchPlayer(challengeTarget);
                    
                    if (searchRes && searchRes.searchPlayer) {
                        currentChallengedPlayer = searchRes.searchPlayer.gamerTag;

                        app.navigate('create');
                        const banner = document.getElementById('cm-direct-challenge-banner');
                        const targetText = document.getElementById('cm-target-user');
                        if (banner && targetText) {
                            banner.style.display = 'block';
                            targetText.innerText = currentChallengedPlayer;
                        }
                    } else {
                        this.showToast(`Player '${challengeTarget}' not found.`, "error");
                    }
                } catch (err) {
                    this.showToast("Error verifying player.", "error");
                }
            }

        } catch (e) {
            console.error(e);
            this.showToast("Failed to authenticate session.", "error");
        }
    },

    showToast(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `background: rgba(14, 18, 26, 0.95); backdrop-filter: blur(10px); border: 1px solid ${type === 'error' ? '#ff4444' : '#00C851'}; border-radius: 8px; padding: 15px 20px; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 15px; animation: slideInRight 0.3s ease;`;
        toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-times-circle text-red' : 'fa-check-circle text-green'}"></i> <span>${msg}</span>`;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },



    updateBalances() {
        if (!appState.currentUser) return;
        const profile = appState.currentUser;

        const rSc = Number(profile.realSc ?? profile.real_sc ?? 0);
        const bSc = Number(profile.bonusSc ?? profile.practiceCredits ?? profile.practice_credits ?? 0);

        const lSc = Number(profile.lockedSc ?? profile.locked_sc ?? 0);
        const totalPlayable = rSc + lSc;

        const headerReal = document.getElementById('header-real-bal');
        if (headerReal) headerReal.innerText = totalPlayable;

        const lobbyReal = document.getElementById('lobby-real-bal');
        if (lobbyReal) lobbyReal.innerText = totalPlayable;

        const lobbyBonus = document.getElementById('lobby-bonus-bal');
        if (lobbyBonus) lobbyBonus.innerText = bSc;

        const topBarBal = document.querySelector('.wallet-bal');
        if (topBarBal) topBarBal.innerHTML = `<i class="fas fa-coins text-gold"></i> ${totalPlayable} SC <span style="font-size: 0.85em; color: var(--text-muted);">(${bSc} Bonus SC)</span>`;

        if (profile.avatarUrl) {
            const rawUrl = profile.avatarUrl;
            const safeUrl = rawUrl.startsWith('http') ? rawUrl : 'https://playstackarena.com' + rawUrl;
            const imgTag = `<img src="${safeUrl}?t=${new Date().getTime()}" style="width:100%; height:100%; max-width:100%; max-height:100%; border-radius:50%; object-fit:cover; display:block;">`;
            const pp = document.getElementById('profile-pic');
            if (pp) {
                pp.style.overflow = 'hidden';
                pp.innerHTML = imgTag;
            }
        }
    },

    async refreshMatches() {
        try {
            const myRes = await window.api.myMatches();
            const openRes = await window.api.openMatches();

            appState.myMatches = (myRes && myRes.myMatches) ? myRes.myMatches : [];
            appState.openMatches = (openRes && openRes.openMatches) ? openRes.openMatches : [];

        } catch (e) {
            console.error("Failed to load matches", e);
            appState.myMatches = [];
            appState.openMatches = [];
        }
    },

    navigate(view) {
        if (view === 'create') {
            const activeMatches = appState.myMatches.filter(m => ['OPEN', 'STARTING', 'READY_CHECK', 'IN_PROGRESS', 'REPORTING', 'DISPUTED'].includes(m.status)).length;
            if (activeMatches >= 2) {
                return this.showToast("You have 2 or more incomplete matches. Finish them first!", "error");
            }
        }

        document.querySelectorAll('.pg-view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-' + view).classList.add('active');
        appState.currentView = view;

        if (view === 'lobby') {
            this.refreshMatches().then(() => this.renderLobby());
        }
        if (view === 'join') {
            this.refreshMatches().then(() => this.renderJoinFeed());
        }
    },

    toggleMode(mode) {
        appState.mode = mode === 'REAL' ? 'RANKED' : 'PRACTICE';
        const stakeInput = document.getElementById('create-stake');

        if (mode === 'REAL') {
            document.getElementById('tab-real-matches').classList.add('active');
            document.getElementById('tab-bonus-matches').classList.remove('active');
            document.getElementById('context-real').style.display = 'block';
            document.getElementById('context-bonus').style.display = 'none';

            stakeInput.disabled = false;
            stakeInput.value = 100;
        } else {
            document.getElementById('tab-real-matches').classList.remove('active');
            document.getElementById('tab-bonus-matches').classList.add('active');
            document.getElementById('context-real').style.display = 'none';
            document.getElementById('context-bonus').style.display = 'block';

            stakeInput.value = 1;
            stakeInput.disabled = true;
        }

        this.updateCreateCalculations();
        this.renderLobby();
    },

    setLobbyFilter(filter) {
        appState.lobbyFilter = filter;
        document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        document.getElementById('filter-' + filter.toLowerCase()).classList.add('active');
        this.renderLobby();
    },

    getBadgeClass(status) {
        switch (status) {
            case 'OPEN': return 'badge-pending';
            case 'READY_CHECK': return 'badge-accepted';
            case 'STARTING': return 'badge-pending';
            case 'IN_PROGRESS': return 'badge-awaiting';
            case 'REPORTING': return 'badge-awaiting';
            case 'COMPLETED': return 'badge-completed';
            case 'DISPUTED': return 'badge-disputed';
            case 'CANCELLED': return 'badge-disputed';
            default: return 'badge-pending';
        }
    },

    statusIndicator(status) {
        if (status === 'OPEN') return 'PENDING';
        if (status === 'READY_CHECK') return 'ACTION REQUIRED';
        if (status === 'STARTING') return 'JOINED';
        if (status === 'REPORTING') return 'VERIFYING RESULT';
        if (status === 'IN_PROGRESS') return 'IN PROGRESS';
        if (status === 'COMPLETED') return 'COMPLETED';
        if (status === 'DISPUTED') return 'DISPUTED';
        if (status === 'CANCELLED') return 'CANCELLED';
        return status;
    },

    // renderMatchCard(match, isJoinView = false) {
    //     const isHost = match.host && appState.currentUser && (
    //         match.host.id === appState.currentUser.id ||
    //         (appState.currentUser.user && match.host.id === appState.currentUser.user.id)
    //     );
        
    //     let oppName = "Waiting...";
    //     if (isHost && match.guest) oppName = match.guest.gamerTag;
    //     if (!isHost && match.host) oppName = match.host.gamerTag;

    //     const badgeCls = this.getBadgeClass(match.status);
    //     const currency = match.matchType === 'RANKED' ? 'SC' : 'Bonus SC';
    //     const pot = match.entryFeeSc * 2;
    //     const reward = match.matchType === 'RANKED' ? (pot - Math.floor(pot * 0.1)) : pot;

    //     let btnHtml = '';
    //     if (isJoinView) {
    //         btnHtml = `<button class="btn btn-primary full-width mt-3" onclick="app.joinMatch('${match.id}')">Join Match</button>`;
    //     } else {
    //         btnHtml = `<button class="btn btn-outline full-width mt-3" onclick="app.viewMatchDetails('${match.id}')">View Match</button>`;
    //     }

    //     return `
    //     <div class="match-card-h premium" style="flex-direction: column; align-items: stretch; padding: 20px; gap: 15px; background: rgba(20, 20, 30, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px;">
    //         <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
    //             <div>
    //                 <div style="font-weight: bold; color: #fff; font-size: 1.1rem; margin-bottom: 5px;">STAR-${window.escapeHTML(match.id)}</div>
    //                 <div style="font-size: 0.85rem; color: var(--text-muted);">Opponent: <strong style="color:#fff;">${window.escapeHTML(oppName)}</strong></div>
    //             </div>
    //             <div style="text-align: right;">
    //                 <span class="status-badge ${badgeCls}" style="font-size: 0.75rem;">${this.statusIndicator(match.status)}</span>
    //                 <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;"><i class="fas fa-users"></i> ${match.guest ? '2/2' : '1/2'} Players</div>
    //             </div>
    //         </div>
            
    //         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
    //             <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; text-align: center;">
    //                 <span style="display: block; font-size: 0.8rem; color: var(--text-muted);">Entry</span>
    //                 <strong style="color: #fff; font-size: 1.1rem;">${window.escapeHTML(String(match.entryFeeSc))} ${window.escapeHTML(currency)}</strong>
    //             </div>
    //             <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,215,0,0.15);">
    //                 <span style="display: block; font-size: 0.8rem; color: var(--text-muted);">Total Reward</span>
    //                 <strong style="color: var(--accent-gold); font-size: 1.1rem;">${window.escapeHTML(String(reward))} ${window.escapeHTML(currency)}</strong>
    //             </div>
    //         </div>
    //         ${btnHtml}
    //     </div>`;
    // },

    renderMatchCard(match, isJoinView = false) {
        const myUserId = String(appState.currentUser.user ? appState.currentUser.user.id : appState.currentUser.id);
        const isHost = match.host && String(match.host.id) === myUserId;
        
       const isPendingChallenge = !isHost && match.status === 'OPEN' && !match.guest && !isJoinView;
       
        let oppName = "Waiting...";
        if (isHost && match.guest) oppName = match.guest.gamerTag;
        if (!isHost && match.host) oppName = match.host.gamerTag;

        const badgeCls = isPendingChallenge ? 'badge-disputed' : this.getBadgeClass(match.status);
        const statusText = isPendingChallenge ? 'CHALLENGED YOU' : this.statusIndicator(match.status);
        
        const currency = match.matchType === 'RANKED' ? 'SC' : 'Bonus SC';
        const pot = match.entryFeeSc * 2;
        const reward = match.matchType === 'RANKED' ? (pot - Math.floor(pot * 0.1)) : pot;

        let btnHtml = '';
        if (isPendingChallenge) {
          
            btnHtml = `<button class="btn btn-primary full-width mt-3" style="background: var(--accent-orange); border-color: var(--accent-orange);" onclick="app.joinMatch('${match.id}')"><i class="fas fa-fire me-2"></i> Accept Challenge</button>`;
        } else if (isJoinView) {
            btnHtml = `<button class="btn btn-primary full-width mt-3" onclick="app.joinMatch('${match.id}')">Join Match</button>`;
        } else {
            btnHtml = `<button class="btn btn-outline full-width mt-3" onclick="app.viewMatchDetails('${match.id}')">View Match</button>`;
        }

        return `
        <div class="match-card-h premium" style="flex-direction: column; align-items: stretch; padding: 20px; gap: 15px; background: rgba(20, 20, 30, 0.4); border: ${isPendingChallenge ? '1px solid var(--accent-orange)' : '1px solid rgba(255, 255, 255, 0.05)'}; border-radius: 16px; ${isPendingChallenge ? 'box-shadow: 0 0 15px rgba(249, 109, 0, 0.2);' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                <div>
                    <div style="font-weight: bold; color: #fff; font-size: 1.1rem; margin-bottom: 5px;">STAR-${window.escapeHTML(match.id)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">Opponent: <strong style="color:#fff;">${window.escapeHTML(oppName)}</strong></div>
                </div>
                <div style="text-align: right;">
                    <span class="status-badge ${badgeCls}" style="font-size: 0.75rem;">${statusText}</span>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;"><i class="fas fa-users"></i> ${match.guest ? '2/2' : '1/2'} Players</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
                <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 0.8rem; color: var(--text-muted);">Entry</span>
                    <strong style="color: #fff; font-size: 1.1rem;">${window.escapeHTML(String(match.entryFeeSc))} ${window.escapeHTML(currency)}</strong>
                </div>
                <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,215,0,0.15);">
                    <span style="display: block; font-size: 0.8rem; color: var(--text-muted);">Total Reward</span>
                    <strong style="color: var(--accent-gold); font-size: 1.1rem;">${window.escapeHTML(String(reward))} ${window.escapeHTML(currency)}</strong>
                </div>
            </div>
            ${btnHtml}
        </div>`;
    },
    renderLobby() {
        let matches = appState.myMatches.filter(m => m.matchType === appState.mode);

        if (appState.lobbyFilter === 'Pending') {
            matches = matches.filter(m => ['OPEN', 'STARTING'].includes(m.status));
        } else if (appState.lobbyFilter === 'Awaiting') {
            matches = matches.filter(m => ['READY_CHECK', 'IN_PROGRESS', 'REPORTING'].includes(m.status));
        } else if (appState.lobbyFilter === 'Successful') {
            matches = matches.filter(m => ['COMPLETED', 'DISPUTED', 'CANCELLED'].includes(m.status));
        }

        const feed = document.getElementById('my-matches-feed');
        if (matches.length > 0) {
            feed.innerHTML = matches.map(m => this.renderMatchCard(m)).join('');
        } else {
            feed.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px 20px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; color: var(--text-muted);">No matches found in this category.</div>`;
        }
    },

    updateCreateCalculations() {
        const stake = parseInt(document.getElementById('create-stake').value) || 1;
        const isReal = appState.mode === 'RANKED';

        document.getElementById('create-currency-lbl').innerText = isReal ? 'SC' : 'PC';

        if (isReal) {
            const pot = stake * 2;
            const fee = Math.floor(pot * 0.1);
            const reward = pot - fee;

            document.getElementById('create-calc-pool').innerText = `${pot} SC`;
            document.getElementById('create-fee-row').style.display = 'flex';
            document.getElementById('create-calc-fee').innerText = `-${fee} SC`;
            document.getElementById('create-calc-reward').innerText = `${reward} SC`;
        } else {
            document.getElementById('create-calc-pool').innerText = `1 PC`;
            document.getElementById('create-fee-row').style.display = 'none';
            document.getElementById('create-calc-reward').innerText = `Glory & Practice`;
        }
    },

    submitCreateMatch() {
        const stakeInt = parseInt(document.getElementById('create-stake').value);
        const roomIdVal = document.getElementById('create-room-id').value.trim();

        if (!roomIdVal) return this.showToast("Please provide the in-game Room ID to host this match.", "error");

        if (appState.mode === 'RANKED' && (isNaN(stakeInt) || stakeInt < 50)) {
            return this.showToast("Min stake for Ranked is 50 SC", "error");
        }
        if (appState.mode === 'PRACTICE' && stakeInt !== 1) {
            return this.showToast("Practice matches cost exactly 1 PC", "error");
        }

        document.getElementById('automatch-modal').style.display = 'flex';
    },

    async finalizeCreateMatch(isAutomatch) {
        document.getElementById('automatch-modal').style.display = 'none';

        const stakeInt = parseInt(document.getElementById('create-stake').value);
        const rulesVal = document.getElementById('create-rules').value.trim();
        const roomIdVal = document.getElementById('create-room-id').value.trim();
        const roomPassVal = document.getElementById('create-room-pass').value.trim();
        const gameTitle = document.getElementById('create-game').value;

        const btn = document.querySelector('#view-create .btn-primary');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        btn.disabled = true;

        try {
            const res = await window.api.createMatch(gameTitle, stakeInt, appState.mode, rulesVal, roomIdVal, roomPassVal, isAutomatch, currentChallengedPlayer);
            currentChallengedPlayer = null;
            const banner = document.getElementById('cm-direct-challenge-banner');
            if (banner) banner.style.display = 'none';

            if (isAutomatch) {
                this.showToast("Searching for opponent...");
            } else {
                this.showToast("Match created! Waiting for challenger.");
            }

            document.getElementById('create-room-id').value = '';
            document.getElementById('create-room-pass').value = '';
            document.getElementById('create-rules').value = '';

            await this.refreshMatches();

            if (res && res.createMatch) {
                this.viewMatchDetails(res.createMatch.id);
            } else {
                this.setLobbyFilter('Pending');
                this.navigate('lobby');
            }
        } catch (e) {
            this.showToast("Error creating match: " + e.message, "error");
        } finally {
            btn.innerHTML = ogText;
            btn.disabled = false;
        }
    },
    renderJoinFeed() {
        const search = document.getElementById('join-search').value.toLowerCase();
        let openMatches = appState.openMatches.filter(m => m.matchType === appState.mode);

        if (search) {
            openMatches = openMatches.filter(m => m.id.toLowerCase().includes(search) || (m.host && m.host.gamerTag.toLowerCase().includes(search)));
        }

        const feed = document.getElementById('join-matches-feed');
        if (openMatches.length > 0) {
            feed.innerHTML = openMatches.map(m => this.renderMatchCard(m, true)).join('');
        } else {
            feed.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px 20px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; color: var(--text-muted);">No open public matches available right now.</div>`;
        }
    },

    async joinMatch(matchId) {
        try {
            await window.api.joinMatch(matchId);
            this.showToast("Joined match successfully!");
            appState.currentMatchId = matchId;
            await this.refreshMatches();
            this.viewMatchDetails(matchId);
        } catch (e) {
            this.showToast("Failed to join match: " + e.message, "error");
        }
    },


    // async viewMatchDetails(matchId) {
    //     appState.currentMatchId = matchId;
    //     const match = appState.myMatches.find(m => m.id === matchId) || appState.openMatches.find(m => m.id === matchId);
    //     if (!match) return;

    //     const myUserId = String(appState.currentUser.user ? appState.currentUser.user.id : appState.currentUser.id);
    //     const isHost = match.host && appState.currentUser && String(match.host.id) === myUserId;

    //     document.getElementById('details-match-id').innerText = match.id;
    //     document.getElementById('details-status-badge').className = "status-badge " + this.getBadgeClass(match.status);
    //     document.getElementById('details-status-badge').innerText = this.statusIndicator(match.status);

    //     let subStatus = "";
    //     if (match.status === 'OPEN' || (!match.guest && match.status === 'READY_CHECK')) {
    //         subStatus = "Waiting for an opponent to join...";
    //     } else if (match.status === 'STARTING') {
    //         subStatus = isHost ? "Opponent found. Enter Room ID." : "Waiting for Host to create room...";
    //     } else if (match.status === 'READY_CHECK') {
    //         subStatus = "Match ready. Please ready up and join.";
    //     } else if (match.status === 'IN_PROGRESS' || match.status === 'REPORTING') {
    //         subStatus = "Match in progress. Submit result when done.";
    //     } else if (match.status === 'COMPLETED') {
    //         subStatus = `Match Completed.`;
    //     }
    //     document.getElementById('details-sub-status').innerText = subStatus;

    //     document.getElementById('p1-username').innerText = match.host ? match.host.gamerTag : "Host";
    //     if (match.guest) {
    //         document.getElementById('p2-username').innerText = match.guest.gamerTag;
    //         document.getElementById('p2-avatar-container').classList.add('ready');
    //         document.getElementById('p2-avatar-container').classList.remove('waiting');
    //         document.getElementById('p2-avatar-icon').className = "fas fa-user-ninja text-blue";
    //     } else {
    //         document.getElementById('p2-username').innerText = "Waiting...";
    //         document.getElementById('p2-avatar-container').classList.remove('ready');
    //         document.getElementById('p2-avatar-container').classList.add('waiting');
    //         document.getElementById('p2-avatar-icon').className = "fas fa-question text-muted";
    //     }

    //     document.getElementById('details-game').innerText = match.gameTitle;
    //     document.getElementById('details-stake').innerText = match.entryFeeSc + (match.matchType === 'RANKED' ? ' SC' : ' Bonus SC');
    //     const pot = match.entryFeeSc * 2;
    //     const reward = match.matchType === 'RANKED' ? (pot - Math.floor(pot * 0.1)) : pot;
    //     document.getElementById('details-reward').innerText = reward + (match.matchType === 'RANKED' ? ' SC' : ' Bonus SC');

    //     const roomCard = document.getElementById('details-room-card');
    //     if (['READY_CHECK', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'].includes(match.status)) {
    //         roomCard.style.display = 'block';
    //         document.getElementById('details-room-id').innerText = match.roomId || "N/A";
    //         document.getElementById('details-room-pass').innerText = "Hidden";
    //     } else {
    //         roomCard.style.display = 'none';
    //     }

    //     this.renderActionArea(match, isHost);
    //     this.navigate('match-details');

    //     window.api.subscribeToMatch(matchId, async (updatedData) => {
    //         console.log("Real-Time Update Received:", updatedData);

    //         const justCompleted = (updatedData.status === 'COMPLETED' && match.status !== 'COMPLETED');

    //         Object.assign(match, updatedData);

    //         document.getElementById('details-status-badge').className = "status-badge " + this.getBadgeClass(match.status);
    //         document.getElementById('details-status-badge').innerText = this.statusIndicator(match.status);

    //         if (match.roomId && document.getElementById('details-room-card')) {
    //             document.getElementById('details-room-card').style.display = 'block';
    //             document.getElementById('details-room-id').innerText = match.roomId;
    //         }

    //         if (match.guest) {
    //             document.getElementById('p2-username').innerText = match.guest.gamerTag;
    //             document.getElementById('p2-avatar-container').classList.add('ready');
    //             document.getElementById('p2-avatar-container').classList.remove('waiting');
    //             document.getElementById('p2-avatar-icon').className = "fas fa-user-ninja text-blue";
    //         }

    //         this.renderActionArea(match, isHost);

    //         if (justCompleted) {
    //             const profileReq = await window.api.myProfile();
    //             if (profileReq) {
    //                 appState.currentUser = profileReq.myProfile || profileReq;
    //                 this.updateBalances();
    //             }

    //             if (match.winner && String(match.winner.id) === myUserId) {
    //                 this.showToast("Result Confirmed! You WON the match!", "success");
    //             } else {
    //                 this.showToast("Match completed. You lost.", "error");
    //             }
    //         }
    //     });
    // },

    async viewMatchDetails(matchId) {
        appState.currentMatchId = matchId;
        
        const safeMatchId = String(matchId);
        let match = appState.myMatches.find(m => String(m.id) === safeMatchId) || 
                    appState.openMatches.find(m => String(m.id) === safeMatchId);
        
        if (!match) {
            this.showToast("Syncing arena data...", "success");
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.refreshMatches();
            
            match = appState.myMatches.find(m => String(m.id) === safeMatchId) || 
                    appState.openMatches.find(m => String(m.id) === safeMatchId);
                    
            if (!match) {
                this.showToast("Match created, but details delayed. Check Lobby.", "error");
                this.navigate('lobby');
                return;
            }
        }


        const myUserId = String(appState.currentUser.user ? appState.currentUser.user.id : appState.currentUser.id);
        const isHost = match.host && appState.currentUser && String(match.host.id) === myUserId;

        document.getElementById('details-match-id').innerText = match.id;
        document.getElementById('details-status-badge').className = "status-badge " + this.getBadgeClass(match.status);
        document.getElementById('details-status-badge').innerText = this.statusIndicator(match.status);

        let subStatus = "";
        if (match.status === 'OPEN' || (!match.guest && match.status === 'READY_CHECK')) {
            subStatus = "Waiting for an opponent to join...";
        } else if (match.status === 'STARTING') {
            subStatus = isHost ? "Opponent found. Enter Room ID." : "Waiting for Host to create room...";
        } else if (match.status === 'READY_CHECK') {
            subStatus = "Match ready. Please ready up and join.";
        } else if (match.status === 'IN_PROGRESS' || match.status === 'REPORTING') {
            subStatus = "Match in progress. Submit result when done.";
        } else if (match.status === 'COMPLETED') {
            subStatus = `Match Completed.`;
        }
        document.getElementById('details-sub-status').innerText = subStatus;

        document.getElementById('p1-username').innerText = match.host ? match.host.gamerTag : "Host";
        if (match.guest) {
            document.getElementById('p2-username').innerText = match.guest.gamerTag;
            document.getElementById('p2-avatar-container').classList.add('ready');
            document.getElementById('p2-avatar-container').classList.remove('waiting');
            document.getElementById('p2-avatar-icon').className = "fas fa-user-ninja text-blue";
        } else {
            document.getElementById('p2-username').innerText = "Waiting...";
            document.getElementById('p2-avatar-container').classList.remove('ready');
            document.getElementById('p2-avatar-container').classList.add('waiting');
            document.getElementById('p2-avatar-icon').className = "fas fa-question text-muted";
        }

        document.getElementById('details-game').innerText = match.gameTitle;
        document.getElementById('details-stake').innerText = match.entryFeeSc + (match.matchType === 'RANKED' ? ' SC' : ' Bonus SC');
        const pot = match.entryFeeSc * 2;
        const reward = match.matchType === 'RANKED' ? (pot - Math.floor(pot * 0.1)) : pot;
        document.getElementById('details-reward').innerText = reward + (match.matchType === 'RANKED' ? ' SC' : ' Bonus SC');

        const roomCard = document.getElementById('details-room-card');
        if (['READY_CHECK', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'].includes(match.status)) {
            roomCard.style.display = 'block';
            document.getElementById('details-room-id').innerText = match.roomId || "N/A";
            document.getElementById('details-room-pass').innerText = "Hidden";
        } else {
            roomCard.style.display = 'none';
        }

        this.renderActionArea(match, isHost);
        this.navigate('match-details');

        window.api.subscribeToMatch(matchId, async (updatedData) => {
            console.log("Real-Time Update Received:", updatedData);

            const justCompleted = (updatedData.status === 'COMPLETED' && match.status !== 'COMPLETED');

            Object.assign(match, updatedData);

            document.getElementById('details-status-badge').className = "status-badge " + this.getBadgeClass(match.status);
            document.getElementById('details-status-badge').innerText = this.statusIndicator(match.status);

            if (match.roomId && document.getElementById('details-room-card')) {
                document.getElementById('details-room-card').style.display = 'block';
                document.getElementById('details-room-id').innerText = match.roomId;
            }

            if (match.guest) {
                document.getElementById('p2-username').innerText = match.guest.gamerTag;
                document.getElementById('p2-avatar-container').classList.add('ready');
                document.getElementById('p2-avatar-container').classList.remove('waiting');
                document.getElementById('p2-avatar-icon').className = "fas fa-user-ninja text-blue";
            }

            this.renderActionArea(match, isHost);

            if (justCompleted) {
                const profileReq = await window.api.myProfile();
                if (profileReq) {
                    appState.currentUser = profileReq.myProfile || profileReq;
                    this.updateBalances();
                }

                if (match.winner && String(match.winner.id) === myUserId) {
                    this.showToast("Result Confirmed! You WON the match!", "success");
                } else {
                    this.showToast("Match completed. You lost.", "error");
                }
            }
        });
    },
    async refreshCurrentMatch() {
        if (!appState.currentMatchId) return;
        const btn = document.getElementById('btn-refresh-match');
        if (btn) btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';

        await this.refreshMatches();
        this.viewMatchDetails(appState.currentMatchId);
    },

    async uploadProof(matchId, inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        const box = document.querySelector('.result-upload-box');
        if (box) box.innerHTML = '<i class="fas fa-spinner fa-spin text-orange" style="font-size: 2rem;"></i><p class="mt-2">Uploading Proof...</p>';

        try {
            await window.api.submitMatchProof(matchId, file);
            this.showToast("Screenshot proof uploaded successfully!");
            if (box) box.style.display = 'none';
            document.getElementById('proof-status').style.display = 'block';
        } catch (err) {
            this.showToast("Failed to upload proof: " + err.message, "error");
            if (box) box.innerHTML = '<i class="fas fa-times-circle text-red" style="font-size: 2rem;"></i><p class="mt-2">Upload Failed. Click to Try Again.</p>';
        }
    },




    renderActionArea(match, isHost) {
        const area = document.getElementById('details-action-area');
        let html = `<div style="text-align: right; margin-bottom: 15px;"></div>`;
        //Remove the OR if I face problems
        if (match.status === 'OPEN' || (!match.guest && match.status === 'READY_CHECK')) {
            html += `<p style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin me-2"></i> Waiting for challenger...</p>
                    <button class="btn btn-outline" style="color: #ff4444; border-color: #ff4444;" onclick="app.cancelMatch('${match.id}')">Cancel Match</button>`;
        }
        else if (match.status === 'READY_CHECK') {
            const isUserReady = isHost ? match.hostReady : match.guestReady;

            if (isUserReady) {
                html += `
                    <p style="margin-bottom: 15px; color: var(--accent-orange);">You are ready. Waiting for opponent...</p>
                    <button class="btn btn-primary full-width" disabled><i class="fas fa-spinner fa-spin"></i> Waiting...</button>
                `;
            } else {
                html += `
                    <p style="margin-bottom: 15px;">Both players are here. Join game and ready up.</p>
                    <button class="btn btn-primary full-width" onclick="app.readyUp('${match.id}')">I'm Ready</button>
                `;
            }
        }
        else if (match.status === 'IN_PROGRESS' || match.status === 'REPORTING') {

            let hasReported = false;

            const hostClaimed = match.hostClaimedWin ?? match.host_claimed_win;
            const guestClaimed = match.guestClaimedWin ?? match.guest_claimed_win;

            if (isHost && typeof hostClaimed === 'boolean') hasReported = true;
            if (!isHost && typeof guestClaimed === 'boolean') hasReported = true;

            if (hasReported) {
                html += `
                    <div style="padding: 10px 0;">
                        <h4 style="color: var(--accent-orange); margin-bottom: 10px;">Waiting on Opponent</h4>
                        <p style="color: var(--text-muted); font-size: 0.9rem;">You have submitted your result. Waiting for your opponent to confirm.</p>
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent-orange); margin-top: 15px;"></i>
                    </div>
                `;
            } else {
                html += `
                    <p style="margin-bottom: 15px; color: var(--text-muted);">Please be honest. False reports result in bans.</p>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button class="btn btn-primary full-width" style="background:#00C851; border-color:#00C851;" onclick="app.submitResult('${match.id}', true)">
                            <i class="fas fa-trophy"></i> I Won
                        </button>
                        <button class="btn btn-outline full-width" style="color:#ff4444; border-color:#ff4444;" onclick="app.submitResult('${match.id}', false)">
                            <i class="fas fa-skull"></i> I Lost
                        </button>
                    </div>
                `;
            }
        }
        else if (match.status === 'COMPLETED') {
            html += `
                <i class="fas fa-trophy highlight-gold" style="font-size: 3rem; margin-bottom:15px;"></i>
                <h3 style="margin:0 0 5px; color:#fff;">Match Completed</h3>
                <p style="color:var(--text-muted);">Winner: <strong class="text-gold">${match.winner ? match.winner.gamerTag : 'Unknown'}</strong></p>
            `;
        }
        else if (match.status === 'DISPUTED') {
            const hasProof = isHost ? match.hostProofUrl : match.guestProofUrl;

            html += `
                <i class="fas fa-exclamation-triangle text-red" style="font-size: 3rem; margin-bottom:15px;"></i>
                <h3 style="margin:0 0 5px; color:#ff4444;">Under Dispute</h3>
            `;

            if (hasProof) {
                html += `
                    <p style="color:var(--text-muted); margin-bottom:20px;">Your proof has been submitted.</p>
                    <div style="font-size: 1rem; color: #00C851; background: rgba(0, 200, 81, 0.1); padding: 15px; border-radius: 8px; border: 1px solid #00C851;">
                        <i class="fas fa-check-circle"></i> Proof received. Awaiting Admin resolution.
                    </div>
                `;
            } else {
                html += `
                    <p style="color:var(--text-muted); margin-bottom:20px;">Both players claimed victory. Please upload your screenshot proof.</p>
                    
                    <div class="result-upload-box" onclick="document.getElementById('proof-upload').click()">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 10px;"></i>
                        <p style="margin:0; font-weight:bold;">Click to Upload Screenshot</p>
                        <span style="font-size:0.8rem; color:var(--text-muted);">JPG, PNG up to 2MB</span>
                    </div>
                    <input type="file" id="proof-upload" accept="image/*" style="display:none;" onchange="app.uploadProof('${match.id}', this)">
                    <div id="proof-status" style="font-size: 0.9rem; color: #00C851; display:none; margin-top: 15px;">
                        <i class="fas fa-check-circle"></i> Proof Uploaded Successfully. Awaiting Admin.
                    </div>
                `;
            }
        }
        area.innerHTML = html;
    },

    async updateRoomId(matchId) {
        const val = document.getElementById('update-room-id-val').value;
        if (!val) return this.showToast("Room ID required.", "error");
        try {
            await window.api.updateRoomId(matchId, val);
            this.showToast("Room ID updated!");
            await this.refreshMatches();
            this.viewMatchDetails(matchId);
        } catch (e) {
            this.showToast("Failed to update ID: " + e.message, "error");
        }
    },

    async readyUp(matchId) {
        try {
            await window.api.readyUp(matchId);
            this.showToast("You are set as Ready.");
            await this.refreshMatches();
            this.viewMatchDetails(matchId);
        } catch (e) {
            this.showToast("Failed to ready up: " + e.message, "error");
        }
    },

    // async submitResult(matchId, claimedWin) {
    //     try {
    //         await window.api.reportMatchResult(matchId, claimedWin);
    //         this.showToast("Result submitted.");

    //         // Update player balance immediately by refreshing user profile
    //         const profile = await window.api.myProfile();
    //         if (profile) {
    //             appState.currentUser = profile;
    //             this.updateBalances();
    //         }

    //         await this.refreshMatches();
    //         this.viewMatchDetails(matchId);
    //     } catch (e) {
    //         this.showToast("Failed to submit result: " + e.message, "error");
    //     }
    // },

    async submitResult(matchId, claimedWin) {
        try {
            localStorage.setItem(`reported_${matchId}_${appState.currentUser.id}`, 'true');

            await window.api.reportMatchResult(matchId, claimedWin);
            this.showToast("Result submitted.");

            const res = await window.api.myProfile();
            if (res) {
                appState.currentUser = res.myProfile || res;
                this.updateBalances();
            }

            await this.refreshMatches();
            this.viewMatchDetails(matchId);
        } catch (e) {
            localStorage.removeItem(`reported_${matchId}_${appState.currentUser.id}`);
            this.showToast("Failed to submit result: " + e.message, "error");
        }
    },


    async cancelMatch(matchId) {
        try {
            await window.api.cancelMatch(matchId);
            this.showToast("Match cancelled.");
            await this.refreshMatches();
            this.viewMatchDetails(matchId);
        } catch (e) {
            this.showToast("Failed to cancel: " + e.message, "error");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
