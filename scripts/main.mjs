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

function hostileCombatants(combat) {
  if (!combat) return [];
  const hostile = globalThis.CONST?.TOKEN_DISPOSITIONS?.HOSTILE ?? -1;
  return [...combat.combatants].filter(entry => {
    if (!entry.actor) return false;
    const disposition = entry.token?.disposition ?? entry.token?.document?.disposition;
    // Token disposition is authoritative when present. This excludes
    // friendly and neutral NPC allies from encounter-CR calculations.
    if (disposition !== undefined && disposition !== null) return disposition === hostile;
    return !entry.actor.hasPlayerOwner;
  });
}

function encounterCR(combat) {
  return hostileCombatants(combat).reduce((sum, entry) => {
    const cr = Number(entry.actor?.system?.attributes?.cr);
    return sum + (Number.isFinite(cr) && cr > 0 ? cr : 0);
  }, 0);
}

// Monster Vault p.13: Doom based on the encounter's total CR, NOT highest
// individual CR plus extra points per combatant.
function doomTier(cr) {
  if (cr >= 21) return 6;
  if (cr >= 17) return 5;
  if (cr >= 13) return 4;
  if (cr >= 9) return 3;
  if (cr >= 5) return 2;
  return 1;
}

function encounterBaseline(combat) {
  return hostileCombatants(combat).length ? doomTier(encounterCR(combat)) : 0;
}

function readBank(combat) {
  const bank = combat?.getFlag(MODULE_ID, DOOM_FLAG);
  if (!bank || !Number.isSafeInteger(bank.current) || bank.current < 0) return null;
  if (bank.schema === 2) return bank;
  if (bank.schema !== 1) return null;
  // Upgrade experimental dev.2/dev.3 encounters without resetting their total.
  // Prior spending cannot be reconstructed, so expended Doom starts at 0.
  return {
    schema: 2, active: bank.active, current: bank.current,
    base: encounterBaseline(combat), totalCR: encounterCR(combat),
    startingBonus: 0, expended: 0,
    usage: { recharge: false, autoSave: false, autoAttack: false },
    revision: bank.revision ?? 1, lastAction: bank.lastAction ?? "migrate",
    delta: bank.delta ?? 0
  };
}

function displayedBank() {
  const combat = displayedCombat();
  const bank = readBank(combat);
  return bank?.active ? bank : null;
}

// A player must never inherit the GM's (potentially shared) viewed combat.
// The local selector is stored per client, and scene filtering prevents a GM
// working on another map from changing a player's visible Doom bank.
function playerCombatOptions() {
  const sceneId = globalThis.canvas?.scene?.id ?? game.scenes?.viewed?.id ?? null;
  return [...game.combats].filter(combat => {
    if (!combat.started || combat.visible === false || !readBank(combat)?.active) return false;
    const link = typeof combat.scene === "string"
      ? combat.scene
      : (combat.scene?.id ?? combat.sceneId ?? combat._source?.scene ?? null);
    return !sceneId || !link || link === sceneId;
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function playerOverlayCombat() {
  const options = playerCombatOptions();
  const pinnedId = game.settings.get(MODULE_ID, "playerCombatId");
  const pinned = options.find(combat => combat.id === pinnedId);
  if (pinned) return pinned;
  // When joining a new scene, prefer an encounter containing a character
  // controlled by this player; otherwise choose a stable first encounter.
  return options.find(combat => [...combat.combatants].some(entry =>
    entry.actor?.testUserPermission?.(game.user, "OWNER") === true
  )) ?? options[0] ?? null;
}

function overlayCombat() {
  return game.user.isGM ? displayedCombat() : playerOverlayCombat();
}

function overlayBank() {
  const bank = readBank(overlayCombat());
  return bank?.active ? bank : null;
}

function newBank(combat) {
  return {
    schema: 2,
    active: true,
    current: encounterBaseline(combat),
    base: encounterBaseline(combat),
    totalCR: encounterCR(combat),
    startingBonus: 0,
    expended: 0,
    usage: { recharge: false, autoSave: false, autoAttack: false },
    revision: 1,
    lastAction: "start",
    delta: 0
  };
}

const SPENDS = Object.freeze({
  advantage: { cost: 1 },
  disadvantage: { cost: 1 },
  recharge: { cost: 1, once: "recharge" },
  autoSave: { cost: 1, once: "autoSave", expanded: true },
  autoAttack: { cost: 1, once: "autoAttack", expanded: true },
  movement: { cost: 1, expanded: true }
});

function expandedEnabled() {
  return game.settings.get(MODULE_ID, "expandedDoom") === true;
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
      else if (combat.getFlag(MODULE_ID, DOOM_FLAG)?.schema === 1) {
        await persistBank(combat, { ...bank, revision: bank.revision + 1, lastAction: "migrate", delta: 0 });
      }
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
    ui.notifications.warn("Only the active GM can edit Doom.");
    return;
  }
  const combat = game.combats.get(combatId);
  if (!combat || !combat.started) {
    ui.notifications.warn("Select a started combat before editing Doom.");
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
      const prior = bank.current;
      let next = prior;
      let expended = bank.expended ?? 0;
      let startingBonus = bank.startingBonus ?? 0;
      const usage = { recharge: false, autoSave: false, autoAttack: false, ...bank.usage };
      let action = kind;

      if (kind === "gain") {
        if (!Number.isSafeInteger(value) || value < 1) return;
        next += value; // GM manual grant; not a rule-based recovery.
      } else if (kind === "set") {
        if (!Number.isSafeInteger(value) || value < 0) return;
        next = value; // Correction isn't an actual Doom spend.
      } else if (kind === "spend") {
        const descriptor = SPENDS[value];
        if (!descriptor || (descriptor.expanded && !expandedEnabled())) return;
        if (descriptor.once && usage[descriptor.once]) {
          ui.notifications.warn("That Doom option was already used this encounter.");
          return;
        }
        if (prior < descriptor.cost) {
          ui.notifications.warn("Not enough Doom.");
          return;
        }
        next -= descriptor.cost;
        expended += descriptor.cost;
        if (descriptor.once) usage[descriptor.once] = true;
        action = "spend:" + value;
      } else if (kind === "customSpend") {
        if (!Number.isSafeInteger(value) || value < 1 || prior < value) {
          ui.notifications.warn("Invalid spend or insufficient Doom.");
          return;
        }
        next -= value;
        expended += value;
      } else if (kind === "preBonus") {
        if (!expandedEnabled()) return;
        // GMG p.73: each qualifying event grants +1, but starting Doom
        // may never exceed 2 x the encounter's unmodified base.
        if (bank.base < 1 || startingBonus >= bank.base) {
          ui.notifications.warn("Expanded starting Doom has reached twice the normal starting amount.");
          return;
        }
        startingBonus += 1;
        next += 1;
        action = "pre:" + value;
      } else if (kind === "recover") {
        if (!expandedEnabled()) return;
        if (expended < 1) {
          ui.notifications.warn("No expended Doom remains to recover.");
          return;
        }
        expended -= 1;
        next += 1;
        action = "recover:" + value;
      } else {
        return;
      }

      if (!Number.isSafeInteger(next) || next < 0 || !Number.isSafeInteger(expended)) {
        ui.notifications.warn("Invalid Doom amount.");
        return;
      }
      if (next === prior && action === "set") return;
      await persistBank(combat, {
        ...bank, schema: 2, current: next, expended, startingBonus, usage,
        revision: (bank.revision ?? 0) + 1,
        lastAction: action, delta: next - prior
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
  const gmCombat = game.user.isGM ? displayedCombat() : null;
  const gmBank = gmCombat ? readBank(gmCombat) : null;
  if (game.user.isGM) {
    if (gmBank?.active) {
      if (!state.panel.rendered) void state.panel.render({ force: true }).catch(error => reportError("show panel", error));
      else rerenderOpen(state.panel);
    } else if (state.panel?.rendered) {
      void state.panel.close().catch(error => reportError("close panel", error));
    }
  }

  const playerCombat = overlayCombat();
  const bank = overlayBank();
  state.displayedCombatId = bank && playerCombat ? playerCombat.id : null;
  if (state.displayedCombatId) {
    if (!state.overlay.rendered) void state.overlay.render({ force: true }).catch(error => reportError("show overlay", error));
    else rerenderOpen(state.overlay);
  } else if (state.overlay?.rendered) {
    void state.overlay.close().catch(error => reportError("close overlay", error));
  }
}

function handleBankAudio(combat) {
  const bank = readBank(combat);
  if (!bank) return;
  const prior = state.seenRevision.get(combat.id) ?? 0;
  if (bank.revision <= prior) return;
  state.seenRevision.set(combat.id, bank.revision);
  if (!state.initialized || overlayCombat()?.id !== combat.id || !bank.active || !combat.started) return;
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
    position: { width: 330, height: "auto" },
    actions: {
      gainDoom: this._gainDoom,
      spendDoom: this._spendDoom,
      preBonus: this._preBonus,
      recoverDoom: this._recoverDoom
    }
  };

  static PARTS = {
    content: { template: "modules/" + MODULE_ID + "/templates/doom-panel.html" }
  };

  // AppV2 rerenders after every Doom change. Preserve the expanded section
  // without persisting cosmetic UI state into the shared world.
  expandedSectionOpen = false;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const combat = displayedCombat();
    const adversaries = hostileCombatants(combat);
    const bank = displayedBank();
    const expanded = expandedEnabled();
    return {
      ...context,
      doom: bank?.current ?? 0,
      canEdit: canEdit(),
      adversaryCount: adversaries.length,
      totalCR: bank?.totalCR ?? encounterCR(combat),
      startingDoom: bank?.base ?? encounterBaseline(combat),
      expanded,
      spent: bank?.expended ?? 0,
      startingBonus: bank?.startingBonus ?? 0,
      startingMaximum: 2 * (bank?.base ?? 0),
      usedRecharge: bank?.usage?.recharge ?? false,
      usedAutoSave: bank?.usage?.autoSave ?? false,
      usedAutoAttack: bank?.usage?.autoAttack ?? false
    };
  }

  static async _gainDoom() {
    const combat = displayedCombat();
    if (combat) await changeDoom("gain", 1, combat.id);
  }

  static async _spendDoom(_event, target) {
    const combat = displayedCombat();
    if (!combat) return;
    if (target.classList.contains("custom-btn")) {
      const raw = this.element.querySelector("#custom-spend-val")?.value;
      const amount = Number(raw);
      if (!Number.isSafeInteger(amount) || amount < 1) {
        ui.notifications.warn("Spend cost must be a positive whole number.");
        return;
      }
      await changeDoom("customSpend", amount, combat.id);
    } else {
      await changeDoom("spend", target.dataset.spend, combat.id);
    }
  }

  static async _preBonus(_event, target) {
    const combat = displayedCombat();
    if (combat) await changeDoom("preBonus", target.dataset.trigger, combat.id);
  }

  static async _recoverDoom(_event, target) {
    const combat = displayedCombat();
    if (combat) await changeDoom("recover", target.dataset.trigger, combat.id);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const expandedDetails = this.element.querySelector("#doom-expanded-details");
    if (expandedDetails) {
      expandedDetails.open = this.expandedSectionOpen;
      expandedDetails.addEventListener("toggle", () => {
        this.expandedSectionOpen = expandedDetails.open;
      });
    }
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
    const combat = overlayCombat();
    const choices = game.user.isGM ? [] : playerCombatOptions();
    return {
      ...context,
      doom: overlayBank()?.current ?? 0,
      showCombatSelector: !game.user.isGM && choices.length > 1,
      combatChoices: choices.map(option => ({
        id: option.id,
        label: option.name || ("Encounter " + option.id.slice(0, 6)),
        selected: option.id === combat?.id
      }))
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("#doom-combat-selector")?.addEventListener("change", async event => {
      const id = event.currentTarget.value;
      if (!playerCombatOptions().some(combat => combat.id === id)) return;
      try {
        await game.settings.set(MODULE_ID, "playerCombatId", id);
        syncVisibleApplications();
      } catch (error) {
        reportError("save player encounter", error);
      }
    });
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
  game.settings.register(MODULE_ID, "expandedDoom", {
    name: "Enable Expanded Doom (Game Master's Guide)",
    hint: "Off: Monster Vault Doom only. On: add GMG extra starting Doom, recover expended Doom, and expanded spending options.",
    scope: "world", config: true, type: Boolean, default: false,
    onChange: () => syncVisibleApplications()
  });
  game.settings.register(MODULE_ID, "playerCombatId", {
    name: "Selected Doom encounter (local)",
    scope: "client",
    config: false,
    type: String,
    default: "",
    onChange: () => syncVisibleApplications()
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
