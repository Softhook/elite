// ****** debug.js ******
// Global debug flags and helpers for the whole game (loaded early)
// No bundler/modules; exposes globals on window.

(function (global) {
  const STORE_KEY = '__elite_debug_flags__';

  // Default flags (quiet by default)
  const defaults = {
    DEBUG_AI: true,           // AI flow/state/combat
    DEBUG_ENEMY_BEHAVIORS: false, // Enemy-specific AI behavior logs (enemyAIBehaviors.js)
    DEBUG_TARGETING: false,    // Target selection/scoring
    DEBUG_DAMAGE: false,       // Damage/hit/barrier
    DEBUG_ENV: false,          // Environment (nebula etc.)
    DEBUG_GS: false,           // Game state transitions
    DEBUG_PLAYER: false,       // Player events (kills, credits, autopilot)
    DEBUG_MISSIONS: false,     // Mission lifecycle & generator
    DEBUG_AUDIO: false,        // Audio init/playback
    DEBUG_UI: false,           // UI/menu/inventory logs
    DEBUG_PARTICLES: false,    // Particle counts/perf-ish logs
    DEBUG_SAVELOAD: false,     // Save/load persistence flow
    DEBUG_WEAPONS: false,      // Weapon selection/mode switches
    DEBUG_EVENTS: false,       // EventManager warnings/spawns
    DEBUG_HAULER: false,       // Hauler/transport state logs
    DEBUG_CARGO: false,        // Cargo spawn/collect/detect
    DEBUG_MINING: false        // Mining robots and background activity
  };

  // Load persisted flags if any
  let persisted = {};
  try {
    persisted = JSON.parse(global.localStorage?.getItem(STORE_KEY) || '{}') || {};
  } catch (e) { persisted = {}; }

  const flags = Object.assign({}, defaults, persisted);

  // Publish flags as globals (so typeof DEBUG_* checks work anywhere)
  global.DEBUG_AI = !!flags.DEBUG_AI;
  global.DEBUG_ENEMY_BEHAVIORS = !!flags.DEBUG_ENEMY_BEHAVIORS;
  global.DEBUG_TARGETING = !!flags.DEBUG_TARGETING;
  global.DEBUG_DAMAGE = !!flags.DEBUG_DAMAGE;
  global.DEBUG_ENV = !!flags.DEBUG_ENV;
  global.DEBUG_GS = !!flags.DEBUG_GS;
  global.DEBUG_PLAYER = !!flags.DEBUG_PLAYER;
  global.DEBUG_MISSIONS = !!flags.DEBUG_MISSIONS;
  global.DEBUG_AUDIO = !!flags.DEBUG_AUDIO;
  global.DEBUG_UI = !!flags.DEBUG_UI;
  global.DEBUG_PARTICLES = !!flags.DEBUG_PARTICLES;
  global.DEBUG_SAVELOAD = !!flags.DEBUG_SAVELOAD;
  global.DEBUG_WEAPONS = !!flags.DEBUG_WEAPONS;
  global.DEBUG_EVENTS = !!flags.DEBUG_EVENTS;
  global.DEBUG_HAULER = !!flags.DEBUG_HAULER;
  global.DEBUG_CARGO = !!flags.DEBUG_CARGO;
  global.DEBUG_MINING = !!flags.DEBUG_MINING;

  // Helpers (idempotent: don't overwrite if already defined)
  if (typeof global.AI_LOG !== 'function') {
    global.AI_LOG = function (...args) { if (global.DEBUG_AI) console.log(...args); };
  }
  if (typeof global.AI_LOGF !== 'function') {
    global.AI_LOGF = function (builder) { if (global.DEBUG_AI && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.TARGETING_LOG !== 'function') {
    global.TARGETING_LOG = function (...args) { if (global.DEBUG_TARGETING) console.log(...args); };
  }
  if (typeof global.TARGETING_LOGF !== 'function') {
    global.TARGETING_LOGF = function (builder) { if (global.DEBUG_TARGETING && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.DAMAGE_LOG !== 'function') {
    global.DAMAGE_LOG = function (...args) { if (global.DEBUG_DAMAGE) console.log(...args); };
  }
  if (typeof global.DAMAGE_LOGF !== 'function') {
    global.DAMAGE_LOGF = function (builder) { if (global.DEBUG_DAMAGE && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.ENV_LOG !== 'function') {
    global.ENV_LOG = function (...args) { if (global.DEBUG_ENV) console.log(...args); };
  }
  if (typeof global.ENV_LOGF !== 'function') {
    global.ENV_LOGF = function (builder) { if (global.DEBUG_ENV && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.GS_LOG !== 'function') {
    global.GS_LOG = function (...args) { if (global.DEBUG_GS) console.log(...args); };
  }
  if (typeof global.GS_LOGF !== 'function') {
    global.GS_LOGF = function (builder) { if (global.DEBUG_GS && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }

  if (typeof global.PLAYER_LOG !== 'function') {
    global.PLAYER_LOG = function (...args) { if (global.DEBUG_PLAYER) console.log(...args); };
  }
  if (typeof global.PLAYER_LOGF !== 'function') {
    global.PLAYER_LOGF = function (builder) { if (global.DEBUG_PLAYER && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.MISSION_LOG !== 'function') {
    global.MISSION_LOG = function (...args) { if (global.DEBUG_MISSIONS) console.log(...args); };
  }
  if (typeof global.MISSION_LOGF !== 'function') {
    global.MISSION_LOGF = function (builder) { if (global.DEBUG_MISSIONS && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.AUDIO_LOG !== 'function') {
    global.AUDIO_LOG = function (...args) { if (global.DEBUG_AUDIO) console.log(...args); };
  }
  if (typeof global.AUDIO_LOGF !== 'function') {
    global.AUDIO_LOGF = function (builder) { if (global.DEBUG_AUDIO && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.UI_LOG !== 'function') {
    global.UI_LOG = function (...args) { if (global.DEBUG_UI) console.log(...args); };
  }
  if (typeof global.UI_LOGF !== 'function') {
    global.UI_LOGF = function (builder) { if (global.DEBUG_UI && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.PARTICLE_LOG !== 'function') {
    global.PARTICLE_LOG = function (...args) { if (global.DEBUG_PARTICLES) console.log(...args); };
  }
  if (typeof global.PARTICLE_LOGF !== 'function') {
    global.PARTICLE_LOGF = function (builder) { if (global.DEBUG_PARTICLES && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.SAVE_LOG !== 'function') {
    global.SAVE_LOG = function (...args) { if (global.DEBUG_SAVELOAD) console.log(...args); };
  }
  if (typeof global.SAVE_LOGF !== 'function') {
    global.SAVE_LOGF = function (builder) { if (global.DEBUG_SAVELOAD && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.WEAPON_LOG !== 'function') {
    global.WEAPON_LOG = function (...args) { if (global.DEBUG_WEAPONS) console.log(...args); };
  }
  if (typeof global.WEAPON_LOGF !== 'function') {
    global.WEAPON_LOGF = function (builder) { if (global.DEBUG_WEAPONS && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }

  // New helpers: EventManager, Hauler, Cargo
  if (typeof global.EVENT_LOG !== 'function') {
    global.EVENT_LOG = function (...args) { if (global.DEBUG_EVENTS) console.log(...args); };
  }
  if (typeof global.EVENT_LOGF !== 'function') {
    global.EVENT_LOGF = function (builder) { if (global.DEBUG_EVENTS && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.HAULER_LOG !== 'function') {
    global.HAULER_LOG = function (...args) { if (global.DEBUG_HAULER) console.log(...args); };
  }
  if (typeof global.HAULER_LOGF !== 'function') {
    global.HAULER_LOGF = function (builder) { if (global.DEBUG_HAULER && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }
  if (typeof global.CARGO_LOG !== 'function') {
    global.CARGO_LOG = function (...args) { if (global.DEBUG_CARGO) console.log(...args); };
  }
  if (typeof global.CARGO_LOGF !== 'function') {
    global.CARGO_LOGF = function (builder) { if (global.DEBUG_CARGO && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }

  // Enemy AI specific logging helper
  if (typeof global.ENEMY_AI_LOG !== 'function') {
    global.ENEMY_AI_LOG = function (...args) { if (global.DEBUG_ENEMY_BEHAVIORS) console.log(...args); };
  }
  if (typeof global.ENEMY_AI_LOGF !== 'function') {
    global.ENEMY_AI_LOGF = function (builder) { if (global.DEBUG_ENEMY_BEHAVIORS && typeof builder === 'function') { const out = builder(); Array.isArray(out) ? console.log(...out) : console.log(out); } };
  }

  // Convenience controller API
  global.Debug = global.Debug || {};
  const api = global.Debug;

  api.get = function () {
    return {
      DEBUG_AI: global.DEBUG_AI,
      DEBUG_TARGETING: global.DEBUG_TARGETING,
      DEBUG_DAMAGE: global.DEBUG_DAMAGE,
      DEBUG_ENV: global.DEBUG_ENV,
      DEBUG_GS: global.DEBUG_GS,
      DEBUG_PLAYER: global.DEBUG_PLAYER,
      DEBUG_MISSIONS: global.DEBUG_MISSIONS,
      DEBUG_AUDIO: global.DEBUG_AUDIO,
      DEBUG_UI: global.DEBUG_UI,
      DEBUG_PARTICLES: global.DEBUG_PARTICLES,
      DEBUG_SAVELOAD: global.DEBUG_SAVELOAD,
      DEBUG_WEAPONS: global.DEBUG_WEAPONS,
      DEBUG_EVENTS: global.DEBUG_EVENTS,
      DEBUG_HAULER: global.DEBUG_HAULER,
      DEBUG_CARGO: global.DEBUG_CARGO
    };
  };

  api.set = function (newFlags = {}) {
    if (typeof newFlags !== 'object' || newFlags === null) return api.get();
    for (const k of Object.keys(defaults)) {
      if (k in newFlags) {
        global[k] = !!newFlags[k];
      }
    }
    try {
      global.localStorage?.setItem(STORE_KEY, JSON.stringify(api.get()));
    } catch (e) { }
    return api.get();
  };

  api.enable = function (name) { if (name in defaults) return api.set({ [name]: true }); return api.get(); };
  api.disable = function (name) { if (name in defaults) return api.set({ [name]: false }); return api.get(); };
  api.toggle = function (name) { if (name in defaults) return api.set({ [name]: !global[name] }); return api.get(); };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : (typeof self !== 'undefined' ? self : this)));
