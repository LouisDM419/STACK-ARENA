// api.js - Stack Arena GraphQL API Hooks


// const API_ENDPOINT = '/graphql';
// async function graphqlRequest(query, variables = {}) {
//     try {
//         const response = await fetch(API_ENDPOINT, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//             },
//             body: JSON.stringify({ query, variables })
//         });

//         const json = await response.json();

//         if (json.errors) {
//             console.error("GraphQL Errors:", json.errors);
//             throw new Error(json.errors[0].message || "GraphQL Error");
//         }

//         return json.data;
//     } catch (error) {
//         console.error("API Request Failed:", error);
//         throw error;
//     }
// }

const IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const BASE_URL = IS_PRODUCTION
    ? 'https://playstackarena.com'
    : 'http://localhost:8000';

const API_ENDPOINT = `${BASE_URL}/graphql/`;

// async function graphqlRequest(query, variables = {}) {
//     const token = localStorage.getItem('stack_arena_token');

//     try {
//         const response = await fetch(API_ENDPOINT, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//             },
//             body: JSON.stringify({ query, variables }),
//             credentials: 'include'
//         });


//         if (response.status === 401) {
//             localStorage.removeItem('stack_arena_token');
//             window.location.href = '/login.html';
//             return;
//         }

//         const json = await response.json();

//         if (json.errors) {
//             console.error("GraphQL Errors:", json.errors);
//             throw new Error(json.errors[0].message || "GraphQL Error");
//         }

//         return json.data;
//     } catch (error) {
//         console.error("API Request Failed:", error);
//         throw error;
//     }
// }

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

        if (response.status === 401 || response.status === 403) {
            console.warn("Session expired or unauthorized. Redirecting to login...");
            window.location.href = 'login.html';
            return;
        }

        const json = await response.json();

        if (json.errors) {
            console.error("GraphQL Errors:", json.errors);
            if (json.errors[0].message.toLowerCase().includes('not logged in')) {
                window.location.href = 'login.html';
                return;
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
    // 1. Accounts API
    async registerUser(email, password, gamerTag, fullname = "New User", gender = "Prefer Not to Say") {
        const query = `
            mutation RegisterUser($input: RegisterInput!) {
                registerUser(input: $input) {
                    id
                    gamerTag
                    bonusSc
                    user {
                        id
                        email
                    }
                }
            }
        `;
        return await graphqlRequest(query, { input: { email, password, gamerTag, fullname, gender } });
    },

    async loginUser(email, password) {
        const query = `
            mutation LoginUser($input: LoginInput!) {
                loginUser(input: $input) {
                    id
                    gamerTag
                    realSc
                    bonusSc
                }
            }
        `;

        const data = await graphqlRequest(query, { input: { email, password } });

        // yeah I adjusted your code to save tokens on login 
        if (data && data.loginUser && data.loginUser.token) {
            localStorage.setItem('stack_arena_token', data.loginUser.token);
        }
        return data;
    },

    async updateProfile(gamerTag, phoneNumber, bankName, accountNumber, accountName, notificationsEnabled = true) {
        const query = `
            mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                    gamerTag
                    bankName
                    accountNumber
                    accountName
                }
            }
        `;
        return await graphqlRequest(query, { input: { gamerTag, phoneNumber, bankName, accountNumber, accountName, notificationsEnabled } });
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
                    id
                    gamerTag
                    realSc
                    bonusSc
                    rankPoints
                    lockedWinnings
                    winStreak
                    bankName
                    accountNumber
                    user {
                        email
                        dateJoined
                    }
                }
            }
        `;
        return await graphqlRequest(query);
    },

    // 2. Matchmaking API
    async createMatch(gameTitle, entryFeeSc, matchType, rules = "", roomId = "", roomPass = "") {
        const query = `
            mutation CreateMatch($input: CreateMatchInput!) {
                createMatch(input: $input) {
                    id
                    status
                    entryFeeSc
                    gameTitle
                    host { id email }
                }
            }
        `;
        return await graphqlRequest(query, { input: { gameTitle, entryFeeSc, matchType, rules, roomId, roomPass } });
    },

    async joinMatch(matchId) {
        const query = `
            mutation JoinMatch($input: JoinMatchInput!) {
                joinMatch(input: $input) {
                    id
                    status
                    guest { id }
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId } });
    },

    async updateRoomId(matchId, roomId) {
        const query = `
            mutation UpdateRoomId($input: UpdateRoomIdInput!) {
                updateRoomId(input: $input) {
                    id
                    status
                    roomId
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId, roomId } });
    },

    async readyUp(matchId) {
        const query = `
            mutation ReadyUp($input: ReadyUpInput!) {
                readyUp(input: $input) {
                    id
                    status
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId } });
    },

    async reportMatchResult(matchId, claimedWin) {
        const query = `
            mutation ReportMatchResult($input: ReportMatchResultInput!) {
                reportMatchResult(input: $input) {
                    id
                    status
                    winner { id gamerTag }
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId, claimedWin } });
    },

    async cancelMatch(matchId) {
        const query = `
            mutation CancelMatch($input: CancelMatchInput!) {
                cancelMatch(input: $input) {
                    id
                    status
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId } });
    },

    async resolveDispute(matchId, winnerId) {
        const query = `
            mutation ResolveDispute($input: ResolveDisputeInput!) {
                resolveDispute(input: $input) {
                    id
                    status
                    winner { id }
                }
            }
        `;
        return await graphqlRequest(query, { input: { matchId, winnerId } });
    },

    async openMatches() {
        const query = `
            query {
                openMatches {
                    id
                    gameTitle
                    entryFeeSc
                    status
                    host { id email gamerTag }
                }
            }
        `;
        return await graphqlRequest(query);
    },

    async myMatches() {
        const query = `
            query {
                myMatches {
                    id
                    status
                    gameTitle
                    entryFeeSc
                    roomId
                    host { id gamerTag }
                    guest { id gamerTag }
                    winner { id gamerTag }
                }
            }
        `;
        return await graphqlRequest(query);
    },

    async myStats() {
        const query = `
            query {
                myStats {
                    gamerTag
                    totalMatches
                    wins
                    losses
                    winRate
                    rankPoints
                    realSc
                    bonusSc
                    lockedWinnings
                }
            }
        `;
        return await graphqlRequest(query);
    },

    async globalLeaderboard(limit = 10) {
        const query = `
            query GlobalLeaderboard($limit: Int) {
                globalLeaderboard(limit: $limit) {
                    gamerTag
                    totalMatches
                    wins
                    winRate
                    rankPoints
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
                    id
                    title
                    currentValue
                    targetValue
                    isCompleted
                    rewardBonusSc
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
                    authorizationUrl
                    reference
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
                    id
                    amountSc
                    transactionType
                    status
                    reference
                    createdAt
                }
            }
        `;
        return await graphqlRequest(query);
    }
};

// Export to global scope for static HTML pages
window.api = api;
