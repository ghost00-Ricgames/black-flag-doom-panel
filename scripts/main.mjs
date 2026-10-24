/**
 * Black Flag Doom Panel - v2 development / Milestone 2.
 * Foundry V14 ApplicationV2 + Combat document-scoped Doom state.
 *
 * Rules and action labels intentionally remain at v1.x functionality parity.
 * ToV Monster Vault / GMG Doom calculation and named actions come in Milestone 3.
 */
const MODULE_ID = "black-flag-doom-panel";
const DOOM_FLAG = "doomState";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const AUDIO = Object.freeze({
  gain: { src: "sounds/lock.wav", volume: 0.8 },
  spend: { src: "sounds/dice.wav", volume: 0.6 },
  start: { src: "sounds/drums.wav", volume: 0.8 }
});

const state = {
  panel: null,
  overlay: null,
  initialized: false,
  displayedCombatId: null,
  seenRevision: new Map(),
  writeQueues: new Map()
};

function reportError(context, error) {
  console.error(MODULE_ID + " | " + context, error);
  ui.notifications?.error("Doom Panel encountered an error; check the console.");
}

function playLocal(kind) {
  const options = AUDIO[kind];
  if (options) foundry.audio.AudioHelper.play({ ...options, autoplay: true }, false);
}

function activeAuthority() {
  return game.users.activeGM;
}

function canEdit() {
  return Boolean(game.user?.isGM && activeAuthority()?.id === game.user.id);
}

function viewedCombat() {
  return game.combats.viewed ?? game.combats.active ?? null;
}

function displayedCombat() {
  const combat = viewedCombat();
  return combat?.started ? combat : null;
}

function readBank(combat) {
  const bank = combat?.getFlag(MODULE_ID, DOOM_FLAG);
  if (!bank || bank.schema !== 1 || !Number.isSafeInteger(bank.current) || bank.current < 0) return null;
  return bank;
}

function displayedBank() {
  const combat = displayedCombat();
  const bank = readBank(combat);
  return bank?.active ? bank : null;
}

function legacyStartingDoom(combat) {
  // Temporary v1.x parity: replaced by ToV table / encounter-CR in milestone 3.
  const adversaries = [...combat.combatants].filter(c => c.actor && !c.actor.hasPlayerOwner);
  if (!adversaries.length) return 0;
  const maxCR = Math.max(0, ...adversaries.map(c => Number(c.actor?.system?.attributes?.cr) || 0));
  const base = maxCR >= 23 ? 6 : maxCR >= 17 ? 5 : maxCR >= 11 ? 4 : maxCR >= 5 ? 3 : 2;
  return base + adversaries.length - 1;
}

function newBank(combat) {
  return {
    schema: 1,
    active: true,
    current: legacyStartingDoom(combat),
    revision: 1,
    lastAction: "start",
    delta: 0
  };
}

// Serialize all local writes per Combat. Only Foundry's designated active GM
// may mutate Doom, preventing separate GM clients from racing to overwrite it.
function queueWrite(combat, operation) {
  const previous = state.writeQueues.get(combat.id) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  state.writeQueues.set(combat.id, next);
  void next.finally(() => {
    if (state.writeQueues.get(combat.id) === next) state.writeQueues.delete(combat.id);
  }).catch(() => {});
  return next;
}

async function persistBank(combat, bank) {
  await combat.setFlag(MODULE_ID, DOOM_FLAG, bank);
}

function queueLifecycleUpdate(combat) {
  if (!canEdit()) return;
  return queueWrite(combat, async () => {
    // Read only after waiting for earlier writes, never at hook dispatch time.
    const bank = readBank(combat);
    if (combat.started) {
      if (!bank?.active) await persistBank(combat, newBank(combat));
    } else if (bank?.active) {
      await persistBank(combat, {
        ...bank, active: false, revision: bank.revision + 1,
        lastAction: "end", delta: 0
      });
    }
  }).catch(error => reportError("combat lifecycle", error));
}

async function changeDoom(kind, value, combatId) {
  if (!game.user?.isGM) return;
  if (!canEdit()) {
    ui.notifications.warn("Only the currently active GM can edit Doom. Other GMs can view its total.");
    return;
  }
  const combat = game.combats.get(combatId);
  if (!combat || !combat.started) {
    ui.notifications.warn("Select a started combat encounter before editing Doom.");
    return;
  }
  if (!Number.isSafeInteger(value) || value < 0 || (kind !== "set" && value === 0)) {
    ui.notifications.warn("Doom amounts must be valid whole numbers.");
    return;
  }
  try {
    return await queueWrite(combat, async () => {
      if (!combat.started) return;
      let bank = readBank(combat);
      if (!bank?.active) {
        bank = newBank(combat);
        await persistBank(combat, bank);
      }
      let next;
      if (kind === "gain") next = bank.current + value;
      else if (kind === "spend") next = bank.current - value;
      else if (kind === "set") next = value;
      else return;
      if (!Number.isSafeInteger(next) || next < 0) {
        ui.notifications.warn("Insufficient Doom or invalid total.");
        return;
      }
      if (next === bank.current) return;
      await persistBank(combat, {
        ...bank,
        current: next,
        revision: bank.revision + 1,
        lastAction: kind,
        delta: next - bank.current
      });
    });
  } catch (error) {
    reportError("Doom update", error);
  }
}

function rerenderOpen(app) {
  if (app?.rendered) void app.render().catch(error => reportError("render", error));
}

function syncVisibleApplications() {
  if (!state.initialized) return;
  const combat = displayedCombat();
  const bank = displayedBank();
  const id = bank ? combat.id : null;
  if (id !== state.displayedCombatId) state.displayedCombatId = id;
  if (!id) {
    if (state.panel?.rendered) void state.panel.close().catch(error => reportError("close panel", error));
    if (state.overlay?.rendered) void state.overlay.close().catch(error => reportError("close overlay", error));
    return;
  }
  if (game.user.isGM) {
    if (!state.panel.rendered) void state.panel.render({ force: true }).catch(error => reportError("show panel", error));
    else rerenderOpen(state.panel);
  }
  if (!state.overlay.rendered) void state.overlay.render({ force: true }).catch(error => reportError("show overlay", error));
  else rerenderOpen(state.overlay);
}

function handleBankAudio(combat) {
  const bank = readBank(combat);
  if (!bank) return;
  const prior = state.seenRevision.get(combat.id) ?? 0;
  if (bank.revision <= prior) return;
  state.seenRevision.set(combat.id, bank.revision);
  if (!state.initialized || viewedCombat()?.id !== combat.id || !bank.active || !combat.started) return;
  if (bank.lastAction === "start") playLocal("start");
  else if (bank.delta > 0) playLocal("gain");
  else if (bank.delta < 0) playLocal("spend");
}

function onCombatUpdate(combat) {
  handleBankAudio(combat);
  // Run after the document update (unlike combatStart, which is a pre-update hook).
  void queueLifecycleUpdate(combat);
  syncVisibleApplications();
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
    const combat = displayedCombat();
    const adversaries = combat
      ? [...combat.combatants].filter(c => c.actor && !c.actor.hasPlayerOwner)
      : [];
    return {
      ...context,
      doom: displayedBank()?.current ?? 0,
      canEdit: canEdit(),
      adversaryCount: adversaries.length,
      maxCR: Math.max(0, ...adversaries.map(c => Number(c.actor?.system?.attributes?.cr) || 0))
    };
  }

  static async _gainDoom() {
    const combat = displayedCombat();
    if (combat) await changeDoom("gain", 1, combat.id);
  }

  static async _spendDoom(_event, target) {
    const combat = displayedCombat();
    if (!combat) return;
    const raw = target.classList.contains("custom-btn")
      ? this.element.querySelector("#custom-spend-val")?.value
      : target.dataset.cost;
    const cost = Number(raw);
    if (!Number.isSafeInteger(cost) || cost < 1) {
      ui.notifications.warn("Spend cost must be a positive whole number.");
      return;
    }
    await changeDoom("spend", cost, combat.id);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    // Capture combat identity here to avoid applying a late input to another encounter.
    const combatId = displayedCombat()?.id;
    this.element.querySelector("#manual-doom-input")?.addEventListener("change", async event => {
      if (!combatId) return;
      const raw = event.currentTarget.value.trim();
      if (raw === "") return;
      const amount = Number(raw);
      if (!Number.isSafeInteger(amount) || amount < 0) {
        ui.notifications.warn("Doom must be a non-negative whole number.");
        return;
      }
      await changeDoom("set", amount, combatId);
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
    return { ...context, doom: displayedBank()?.current ?? 0 };
  }
}

Hooks.once("init", () => {
  // Register legacy keys only for compatibility with existing v1.x worlds;
  // they are no longer used or mutated by this build.
  game.settings.register(MODULE_ID, "doomPoints", {
    scope: "world", config: false, type: Number, default: 0
  });
  game.settings.register(MODULE_ID, "activeCombat", {
    scope: "world", config: false, type: Boolean, default: false
  });
  game.blackFlagDoomPanel = state;
});

Hooks.once("ready", () => {
  state.panel = new DoomPanel();
  state.overlay = new DoomOverlay();
  // Existing banks should not replay sound on browser refresh.
  for (const combat of game.combats) {
    const bank = readBank(combat);
    if (bank) state.seenRevision.set(combat.id, bank.revision);
  }
  state.initialized = true;
  for (const combat of game.combats) void queueLifecycleUpdate(combat);
  syncVisibleApplications();
});

Hooks.on("updateCombat", onCombatUpdate);
Hooks.on("createCombat", combat => {
  void queueLifecycleUpdate(combat);
  syncVisibleApplications();
});
Hooks.on("deleteCombat", combat => {
  state.seenRevision.delete(combat.id);
  state.writeQueues.delete(combat.id);
  syncVisibleApplications();
});
Hooks.on("canvasReady", syncVisibleApplications);
Hooks.on("updateCombatant", syncVisibleApplications);
Hooks.on("createCombatant", syncVisibleApplications);
Hooks.on("deleteCombatant", syncVisibleApplications);
Hooks.on("updateActor", () => rerenderOpen(state.panel));
Hooks.on("userConnected", () => rerenderOpen(state.panel));
