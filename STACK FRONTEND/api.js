const IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const BASE_URL = IS_PRODUCTION
    ? 'https://playstackarena.com'
    : 'http://localhost:8000';

const API_ENDPOINT = `${BASE_URL}/graphql/`;

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

window.escapeHTML = function (str) {
    if (str === null || str === undefined) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

async function graphqlRequest(query, variables = {}) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
            credentials: 'include'
        });

        const currentPath = window.location.pathname;
        const isPublicPage = currentPath.endsWith('index.html') || currentPath.endsWith('register.html') || currentPath.endsWith('login.html') || currentPath === '/' || currentPath === '';

        if (response.status === 401 || response.status === 403) {
            console.warn("Session expired or unauthorized. Redirecting to login...");
            if (!isPublicPage) window.location.href = 'login.html';
            return null;
        }

        const json = await response.json();

        if (json.errors) {
            console.error("GraphQL Errors:", json.errors);
            const errMsg = json.errors[0].message.toLowerCase();
            if (errMsg.includes('not logged in') || errMsg.includes('authentication required')) {
                if (!isPublicPage) window.location.href = 'login.html';
                return null;
            }
            throw new Error(json.errors[0].message || "GraphQL Error");
        }

        return json.data;
    } catch (error) {
        console.error("API Request Failed:", error);
        throw error;
    }
}

const api = {
    // Commented out the old registerUser function because we're now using the new one with fingerprint ID

    // async registerUser(email, password, gamerTag, fullname = "New User", gender = "Prefer Not to Say") {
    //     const query = `
    //         mutation RegisterUser($input: RegisterInput!) {
    //             registerUser(input: $input) {
    //                 id gamerTag practiceCredits lockedSc hasMadeFirstDeposit user { id email }
    //             }
    //         }
    //     `;
    //     return await graphqlRequest(query, { input: { email, password, gamerTag, fullname, gender } });
    // },

    // async loginUser(email, password) {
    //     const query = `
    //         mutation LoginUser($input: LoginInput!) {
    //             loginUser(input: $input) {
    //                 id gamerTag realSc practiceCredits lockedSc
    //             }
    //         }
    //     `;
    //     return await graphqlRequest(query, { input: { email, password } });
    // },
    // The Landing Page Stats Fetcher I talked about
    async getPlatformMetrics() {
        const query = `
            query {
                platformMetrics {
                    matchesPlayedToday
                    activePlayersThisWeek
                    totalScPaidOut
                }
            }
        `;
        return await graphqlRequest(query);
    },

    // I Updated Auth to include the Fingerprint ID check it out
    async registerUser(email, password, gamerTag, fullname = "New User", gender = "Prefer Not to Say", visitorId = null) {
        const query = `
            mutation RegisterUser($input: RegisterInput!) {
                registerUser(input: $input) {
                    id gamerTag practiceCredits lockedSc hasMadeFirstDeposit user { id email }
                }
            }
        `;
        return await graphqlRequest(query, { input: { email, password, gamerTag, fullname, gender, visitorId } });
    },

    async loginUser(email, password, visitorId = null) {
        const query = `
            mutation LoginUser($input: LoginInput!) {
                loginUser(input: $input) {
                    id gamerTag realSc practiceCredits lockedSc
                }
            }
        `;
        return await graphqlRequest(query, { input: { email, password, visitorId } });
    },
    matchSocket: null,
    userSocket: null,
    userHeartbeat: null,
    matchHeartbeat: null,
    userEventCallbacks: [],

    // subscribeToUserEvents(onEventCallback) {
    //     this.unsubscribeFromUserEvents();
    //     const wsUrl = IS_PRODUCTION
    //         ? 'wss://playstackarena.com/graphql/'
    //         : 'ws://localhost:8000/graphql/';

    //     try {
    //         this.userSocket = new WebSocket(wsUrl, 'graphql-transport-ws');

    //         this.userSocket.onopen = () => {
    //             this.userSocket.send(JSON.stringify({ type: 'connection_init' }));
    //         };
    //         this.userHeartbeat = setInterval(() => {
    //             if (this.userSocket && this.userSocket.readyState === WebSocket.OPEN) {
    //                 this.userSocket.send(JSON.stringify({ type: 'ping' }));
    //             }
    //         }, 30000);

    //         this.userSocket.onmessage = (event) => {
    //             const msg = JSON.parse(event.data);

    //             if (msg.type === 'connection_ack') {
    //                 // Subsccribe to the User Events stream on connection
    //                 const query = `
    //                     subscription WatchUserEvents {
    //                         watchUserEvents {
    //                             type
    //                             cardType
    //                             matchId
    //                         }
    //                     }
    //                 `;
    //                 this.userSocket.send(JSON.stringify({
    //                     id: 'user_events_sub',
    //                     type: 'subscribe',
    //                     payload: { query, variables: {} }
    //                 }));
    //             }
    //             else if (msg.type === 'next' && msg.payload && msg.payload.data) {
    //                 const eventData = msg.payload.data.watchUserEvents;
    //                 if (eventData && (eventData.type === 'share_card.trigger' || eventData.type === 'match.redirect')) {
    //                     onEventCallback({
    //                         type: eventData.type,
    //                         card_type: eventData.cardType,
    //                         match_id: eventData.matchId
    //                     });
    //                 }
    //             }
    //         };
    //         this.userSocket.onerror = (err) => console.error("User WS Error:", err);
    //     } catch (e) {
    //         console.error("Could not init User WebSocket", e);
    //     }
    // },

    // unsubscribeFromUserEvents() {
    //     if (this.userHeartbeat) {
    //         clearInterval(this.userHeartbeat);
    //         this.userHeartbeat = null;
    //     }
    //     if (this.userSocket) {
    //         if (this.userSocket.readyState === WebSocket.OPEN) {
    //             this.userSocket.close();
    //         }
    //         this.userSocket = null;
    //     }
    // },

    subscribeToUserEvents(onEventCallback) {
        if (!this.userEventCallbacks) {
            this.userEventCallbacks = [];
        }
        if (onEventCallback && !this.userEventCallbacks.includes(onEventCallback)) {
            this.userEventCallbacks.push(onEventCallback);
        }

        if (this.userSocket && (this.userSocket.readyState === WebSocket.OPEN || this.userSocket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const wsUrl = IS_PRODUCTION
            ? 'wss://playstackarena.com/graphql/'
            : 'ws://localhost:8000/graphql/';

        try {
            this.userSocket = new WebSocket(wsUrl, 'graphql-transport-ws');

            this.userSocket.onopen = () => {
                this.userSocket.send(JSON.stringify({ type: 'connection_init' }));

                this.userHeartbeat = setInterval(() => {
                    if (this.userSocket && this.userSocket.readyState === WebSocket.OPEN) {
                        this.userSocket.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            this.userSocket.onmessage = (event) => {
                const msg = JSON.parse(event.data);

                if (msg.type === 'connection_ack') {
                    const query = `
                        subscription WatchUserEvents {
                            watchUserEvents {
                                type
                                cardType
                                matchId
                            }
                        }
                    `;
                    this.userSocket.send(JSON.stringify({
                        id: 'user_events_sub',
                        type: 'subscribe',
                        payload: { query, variables: {} }
                    }));
                }
                else if (msg.type === 'next' && msg.payload && msg.payload.data) {
                    const eventData = msg.payload.data.watchUserEvents;
                    if (eventData && (eventData.type === 'share_card.trigger' || eventData.type === 'match.redirect')) {

                        this.userEventCallbacks.forEach(cb => {
                            cb({
                                type: eventData.type,
                                card_type: eventData.cardType,
                                match_id: eventData.matchId
                            });
                        });

                    }
                }
            };
            this.userSocket.onerror = (err) => console.error("User WS Error:", err);
        } catch (e) {
            console.error("Could not init User WebSocket", e);
        }
    },

    unsubscribeFromUserEvents() {
        if (this.userHeartbeat) {
            clearInterval(this.userHeartbeat);
            this.userHeartbeat = null;
        }
        if (this.userSocket) {
            if (this.userSocket.readyState === WebSocket.OPEN || this.userSocket.readyState === WebSocket.CONNECTING) {
                this.userSocket.close();
            }
            this.userSocket = null;
        }
        this.userEventCallbacks = [];
    },

    subscribeToMatch(matchId, onUpdateCallback) {
        this.unsubscribeFromMatch();

        const wsUrl = IS_PRODUCTION
            ? 'wss://playstackarena.com/graphql/'
            : 'ws://localhost:8000/graphql/';

        this.matchSocket = new WebSocket(wsUrl, 'graphql-transport-ws');

        this.matchSocket.onopen = () => {
            this.matchSocket.send(JSON.stringify({ type: 'connection_init' }));
        };

        this.matchHeartbeat = setInterval(() => {
            if (this.matchSocket && this.matchSocket.readyState === WebSocket.OPEN) {
                this.matchSocket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);

        this.matchSocket.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === 'connection_ack') {
                const query = `
                    subscription WatchMatch($matchId: ID!) {
                        watchMatch(matchId: $matchId) {
                            id status roomId roomLink roomPass hostReady guestReady hostClaimedWin guestClaimedWin
                            hostProofUrl guestProofUrl host { id gamerTag } guest { id gamerTag } winner { id gamerTag }
                        }
                    }
                `;
                this.matchSocket.send(JSON.stringify({
                    id: `match_${matchId}`,
                    type: 'subscribe',
                    payload: { query, variables: { matchId } }
                }));
            }
            else if (msg.type === 'next' && msg.payload && msg.payload.data) {
                onUpdateCallback(msg.payload.data.watchMatch);
            }
        };

        this.matchSocket.onerror = (err) => console.error("WebSocket Error:", err);
    },

    unsubscribeFromMatch() {
        if (this.matchHeartbeat) {
            clearInterval(this.matchHeartbeat);
            this.matchHeartbeat = null;
        }
        if (this.matchSocket) {
            this.matchSocket.close();
            this.matchSocket = null;
        }
    },

    async updateProfile(gamerTag, phoneNumber, bankName, accountNumber, accountName, notificationsEnabled = true, codmUid = " ") {
        const query = `
            mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id gamerTag codmUid bankName accountNumber accountName
                }
            }
        `;
        return await graphqlRequest(query, { input: { gamerTag, phoneNumber, bankName, accountNumber, accountName, notificationsEnabled, codmUid } });
    },


    async verifyAccount(email, otp) {
        const query = `
            mutation VerifyAccount($email: String!, $otp: String!) {
                verifyAccount(email: $email, otp: $otp){
                    id
                    gamerTag
                    realSc
                    }
            }
        `;
        return await graphqlRequest(query, { email, otp });
    },

    async changePassword(currentPassword, newPassword) {
        const query = `
            mutation ChangePassword($input: ChangePasswordInput!) {
                changePassword(input: $input)
            }
        `;
        return await graphqlRequest(query, { input: { currentPassword, newPassword } });
    },

    async myProfile() {
        const query = `
            query {
                myProfile {
                    id gamerTag codmUid realSc practiceCredits lockedSc rankPoints lockedWinnings winStreak hasMadeFirstDeposit isFlagged avatarUrl 
                    user { id email dateJoined }
                }
            }
        `;
        return await graphqlRequest(query);
    },
    async searchPlayer(gamerTag) {
        const query = `
            query SearchPlayer($gamerTag: String!) {
                searchPlayer(gamerTag: $gamerTag) {
                    gamerTag
                }
            }
        `;
        return await graphqlRequest(query, { gamerTag });
    },
    async myNotifications() {
        const query = `query { myNotifications { id title message isRead createdAt } }`;
        return await graphqlRequest(query);
    },
    async markNotificationsRead() {
        const query = `mutation { markNotificationsRead }`;
        return await graphqlRequest(query);
    },
    async deleteAccount(password) {
        const query = `
            mutation DeleteAccount($password: String!) {
                deleteAccount(password: $password)
            }
        `;
        return await graphqlRequest(query, { password });
    },


    // BASE 64 IMAGE UPLOADS ONLY
    async uploadAvatar(file) {
        const base64String = await fileToBase64(file);
        const query = `
            mutation UploadAvatar($fileBase64: String!, $fileName: String!) {
                uploadAvatar(fileBase64: $fileBase64, fileName: $fileName) {
                    id avatarUrl
                }
            }
        `;
        return await graphqlRequest(query, { fileBase64: base64String, fileName: file.name });
    },

    async submitMatchProof(matchId, file) {
        const base64String = await fileToBase64(file);
        const query = `
            mutation SubmitMatchProof($matchId: ID!, $fileBase64: String!, $fileName: String!) {
                submitMatchProof(matchId: $matchId, fileBase64: $fileBase64, fileName: $fileName) {
                    id status
                }
            }
        `;
        return await graphqlRequest(query, { matchId, fileBase64: base64String, fileName: file.name });
    },


    // async createMatch(gameTitle, entryFeeSc, matchType, rules = "", roomId = "", roomPass = "", isAutomatch = false) {
    //     const query = `
    //         mutation CreateMatch($input: CreateMatchInput!) {
    //             createMatch(input: $input) {
    //                 id status entryFeeSc gameTitle host { id email }
    //             }
    //         }
    //     `;
    //     return await graphqlRequest(query, {
    //         input: { gameTitle, entryFeeSc, matchType, rules, roomId, roomPass, isAutomatch }
    //     });
    // },

    async createMatch(gameTitle, entryFeeSc, matchType, rules = "", roomId = "", roomPass = "", isAutomatch = false, invitedGuestTag = null, roomLink = "") {
        const query = `
            mutation CreateMatch($input: CreateMatchInput!) {
                createMatch(input: $input) {
                    id status entryFeeSc gameTitle host { id email }
                }
            }
        `;
        return await graphqlRequest(query, {
            input: { gameTitle, entryFeeSc, matchType, rules, roomId, roomPass, isAutomatch, invitedGuestTag, roomLink }
        });
    },
    async joinMatch(matchId) {
        const query = `
            mutation JoinMatch($input: JoinMatchInput!) {
                joinMatch(input: $input) {
                    id status guest { id }
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId } });
    },
    async requestPasswordReset(email) {
        const query = `
            mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
                requestPasswordReset(input: $input)
            }
        `;
        return await graphqlRequest(query, { input: { email } });
    },

    async confirmPasswordReset(email, otp, newPassword) {
        const query = `
            mutation ConfirmPasswordReset($input: ConfirmPasswordResetInput!) {
                confirmPasswordReset(input: $input)
            }
        `;
        return await graphqlRequest(query, { input: { email, otp, newPassword } });
    },

    async updateRoomId(matchId, roomId) {
        const query = `
            mutation UpdateRoomId($input: UpdateRoomIdInput!) {
                updateRoomId(input: $input) {
                    id status roomId
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId, roomId } });
    },

    async readyUp(matchId) {
        const query = `
            mutation ReadyUp($input: ReadyUpInput!) {
                readyUp(input: $input) { id status }
            }
        `;
        return await graphqlRequest(query, { input: { matchId } });
    },

    async reportMatchResult(matchId, claimedWin) {
        const query = `
            mutation ReportMatchResult($input: ReportMatchInput!) {
                reportMatchResult(input: $input) {
                    id status winner { id gamerTag }
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId, claimedWin } });
    },

    async cancelMatch(matchId) {
        const query = `
            mutation CancelMatch($input: CancelMatchInput!) {
                cancelMatch(input: $input) { id status }
            }
        `;
        return await graphqlRequest(query, { input: { matchId } });
    },

    async resolveDispute(matchId, winnerId) {
        const query = `
            mutation ResolveDispute($input: ResolveDisputeInput!) {
                resolveDispute(input: $input) {
                    id status winner { id }
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId, winnerId } });
    },

    async openMatches() {
        const query = `
            query {
                openMatches {
                    id gameTitle entryFeeSc updatedAt matchType status rules host { id email gamerTag }
                }
            }
        `;
        return await graphqlRequest(query);
    },

    async myMatches() {
        const query = `
            query {
                myMatches {
                    id status gameTitle matchType entryFeeSc updatedAt rules roomId  roomLink roomPass
                    hostClaimedWin guestClaimedWin hostProofUrl guestProofUrl
                    hostReady guestReady
                    host { id gamerTag } guest { id gamerTag } winner { id gamerTag }
                }
            }
        `;
        return await graphqlRequest(query);
    },


    async myStats() {
        const query = `
            query {
                myStats {
                    gamerTag totalMatches wins losses winRate rankPoints realSc practiceCredits lockedSc
                }
            }
        `;
        return await graphqlRequest(query);
    },

    async globalLeaderboard(limit = 100) {
        const query = `
            query GlobalLeaderboard($limit: Int) {
                globalLeaderboard(limit: $limit) {
                    gamerTag totalMatches wins winRate rankPoints realSc lockedSc avatarUrl
                }
            }
        `;
        return await graphqlRequest(query, { limit });
    },

    // 3. Engagement API
    async myDailyMissions() {
        const query = `
            query {
                myDailyMissions {
                    id title currentValue targetValue isCompleted rewardPracticeCredits
                }
            }
        `;
        return await graphqlRequest(query);
    },

    async claimMissionReward(progressId) {
        const query = `
            mutation ClaimMissionReward($progressId: Int!) {
                claimMissionReward(progressId: $progressId)
            }
        `;
        return await graphqlRequest(query, { progressId });
    },

    // 4. Wallets API
    async initializeDeposit(amountNgn) {
        const query = `
            mutation InitializeDeposit($amountNgn: Int!) {
                initializeDeposit(amountNgn: $amountNgn) {
                    authorizationUrl reference
                }
            }
        `;
        return await graphqlRequest(query, { amountNgn });
    },

    async requestWithdrawal(amountSc, bankCode, accountNumber, accountName) {
        const query = `
            mutation RequestWithdrawal($input: RequestWithdrawalInput!) {
                requestWithdrawal(input: $input)
            }
        `;
        return await graphqlRequest(query, { input: { amountSc, bankCode, accountNumber, accountName } });
    },

    async myWalletHistory() {
        const query = `
            query {
                myWalletHistory {
                    id amountSc transactionType status reference createdAt
                }
            }
        `;
        return await graphqlRequest(query);
    }
};

window.api = api;