// api.js - Stack Arena GraphQL API Hooks

const API_ENDPOINT = '/graphql';

/**
 * Core GraphQL Fetcher
 */
async function graphqlRequest(query, variables = {}) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });

        const json = await response.json();

        if (json.errors) {
            console.error("GraphQL Errors:", json.errors);
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
    async registerUser(email, password, gamerTag) {
        const query = `
            mutation RegisterUser($input: RegisterInput!) {
                registerUser(input: $input) {
                    id
                    gamerTag
                    bonusSc
                }
            }
        `;
        return await graphqlRequest(query, { input: { email, password, gamerTag } });
    },

    async loginUser(email, password) {
        const query = `
            mutation LoginUser($input: LoginInput!) {
                loginUser(input: $input) {
                    id
                    gamerTag
                }
            }
        `;
        return await graphqlRequest(query, { input: { email, password } });
    },

    async updateProfile(gamerTag, phoneNumber, gameIds) {
        const query = `
            mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                    gamerTag
                    phoneNumber
                }
            }
        `;
        return await graphqlRequest(query, { input: { gamerTag, phoneNumber, gameIds } });
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
                }
            }
        `;
        return await graphqlRequest(query);
    },

    // 2. Matchmaking API
    async createMatch(gameTitle, entryFeeSc, matchType) {
        const query = `
            mutation CreateMatch($input: CreateMatchInput!) {
                createMatch(input: $input) {
                    id
                    status
                    entryFeeSc
                    gameTitle
                    matchType
                }
            }
        `;
        return await graphqlRequest(query, { input: { gameTitle, entryFeeSc, matchType } });
    },

    async joinMatch(matchId) {
        const query = `
            mutation JoinMatch($input: JoinMatchInput!) {
                joinMatch(input: $input) {
                    id
                    status
                    guest { id gamerTag }
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

    async openMatches() {
        const query = `
            query {
                openMatches {
                    id
                    host { id email gamerTag }
                    guest { id email gamerTag }
                    gameTitle
                    entryFeeSc
                    matchType
                    roomId
                    status
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
                    entryFeeSc
                    gameTitle
                    matchType
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

    async globalLeaderboard() {
        const query = `
            query {
                globalLeaderboard {
                    gamerTag
                    totalMatches
                    wins
                    winRate
                    rankPoints
                }
            }
        `;
        return await graphqlRequest(query);
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
