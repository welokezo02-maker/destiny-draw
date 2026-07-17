/* ==========================================================================
   script.js - DESTINY DRAW MOBILE-FIRST NATIVE ENGINE
   ========================================================================== */

(function () {
    'use strict';

    // ---------------------------------------------------------
    // DEFINED ROLES FOR THE POOL
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

    const STORAGE_KEY = "destiny_draw_mobile_v1";

    const MINI_GAMES = [
        { id: 0, name: "CHRONO TAP", desc: "TAP AT THE INSTANT THE RED CIRCLE MATCHES THE OUTER TARGET ZONE!" },
        { id: 1, name: "NEON MATRIX", desc: "WATCH AND REPEAT THE FLASHING COLOR GRID SEQUENCE!" },
        { id: 2, name: "CYBER POP", desc: "TAP EVERY BUBBLE TO POP IT BEFORE TIME RUNS OUT!" }
    ];

    // ---------------------------------------------------------
    // STATE ENGINE
    // ---------------------------------------------------------
    let AppState = {
        assignedRoles: {},
        history: [],
        currentPlayer: {
            name: "",
            wins: 0,
            gamesPlayed: 0,
            gamePool: []
        }
    };

    let GameLoopInterval = null;
    let GameTimerCountdown = 0;
    let GameRuntimeData = {};

    // ---------------------------------------------------------
    // DOM MAP
    // ---------------------------------------------------------
    const DOM = {
        viewport: document.getElementById('app-viewport'),
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
            continueJourney: document.getElementById('btn-continue-journey'),
            triggerRoulette: document.getElementById('btn-trigger-roulette'),
            finishTurn: document.getElementById('btn-finish-turn'),
            restartFull: document.getElementById('btn-restart-full'),
            resetSession: document.getElementById('btn-reset-session'),
            toggleTray: document.getElementById('btn-toggle-tray'),
            closeTray: document.getElementById('btn-close-tray')
        },
        displays: {
            statusTray: document.getElementById('status-tray'),
            rolesList: document.getElementById('roles-list'),
            historyList: document.getElementById('history-list'),
            introGameTitle: document.getElementById('intro-game-title'),
            introGameName: document.getElementById('intro-game-name'),
            introGameDesc: document.getElementById('intro-game-desc'),
            introCountdown: document.getElementById('intro-countdown'),
            arenaGameName: document.getElementById('arena-game-name'),
            arenaTimer: document.getElementById('arena-timer'),
            arenaScore: document.getElementById('arena-score-tracking'),
            arenaSurface: document.getElementById('arena-surface'),
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
    // SYSTEM FEEDBACK / FX
    // ---------------------------------------------------------
    const FX = {
        shake: () => {
            DOM.viewport.classList.remove('shake');
            void DOM.viewport.offsetWidth;
            DOM.viewport.classList.add('shake');
            setTimeout(() => DOM.viewport.classList.remove('shake'), 300);
        },
        flash: (type) => {
            const classFx = type === 'green' ? 'flash-green' : 'flash-red';
            DOM.viewport.classList.remove('flash-green', 'flash-red');
            void DOM.viewport.offsetWidth;
            DOM.viewport.classList.add(classFx);
            setTimeout(() => DOM.viewport.classList.remove(classFx), 250);
        }
    };

    // ---------------------------------------------------------
    // INITIALIZATION & CACHE
    // ---------------------------------------------------------
    function init() {
        loadSession();
        setupGlobalEvents();
        updateUI();
        routeViewOnStart();
    }

    function saveSession() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
    }

    function loadSession() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                AppState = JSON.parse(stored);
            } catch (e) {
                resetEngine();
            }
        }
    }

    function resetEngine() {
        AppState = {
            assignedRoles: {},
            history: [],
            currentPlayer: { name: "", wins: 0, gamesPlayed: 0, gamePool: [] }
        };
        saveSession();
    }

    function switchView(viewKey) {
        Object.keys(DOM.views).forEach(k => {
            DOM.views[k].classList.toggle('active', k === viewKey);
        });
    }

    function routeViewOnStart() {
        const remaining = getRemainingRoles();
        if (remaining.length === 0 && Object.keys(AppState.assignedRoles).length > 0) {
            buildSummaryScreen();
            switchView('summary');
        } else if (AppState.currentPlayer.name) {
            if (AppState.currentPlayer.gamesPlayed >= 3) {
                setupDestinyAllocationView();
                switchView('destiny');
            } else {
                beginGameIntroduction();
            }
        } else {
            switchView('inputName');
        }
    }

    function updateUI() {
        // Build Status tray roles
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

        // History logs
        DOM.displays.historyList.innerHTML = "";
        [...AppState.history].reverse().slice(0, 5).forEach(h => {
            const el = document.createElement('div');
            el.className = "history-item";
            el.innerHTML = `<span>${h.name}</span><span class="glow-text">${h.role}</span>`;
            DOM.displays.historyList.appendChild(el);
        });
    }

    function getRemainingRoles() {
        return DEFINED_ROLES.filter(r => !AppState.assignedRoles[r]);
    }

    // ---------------------------------------------------------
    // USER ACTION ROUTINES
    // ---------------------------------------------------------
    function handleUserRegistration() {
        const name = DOM.inputs.playerName.value.trim();
        if (!name) {
            FX.shake();
            return;
        }

        if (getRemainingRoles().length === 0) {
            alert("ALL CONSTRAINTS RESOLVED.");
            buildSummaryScreen();
            switchView('summary');
            return;
        }

        AppState.currentPlayer = {
            name: name,
            wins: 0,
            gamesPlayed: 0,
            gamePool: [0, 1, 2].sort(() => 0.5 - Math.random()) // Perfect randomized order
        };
        saveSession();
        beginGameIntroduction();
    }

    function beginGameIntroduction() {
        switchView('gameIntro');
        const activeGameId = AppState.currentPlayer.gamePool[AppState.currentPlayer.gamesPlayed];
        const meta = MINI_GAMES.find(g => g.id === activeGameId);

        DOM.displays.introGameTitle.textContent = `ROUND ${AppState.currentPlayer.gamesPlayed + 1}/3`;
        DOM.displays.introGameName.textContent = meta.name;
        DOM.displays.introGameDesc.textContent = meta.desc;

        let leftCount = 3;
        DOM.displays.introCountdown.textContent = leftCount;

        const countdown = setInterval(() => {
            leftCount--;
            if (leftCount > 0) {
                DOM.displays.introCountdown.textContent = leftCount;
            } else if (leftCount === 0) {
                DOM.displays.introCountdown.textContent = "PROVE!";
            } else {
                clearInterval(countdown);
                startActiveArena(activeGameId, meta.name);
            }
        }, 800);
    }

    function runGlobalCountdown(sec, triggerEnd) {
        GameTimerCountdown = sec;
        DOM.displays.arenaTimer.textContent = `${GameTimerCountdown}s`;
        
        GameLoopInterval = setInterval(() => {
            GameTimerCountdown--;
            DOM.displays.arenaTimer.textContent = `${GameTimerCountdown}s`;
            
            if (GameTimerCountdown <= 3 && GameTimerCountdown > 0) {
                FX.flash('red');
            }
            if (GameTimerCountdown <= 0) {
                clearInterval(GameLoopInterval);
                triggerEnd();
            }
        }, 1000);
    }

    function startActiveArena(gameId, name) {
        switchView('gameArena');
        DOM.displays.arenaGameName.textContent = name;
        DOM.displays.arenaSurface.innerHTML = "";

        if (GameLoopInterval) clearInterval(GameLoopInterval);

        if (gameId === 0) startChronoTap();
        else if (gameId === 1) startNeonMatrix();
        else if (gameId === 2) startCyberPop();
    }

    function concludeGame(isWin, summary) {
        if (GameLoopInterval) clearInterval(GameLoopInterval);
        DOM.displays.arenaSurface.innerHTML = "";

        AppState.currentPlayer.gamesPlayed++;
        if (isWin) {
            AppState.currentPlayer.wins++;
            DOM.displays.resultTitle.textContent = "VICTORY";
            DOM.displays.resultTitle.className = "glow-text";
            FX.flash('green');
        } else {
            DOM.displays.resultTitle.textContent = "DEFEAT";
            DOM.displays.resultTitle.className = "";
            FX.shake();
            FX.flash('red');
        }

        DOM.displays.resultDesc.textContent = `${summary} (SCORE: ${AppState.currentPlayer.wins}/${AppState.currentPlayer.gamesPlayed})`;
        saveSession();
        switchView('gameResult');
    }

    // ---------------------------------------------------------
    // MINIGAME 0: CHRONO TAP (100% NATIVE DOM COMPATIBLE)
    // ---------------------------------------------------------
    function startChronoTap() {
        DOM.displays.arenaScore.textContent = "ALIGN THE RINGS!";
        
        const centerCore = document.createElement('div');
        centerCore.className = "chrono-target-zone";
        
        const shrinker = document.createElement('div');
        shrinker.className = "chrono-tracker-ring";
        
        centerCore.appendChild(shrinker);
        DOM.displays.arenaSurface.appendChild(centerCore);

        // Responsive Action Button
        const trigger = document.createElement('button');
        trigger.className = "btn-pixel primary";
        trigger.textContent = "TAP ALIGN!";
        trigger.style.position = "absolute";
        trigger.style.bottom = "20px";
        DOM.displays.arenaSurface.appendChild(trigger);

        let size = 200;
        const animationLoop = setInterval(() => {
            size -= 4;
            if (size <= 20) {
                size = 200;
            }
            shrinker.style.width = size + "px";
            shrinker.style.height = size + "px";
        }, 20);

        trigger.addEventListener('click', () => {
            clearInterval(animationLoop);
            // The green ring zone is 80px. If size matches close enough, win.
            if (size >= 70 && size <= 95) {
                concludeGame(true, "PERFECT CHRONO HARMONY!");
            } else {
                concludeGame(false, "ALIGNMENT DRIFT DETECTED.");
            }
        });

        runGlobalCountdown(10, () => {
            clearInterval(animationLoop);
            concludeGame(false, "CHRONO INTERFACE EXPIRATION.");
        });
    }

    // ---------------------------------------------------------
    // MINIGAME 1: NEON MATRIX
    // ---------------------------------------------------------
    function startNeonMatrix() {
        DOM.displays.arenaScore.textContent = "REPLAY NEON ECHO...";

        const grid = document.createElement('div');
        grid.className = "matrix-grid";

        const cells = [];
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = "matrix-node";
            cell.dataset.index = i;
            grid.appendChild(cell);
            cells.push(cell);
        }
        DOM.displays.arenaSurface.appendChild(grid);

        const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9));
        GameRuntimeData = { steps: 0, activeInput: false };

        // Play pattern
        let flashStep = 0;
        const runFlashes = setInterval(() => {
            if (flashStep < seq.length) {
                const target = cells[seq[flashStep]];
                target.classList.add('flash');
                setTimeout(() => target.classList.remove('flash'), 350);
                flashStep++;
            } else {
                clearInterval(runFlashes);
                GameRuntimeData.activeInput = true;
                DOM.displays.arenaScore.textContent = "YOUR ECHO TURN!";
            }
        }, 700);

        cells.forEach((node, idx) => {
            node.addEventListener('click', () => {
                if (!GameRuntimeData.activeInput) return;

                node.classList.add('flash');
                setTimeout(() => node.classList.remove('flash'), 150);

                if (idx === seq[GameRuntimeData.steps]) {
                    GameRuntimeData.steps++;
                    DOM.displays.arenaScore.textContent = `MATCHED: ${GameRuntimeData.steps}/4`;
                    FX.flash('green');
                    
                    if (GameRuntimeData.steps === 4) {
                        concludeGame(true, "MATRIX MATCH COMPLETE.");
                    }
                } else {
                    concludeGame(false, "MATRIX SEQUENCE DESYNC.");
                }
            });
        });

        runGlobalCountdown(15, () => {
            concludeGame(false, "SIGNAL ECHO INTERVAL TERMINATED.");
        });
    }

    // ---------------------------------------------------------
    // MINIGAME 2: CYBER POP
    // ---------------------------------------------------------
    function startCyberPop() {
        const countRequired = 10;
        GameRuntimeData = { popped: 0 };
        DOM.displays.arenaScore.textContent = `POPS: 0/${countRequired}`;

        const surfaceW = DOM.displays.arenaSurface.offsetWidth || 300;
        const surfaceH = DOM.displays.arenaSurface.offsetHeight || 320;

        function spawn() {
            if (GameRuntimeData.popped >= countRequired || GameTimerCountdown <= 0) return;

            const b = document.createElement('div');
            b.className = "cyber-bubble";
            b.textContent = Math.floor(Math.random() * 9) + 1;
            
            const randomX = Math.max(10, Math.min(surfaceW - 60, Math.random() * (surfaceW - 50)));
            b.style.left = randomX + "px";
            b.style.top = "280px";

            let rise = 280;
            const flight = setInterval(() => {
                rise -= 3;
                b.style.top = rise + "px";

                if (rise <= 0) {
                    clearInterval(flight);
                    b.remove();
                    FX.shake();
                    spawn();
                }
            }, 30);

            b.addEventListener('click', () => {
                clearInterval(flight);
                b.remove();
                GameRuntimeData.popped++;
                DOM.displays.arenaScore.textContent = `POPS: ${GameRuntimeData.popped}/${countRequired}`;
                FX.flash('green');

                if (GameRuntimeData.popped >= countRequired) {
                    concludeGame(true, "BUBBLE GRID CLEANSE.");
                } else {
                    spawn();
                }
            });

            DOM.displays.arenaSurface.appendChild(b);
        }

        spawn();
        spawn();

        runGlobalCountdown(15, () => {
            concludeGame(false, `POP DURATION LAPSED. MET ${GameRuntimeData.popped}/${countRequired}.`);
        });
    }

    // ---------------------------------------------------------
    // ALLOCATION FLOW & DESTINY ROULETTE
    // ---------------------------------------------------------
    function setupDestinyAllocationView() {
        const remaining = getRemainingRoles();
        if (remaining.length === 0) {
            buildSummaryScreen();
            switchView('summary');
            return;
        }

        if (AppState.currentPlayer.wins >= 2) {
            DOM.displays.destinyTitle.textContent = "VAULT ACQUIRED";
            DOM.displays.destinySubtitle.textContent = "SELECT THE ROLE YOU DESIRE:";
            DOM.displays.roleGrid.classList.remove('hidden');
            DOM.displays.randomizerMachine.classList.add('hidden');
            
            DOM.displays.roleGrid.innerHTML = "";
            remaining.forEach(role => {
                const card = document.createElement('div');
                card.className = "role-card";
                card.textContent = role;
                card.addEventListener('click', () => saveAssignedRole(role));
                DOM.displays.roleGrid.appendChild(card);
            });
        } else {
            DOM.displays.destinyTitle.textContent = "VAULT SEALED";
            DOM.displays.destinySubtitle.textContent = "RANDOM PROCESS REQUIRED:";
            DOM.displays.roleGrid.classList.add('hidden');
            DOM.displays.randomizerMachine.classList.remove('hidden');
            DOM.displays.randomizerRoulette.textContent = "???";
            DOM.buttons.triggerRoulette.classList.remove('disabled');
        }
    }

    function runDestinyRoulette() {
        DOM.buttons.triggerRoulette.classList.add('disabled');
        const remaining = getRemainingRoles();
        let counts = 0;
        
        const tick = setInterval(() => {
            const tempRole = remaining[Math.floor(Math.random() * remaining.length)];
            DOM.displays.randomizerRoulette.textContent = tempRole.toUpperCase();
            counts++;

            if (counts >= 12) {
                clearInterval(tick);
                const absoluteChoice = remaining[Math.floor(Math.random() * remaining.length)];
                saveAssignedRole(absoluteChoice);
            }
        }, 120);
    }

    function saveAssignedRole(finalRole) {
        const pName = AppState.currentPlayer.name;
        AppState.assignedRoles[finalRole] = pName;
        AppState.history.push({ name: pName, role: finalRole });

        // Reset turn state
        AppState.currentPlayer = { name: "", wins: 0, gamesPlayed: 0, gamePool: [] };
        saveSession();
        updateUI();

        DOM.displays.resolutionTitle.textContent = `${pName.toUpperCase()}'s DESIGNATION`;
        DOM.displays.resolvedCardInner.textContent = finalRole.toUpperCase();
        switchView('resolution');
    }

    function buildSummaryScreen() {
        DOM.displays.summaryTableBody.innerHTML = "";
        DEFINED_ROLES.forEach(r => {
            const tr = document.createElement('tr');
            const tdRole = document.createElement('td');
            tdRole.textContent = r;
            const tdName = document.createElement('td');
            tdName.className = AppState.assignedRoles[r] ? "glow-text" : "";
            tdName.textContent = AppState.assignedRoles[r] || "VACANT";
            tr.appendChild(tdRole);
            tr.appendChild(tdName);
            DOM.displays.summaryTableBody.appendChild(tr);
        });
    }

    function handleHardSystemReset() {
        if (confirm("THIS ACTION CANNOT BE UNDONE. RESET CURRENT TRIAL DATABASE?")) {
            resetEngine();
            updateUI();
            DOM.inputs.playerName.value = "";
            switchView('inputName');
        }
    }

    // ---------------------------------------------------------
    // SIDEBAR TRAY TOGGLE
    // ---------------------------------------------------------
    function toggleStatusTray(isOpen) {
        DOM.displays.statusTray.classList.toggle('active', isOpen);
    }

    // ---------------------------------------------------------
    // GLOBAL HANDLERS
    // ---------------------------------------------------------
    function setupGlobalEvents() {
        DOM.buttons.startJourney.addEventListener('click', handleUserRegistration);
        DOM.buttons.continueJourney.addEventListener('click', () => {
            if (AppState.currentPlayer.gamesPlayed >= 3) {
                setupDestinyAllocationView();
                switchView('destiny');
            } else {
                beginGameIntroduction();
            }
        });
        DOM.buttons.triggerRoulette.addEventListener('click', runDestinyRoulette);
        DOM.buttons.finishTurn.addEventListener('click', () => {
            if (getRemainingRoles().length === 0) {
                buildSummaryScreen();
                switchView('summary');
            } else {
                DOM.inputs.playerName.value = "";
                switchView('inputName');
            }
        });
        DOM.buttons.restartFull.addEventListener('click', handleHardSystemReset);
        DOM.buttons.resetSession.addEventListener('click', handleHardSystemReset);

        // Drawer Event mapping
        DOM.buttons.toggleTray.addEventListener('click', () => toggleStatusTray(true));
        DOM.buttons.closeTray.addEventListener('click', () => toggleStatusTray(false));
    }

    document.addEventListener('DOMContentLoaded', init);
}());
