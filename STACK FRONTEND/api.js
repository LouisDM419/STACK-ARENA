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
            const errMsg = json.errors[0].message.toLowerCase();
            if (errMsg.includes('not logged in') || errMsg.includes('authentication required')) {
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
                    avatarUrl
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
    async uploadAvatar(file) {
        const query = `
            mutation UploadAvatar($file: Upload!) {
                uploadAvatar(file: $file) {
                    id
                    avatarUrl
                }
            }
        `;
        // We pass 'file' as the fileKey so the function knows where to map it
        return await graphqlFileUpload(query, {}, 'file', file);
    },

    async submitMatchProof(matchId, file) {
        const query = `
            mutation SubmitMatchProof($matchId: ID!, $proof: Upload!) {
                submitMatchProof(matchId: $matchId, proof: $proof) {
                    id
                    status
                }
            }
        `;
        // We pass 'proof' as the fileKey
        return await graphqlFileUpload(query, { matchId }, 'proof', file);
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
// Add this right below your existing graphqlRequest function
async function graphqlFileUpload(query, variables = {}, fileKey, fileObj) {
    try {
        const formData = new FormData();

        // 1. Create the standard GraphQL operations object
        // We set the actual file variable to 'null' as a placeholder
        const operations = {
            query,
            variables: { ...variables, [fileKey]: null }
        };
        formData.append('operations', JSON.stringify(operations));

        // 2. Create the map that tells the server where to put the file
        const map = {
            "0": [`variables.${fileKey}`]
        };
        formData.append('map', JSON.stringify(map));

        // 3. Append the actual physical file
        formData.append('0', fileObj);

        // 4. Send the request
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData,
            credentials: 'include'
            // CRITICAL: Do NOT set 'Content-Type' manually here!
        });

        if (response.status === 401 || response.status === 403) {
            console.warn("Session expired. Redirecting to login...");
            window.location.href = 'login.html';
            return;
        }

        const json = await response.json();

        if (json.errors) {
            console.error("GraphQL Upload Errors:", json.errors);
            throw new Error(json.errors[0].message || "Upload Failed");
        }

        return json.data;
    } catch (error) {
        console.error("API Upload Failed:", error);
        throw error;
    }
}
// Export to global scope for static HTML pages
window.api = api;
