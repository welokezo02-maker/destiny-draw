/* ==========================================================================
   script.js - UNIVERSAL FUZZY-MATCHING ENGINE (NO ID DEPENDENCY)
   ========================================================================== */

(function () {
    'use strict';

    const DEFINED_ROLES = [
        "Leader", "Opening Prayer", "Scripture Reading", "Offertory Prayer",
        "Offering Collection", "Volunteer", "Announcements", "Icebreaker",
        "Closing Prayer", "Game Host", "Worship Assistant"
    ];

    const STORAGE_KEY = "destiny_draw_mobile_v1";

    let AppState = {
        assignedRoles: {},
        history: [],
        currentPlayer: { name: "", wins: 0, gamesPlayed: 0, gamePool: [] }
    };

    // Fallback load/save
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) AppState = JSON.parse(stored);
    } catch (e) {
        console.warn("Storage read failed, starting fresh.");
    }

    function init() {
        console.log("Destiny Draw Engine Initiated.");

        // 1. Find the Input Field
        // Looks for any input element on the page
        const nameInput = document.querySelector('input[type="text"]') || document.querySelector('input');

        // 2. Find the "Start Trial" Button
        // Finds any button containing the words "start" or "trial" (case-insensitive)
        let startButton = null;
        const allButtons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        
        startButton = allButtons.find(btn => {
            const txt = btn.textContent.toLowerCase();
            return txt.includes('start') || txt.includes('trial');
        });

        // 3. Find the "Status" Button
        const statusButton = allButtons.find(btn => {
            return btn.textContent.toLowerCase().includes('status');
        });

        // --- BIND EVENTS ---

        if (startButton) {
            console.log("Found Start Button:", startButton);
            startButton.addEventListener('click', function(e) {
                e.preventDefault();
                const name = nameInput ? nameInput.value.trim() : "";
                if (!name) {
                    alert("Please enter your callsign!");
                    return;
                }
                
                // Success! Set player name and kick off the logic
                AppState.currentPlayer.name = name;
                AppState.currentPlayer.gamesPlayed = 0;
                AppState.currentPlayer.wins = 0;
                AppState.currentPlayer.gamePool = [0, 1, 2].sort(() => 0.5 - Math.random());
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
                alert(`Welcome, ${name}! System Initiated. Beginning Trial...`);
                
                // Let's try to jump to the game view, or reload to apply state
                location.reload(); 
            });
        } else {
            console.error("Could not find a 'Start Trial' button on the page.");
        }

        if (statusButton) {
            console.log("Found Status Button:", statusButton);
            statusButton.addEventListener('click', function(e) {
                e.preventDefault();
                alert("System Status: Active\nRemaining Roles: " + 
                      DEFINED_ROLES.filter(r => !AppState.assignedRoles[r]).join(', '));
            });
        }
    }

    // Safely run setup
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
