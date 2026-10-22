/**
 * Black Flag Doom Panel — Foundry V14 ApplicationV2 migration (development milestone 1).
 *
 * The Doom rules and persistence model are intentionally preserved for this
 * architecture milestone. They will be replaced in the subsequent rules/state
 * milestone after the ToV Monster Vault and Game Master's Guide review.
 */
const MODULE_ID = "black-flag-doom-panel";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const AUDIO = Object.freeze({
  gain: { src: "sounds/lock.wav", volume: 0.8 },
  spend: { src: "sounds/dice.wav", volume: 0.6 },
  start: { src: "sounds/drums.wav", volume: 0.8 }
});

const state = {
  panel: null,
  overlay: null,
  lastKnownValue: 0,
  initialized: false
};

// Setting changes reach all clients. Play once on each client without sending
// another socket broadcast from every recipient.
function playLocal(kind) {
  const options = AUDIO[kind];
  if (options) foundry.audio.AudioHelper.play({ ...options, autoplay: true }, false);
}

function rerenderOpen(app) {
  if (app?.rendered) void app.render().catch(err => console.error(MODULE_ID + " | Render failed", err));
}

// Legacy v1 calculation retained temporarily to isolate the UI migration.
// Correct encounter-CR calculation will replace this in milestone 3.
function legacyStartingDoom(adversaries) {
  if (!adversaries.length) return 0;
  const maxCR = Math.max(0, ...adversaries.map(c => Number(c.actor?.system?.attributes?.cr) || 0));
  const base = maxCR >= 23 ? 6 : maxCR >= 17 ? 5 : maxCR >= 11 ? 4 : maxCR >= 5 ? 3 : 2;
  return base + adversaries.length - 1;
}

function activeAdversaries() {
  return game.combats.active?.combatants.filter(c => c.actor && !c.actor.hasPlayerOwner) ?? [];
}

function getDoom() {
  return game.settings.get(MODULE_ID, "doomPoints");
}

async function setDoom(amount) {
  if (!game.user.isGM) return;
  if (!Number.isSafeInteger(amount) || amount < 0) {
    ui.notifications.warn("Doom must be a non-negative whole number.");
    return;
  }
  await game.settings.set(MODULE_ID, "doomPoints", amount);
}

class DoomPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "doom-panel-window",
    classes: ["bfdp-panel-app"],
    window: { title: "Doom Tracker", resizable: true },
    position: { width: 260, height: "auto" },
    actions: {
      gainDoom: this._gainDoom,
      spendDoom: this._spendDoom
    }
  };

  static PARTS = {
    content: { template: "modules/" + MODULE_ID + "/templates/doom-panel.html" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const adversaries = activeAdversaries();
    return {
      ...context,
      doom: getDoom(),
      adversaryCount: adversaries.length,
      maxCR: Math.max(0, ...adversaries.map(c => Number(c.actor?.system?.attributes?.cr) || 0))
    };
  }

  /** @this {DoomPanel} */
  static async _gainDoom() {
    if (!game.user.isGM) return;
    await setDoom(getDoom() + 1);
  }

  /** @this {DoomPanel} */
  static async _spendDoom(_event, target) {
    if (!game.user.isGM) return;
    const isCustom = target.classList.contains("custom-btn");
    const raw = isCustom
      ? this.element.querySelector("#custom-spend-val")?.value
      : target.dataset.cost;
    const cost = Number(raw);
    if (!Number.isSafeInteger(cost) || cost < 1) {
      ui.notifications.warn("Spend cost must be a positive whole number.");
      return;
    }
    const current = getDoom();
    if (current < cost) return;
    await setDoom(current - cost);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("#manual-doom-input")?.addEventListener("change", async event => {
      const raw = event.currentTarget.value;
      if (raw.trim() === "") return;
      await setDoom(Number(raw));
    });
  }
}

class DoomOverlay extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "doom-overlay-window",
    classes: ["bfdp-overlay-app"],
    window: { frame: false },
    position: { width: 260, height: "auto" }
  };

  static PARTS = {
    content: { template: "modules/" + MODULE_ID + "/templates/doom-overlay.html" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return { ...context, doom: getDoom() };
  }
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "doomPoints", {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: value => {
      if (state.initialized) {
        if (value > state.lastKnownValue) playLocal("gain");
        else if (value < state.lastKnownValue) playLocal("spend");
      }
      state.lastKnownValue = value;
      rerenderOpen(state.panel);
      rerenderOpen(state.overlay);
    }
  });

  game.settings.register(MODULE_ID, "activeCombat", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    onChange: active => {
      if (active) {
        if (state.initialized) playLocal("start");
        void state.overlay?.render({ force: true });
        if (game.user.isGM) void state.panel?.render({ force: true });
      } else {
        void state.overlay?.close();
        if (game.user.isGM) void state.panel?.close();
      }
    }
  });

  game.blackFlagDoomPanel = state;
});

Hooks.once("ready", async () => {
  state.panel = new DoomPanel();
  state.overlay = new DoomOverlay();
  state.lastKnownValue = getDoom();
  state.initialized = true;

  // Never reset world-level Doom merely because the GM refreshed the page.
  // Encounter-scoped lifecycle/state handling follows in milestone 2.
  if (game.settings.get(MODULE_ID, "activeCombat")) {
    await state.overlay.render({ force: true });
    if (game.user.isGM) await state.panel.render({ force: true });
  }
});

Hooks.on("combatStart", async combat => {
  if (!game.user.isGM) return;
  const adversaries = combat.combatants.filter(c => c.actor && !c.actor.hasPlayerOwner);
  await setDoom(legacyStartingDoom(adversaries));
  await game.settings.set(MODULE_ID, "activeCombat", true);
});

// Temporary legacy behavior: deleting an unrelated combat still clears Doom.
// Milestone 2 will associate the bank with the specific encounter.
Hooks.on("deleteCombat", async () => {
  if (!game.user.isGM) return;
  await game.settings.set(MODULE_ID, "activeCombat", false);
  await setDoom(0);
});

Hooks.on("createCombatant", () => rerenderOpen(state.panel));
Hooks.on("deleteCombatant", () => rerenderOpen(state.panel));
Hooks.on("updateCombatant", () => rerenderOpen(state.panel));
Hooks.on("updateActor", () => rerenderOpen(state.panel));
