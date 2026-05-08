/**
 * GamepadManager — Game Controller Integration for Viron/Elite
 * 
 * Hybrid approach:
 * 1. Keyboard bridge (synthetic KeyboardEvents) for discrete/one-shot actions
 * 2. Direct state polling for continuous inputs (p5.js keyIsDown() ignores synthetic events)
 * 
 * The game's main loop calls GamepadManager.pollContinuousState() each frame
 * to read analog sticks/triggers for movement, while button presses fire
 * synthetic keyboard events that flow through the existing keyPressed()/keyReleased() handlers.
 */

// ─── Controller Layout Maps ────────────────────────────────────────────────────
const GP_MAPS = {
  X: {
    name: 'X-MODE (Xbox)',
    A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2_BTN: 6, R2_BTN: 7,
    L2_AXIS: 2, R2_AXIS: 5, L4: 16, R4: 17, Pl: 14, Pr: 15,
    LX: 0, LY: 1, RX: 2, RY: 3, L3: 10, R3: 11,
    D_UP: 12, D_DOWN: 13, D_LEFT: 14, D_RIGHT: 15,
    SELECT: 8, START: 9, HOME: 16
  },
  D: {
    name: 'D-MODE',
    A: 0, B: 1, X: 3, Y: 4, L1: 6, R1: 7, L2_AXIS: 4, R2_AXIS: 3, L2_BTN: 8, R2_BTN: 9,
    L4: 16, R4: 17, Pl: 5, Pr: 2, LX: 0, LY: 1, RX: 2, RY: 5,
    L3: 13, R3: 14, HAT: 9, SELECT: 10, START: 11, HOME: 12, STAR: 15
  },
  S: {
    name: 'S-MODE (Switch)',
    A: 1, B: 0, X: 3, Y: 2, L1: 4, R1: 5, L2_BTN: 6, R2_BTN: 7,
    L4: 16, R4: 17, Pl: 14, Pr: 15, LX: 0, LY: 1, RX: 2, RY: 3,
    L3: 10, R3: 11, D_UP: 12, D_DOWN: 13, D_LEFT: 14, D_RIGHT: 15,
    SELECT: 8, START: 9, HOME: 12
  }
};

// ─── GamepadManager Class ───────────────────────────────────────────────────────
class GamepadManager {
  constructor(options = {}) {
    this._deadzone = options.deadzone ?? 0.15;
    this._stickThreshold = options.stickThreshold ?? 0.5;
    this._triggerThreshold = options.triggerThreshold ?? 0.1;

    // Internal state
    this._rawGP = null;
    this._map = GP_MAPS.X;
    this._state = null;
    this._prev = null;
    this._connected = false;
    this._rafId = null;

    // Keyboard bridge: tracks which synthetic keys are currently held
    this._keysHeld = new Set();

    // Discrete button→key bindings (for one-shot actions via synthetic events)
    this._bindings = [];

    // Connection toast
    this._showToast = options.toast ?? true;

    // Bind handlers
    this._onConnect = this._onConnect.bind(this);
    this._onDisconnect = this._onDisconnect.bind(this);
    this._tick = this._tick.bind(this);

    window.addEventListener('gamepadconnected', this._onConnect);
    window.addEventListener('gamepaddisconnected', this._onDisconnect);

    this._rafId = requestAnimationFrame(this._tick);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  get connected() { return this._connected; }
  get state() { return this._state; }
  get prevState() { return this._prev; }

  /** True only on the frame a button transitions off→on */
  pressed(input) {
    return this._getBool(this._state, input) && !this._getBool(this._prev, input);
  }

  /** True only on the frame a button transitions on→off */
  released(input) {
    return !this._getBool(this._state, input) && this._getBool(this._prev, input);
  }

  /** True while held */
  held(input) {
    return this._getBool(this._state, input);
  }

  /** Read analog value (-1..1 for sticks, 0..1 for triggers) */
  analog(input) {
    return this._getVal(this._state, input) ?? 0;
  }

  /**
   * Bind a gamepad input to fire a synthetic keyboard event.
   * Used for discrete/one-shot actions (menus, toggles, firing).
   */
  bindKey(input, keyCode, opts = {}) {
    this._bindings.push({
      input, key: keyCode,
      analog: opts.analog ?? false,
      threshold: opts.threshold ?? this._stickThreshold,
      invert: opts.invert ?? false
    });
    return this;
  }

  /** Remove bindings */
  unbind(input, key) {
    if (!input && !key) { this._bindings = []; return this; }
    this._bindings = this._bindings.filter(b =>
      (input ? b.input !== input : true) && (key ? b.key !== key : true)
    );
    return this;
  }

  /** Haptic rumble */
  rumble(intensity = 0.5, duration = 150) {
    if (this._rawGP?.vibrationActuator) {
      this._rawGP.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0, duration,
        strongMagnitude: intensity, weakMagnitude: intensity
      }).catch(() => {});
    }
  }

  /** Clean shutdown */
  destroy() {
    cancelAnimationFrame(this._rafId);
    window.removeEventListener('gamepadconnected', this._onConnect);
    window.removeEventListener('gamepaddisconnected', this._onDisconnect);
    for (const code of this._keysHeld) this._dispatchKey(code, false);
    this._keysHeld.clear();
    this._bindings = [];
  }

  get state() { return this._state; }
  get previousState() { return this._prev; }
  get connected() { return this._connected; }

  // ─── Polling Loop ───────────────────────────────────────────────────────────

  _tick() {
    this._prev = this._state;

    const gamepads = navigator.getGamepads();
    this._rawGP = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) { this._rawGP = gamepads[i]; break; }
    }

    if (this._rawGP) {
      this._detectMode(this._rawGP);
      this._state = this._parse(this._rawGP);
      this._processBindings();
    } else {
      this._state = null;
    }

    this._rafId = requestAnimationFrame(this._tick);
  }

  // ─── Mode Detection ─────────────────────────────────────────────────────────

  _detectMode(gp) {
    const id = gp.id.toLowerCase();
    if (id.includes('pro controller') || id.includes('057e') || id.includes('nintendo')) {
      this._map = GP_MAPS.S;
    } else if (id.includes('xbox') || id.includes('xinput') || id.includes('standard gamepad')) {
      this._map = GP_MAPS.X;
    } else {
      this._map = GP_MAPS.D;
    }
  }

  // ─── Parse Raw Gamepad ──────────────────────────────────────────────────────

  _parse(gp) {
    const m = this._map;
    const btn = (idx) => gp.buttons[idx]?.pressed || false;
    const dpad = { up: false, down: false, left: false, right: false };
    let l2 = 0, r2 = 0;

    // D-Pad
    if (m.name === 'D-MODE') {
      const h = gp.axes[m.HAT];
      if (h !== undefined) {
        if (h < -0.5 || (h > 0.8 && h <= 1.05)) dpad.up = true;
        if (h > -0.85 && h < -0.1) dpad.right = true;
        if (h > -0.25 && h < 0.5) dpad.down = true;
        if (h > 0.3 && h <= 1.05) dpad.left = true;
      }
    } else {
      dpad.up = btn(m.D_UP);
      dpad.down = btn(m.D_DOWN);
      dpad.left = btn(m.D_LEFT);
      dpad.right = btn(m.D_RIGHT);
    }

    // Triggers
    if (m.name === 'D-MODE') {
      const aL = gp.axes[m.L2_AXIS] || 0;
      const aR = gp.axes[m.R2_AXIS] || 0;
      const normAL = aL < -0.1 ? (aL + 1) / 2 : aL;
      const normAR = aR < -0.1 ? (aR + 1) / 2 : aR;
      l2 = this._dz(this._clamp01(normAL));
      r2 = this._dz(this._clamp01(normAR));
    } else {
      const bL = gp.buttons[m.L2_BTN]?.value || 0;
      const bR = gp.buttons[m.R2_BTN]?.value || 0;
      const aL = gp.axes[m.L2_AXIS] || 0;
      const aR = gp.axes[m.R2_AXIS] || 0;
      const normAL = aL < -0.1 ? (aL + 1) / 2 : aL;
      const normAR = aR < -0.1 ? (aR + 1) / 2 : aR;
      l2 = this._dz(this._clamp01((bL > 0 && bL < 1) ? bL : normAL));
      r2 = this._dz(this._clamp01((bR > 0 && bR < 1) ? bR : normAR));
    }

    return {
      mode: m.name,
      a: btn(m.A), b: btn(m.B), x: btn(m.X), y: btn(m.Y),
      l1: btn(m.L1), r1: btn(m.R1),
      l2, r2,
      l3: btn(m.L3), r3: btn(m.R3),
      l4: btn(m.L4), r4: btn(m.R4),
      pl: btn(m.Pl), pr: btn(m.Pr),
      sel: btn(m.SELECT), start: btn(m.START),
      dpad,
      ls: { x: this._dz(gp.axes[m.LX]), y: this._dz(gp.axes[m.LY]) },
      rs: { x: this._dz(gp.axes[m.RX]), y: this._dz(gp.axes[m.RY]) }
    };
  }

  // ─── Keyboard Bridge ────────────────────────────────────────────────────────

  _processBindings() {
    if (!this._state) return;

    for (const b of this._bindings) {
      const raw = this._getVal(this._state, b.input) ?? 0;
      const val = b.invert ? -raw : raw;
      let active;

      if (b.analog || (typeof val === 'number' && !Number.isInteger(val))) {
        active = Math.abs(val) >= b.threshold;
      } else {
        active = !!val;
      }

      const wasHeld = this._keysHeld.has(b.key);
      if (active && !wasHeld) {
        this._dispatchKey(b.key, true);
        this._keysHeld.add(b.key);
      } else if (!active && wasHeld) {
        this._dispatchKey(b.key, false);
        this._keysHeld.delete(b.key);
      }
    }
  }

  _dispatchKey(code, down) {
    const type = down ? 'keydown' : 'keyup';
    const keyVal = this._codeToKey(code);
    window.dispatchEvent(new KeyboardEvent(type, {
      code, key: keyVal, bubbles: true, cancelable: true
    }));
  }

  _codeToKey(code) {
    if (code.startsWith('Key')) return code[3].toLowerCase();
    if (code.startsWith('Digit')) return code[5];
    const lookup = {
      Space: ' ', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
      ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
      Enter: 'Enter', Escape: 'Escape', Tab: 'Tab',
      ShiftLeft: 'Shift', ShiftRight: 'Shift',
      Comma: ',', Period: '.',
    };
    return lookup[code] ?? code;
  }

  // ─── Value Accessors ────────────────────────────────────────────────────────

  _getVal(obj, path) {
    if (!obj) return undefined;
    const parts = path.split('.');
    let val = obj;
    for (const p of parts) { val = val?.[p]; if (val === undefined) return undefined; }
    return val;
  }

  _getBool(obj, path) {
    const val = this._getVal(obj, path);
    if (val === undefined || val === null) return false;
    if (typeof val === 'boolean') return val;
    return Math.abs(val) >= this._stickThreshold;
  }

  // ─── Math Helpers ───────────────────────────────────────────────────────────

  _clamp01(v) { return Math.max(0, Math.min(1, v)); }
  _dz(v) { return Math.abs(v) < this._deadzone ? 0 : v; }

  // ─── Connection Events ──────────────────────────────────────────────────────

  _onConnect(e) {
    this._connected = true;
    if (this._showToast) this._toast(`🎮 ${e.gamepad.id.split('(')[0].trim()} connected`);
  }

  _onDisconnect(e) {
    this._connected = false;
    this._state = null;
    this._prev = null;
    for (const code of this._keysHeld) this._dispatchKey(code, false);
    this._keysHeld.clear();
    if (this._showToast) this._toast('🎮 Controller disconnected');
  }

  // ─── Toast ──────────────────────────────────────────────────────────────────

  _toast(msg) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '10px 24px',
      borderRadius: '8px', fontSize: '14px', fontFamily: 'system-ui, sans-serif',
      zIndex: 99999, transition: 'opacity 0.4s', opacity: '0',
      pointerEvents: 'none'
    });
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.style.opacity = '1');
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }, 2500);
  }
}

// ─── Global Instance & Game-Specific Bindings ───────────────────────────────────

function initGamepad() {
  return new GamepadManager({ toast: true, deadzone: 0.15 });
}
