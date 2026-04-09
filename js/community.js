// Phluowise Community Page Logic - Social Deep Engagement Version
// This script handles feature requests, bidirectional voting, and interactive comments.

document.addEventListener('DOMContentLoaded', async () => {
    const { DATABASE_ID, COMMUNITY_REQUESTS_TABLE, COMMUNITY_VOTES_TABLE, COMMUNITY_COMMENTS_TABLE, COMMUNITY_COMMENT_VOTES_TABLE } = window.appwriteConfig;

    const CommunityStore = {
        async getRequests() {
            try {
                const response = await databases.listDocuments(DATABASE_ID, COMMUNITY_REQUESTS_TABLE, [
                    Query.orderDesc('$createdAt'),
                    Query.limit(100)
                ]);
                return response.documents;
            } catch (error) {
                console.error("Fetch requests failed:", error);
                return [];
            }
        },

        async getUserVotes(userId) {
            try {
                const response = await databases.listDocuments(DATABASE_ID, COMMUNITY_VOTES_TABLE, [
                    Query.equal('userId', userId),
                    Query.limit(100)
                ]);
                const votes = {};
                response.documents.forEach(doc => {
                    // Use direction if it exists, otherwise fallback to voteCount mapping
                    votes[doc.requestId] = doc.direction || (doc.voteCount === 1 ? 'up' : 'down');
                });
                return votes;
            } catch (error) {
                console.error("Fetch user votes failed:", error);
                return {};
            }
        },

        async getCommentVotes(userId) {
            try {
                const response = await databases.listDocuments(DATABASE_ID, COMMUNITY_COMMENT_VOTES_TABLE, [
                    Query.equal('userId', userId),
                    Query.limit(100)
                ]);
                const votes = {};
                response.documents.forEach(doc => {
                    votes[doc.commentId] = doc.direction;
                });
                return votes;
            } catch (error) {
                console.error("Fetch comment votes failed:", error);
                return {};
            }
        },

        async getComments(requestId) {
            try {
                const response = await databases.listDocuments(DATABASE_ID, COMMUNITY_COMMENTS_TABLE, [
                    Query.equal('requestId', requestId),
                    Query.orderAsc('$createdAt'),
                    Query.limit(100)
                ]);
                return response.documents;
            } catch (error) {
                console.error("Fetch comments failed:", error);
                return [];
            }
        }
    };

    // ─── Helpers ──────────────────────────────────────────────────────────
    const devLog = (...args) => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('[Community Debug]:', ...args);
        }
    };

    // Global Schema Guard - prevents 400 errors from missing attributes
    const filterPayload = (payload) => {
        if (!state.missingAttributes) return payload;
        const filtered = { ...payload };
        Object.keys(state.missingAttributes).forEach(key => {
            delete filtered[key];
        });
        return filtered;
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return 'Just now';
        const date = new Date(isoString);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    };

    // ─── Initial State ────────────────────────────────────────────────────
    const state = {
        requests: [],
        userVotes: {},
        commentVotes: {},
        currentUser: null,
        charts: {
            status: null,
            ranking: null
        }
    };

    try {
        if (window.account) {
            try {
                const user = await window.account.get();
                if (user) state.currentUser = user;
            } catch (e) { console.warn("Guest mode active."); }
        }
        if (!state.currentUser) state.currentUser = { $id: 'guest_local', name: 'Guest User' };
    } catch (error) { console.error("Auth error:", error); }

    // ─── Initialize Public API ───────────────────────────────────────────
    window.switchTab = (tabName) => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase() === tabName));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.toggle('active', content.id === `${tabName}Tab`));
        if (tabName === 'distribution' && state.charts.status) state.charts.status.update();
        if (tabName === 'ranking' && state.charts.ranking) state.charts.ranking.update();
    };

    window.toggleStatsMenu = () => {
        const container = document.getElementById('statsMenu');
        if (container) container.classList.toggle('active');
    };

    window.openModal = () => {
        document.getElementById('modalTitle').innerText = 'Propose a Feature';
        document.getElementById('submitBtnText').innerText = 'Submit Proposal';
        document.getElementById('editRequestId').value = '';
        document.getElementById('featureTitle').value = '';
        document.getElementById('featureDesc').value = '';
        document.getElementById('requestModal').classList.add('active');
    };

    window.closeModal = () => document.getElementById('requestModal').classList.remove('active');
    window.closeDetails = () => document.getElementById('detailsModal').classList.remove('active');

    window.toggleFabGroup = () => {
        document.getElementById('fabGroup')?.classList.toggle('collapsed');
    };

    window.toggleComments = (id) => {
        devLog("Toggling comments for:", id);
        const section = document.getElementById(`comments-${id}`);
        if (!section) return;
        const isActive = section.classList.toggle('active');
        if (isActive) {
            setTimeout(() => {
                section.querySelector('.comment-input')?.focus();
            }, 100);
        }
    };

    window.handleCommentVote = async (featureId, commentId, direction) => {
        if (state.currentUser?.$id === 'guest_local') {
            showToast("Please log in to vote on comments.", "error");
            return;
        }

        const request = state.requests.find(r => r.$id === featureId);
        if (!request) return;
        const comment = request.comments?.find(c => c.$id === commentId);
        if (!comment) return;

        const currentVote = state.commentVotes[commentId];
        if (currentVote === direction) return; // Already voted

        // Optimistic UI updates
        let upDelta = 0;
        let downDelta = 0;

        if (currentVote) {
            if (currentVote === 'up') upDelta--; else downDelta--;
        }

        if (direction === 'up') upDelta++; else downDelta++;

        comment.upvotes = (comment.upvotes || 0) + upDelta;
        comment.downvotes = (comment.downvotes || 0) + downDelta;
        state.commentVotes[commentId] = direction;
        
        renderRequests(); // Refresh UI including open modals

        try {
            // Save vote record
            const votePayload = filterPayload({
                userId: state.currentUser.$id,
                commentId: commentId,
                direction: direction,
                userName: state.currentUser.name || 'Anonymous'
            });

            // Find existing vote to update or create new
            const existing = await databases.listDocuments(DATABASE_ID, COMMUNITY_COMMENT_VOTES_TABLE, [
                Query.equal('userId', state.currentUser.$id),
                Query.equal('commentId', commentId)
            ]);

            if (existing.documents.length > 0) {
                await databases.updateDocument(DATABASE_ID, COMMUNITY_COMMENT_VOTES_TABLE, existing.documents[0].$id, votePayload);
            } else {
                await databases.createDocument(DATABASE_ID, COMMUNITY_COMMENT_VOTES_TABLE, ID.unique(), votePayload);
            }

            // Update comment statistics
            const updateData = filterPayload({
                upvotes: comment.upvotes,
                downvotes: comment.downvotes
            });

            await databases.updateDocument(DATABASE_ID, COMMUNITY_COMMENTS_TABLE, commentId, updateData);
            showToast("Comment vote recorded!");
        } catch (error) {
            console.error("Comment vote failed:", error);
            // Rollback optimistic update
            comment.upvotes -= upDelta;
            comment.downvotes -= downDelta;
            state.commentVotes[commentId] = currentVote;
            renderRequests();
            showToast("Failed to record vote.", "error");
        }
    };

    // ─── Event Listeners ──────────────────────────────────────────────────
    document.getElementById('openModalBtn')?.addEventListener('click', window.openModal);
    document.getElementById('featureForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput')?.addEventListener('input', debounce(filterRequests, 300));
    document.getElementById('statusFilter')?.addEventListener('change', filterRequests);
    document.getElementById('sortFilter')?.addEventListener('change', loadFeatureRequests);

    // Character Counter Logic
    const titleInput = document.getElementById('featureTitle');
    const descInput = document.getElementById('featureDesc');
    
    const updateCounter = (el, max) => {
        let counter = el.parentElement.querySelector('.char-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'char-counter text-right text-xs text-secondary mt-1';
            el.parentElement.appendChild(counter);
        }
        counter.innerText = `${el.value.length}/${max}`;
        counter.style.color = el.value.length >= max ? '#EF4444' : 'var(--text-secondary)';
    };

    titleInput?.addEventListener('input', () => updateCounter(titleInput, 100));
    descInput?.addEventListener('input', () => updateCounter(descInput, 1000));

    // ─── Startup ──────────────────────────────────────────────────────────
    initChart();
    // Non-blocking load
    loadFeatureRequests().catch(e => console.error("Initial load failure:", e));


    // ─── Toast System ─────────────────────────────────────────────────────
    window.showToast = (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>` :
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px) scale(0.9)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };


    // ─── Details Modal ────────────────────────────────────────────────────
    window.openDetails = (requestId) => {
        const req = state.requests.find(r => r.$id === requestId);
        if (!req) return;

        const modal = document.getElementById('detailsModal');
        const up = req.upvotes || 0;
        const down = req.downvotes || 0;
        const total = up + down;
        const upPercent = total > 0 ? (up / total) * 100 : 50;
        const downPercent = total > 0 ? (down / total) * 100 : 50;

        modal.innerHTML = `
            <div class="modal-content max-w-2xl">
                <div class="flex justify-between items-center mb-6">
                    <span class="status-badge status-${req.status || 'pending'}">${(req.status || 'pending').replace('-', ' ')}</span>
                    <button onclick="closeDetails()" class="text-secondary hover:text-white"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div class="mb-4">
                    <h2 class="text-2xl font-bold text-white">${window.sanitize(req.title)}</h2>
                    <span class="text-xs text-secondary">${formatDateTime(req.$createdAt)}</span>
                </div>
                <p class="text-secondary mb-8 leading-relaxed">${window.sanitize(req.description)}</p>
                
                <div class="vote-stats-container mb-8">
                    <div class="vote-stats-bar h-2">
                        <div class="vote-bar-up" style="width: ${upPercent}%"></div>
                        <div class="vote-bar-down" style="width: ${downPercent}%"></div>
                    </div>
                    <div class="vote-stats-labels">
                        <span>${Math.round(upPercent)}% Supported</span>
                        <span>${Math.round(downPercent)}% Opposed</span>
                    </div>
                </div>

                <div class="comment-section active" style="display: block; border: none; padding: 0;">
                    <h3 class="text-lg font-bold mb-4">Conversation (${req.comments?.length || 0})</h3>
                    <div class="comment-list max-h-60" id="detail-comments-${req.$id}">
                        ${renderCommentList(req.$id, req.comments || [])}
                    </div>
                    <div class="comment-input-group mt-4">
                        <input type="text" class="comment-input" id="detail-input-${req.$id}" placeholder="Join the discussion..." onkeypress="if(event.key === 'Enter') submitComment('${req.$id}', true)">
                        <button class="send-comment-btn" onclick="submitComment('${req.$id}', true)">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.classList.add('active');
    };

    window.closeDetails = () => document.getElementById('detailsModal').classList.remove('active');

    window.toggleComments = (id) => {
        devLog("Toggling comments for:", id);
        const section = document.getElementById(`comments-${id}`);
        if (!section) return;

        const isActive = section.classList.toggle('active');
        if (isActive) {
            setTimeout(() => {
                section.querySelector('.comment-input')?.focus();
            }, 100);
        }
    };

    // ─── Core Logic ───────────────────────────────────────────────────────

    async function loadFeatureRequests() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="spinner"></div>';

        state.requests = await CommunityStore.getRequests();

        if (state.currentUser && state.currentUser.$id !== 'guest_local') {
            state.userVotes = await CommunityStore.getUserVotes(state.currentUser.$id);
            state.commentVotes = await CommunityStore.getCommentVotes(state.currentUser.$id);
        }

        // Fetch all comments and group them (Increased limit for better coverage)
        const response = await databases.listDocuments(DATABASE_ID, COMMUNITY_COMMENTS_TABLE, [
            Query.orderAsc('$createdAt'),
            Query.limit(1000)
        ]);
        const allComments = response.documents;

        state.requests.forEach(req => {
            req.comments = allComments.filter(c => c.requestId === req.$id);
        });

        const sort = document.getElementById('sortFilter').value;
        if (sort === 'newest') state.requests.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
        else state.requests.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

        renderRequests(state.requests);
        updateDashboard(state.requests);
    }

    function renderRequests(requests) {
        const requestsToRender = requests || state.requests;
        const container = document.getElementById('requestsContainer');

        if (requestsToRender.length === 0) {
            container.innerHTML = `<div class="col-span-full py-20 text-center text-secondary">No community proposals found yet. Be the first to start one!</div>`;
            return;
        }

        container.innerHTML = requestsToRender.map(req => {
            const up = req.upvotes || 0;
            const down = req.downvotes || 0;
            const total = up + down;
            const upPercent = total > 0 ? (up / total) * 100 : 50;
            const downPercent = total > 0 ? (down / total) * 100 : 50;

            const userVote = state.userVotes[req.$id];
            const statusClass = `status-${req.status || 'pending'}`;
            const reqComments = req.comments || [];
            const isOwner = req.userId === state.currentUser?.$id;
            const statusLabel = (req.status || 'pending').replace('-', ' ');
            const userNameDisplay = window.sanitize(req.userName || 'Anonymous');

            return `
                <div class="glass-card request-card animate-fade-in" id="req-${req.$id}">
                    <div class="flex justify-between items-start">
                        <div class="flex flex-col gap-2">
                            <span class="status-badge ${statusClass}">${statusLabel}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-secondary">${formatDateTime(req.$createdAt)}</span>
                            ${isOwner ? `
                                <div class="card-actions">
                                    <button class="action-btn edit" onclick="editFeature('${req.$id}')" title="Edit">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button class="action-btn delete" onclick="deleteFeature('${req.$id}')" title="Delete">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <h3 class="request-title cursor-pointer hover:text-primary transition-colors" onclick="openDetails('${req.$id}')">${window.sanitize(req.title)}</h3>
                    <p class="request-desc">${window.sanitize(req.description)}</p>
                    
                    <div class="request-footer flex flex-col gap-4 mt-6">
                        <div class="flex justify-between items-center">
                            <div class="vote-group">
                                <button class="vote-action-btn up ${userVote === 'up' ? 'active' : ''}" onclick="handleVote('${req.$id}', 'up')">
                                    <svg class="w-5 h-5" fill="${userVote === 'up' ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                                <span class="vote-count-display">${req.voteCount || 0}</span>
                                <button class="vote-action-btn down ${userVote === 'down' ? 'active' : ''}" onclick="handleVote('${req.$id}', 'down')">
                                    <svg class="w-5 h-5" fill="${userVote === 'down' ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            
                            <button class="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors" onclick="window.toggleComments('${req.$id}')">
                                <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <span class="pointer-events-none">${reqComments.length}</span>
                            </button>
                        </div>

                        <!-- Modern Line Stats -->
                        <div class="vote-stats-container">
                            <div class="vote-stats-bar">
                                <div class="vote-bar-up" style="width: ${upPercent}%"></div>
                                <div class="vote-bar-down" style="width: ${downPercent}%"></div>
                            </div>
                            <div class="vote-stats-labels">
                                <span class="stat-icon-wrap">${Math.round(upPercent)}% UP (${up})</span>
                                <span class="stat-icon-wrap">(${down}) ${Math.round(downPercent)}% DOWN</span>
                            </div>
                        </div>
                    </div>

                    <div class="comment-section" id="comments-${req.$id}">
                        <div class="comment-list" id="comment-list-${req.$id}">
                            ${renderCommentList(req.$id, reqComments)}
                        </div>
                        <div class="comment-input-group">
                            <input type="text" class="comment-input" id="input-${req.$id}" placeholder="Type here..." onkeypress="if(event.key === 'Enter') submitComment('${req.$id}')">
                            <button class="send-comment-btn" onclick="submitComment('${req.$id}')">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderCommentList(featureId, comments) {
        if (comments.length === 0) return '<p class="text-xs text-secondary text-center py-4">No comments yet.</p>';
        
        // Find if any comment was added in the last 10 seconds to apply flash animation
        const now = new Date();
        
        return comments.map(c => {
            const userVote = state.commentVotes[c.$id];
            const isOwner = c.userId === state.currentUser.$id;
            const commentDate = new Date(c.$createdAt);
            const isNew = (now - commentDate) < 10000; // 10 seconds

            const up = c.upvotes || 0;
            const down = c.downvotes || 0;
            const total = up + down;
            const upPercent = total > 0 ? (up / total) * 100 : 50;
            const downPercent = total > 0 ? (down / total) * 100 : 50;

            return `
                <div class="comment-bubble ${isNew ? 'comment-updated' : ''}" id="comment-${c.$id}">
                    <div class="comment-meta">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-ash-light font-outfit text-xs">${window.sanitize(c.userName)}</span>
                            <span class="text-[10px] opacity-70">${formatDateTime(c.$createdAt)}</span>
                        </div>
                        ${isOwner ? `
                            <div class="flex items-center gap-2">
                                <button class="action-btn edit scale-75" onclick="editComment('${featureId}', '${c.$id}')" title="Edit Comment">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button class="action-btn delete scale-75" onclick="deleteComment('${featureId}', '${c.$id}')" title="Delete Comment">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <p class="text-sm text-ash-light leading-relaxed mb-4">${window.sanitize(c.text)}</p>
                    
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex items-center gap-4">
                            <button class="c-vote-btn up ${userVote === 'up' ? 'active' : ''}" onclick="window.handleCommentVote('${featureId}', '${c.$id}', 'up')">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                                <span class="font-bold">${up}</span>
                            </button>
                            <button class="c-vote-btn down ${userVote === 'down' ? 'active' : ''}" onclick="window.handleCommentVote('${featureId}', '${c.$id}', 'down')">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                                <span class="font-bold">${down}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Mini Line Stats -->
                    <div class="comment-stats-container">
                        <div class="comment-stats-bar">
                            <div class="c-bar-up" style="width: ${upPercent}%"></div>
                            <div class="c-bar-down" style="width: ${downPercent}%"></div>
                        </div>
                        <div class="comment-stats-labels">
                            <span>${Math.round(upPercent)}% Supported</span>
                            <span>${Math.round(downPercent)}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const confirmAction = (title, text) => {
        return new Promise((resolve) => {
            const overlay = document.getElementById('confirmOverlay');
            const titleEl = document.getElementById('confirmTitle');
            const textEl = document.getElementById('confirmText');
            const cancelBtn = document.getElementById('confirmCancel');
            const actionBtn = document.getElementById('confirmAction');

            titleEl.innerText = title;
            textEl.innerText = text;
            overlay.classList.add('active');

            const cleanup = (res) => {
                overlay.classList.remove('active');
                cancelBtn.onclick = null;
                actionBtn.onclick = null;
                resolve(res);
            };

            cancelBtn.onclick = () => cleanup(false);
            actionBtn.onclick = () => cleanup(true);
            overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
        });
    };

    window.editFeature = (id) => {
        const req = state.requests.find(r => r.$id === id);
        if (!req) return;
        document.getElementById('modalTitle').innerText = 'Edit Proposal';
        document.getElementById('submitBtnText').innerText = 'Update Proposal';
        document.getElementById('editRequestId').value = id;
        document.getElementById('featureTitle').value = req.title;
        document.getElementById('featureDesc').value = req.description;
        document.getElementById('requestModal').classList.add('active');
    };

    window.deleteFeature = async (id) => {
        const confirmed = await confirmAction('Delete Proposal?', 'This action cannot be undone. All votes and comments for this feature will be lost forever.');
        if (!confirmed) return;
        
        try {
            await databases.deleteDocument(DATABASE_ID, COMMUNITY_REQUESTS_TABLE, id);
            showToast("Proposal deleted.");
            // Real-time will handle the update
        } catch (error) {
            console.error("Deletion failed:", error);
            showToast("Failed to delete proposal.", "error");
        }
    };

    window.editComment = (featureId, commentId) => {
        const comment = state.requests.flatMap(r => r.comments || []).find(c => c.$id === commentId);
        if (!comment) return;

        const body = document.getElementById(`comment-body-${commentId}`);
        body.innerHTML = `
            <div class="flex gap-2 mt-2">
                <input type="text" class="comment-input" id="edit-input-${commentId}" value="${window.sanitize(comment.text)}" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 8px 12px; border: 1px solid var(--glass-border);">
                <button class="action-btn edit" onclick="saveCommentEdit('${featureId}', '${commentId}')" title="Save">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </button>
            </div>
        `;
        document.getElementById(`edit-input-${commentId}`).focus();
    };

    window.saveCommentEdit = async (featureId, commentId) => {
        const newText = document.getElementById(`edit-input-${commentId}`).value.trim();
        if (!newText) return;

        try {
            await databases.updateDocument(DATABASE_ID, COMMUNITY_COMMENTS_TABLE, commentId, {
                text: newText
            });
            showToast("Comment updated!");
            // Real-time will handle the update
        } catch (error) {
            console.error("Comment edit failed:", error);
            showToast("Failed to edit comment.", "error");
        }
    };

    window.deleteComment = async (featureId, commentId) => {
        const confirmed = await confirmAction('Delete Comment?', 'Are you sure you want to remove this comment?');
        if (!confirmed) return;

        try {
            await databases.deleteDocument(DATABASE_ID, COMMUNITY_COMMENTS_TABLE, commentId);
            showToast("Comment removed.");
        } catch (error) {
            console.error("Comment deletion failed:", error);
            showToast("Failed to delete comment.", "error");
        }
    };

    window.handleCommentVote = async (featureId, commentId, direction) => {
        if (!state.currentUser || state.currentUser.$id === 'guest_local') return;

        try {
            const existingVotes = await databases.listDocuments(DATABASE_ID, COMMUNITY_COMMENT_VOTES_TABLE, [
                Query.equal('userId', state.currentUser.$id),
                Query.equal('commentId', commentId)
            ]);

            const currentVote = state.commentVotes[commentId];
            let voteDelta = 0;

            if (currentVote === direction) {
                if (existingVotes.documents.length > 0) {
                    await databases.deleteDocument(DATABASE_ID, COMMUNITY_COMMENT_VOTES_TABLE, existingVotes.documents[0].$id);
                }
                voteDelta = (direction === 'up' ? -1 : 1);
                delete state.commentVotes[commentId];
            } else {
                if (existingVotes.documents.length > 0) {
                    await databases.updateDocument(DATABASE_ID, COMMUNITY_COMMENT_VOTES_TABLE, existingVotes.documents[0].$id, {
                        direction: direction
                    });
                    voteDelta = (direction === 'up' ? 2 : -2);
                } else {
                    await databases.createDocument(DATABASE_ID, COMMUNITY_COMMENT_VOTES_TABLE, ID.unique(), {
                        userId: state.currentUser.$id,
                        commentId: commentId,
                        direction: direction
                    });
                    voteDelta = (direction === 'up' ? 1 : -1);
                }
                state.commentVotes[commentId] = direction;
            }

            // Get the current comment count to update it
            const commentDoc = await databases.getDocument(DATABASE_ID, COMMUNITY_COMMENTS_TABLE, commentId);
            await databases.updateDocument(DATABASE_ID, COMMUNITY_COMMENTS_TABLE, commentId, {
                voteCount: (commentDoc.voteCount || 0) + voteDelta
            });

        } catch (error) {
            console.error("Comment voting failed:", error);
        }
    };

    // ─── Real-time Synchronization ───────────────────────────────────────
    function initRealtime() {
        if (!window.client) return;

        const endpoint = `databases.${DATABASE_ID}.collections.${COMMUNITY_REQUESTS_TABLE}.documents`;
        const commentEndpoint = `databases.${DATABASE_ID}.collections.${COMMUNITY_COMMENTS_TABLE}.documents`;

        window.client.subscribe([endpoint, commentEndpoint], (response) => {
            devLog("Real-time update received:", response);
            // Throttle or just reload the list
            loadFeatureRequests();
        });
    }

    initRealtime();

    // ─── CRUD Actions ─────────────────────────────────────────────────────

    window.submitComment = async (featureId, fromDetails = false) => {
        const suffix = fromDetails ? 'detail-' : '';
        const input = document.getElementById(`${suffix}input-${featureId}`);
        const btn = input.nextElementSibling;
        const text = input.value.trim();
        if (!text || !state.currentUser) return;

        btn.classList.add('loading-active');
        btn.disabled = true;

        try {
            await databases.createDocument(DATABASE_ID, COMMUNITY_COMMENTS_TABLE, ID.unique(), {
                requestId: featureId,
                userName: state.currentUser.name,
                userId: state.currentUser.$id,
                text: text,
                voteCount: 0
            });
            input.value = '';
            showToast("Comment added!");
            
            // Wait for refresh to ensure state has the new comment
            await loadFeatureRequests();
            
            if (fromDetails) {
                // Re-open/Refresh details modal with updated state
                openDetails(featureId);
            }
        } catch (error) {
            console.error("Comment submission failed:", error);
            showToast("Failed to send comment.", "error");
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading-active');
        }
    };

    window.handleVote = async (featureId, direction) => {
        if (!state.currentUser || state.currentUser.$id === 'guest_local') {
            showToast("Please log in to vote!", "error");
            return;
        }

        const request = state.requests.find(r => r.$id === featureId);
        if (!request) return;

        const currentVote = state.userVotes[featureId];
        let voteDelta = 0;
        let upDelta = 0;
        let downDelta = 0;

        // Optimistic UI calculation
        if (currentVote === direction) {
            // Remove vote
            voteDelta = (direction === 'up' ? -1 : 1);
            if (direction === 'up') upDelta = -1; else downDelta = -1;
            delete state.userVotes[featureId];
        } else {
            // Change or add vote
            if (currentVote) {
                // Switching side
                voteDelta = (direction === 'up' ? 2 : -2);
                if (direction === 'up') { upDelta = 1; downDelta = -1; } else { upDelta = -1; downDelta = 1; }
            } else {
                // Initial vote
                voteDelta = (direction === 'up' ? 1 : -1);
                if (direction === 'up') upDelta = 1; else downDelta = 1;
            }
            state.userVotes[featureId] = direction;
        }

        // Apply Optimistic Update
        request.voteCount = (request.voteCount || 0) + voteDelta;
        request.upvotes = (request.upvotes || 0) + upDelta;
        request.downvotes = (request.downvotes || 0) + downDelta;
        renderRequests();
        
        try {
            const existingVotes = await databases.listDocuments(DATABASE_ID, COMMUNITY_VOTES_TABLE, [
                Query.equal('userId', state.currentUser.$id),
                Query.equal('requestId', featureId)
            ]);

            if (!state.userVotes[featureId]) {
                if (existingVotes.documents.length > 0) {
                    await databases.deleteDocument(DATABASE_ID, COMMUNITY_VOTES_TABLE, existingVotes.documents[0].$id);
                }
            } else {
                const votePayload = filterPayload({
                    userId: state.currentUser.$id,
                    requestId: featureId,
                    voteCount: direction === 'up' ? 1 : -1,
                    userName: state.currentUser.name || 'Anonymous',
                    text: "Vote recorded"
                });

                if (existingVotes.documents.length > 0) {
                    await databases.updateDocument(DATABASE_ID, COMMUNITY_VOTES_TABLE, existingVotes.documents[0].$id, votePayload);
                } else {
                    await databases.createDocument(DATABASE_ID, COMMUNITY_VOTES_TABLE, ID.unique(), votePayload);
                }
            }

            // Update request statistics
            const updateData = filterPayload({
                voteCount: request.voteCount,
                upvotes: request.upvotes,
                downvotes: request.downvotes
            });

            await databases.updateDocument(DATABASE_ID, COMMUNITY_REQUESTS_TABLE, featureId, updateData);

            showToast(`Vote ${!state.userVotes[featureId] ? 'removed' : 'recorded'}!`);
            updateDashboard(state.requests);

        } catch (error) {
            console.error("Voting failed:", error);
            
            // Auto-detect missing attributes and retry
            if (error.message?.includes('Unknown attribute')) {
                const match = error.message.match(/"([^"]+)"/);
                const attr = match ? match[1] : null;
                if (attr) {
                    if (!state.missingAttributes) state.missingAttributes = {};
                    state.missingAttributes[attr] = true;
                    devLog(`Detected missing attribute: ${attr}. Retrying...`);
                    return window.handleVote(featureId, direction); // Recursive retry with filtered payload
                }
            }
            
            showToast("Failed to sync vote. Reverting...", "error");
            loadFeatureRequests(); 
        }
    };

    async function handleFormSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('featureTitle').value;
        const description = document.getElementById('featureDesc').value;
        const editId = document.getElementById('editRequestId').value;
        const btn = document.getElementById('submitFeatureBtn');

        if (!state.currentUser) return;

        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            if (editId) {
                const updateData = filterPayload({ title, description });
                await databases.updateDocument(DATABASE_ID, COMMUNITY_REQUESTS_TABLE, editId, updateData);
                showToast("Proposal updated!");
            } else {
                const createData = filterPayload({
                    title,
                    description,
                    status: 'pending',
                    userId: state.currentUser.$id,
                    userName: (state.currentUser.name || 'User'),
                    voteCount: 1,
                    upvotes: 1,
                    downvotes: 0
                });

                await databases.createDocument(DATABASE_ID, COMMUNITY_REQUESTS_TABLE, ID.unique(), createData);
                showToast("Proposal submitted successfully!");
            }
            closeModal();
            loadFeatureRequests();
        } catch (error) {
            console.error("Submission failed:", error);
            
            if (error.message?.includes('Unknown attribute')) {
                const match = error.message.match(/"([^"]+)"/);
                const attr = match ? match[1] : null;
                if (attr) {
                    if (!state.missingAttributes) state.missingAttributes = {};
                    state.missingAttributes[attr] = true;
                    devLog(`Detected missing attribute: ${attr}. Retrying submission...`);
                    return handleFormSubmit(e); // Recursive retry
                }
            }
            showToast("Submission failed. Please try again.", "error");
        } finally {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
        }
    }

    window.deleteFeature = async (id) => {
        const confirmed = await confirmAction('Delete Proposal?', 'This action cannot be undone. All votes and comments will be lost.');
        if (!confirmed) return;

        try {
            await databases.deleteDocument(DATABASE_ID, COMMUNITY_REQUESTS_TABLE, id);
            // Real-time will handle the update
        } catch (error) {
            console.error("Deletion failed:", error);
        }
    };

    window.editFeature = (id) => {
        const req = state.requests.find(r => r.$id === id);
        if (!req) return;

        document.getElementById('featureTitle').value = req.title;
        document.getElementById('featureDesc').value = req.description;
        document.getElementById('editRequestId').value = req.$id;
        document.getElementById('modalTitle').innerText = 'Update Proposal';
        document.getElementById('submitBtnText').innerText = 'Save Changes';
        document.getElementById('requestModal').classList.add('active');
    };

    function filterRequests() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const status = document.getElementById('statusFilter').value;
        const filtered = state.requests.filter(req => {
            const matchesQuery = req.title.toLowerCase().includes(query) || req.description.toLowerCase().includes(query);
            const matchesStatus = status === 'all' || req.status === status;
            return matchesQuery && matchesStatus;
        });
        renderRequests(filtered);
    }

    function initChart() {
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        state.charts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Approved', 'Building', 'Shipped'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['rgba(251, 191, 36, 0.6)', 'rgba(155, 161, 166, 0.6)', 'rgba(59, 116, 255, 0.6)', 'rgba(34, 197, 94, 0.6)'],
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#9BA1A6' } } }, cutout: '70%' }
        });

        const rankingCtx = document.getElementById('rankingChart').getContext('2d');
        state.charts.ranking = new Chart(rankingCtx, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Score', data: [], backgroundColor: 'rgba(59, 116, 255, 0.5)', borderColor: 'rgba(59, 116, 255, 1)', borderWidth: 1, borderRadius: 8 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9BA1A6' } }, y: { grid: { display: false }, ticks: { color: '#FFFFFF' } } }, plugins: { legend: { display: false } } }
        });
    }

    function updateDashboard(requests) {
        const stats = {
            total: requests.length,
            votes: requests.reduce((sum, r) => sum + (r.upvotes || 0) + (r.downvotes || 0), 0),
            pending: requests.filter(r => r.status === 'pending').length,
            approved: requests.filter(r => r.status === 'approved').length,
            building: requests.filter(r => r.status === 'in-progress').length,
            shipped: requests.filter(r => r.status === 'completed').length
        };
        document.getElementById('bubbleTotal').innerText = stats.total;
        document.getElementById('bubbleVotes').innerText = stats.votes;
        document.getElementById('bubbleBuilding').innerText = stats.building;
        document.getElementById('bubbleShipped').innerText = stats.shipped;
        state.charts.status.data.datasets[0].data = [stats.pending, stats.approved, stats.building, stats.shipped];
        state.charts.status.update();
        const topRequests = [...requests].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0)).slice(0, 5);
        state.charts.ranking.data.labels = topRequests.map(r => r.title.length > 20 ? r.title.substring(0, 17) + '...' : r.title);
        state.charts.ranking.data.datasets[0].data = topRequests.map(r => r.voteCount || 0);
        state.charts.ranking.update();
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // ─── Draggable Navigation Logic ───────────────────────────────────────
    function initDraggableFAB() {
        const fabGroup = document.getElementById('fabGroup');
        const toggler = fabGroup.querySelector('.fab-toggler');

        let isDragging = false;
        let startX, startY;
        let initialX, initialY;
        let dragThreshold = 5;
        let hasMoved = false;

        // Load saved position
        const savedPos = localStorage.getItem('phluowise_fab_position');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            fabGroup.style.bottom = 'auto';
            fabGroup.style.right = 'auto';
            fabGroup.style.left = pos.left + 'px';
            fabGroup.style.top = pos.top + 'px';
        }

        toggler.onpointerdown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = fabGroup.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            hasMoved = false;
            fabGroup.classList.add('dragging');
            toggler.setPointerCapture(e.pointerId);
        };

        toggler.onpointermove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
                hasMoved = true;
            }

            if (hasMoved) {
                let newX = initialX + dx;
                let newY = initialY + dy;

                // Boundary constraints
                const margin = 20;
                newX = Math.max(margin, Math.min(newX, window.innerWidth - fabGroup.offsetWidth - margin));
                newY = Math.max(margin, Math.min(newY, window.innerHeight - fabGroup.offsetHeight - margin));

                fabGroup.style.bottom = 'auto';
                fabGroup.style.right = 'auto';
                fabGroup.style.left = newX + 'px';
                fabGroup.style.top = newY + 'px';
            }
        };

        toggler.onpointerup = (e) => {
            if (!isDragging) return;
            isDragging = false;
            fabGroup.classList.remove('dragging');
            toggler.releasePointerCapture(e.pointerId);

            if (hasMoved) {
                e.stopPropagation(); // Prevent the toggle click

                // Snapping Logic
                const rect = fabGroup.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const margin = 20;

                let finalX;
                if (centerX < window.innerWidth / 2) {
                    finalX = margin; // Snap left
                } else {
                    finalX = window.innerWidth - rect.width - margin; // Snap right
                }

                fabGroup.style.left = finalX + 'px';

                // Persistence
                localStorage.setItem('phluowise_fab_position', JSON.stringify({
                    left: finalX,
                    top: rect.top
                }));
            }
        };
    }

    initDraggableFAB();
});
