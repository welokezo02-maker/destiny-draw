/* ==========================================================================
   script.js - DESTINY DRAW ARCHITECTURE ENGINE
   ========================================================================== */

(function () {
    'use strict';

    // ---------------------------------------------------------
    // SYSTEM CONFIGURATION & CONSTANTS
    // ---------------------------------------------------------
    const DEFINED_ROLES = [
        "Leader",
        "Opening Prayer",
        "Scripture Reading",
        "Offertory Prayer",
        "Offering Collection",
        "Volunteer",
        "Announcements",
        "Icebreaker",
        "Closing Prayer",
        "Game Host",
        "Worship Assistant"
    ];

    const STORAGE_KEYS = {
        STATE: "destiny_draw_state_v1"
    };

    // ---------------------------------------------------------
    // CORE APPLICATION STATE MATRIX
    // ---------------------------------------------------------
    let AppState = {
        assignedRoles: {}, // Format: { "Role Name": "Player Name" }
        history: [],       // Array of structural logs: { name: "", role: "", status: "" }
        currentPlayer: {
            name: "",
            wins: 0,
            gamesPlayed: 0,
            currentGameIndex: 0,
            gamePool: []
        }
    };

    // ---------------------------------------------------------
    // DOM CACHE REGISTRY
    // ---------------------------------------------------------
    const DOM = {
        views: {
            inputName: document.getElementById('view-input-name'),
            gameIntro: document.getElementById('view-game-intro'),
            gameArena: document.getElementById('view-game-arena'),
            gameResult: document.getElementById('view-game-result'),
            destiny: document.getElementById('view-destiny'),
            resolution: document.getElementById('view-resolution'),
            summary: document.getElementById('view-summary')
        },
        inputs: {
            playerName: document.getElementById('player-name-input')
        },
        buttons: {
            startJourney: document.getElementById('btn-start-journey'),
            skipIntro: document.getElementById('btn-skip-intro'),
            continueJourney: document.getElementById('btn-continue-journey'),
            triggerRoulette: document.getElementById('btn-trigger-roulette'),
            finishTurn: document.getElementById('btn-finish-turn'),
            restartFull: document.getElementById('btn-restart-full'),
            fullscreen: document.getElementById('btn-fullscreen'),
            resetSession: document.getElementById('btn-reset-session')
        },
        displays: {
            rolesList: document.getElementById('roles-list'),
            historyList: document.getElementById('history-list'),
            introGameTitle: document.getElementById('intro-game-title'),
            introGameDesc: document.getElementById('intro-game-desc'),
            introCountdown: document.getElementById('intro-countdown'),
            arenaGameName: document.getElementById('arena-game-name'),
            arenaTimer: document.getElementById('arena-timer'),
            arenaCanvas: document.getElementById('arena-canvas-container'),
            arenaScore: document.getElementById('arena-score-tracking'),
            resultTitle: document.getElementById('result-status-title'),
            resultDesc: document.getElementById('result-status-desc'),
            destinyTitle: document.getElementById('destiny-title'),
            destinySubtitle: document.getElementById('destiny-subtitle'),
            roleGrid: document.getElementById('role-selection-grid'),
            randomizerMachine: document.getElementById('randomizer-machine'),
            randomizerRoulette: document.getElementById('randomizer-roulette'),
            resolutionTitle: document.getElementById('resolution-outcome-title'),
            resolvedCardInner: document.querySelector('#resolved-role-card .card-inner'),
            summaryTableBody: document.getElementById('summary-table-body')
        }
    };

    // ---------------------------------------------------------
    // INITIALIZATION & PERSISTENCE LAYER
    // ---------------------------------------------------------
    function init() {
        loadSessionData();
        setupGlobalEventListeners();
        renderSidebar();
        evaluateInitialViewRouting();
    }

    function saveSessionData() {
        try {
            localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(AppState));
        } catch (e) {
            console.error("Storage system sync failure:", e);
        }
    }

    function loadSessionData() {
        const stored = localStorage.getItem(STORAGE_KEYS.STATE);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object') {
                    AppState.assignedRoles = parsed.assignedRoles || {};
                    AppState.history = parsed.history || [];
                    AppState.currentPlayer = parsed.currentPlayer || {
                        name: "", wins: 0, gamesPlayed: 0, currentGameIndex: 0, gamePool: []
                    };
                }
            } catch (e) {
                console.warn("Corrupted session layout detected. Refreshing matrices.");
                resetToDefaultState();
            }
        } else {
            resetToDefaultState();
        }
    }

    function resetToDefaultState() {
        AppState.assignedRoles = {};
        AppState.history = [];
        AppState.currentPlayer = {
            name: "", wins: 0, gamesPlayed: 0, currentGameIndex: 0, gamePool: []
        };
        saveSessionData();
    }

    // ---------------------------------------------------------
    // VIEW ROUTING ENGINE
    // ---------------------------------------------------------
    function switchView(targetViewKey) {
        Object.keys(DOM.views).forEach(key => {
            if (key === targetViewKey) {
                DOM.views[key].classList.add('active');
            } else {
                DOM.views[key].classList.remove('active');
            }
        });
    }

    function evaluateInitialViewRouting() {
        const remaining = getRemainingRoles();
        if (remaining.length === 0 && Object.keys(AppState.assignedRoles).length > 0) {
            renderSummaryView();
            switchView('summary');
        } else if (AppState.currentPlayer.name) {
            // Re-route processing based on mid-game disconnection recovery
            if (AppState.currentPlayer.gamesPlayed >= 3) {
                renderDestinyProcessingView();
                switchView('destiny');
            } else {
                executeGameIntroLoop();
            }
        } else {
            switchView('inputName');
        }
    }

    // ---------------------------------------------------------
    // SIDEBAR & DATA INTERFACE RENDERING
    // ---------------------------------------------------------
    function renderSidebar() {
        // Render Role Checklist Matrix
        DOM.displays.rolesList.innerHTML = "";
        DEFINED_ROLES.forEach(role => {
            const li = document.createElement('li');
            li.textContent = role;
            if (AppState.assignedRoles[role]) {
                li.classList.add('taken');
                li.textContent += ` (${AppState.assignedRoles[role]})`;
            }
            DOM.displays.rolesList.appendChild(li);
        });

        // Render Live History Timeline Feed
        DOM.displays.historyList.innerHTML = "";
        const visualLogs = [...AppState.history].reverse().slice(0, 5);
        visualLogs.forEach(item => {
            const el = document.createElement('div');
            el.className = "history-item";
            el.innerHTML = `<span>${escapeHTML(item.name)}</span><span class="glow-yellow">${escapeHTML(item.role)}</span>`;
            DOM.displays.historyList.appendChild(el);
        });
    }

    function getRemainingRoles() {
        return DEFINED_ROLES.filter(role => !AppState.assignedRoles[role]);
    }

    // ---------------------------------------------------------
    // CONTROLLER LOGIC: STEP-BY-STEP OPERATION HOOKS
    // ---------------------------------------------------------
    function handlePlayerRegistration() {
        const rawName = DOM.inputs.playerName.value.trim();
        if (!rawName) {
            alert("IDENTIFICATION ERROR: Please enter a valid name.");
            return;
        }

        const remaining = getRemainingRoles();
        if (remaining.length === 0) {
            alert("VAULT LOCKED: No remaining roles available for assignment.");
            renderSummaryView();
            switchView('summary');
            return;
        }

        // Initialize user tracking runtime record
        AppState.currentPlayer.name = rawName;
        AppState.currentPlayer.wins = 0;
        AppState.currentPlayer.gamesPlayed = 0;
        AppState.currentPlayer.currentGameIndex = 0;
        // Build randomized array subset selection for the 3 mini-games out of 8 variants
        AppState.currentPlayer.gamePool = generateRandomizedGamePool(3);

        saveSessionData();
        executeGameIntroLoop();
    }

    function generateRandomizedGamePool(count) {
        // Pool configurations for later implementation expansion
        const gameIdentifiers = [0, 1, 2, 3, 4, 5, 6, 7];
        const shuffled = gameIdentifiers.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function executeGameIntroLoop() {
        switchView('gameIntro');
        const currentRound = AppState.currentPlayer.gamesPlayed + 1;
        DOM.displays.introGameTitle.textContent = `GAME ${currentRound}/3`;
        DOM.displays.introGameDesc.textContent = `PREPARE YOUR REFLEXES...`;
        
        let counter = 3;
        DOM.displays.introCountdown.textContent = counter;
        DOM.displays.skipIntro.classList.add('hidden');

        const interval = setInterval(() => {
            counter--;
            if (counter > 0) {
                DOM.displays.introCountdown.textContent = counter;
            } else if (counter === 0) {
                DOM.displays.introCountdown.textContent = "START!";
            } else {
                clearInterval(interval);
                launchArenaCore();
            }
        }, 1000);
    }

    function launchArenaCore() {
        switchView('gameArena');
        DOM.displays.arenaGameName.textContent = `LOADING MINI-GAME...`;
        DOM.displays.arenaTimer.textContent = "TIME: --";
        DOM.displays.arenaCanvas.innerHTML = `<div style="font-size:10px;color:#ffea00;">STAGED FOR MILESTONE 3 INTERLOCK</div>`;
        DOM.displays.arenaScore.textContent = "SCORE: 0";

        // TEMPORARY PASSTHROUGH TO VALIDATE STATE LIFECYCLE ROUTING UNTIL MILESTONE 3 INTERLOCK
        setTimeout(() => {
            evaluateMiniGameOutcome(true, "AUTO MOCK SYSTEM INITIAL SUCCESS");
        }, 1500);
    }

    function evaluateMiniGameOutcome(isWin, summaryText) {
        AppState.currentPlayer.gamesPlayed++;
        if (isWin) {
            AppState.currentPlayer.wins++;
            DOM.displays.resultTitle.textContent = "VICTORY";
            DOM.displays.resultTitle.className = "glow-yellow";
        } else {
            DOM.displays.resultTitle.textContent = "DEFEAT";
            DOM.displays.resultTitle.className = "glow-blue";
        }

        DOM.displays.resultDesc.textContent = `${summaryText} (${AppState.currentPlayer.wins}/${AppState.currentPlayer.gamesPlayed} WINS)`;
        saveSessionData();
        switchView('gameResult');
    }

    function handleResultScreenRouting() {
        if (AppState.currentPlayer.gamesPlayed >= 3) {
            renderDestinyProcessingView();
            switchView('destiny');
        } else {
            executeGameIntroLoop();
        }
    }

    function renderDestinyProcessingView() {
        const wins = AppState.currentPlayer.wins;
        const remaining = getRemainingRoles();

        if (remaining.length === 0) {
            alert("CRITICAL ERROR: All roles filled mid-session.");
            renderSummaryView();
            switchView('summary');
            return;
        }

        if (wins >= 2) {
            DOM.displays.destinyTitle.textContent = "THE VAULT UNLOCKED";
            DOM.displays.destinySubtitle.textContent = "SELECT YOUR DESIRED FACTION DESTINY:";
            DOM.displays.roleGrid.classList.remove('hidden');
            DOM.displays.randomizerMachine.classList.add('hidden');
            buildDynamicRoleGrid(remaining);
        } else {
            DOM.displays.destinyTitle.textContent = "THE VAULT SEALED";
            DOM.displays.destinySubtitle.textContent = "CHANCE WILL ALLOCATE YOUR ASSIGNMENT:";
            DOM.displays.roleGrid.classList.add('hidden');
            DOM.displays.randomizerMachine.classList.remove('hidden');
            DOM.displays.randomizerRoulette.textContent = "???";
            DOM.buttons.triggerRoulette.classList.remove('disabled');
        }
    }

    function buildDynamicRoleGrid(remainingRoles) {
        DOM.displays.roleGrid.innerHTML = "";
        remainingRoles.forEach(role => {
            const card = document.createElement('div');
            card.className = "role-card";
            card.textContent = role;
            card.addEventListener('click', () => {
                finalizeRoleAllocation(role);
            });
            DOM.displays.roleGrid.appendChild(card);
        });
    }

    function executeRandomizerRoulette() {
        DOM.buttons.triggerRoulette.classList.add('disabled');
        const remaining = getRemainingRoles();
        let spinCounter = 0;
        const maxSpins = 15;
        const baseInterval = 100;

        function runSpin() {
            const mockRoleIndex = Math.floor(Math.random() * remaining.length);
            DOM.displays.randomizerRoulette.textContent = remaining[mockRoleIndex].toUpperCase();
            spinCounter++;

            if (spinCounter < maxSpins) {
                setTimeout(runSpin, baseInterval + (spinCounter * 20));
            } else {
                const finalRoleIndex = Math.floor(Math.random() * remaining.length);
                const definitiveRole = remaining[finalRoleIndex];
                finalizeRoleAllocation(definitiveRole);
            }
        }
        runSpin();
    }

    function finalizeRoleAllocation(allocatedRole) {
        const playerName = AppState.currentPlayer.name;
        
        // Finalize transaction records mutations
        AppState.assignedRoles[allocatedRole] = playerName;
        AppState.history.push({
            name: playerName,
            role: allocatedRole,
            status: AppState.currentPlayer.wins >= 2 ? "CHOICE" : "RANDOM"
        });

        // Reset runtime configuration variable track
        AppState.currentPlayer = { name: "", wins: 0, gamesPlayed: 0, currentGameIndex: 0, gamePool: [] };
        saveSessionData();
        renderSidebar();

        // Direct view updates onto display boards
        DOM.displays.resolutionTitle.textContent = `${playerName.toUpperCase()}'s REALIZED DESTINY`;
        DOM.displays.resolvedCardInner.textContent = allocatedRole.toUpperCase();
        switchView('resolution');
    }

    function handleResolutionCompletion() {
        const remaining = getRemainingRoles();
        if (remaining.length === 0) {
            renderSummaryView();
            switchView('summary');
        } else {
            DOM.inputs.playerName.value = "";
            switchView('inputName');
        }
    }

    function renderSummaryView() {
        DOM.displays.summaryTableBody.innerHTML = "";
        DEFINED_ROLES.forEach(role => {
            const tr = document.createElement('tr');
            const thRole = document.createElement('td');
            thRole.textContent = role;
            const tdPlayer = document.createElement('td');
            tdPlayer.className = "glow-yellow";
            tdPlayer.textContent = AppState.assignedRoles[role] ? AppState.assignedRoles[role] : "UNASSIGNED VACANCY";
            if (!AppState.assignedRoles[role]) {
                tdPlayer.style.opacity = "0.3";
                tdPlayer.classList.remove("glow-yellow");
            }
            tr.appendChild(thRole);
            tr.appendChild(tdPlayer);
            DOM.displays.summaryTableBody.appendChild(tr);
        });
    }

    function handleFullResetCommand() {
        if (confirm("CRITICAL WARNING: This will permanently wipe all assigned roles and history ledger configurations. Proceed?")) {
            resetToDefaultState();
            renderSidebar();
            DOM.inputs.playerName.value = "";
            switchView('inputName');
        }
    }

    // ---------------------------------------------------------
    // SYSTEM EVENT DRIVERS & UTILITIES
    // ---------------------------------------------------------
    function setupGlobalEventListeners() {
        DOM.buttons.startJourney.addEventListener('click', handlePlayerRegistration);
        DOM.buttons.continueJourney.addEventListener('click', handleResultScreenRouting);
        DOM.buttons.triggerRoulette.addEventListener('click', executeRandomizerRoulette);
        DOM.buttons.finishTurn.addEventListener('click', handleResolutionCompletion);
        DOM.buttons.restartFull.addEventListener('click', handleFullResetCommand);
        DOM.buttons.resetSession.addEventListener('click', handleFullResetCommand);

        DOM.buttons.fullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Fullscreen escalation failed: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });

        // Keyboard support hooks
        DOM.inputs.playerName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handlePlayerRegistration();
        });
    }

    function escapeHTML(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Initialize execution block
    document.addEventListener('DOMContentLoaded', init);
}());
