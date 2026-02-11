const BFDP_ID = 'black-flag-doom-panel';

// Dramatic Audio Paths
const SOUNDS = {
    GAIN: "sounds/lock.wav",    // Clunk for generation
    SPEND: "sounds/dice.wav",   // Rattle for spending
    START: "sounds/drums.wav"   // Dramatic beat on Combat Start
};

Hooks.once('init', () => {
    // Register the setting to store the Doom count globally
    game.settings.register(BFDP_ID, "doomPoints", {
        scope: "world",
        config: false,
        type: Number,
        default: 0,
        onChange: (newValue) => {
            const panel = game.blackFlagDoomPanel;
            const oldValue = panel.lastKnownValue || 0;
            
            // Play audio based on direction of change
            if (newValue > oldValue) {
                AudioHelper.play({src: SOUNDS.GAIN, volume: 0.8}, true);
            } else if (newValue < oldValue) {
                AudioHelper.play({src: SOUNDS.SPEND, volume: 0.6}, true);
            }
            panel.lastKnownValue = newValue;

            if (panel.panel?.rendered) panel.panel.render(true);
            if (panel.overlay?.rendered) panel.overlay.render(true);
        }
    });

    game.settings.register(BFDP_ID, "activeCombat", {
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        onChange: active => {
            if (active) {
                AudioHelper.play({src: SOUNDS.START, volume: 0.8}, true);
                game.blackFlagDoomPanel.overlay.render(true);
                if (game.user.isGM) game.blackFlagDoomPanel.panel.render(true);
            } else {
                game.blackFlagDoomPanel.overlay.close();
                if (game.blackFlagDoomPanel.panel) game.blackFlagDoomPanel.panel.close();
            }
        }
    });

    game.blackFlagDoomPanel = { panel: null, overlay: null, lastKnownValue: 0 };
});

Hooks.on('ready', async () => {
    game.blackFlagDoomPanel.panel = new DoomPanelDev();
    game.blackFlagDoomPanel.overlay = new DoomOverlayDev();
    game.blackFlagDoomPanel.lastKnownValue = game.settings.get(BFDP_ID, "doomPoints");

    // Clean up ghost renders on reload
    if (!game.combats.active && game.user.isGM) {
        await game.settings.set(BFDP_ID, "activeCombat", false);
        await game.settings.set(BFDP_ID, "doomPoints", 0);
    }

    if (game.settings.get(BFDP_ID, "activeCombat")) {
        game.blackFlagDoomPanel.overlay.render(true);
        if (game.user.isGM) game.blackFlagDoomPanel.panel.render(true);
    }
});

function calculateDoomFromTable(adversaries) {
    if (!adversaries || adversaries.length === 0) return 0;
    let maxCR = 0;
    adversaries.forEach(c => {
        let cr = c.actor?.system.attributes?.cr || 0;
        let num = typeof cr === "string" ? Function(`"use strict"; return (${cr})`)() : cr;
        if (num > maxCR) maxCR = num;
    });
    let base = (maxCR >= 23) ? 6 : (maxCR >= 17) ? 5 : (maxCR >= 11) ? 4 : (maxCR >= 5) ? 3 : 2;
    return base + (adversaries.length - 1);
}

Hooks.on("combatStart", async (combat) => {
    if (!game.user.isGM) return;
    const adversaries = combat.combatants.filter(c => !c.actor?.hasPlayerOwner);
    const startDoom = calculateDoomFromTable(adversaries);
    await game.settings.set(BFDP_ID, "doomPoints", startDoom);
    await game.settings.set(BFDP_ID, "activeCombat", true);
});

Hooks.on("deleteCombat", async () => {
    if (game.user.isGM) {
        await game.settings.set(BFDP_ID, "activeCombat", false);
        await game.settings.set(BFDP_ID, "doomPoints", 0);
    }
});

class DoomPanelDev extends Application {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "doom-panel-window",
            template: `modules/black-flag-doom-panel/templates/doom-panel.html`,
            popOut: true,
            width: 240,
            height: "auto",
            title: "Doom Tracker"
        });
    }

    getData() {
        const combat = game.combats.active;
        const adversaries = combat ? combat.combatants.filter(c => !c.actor?.hasPlayerOwner) : [];
        let maxCR = 0;
        adversaries.forEach(c => {
            let cr = c.actor?.system.attributes?.cr || 0;
            let num = typeof cr === "string" ? Function(`"use strict"; return (${cr})`)() : cr;
            if (num > maxCR) maxCR = num;
        });
        return {
            doom: game.settings.get(BFDP_ID, "doomPoints"),
            adversaryCount: adversaries.length,
            maxCR: maxCR
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('.gain-btn').on('click', () => {
            game.settings.set(BFDP_ID, "doomPoints", game.settings.get(BFDP_ID, "doomPoints") + 1);
        });
        html.find('.spend-btn').on('click', ev => {
            const btn = ev.currentTarget;
            const cost = btn.classList.contains('custom-btn') 
                ? parseInt(html.find('#custom-spend-val').val()) 
                : parseInt(btn.dataset.cost);
            const current = game.settings.get(BFDP_ID, "doomPoints");
            if (current >= cost) game.settings.set(BFDP_ID, "doomPoints", current - cost);
        });
        html.find('#manual-doom-input').on('change', ev => {
            game.settings.set(BFDP_ID, "doomPoints", parseInt(ev.target.value) || 0);
        });
    }
}

class DoomOverlayDev extends Application {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "doom-overlay-window",
            template: `modules/black-flag-doom-panel/templates/doom-overlay.html`,
            popOut: false
        });
    }
    getData() { return { doom: game.settings.get(BFDP_ID, "doomPoints") }; }
}
