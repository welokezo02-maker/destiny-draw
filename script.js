/* ==========================================================================
   script.js - DESTINY DRAW ARCHITECTURE ENGINE (COMPLETED ARCADE SUITE)
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

    // Mapping game pool indices to metadata (Expanded to 8 games)
    const MINI_GAMES_REGISTRY = [
        { id: 0, name: "MEMORY TILES", desc: "FLIP & MATCH THE PIXEL TILES!" },
        { id: 1, name: "FAST CLICK", desc: "SMASH THE BUTTON BEFORE TIME RUNS OUT!" },
        { id: 2, name: "NUMBER RUSH", desc: "CLICK NUMBERS IN ASCENDING ORDER!" },
        { id: 3, name: "PIXEL DODGE", desc: "DODGE THE INCOMING METEOR TILES!" },
        { id: 4, name: "TREASURE CHEST", desc: "GUESS WHICH CHEST HOLDS THE GOLD!" },
        { id: 5, name: "SIMON SAYS", desc: "REPEAT THE FLASHING COLOR PATTERN!" },
        { id: 6, name: "PIXEL ATTACK", desc: "DEFEND AGAINST THE FALLING BLOCKS!" },
        { id: 7, name: "MAZE ESCAPE", desc: "NAVIGATE THE PIXEL AVATAR TO THE EXIT!" }
    ];

    // ---------------------------------------------------------
    // CORE APPLICATION STATE MATRIX
    // ---------------------------------------------------------
    let AppState = {
        assignedRoles: {}, 
        history: [],       
        currentPlayer: {
            name: "",
            wins: 0,
            gamesPlayed: 0,
            currentGameIndex: 0,
            gamePool: []
        }
    };

    // Runtime loop variable trackers for mini-games
    let GameLoopInterval = null;
    let GameTimerCountdown = 0;
    let GameRuntimeData = {};

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
    // CONTROLLER LOGIC: PLAYER STEPS
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

        AppState.currentPlayer.name = rawName;
        AppState.currentPlayer.wins = 0;
        AppState.currentPlayer.gamesPlayed = 0;
        AppState.currentPlayer.currentGameIndex = 0;
        AppState.currentPlayer.gamePool = generateRandomizedGamePool(3);

        saveSessionData();
        executeGameIntroLoop();
    }

    function generateRandomizedGamePool(count) {
        // Pool bounded to include all 8 indices [0-7]
        const gameIdentifiers = [0, 1, 2, 3, 4, 5, 6, 7];
        const shuffled = gameIdentifiers.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function executeGameIntroLoop() {
        switchView('gameIntro');
        const currentRound = AppState.currentPlayer.gamesPlayed + 1;
        const assignedGameID = AppState.currentPlayer.gamePool[AppState.currentPlayer.gamesPlayed];
        const gameMeta = MINI_GAMES_REGISTRY.find(g => g.id === assignedGameID) || MINI_GAMES_REGISTRY[0];

        DOM.displays.introGameTitle.textContent = `GAME ${currentRound}/3`;
        DOM.displays.introGameDesc.textContent = gameMeta.name + ": " + gameMeta.desc;
        
        let counter = 3;
        DOM.displays.introCountdown.textContent = counter;

        const interval = setInterval(() => {
            counter--;
            if (counter > 0) {
                DOM.displays.introCountdown.textContent = counter;
            } else if (counter === 0) {
                DOM.displays.introCountdown.textContent = "START!";
            } else {
                clearInterval(interval);
                launchArenaCore(assignedGameID, gameMeta.name);
            }
        }, 1000);
    }

    // ---------------------------------------------------------
    // CORE MINI-GAMES INTERLOCK STAGE
    // ---------------------------------------------------------
    function launchArenaCore(gameID, gameName) {
        switchView('gameArena');
        DOM.displays.arenaGameName.textContent = gameName;
        DOM.displays.arenaCanvas.innerHTML = "";
        
        if (GameLoopInterval) clearInterval(GameLoopInterval);
        
        switch (gameID) {
            case 0: setupMemoryTilesGame(); break;
            case 1: setupFastClickGame(); break;
            case 2: setupNumberRushGame(); break;
            case 3: setupPixelDodgeGame(); break;
            case 4: setupTreasureChestGame(); break;
            case 5: setupSimonSaysGame(); break;
            case 6: setupPixelAttackGame(); break;
            case 7: setupMazeEscapeGame(); break;
            default: setupMemoryTilesGame();
        }
    }

    function runGlobalArenaTimer(durationSeconds, completionCallback) {
        GameTimerCountdown = durationSeconds;
        DOM.displays.arenaTimer.textContent = `TIME: ${GameTimerCountdown}`;
        
        GameLoopInterval = setInterval(() => {
            GameTimerCountdown--;
            DOM.displays.arenaTimer.textContent = `TIME: ${GameTimerCountdown}`;
            if (GameTimerCountdown <= 0) {
                clearInterval(GameLoopInterval);
                completionCallback();
            }
        }, 1000);
    }

    function clearActiveArenaLoop() {
        if (GameLoopInterval) {
            clearInterval(GameLoopInterval);
            GameLoopInterval = null;
        }
        DOM.displays.arenaCanvas.innerHTML = "";
    }

    function evaluateMiniGameOutcome(isWin, summaryText) {
        clearActiveArenaLoop();
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

    // ---------------------------------------------------------
    // ARCADE GAME MODULES ENGINE IMPLEMENTATION
    // ---------------------------------------------------------

    // --- GAME 0: MEMORY TILES ---
    function setupMemoryTilesGame() {
        DOM.displays.arenaScore.textContent = "MATCHES: 0/4";
        const gridWrapper = document.createElement('div');
        gridWrapper.style.display = "grid";
        gridWrapper.style.gridTemplateColumns = "repeat(4, 1fr)";
        gridWrapper.style.gap = "8px";
        gridWrapper.style.width = "240px";

        const tileValues = ["#ff0055", "#00b4d8", "#ffcc00", "#38b000", "#ff0055", "#00b4d8", "#ffcc00", "#38b000"];
        const shuffledTiles = tileValues.sort(() => 0.5 - Math.random());
        
        GameRuntimeData = { flipped: [], matches: 0, lockboard: false };

        shuffledTiles.forEach((color, idx) => {
            const tile = document.createElement('div');
            tile.className = "btn-pixel";
            tile.style.height = "50px";
            tile.style.backgroundColor = "#141b4d";
            tile.style.borderColor = "#2c388c";
            tile.dataset.color = color;
            tile.dataset.index = idx;

            tile.addEventListener('click', () => {
                if (GameRuntimeData.lockboard || tile.classList.contains('matched') || GameRuntimeData.flipped.includes(tile)) return;
                
                tile.style.backgroundColor = color;
                tile.style.borderColor = "#fff";
                GameRuntimeData.flipped.push(tile);

                if (GameRuntimeData.flipped.length === 2) {
                    GameRuntimeData.lockboard = true;
                    const [t1, t2] = GameRuntimeData.flipped;
                    
                    if (t1.dataset.color === t2.dataset.color) {
                        t1.classList.add('matched');
                        t2.classList.add('matched');
                        GameRuntimeData.flipped = [];
                        GameRuntimeData.matches++;
                        DOM.displays.arenaScore.textContent = `MATCHES: ${GameRuntimeData.matches}/4`;
                        GameRuntimeData.lockboard = false;

                        if (GameRuntimeData.matches === 4) {
                            clearInterval(GameLoopInterval);
                            evaluateMiniGameOutcome(true, "PERFECT MEMORY MATRIX!");
                        }
                    } else {
                        setTimeout(() => {
                            t1.style.backgroundColor = "#141b4d";
                            t1.style.borderColor = "#2c388c";
                            t2.style.backgroundColor = "#141b4d";
                            t2.style.borderColor = "#2c388c";
                            GameRuntimeData.flipped = [];
                            GameRuntimeData.lockboard = false;
                        }, 600);
                    }
                }
            });
            gridWrapper.appendChild(tile);
        });

        DOM.displays.arenaCanvas.appendChild(gridWrapper);
        runGlobalArenaTimer(20, () => {
            evaluateMiniGameOutcome(false, "TIME ELAPSED! SELECTION TERMINATED.");
        });
    }

    // --- GAME 1: FAST CLICK ---
    function setupFastClickGame() {
        const requiredClicks = 30;
        GameRuntimeData = { clicks: 0 };
        DOM.displays.arenaScore.textContent = `CLICKS: 0/${requiredClicks}`;

        const clickTarget = document.createElement('button');
        clickTarget.className = "btn-pixel red";
        clickTarget.textContent = "SMASH!";
        clickTarget.style.fontSize = "16px";
        clickTarget.style.padding = "30px 40px";

        clickTarget.addEventListener('click', () => {
            GameRuntimeData.clicks++;
            DOM.displays.arenaScore.textContent = `CLICKS: ${GameRuntimeData.clicks}/${requiredClicks}`;
            clickTarget.style.transform = `scale(${1 + (Math.random() * 0.15)}) rotate(${(Math.random() * 10 - 5)}deg)`;
            
            if (GameRuntimeData.clicks >= requiredClicks) {
                clearInterval(GameLoopInterval);
                evaluateMiniGameOutcome(true, "POWER CLICK VELOCITY ACHIEVED!");
            }
        });

        DOM.displays.arenaCanvas.appendChild(clickTarget);
        runGlobalArenaTimer(12, () => {
            evaluateMiniGameOutcome(false, `INSUFFICIENT SPEED. MET ${GameRuntimeData.clicks} TARGETS.`);
        });
    }

    // --- GAME 2: NUMBER RUSH ---
    function setupNumberRushGame() {
        DOM.displays.arenaScore.textContent = "NEXT NUMBER: 1";
        const gridWrapper = document.createElement('div');
        gridWrapper.style.display = "grid";
        gridWrapper.style.gridTemplateColumns = "repeat(3, 1fr)";
        gridWrapper.style.gap = "10px";
        gridWrapper.style.width = "220px";

        const sequence = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const shuffledSequence = sequence.sort(() => 0.5 - Math.random());
        GameRuntimeData = { expected: 1 };

        shuffledSequence.forEach(num => {
            const numBtn = document.createElement('button');
            numBtn.className = "btn-pixel";
            numBtn.textContent = num;
            numBtn.style.padding = "15px";

            numBtn.addEventListener('click', () => {
                if (num === GameRuntimeData.expected) {
                    numBtn.classList.add('disabled');
                    numBtn.style.opacity = "0.2";
                    GameRuntimeData.expected++;
                    
                    if (GameRuntimeData.expected > 9) {
                        clearInterval(GameLoopInterval);
                        evaluateMiniGameOutcome(true, "MATHEMATICAL RUSH COMPLETED!");
                    } else {
                        DOM.displays.arenaScore.textContent = `NEXT NUMBER: ${GameRuntimeData.expected}`;
                    }
                } else {
                    numBtn.style.borderColor = "#d90429";
                    setTimeout(() => { numBtn.style.borderColor = "#2c388c"; }, 300);
                }
            });
            gridWrapper.appendChild(numBtn);
        });

        DOM.displays.arenaCanvas.appendChild(gridWrapper);
        runGlobalArenaTimer(15, () => {
            evaluateMiniGameOutcome(false, "ALGORITHM CONSTRAINTS TIMED OUT.");
        });
    }

    // --- GAME 3: PIXEL DODGE ---
    function setupPixelDodgeGame() {
        DOM.displays.arenaScore.textContent = "SURVIVE: 15s";
        
        const arenaArea = document.createElement('div');
        arenaArea.style.position = "relative";
        arenaArea.style.width = "100%";
        arenaArea.style.height = "180px";
        arenaArea.style.backgroundColor = "#000";
        arenaArea.style.overflow = "hidden";

        const playerEntity = document.createElement('div');
        playerEntity.className = "btn-pixel";
        playerEntity.style.position = "absolute";
        playerEntity.style.bottom = "10px";
        playerEntity.style.left = "calc(50% - 15px)";
        playerEntity.style.width = "30px";
        playerEntity.style.height = "30px";
        playerEntity.style.padding = "0";
        playerEntity.style.backgroundColor = "#00b4d8";
        arenaArea.appendChild(playerEntity);

        const leftBtn = document.createElement('button');
        leftBtn.className = "btn-pixel small";
        leftBtn.textContent = "<<";
        leftBtn.style.marginRight = "20px";
        
        const rightBtn = document.createElement('button');
        rightBtn.className = "btn-pixel small";
        rightBtn.textContent = ">>";

        const controlsRow = document.createElement('div');
        controlsRow.style.marginTop = "8px";
        controlsRow.appendChild(leftBtn);
        controlsRow.appendChild(rightBtn);

        DOM.displays.arenaCanvas.appendChild(arenaArea);
        DOM.displays.arenaCanvas.appendChild(controlsRow);

        GameRuntimeData = { posX: 110, meteors: [], survivalTime: 15 };

        leftBtn.addEventListener('click', () => {
            GameRuntimeData.posX = Math.max(0, GameRuntimeData.posX - 25);
            playerEntity.style.left = GameRuntimeData.posX + "px";
        });

        rightBtn.addEventListener('click', () => {
            const maxBoundary = arenaArea.clientWidth - 30;
            GameRuntimeData.posX = Math.min(maxBoundary, GameRuntimeData.posX + 25);
            playerEntity.style.left = GameRuntimeData.posX + "px";
        });

        const docKeydown = (e) => {
            if (e.key === "ArrowLeft") {
                GameRuntimeData.posX = Math.max(0, GameRuntimeData.posX - 20);
                playerEntity.style.left = GameRuntimeData.posX + "px";
            } else if (e.key === "ArrowRight") {
                const maxBoundary = arenaArea.clientWidth - 30;
                GameRuntimeData.posX = Math.min(maxBoundary, GameRuntimeData.posX + 20);
                playerEntity.style.left = GameRuntimeData.posX + "px";
            }
        };
        document.addEventListener('keydown', docKeydown);

        let spawnFrameTick = 0;
        const collisionTickInterval = setInterval(() => {
            spawnFrameTick++;
            if (spawnFrameTick % 12 === 0) {
                const meteor = document.createElement('div');
                meteor.style.position = "absolute";
                meteor.style.top = "0px";
                meteor.style.left = Math.floor(Math.random() * (arenaArea.clientWidth - 16)) + "px";
                meteor.style.width = "16px";
                meteor.style.height = "16px";
                meteor.style.backgroundColor = "#d90429";
                meteor.style.border = "2px solid #80001c";
                arenaArea.appendChild(meteor);
                GameRuntimeData.meteors.push(meteor);
            }

            for (let i = GameRuntimeData.meteors.length - 1; i >= 0; i--) {
                const m = GameRuntimeData.meteors[i];
                const currentTop = parseInt(m.style.top) || 0;
                const nextTop = currentTop + 6;
                m.style.top = nextTop + "px";

                if (nextTop > 180) {
                    m.remove();
                    GameRuntimeData.meteors.splice(i, 1);
                    continue;
                }

                const mLeft = parseInt(m.style.left);
                const pLeft = GameRuntimeData.posX;
                
                if (nextTop >= 140 && nextTop <= 170) {
                    if (mLeft + 16 >= pLeft && mLeft <= pLeft + 30) {
                        clearInterval(collisionTickInterval);
                        clearInterval(GameLoopInterval);
                        document.removeEventListener('keydown', docKeydown);
                        evaluateMiniGameOutcome(false, "IMPACT DETECTED! METEOR COLLISION.");
                        return;
                    }
                }
            }
        }, 50);

        runGlobalArenaTimer(15, () => {
            clearInterval(collisionTickInterval);
            document.removeEventListener('keydown', docKeydown);
            evaluateMiniGameOutcome(true, "EVASION PROTOCOLS SUCCESSFUL!");
        });
    }

    // --- GAME 4: TREASURE CHEST ---
    function setupTreasureChestGame() {
        const structuralTries = 2;
        GameRuntimeData = { tries: 0, winningIndex: Math.floor(Math.random() * 3) };
        DOM.displays.arenaScore.textContent = `ATTEMPTS LEFT: ${structuralTries}`;

        const chestWrapper = document.createElement('div');
        chestWrapper.style.display = "flex";
        chestWrapper.style.gap = "15px";

        for (let i = 0; i < 3; i++) {
            const chest = document.createElement('button');
            chest.className = "btn-pixel";
            chest.textContent = "CHEST";
            chest.style.padding = "25px 15px";
            chest.style.backgroundColor = "#141b4d";

            chest.addEventListener('click', () => {
                if (chest.classList.contains('disabled') || GameRuntimeData.tries >= structuralTries) return;

                GameRuntimeData.tries++;
                if (i === GameRuntimeData.winningIndex) {
                    chest.style.backgroundColor = "#ffea00";
                    chest.textContent = "GOLD!!";
                    clearInterval(GameLoopInterval);
                    setTimeout(() => { evaluateMiniGameOutcome(true, "FOUND THE TRUE TREASURE!"); }, 800);
                } else {
                    chest.style.backgroundColor = "#222";
                    chest.textContent = "EMPTY";
                    chest.classList.add('disabled');
                    DOM.displays.arenaScore.textContent = `ATTEMPTS LEFT: ${structuralTries - GameRuntimeData.tries}`;

                    if (GameRuntimeData.tries >= structuralTries) {
                        clearInterval(GameLoopInterval);
                        setTimeout(() => { evaluateMiniGameOutcome(false, "ALL CHESTS WERE BOOBY-TRAPPED!"); }, 800);
                    }
                }
            });
            chestWrapper.appendChild(chest);
        }

        DOM.displays.arenaCanvas.appendChild(chestWrapper);
        runGlobalArenaTimer(15, () => {
            evaluateMiniGameOutcome(false, "THE ROOM COLLAPSED BEFORE CHOOSING!");
        });
    }

    // --- GAME 5: SIMON SAYS ---
    function setupSimonSaysGame() {
        DOM.displays.arenaScore.textContent = "WATCH PATTERN";
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = "grid";
        buttonsContainer.style.gridTemplateColumns = "1fr 1fr";
        buttonsContainer.style.gap = "15px";
        buttonsContainer.style.width = "180px";

        const colors = ["#d90429", "#00b4d8", "#ffea00", "#38b000"];
        const sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
        
        GameRuntimeData = { sequence, userStep: 0, blockInput: true };
        const visualButtons = [];

        colors.forEach((color, index) => {
            const btn = document.createElement('div');
            btn.className = "btn-pixel";
            btn.style.height = "60px";
            btn.style.backgroundColor = color;
            btn.style.opacity = "0.3";
            btn.style.borderColor = "#000";

            btn.addEventListener('click', () => {
                if (GameRuntimeData.blockInput) return;
                
                btn.style.opacity = "1";
                setTimeout(() => { btn.style.opacity = "0.3"; }, 200);

                if (index === GameRuntimeData.sequence[GameRuntimeData.userStep]) {
                    GameRuntimeData.userStep++;
                    DOM.displays.arenaScore.textContent = `MATCHED: ${GameRuntimeData.userStep}/4`;
                    if (GameRuntimeData.userStep === 4) {
                        clearInterval(GameLoopInterval);
                        evaluateMiniGameOutcome(true, "PERFECT RECALL MEMORY TUNING!");
                    }
                } else {
                    clearInterval(GameLoopInterval);
                    evaluateMiniGameOutcome(false, "WRONG SEQUENCE ECHOED.");
                }
            });

            visualButtons.push(btn);
            buttonsContainer.appendChild(btn);
        });

        DOM.displays.arenaCanvas.appendChild(buttonsContainer);

        // Flash sequence animation timeline loop
        let flashIdx = 0;
        const flashInterval = setInterval(() => {
            if (flashIdx < sequence.length) {
                const targetBtn = visualButtons[sequence[flashIdx]];
                targetBtn.style.opacity = "1";
                setTimeout(() => { targetBtn.style.opacity = "0.3"; }, 400);
                flashIdx++;
            } else {
                clearInterval(flashInterval);
                GameRuntimeData.blockInput = false;
                DOM.displays.arenaScore.textContent = "YOUR REPEAT TURN!";
            }
        }, 700);

        runGlobalArenaTimer(20, () => {
            evaluateMiniGameOutcome(false, "SIMON DICTATED TIME OUT.");
        });
    }

    // --- GAME 6: PIXEL ATTACK ---
    function setupPixelAttackGame() {
        const goalScore = 15;
        GameRuntimeData = { hits: 0 };
        DOM.displays.arenaScore.textContent = `TARGETS SMASHED: 0/${goalScore}`;

        const gridBoard = document.createElement('div');
        gridBoard.style.position = "relative";
        gridBoard.style.width = "100%";
        gridBoard.style.height = "100%";

        DOM.displays.arenaCanvas.appendChild(gridBoard);

        const spawnAndDropTarget = () => {
            if (GameRuntimeData.hits >= goalScore || GameTimerCountdown <= 0) return;

            const badBlock = document.createElement('button');
            badBlock.className = "btn-pixel red";
            badBlock.textContent = "X";
            badBlock.style.position = "absolute";
            badBlock.style.padding = "6px 10px";
            badBlock.style.top = "10px";
            badBlock.style.left = Math.floor(Math.random() * (gridBoard.clientWidth - 40)) + "px";

            let fallInterval = setInterval(() => {
                let currentTop = parseInt(badBlock.style.top) || 0;
                if (currentTop > 140) {
                    clearInterval(fallInterval);
                    badBlock.remove();
                    // Penalty logic deduction constraint framework
                    spawnAndDropTarget();
                } else {
                    badBlock.style.top = (currentTop + 15) + "px";
                }
            }, 120);

            badBlock.addEventListener('click', () => {
                clearInterval(fallInterval);
                badBlock.remove();
                GameRuntimeData.hits++;
                DOM.displays.arenaScore.textContent = `TARGETS SMASHED: ${GameRuntimeData.hits}/${goalScore}`;

                if (GameRuntimeData.hits >= goalScore) {
                    clearInterval(GameLoopInterval);
                    evaluateMiniGameOutcome(true, "RETRO GRID FULLY SANITIZED!");
                } else {
                    spawnAndDropTarget();
                }
            });

            gridBoard.appendChild(badBlock);
        };

        spawnAndDropTarget();
        spawnAndDropTarget(); // Secondary threat intercept tracking loops

        runGlobalArenaTimer(20, () => {
            evaluateMiniGameOutcome(false, `INCOMPLETE TERMINATION. INFILTRATED BY BLOCKS.`);
        });
    }

    // --- GAME 7: MAZE ESCAPE ---
    function setupMazeEscapeGame() {
        DOM.displays.arenaScore.textContent = "REACH THE GREEN SQUARE!";
        
        const mazeContainer = document.createElement('div');
        mazeContainer.style.position = "relative";
        mazeContainer.style.width = "150px";
        mazeContainer.style.height = "150px";
        mazeContainer.style.backgroundColor = "#111";
        mazeContainer.style.border = "3px solid var(--panel-border-light)";

        // 5x5 Grid matrix structure mapping (0 = path, 1 = solid walls layout)
        const layout = [
            [0, 0, 1, 0, 0],
            [1, 0, 1, 0, 1],
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 1, 0] // Target point at [4,4]
        ];

        // Draw structural map components inside canvas
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (layout[r][c] === 1) {
                    const block = document.createElement('div');
                    block.style.position = "absolute";
                    block.style.width = "30px";
                    block.style.height = "30px";
                    block.style.backgroundColor = "#2c388c";
                    block.style.top = (r * 30) + "px";
                    block.style.left = (c * 30) + "px";
                    mazeContainer.appendChild(block);
                }
            }
        }

        // Win Goal Square rendering
        const targetElement = document.createElement('div');
        targetElement.style.position = "absolute";
        targetElement.style.width = "30px";
        targetElement.style.height = "30px";
        targetElement.style.backgroundColor = "#38b000";
        targetElement.style.top = "120px";
        targetElement.style.left = "120px";
        mazeContainer.appendChild(targetElement);

        // Player micro token element
        const explorerToken = document.createElement('div');
        explorerToken.style.position = "absolute";
        explorerToken.style.width = "20px";
        explorerToken.style.height = "20px";
        explorerToken.style.margin = "5px";
        explorerToken.style.backgroundColor = "#ffea00";
        explorerToken.style.top = "0px";
        explorerToken.style.left = "0px";
        mazeContainer.appendChild(explorerToken);

        // Movement Directional UI Controls Grid Box layout
        const controlsPad = document.createElement('div');
        controlsPad.style.display = "grid";
        controlsPad.style.gridTemplateColumns = "repeat(3, 1fr)";
        controlsPad.style.gap = "4px";
        controlsPad.style.marginLeft = "15px";

        GameRuntimeData = { pR: 0, pC: 0 };

        const processDirection = (dr, dc) => {
            const nextR = GameRuntimeData.pR + dr;
            const nextC = GameRuntimeData.pC + dc;
            
            if (nextR >= 0 && nextR < 5 && nextC >= 0 && nextC < 5) {
                if (layout[nextR][nextC] !== 1) {
                    GameRuntimeData.pR = nextR;
                    GameRuntimeData.pC = nextC;
                    explorerToken.style.top = (nextR * 30) + "px";
                    explorerToken.style.left = (nextC * 30) + "px";

                    if (nextR === 4 && nextC === 4) {
                        clearInterval(GameLoopInterval);
                        evaluateMiniGameOutcome(true, "MAZE CORE ESCAPED SUCCESSFULLY!");
                    }
                }
            }
        };

        const createDirectionalButton = (label, dr, dc) => {
            const b = document.createElement('button');
            b.className = "btn-pixel small";
            b.textContent = label;
            b.addEventListener('click', () => processDirection(dr, dc));
            return b;
        };

        const spacer = () => document.createElement('div');

        controlsPad.appendChild(spacer());
        controlsPad.appendChild(createDirectionalButton("U", -1, 0));
        controlsPad.appendChild(spacer());
        controlsPad.appendChild(createDirectionalButton("L", 0, -1));
        controlsPad.appendChild(createDirectionalButton("D", 1, 0));
        controlsPad.appendChild(createDirectionalButton("R", 0, 1));

        DOM.displays.arenaCanvas.appendChild(mazeContainer);
        DOM.displays.arenaCanvas.appendChild(controlsPad);

        runGlobalArenaTimer(25, () => {
            evaluateMiniGameOutcome(false, "LOST INSIDE THE LABYRINTH GEOMETRY.");
        });
    }

    // ---------------------------------------------------------
    // POST-GAME DESTINY MATRIX EVALUATION PROCEDURES
    // ---------------------------------------------------------
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
        
        AppState.assignedRoles[allocatedRole] = playerName;
        AppState.history.push({
            name: playerName,
            role: allocatedRole,
            status: AppState.currentPlayer.wins >= 2 ? "CHOICE" : "RANDOM"
        });

        AppState.currentPlayer = { name: "", wins: 0, gamesPlayed: 0, currentGameIndex: 0, gamePool: [] };
        saveSessionData();
        renderSidebar();

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
            if (GameLoopInterval) clearInterval(GameLoopInterval);
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

        DOM.inputs.playerName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handlePlayerRegistration();
        });
    }

    function escapeHTML(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    document.addEventListener('DOMContentLoaded', init);
}());
