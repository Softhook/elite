/**
 * GamepadManager Integration Tests
 * Validates the GamepadManager class, key bindings, state parsing,
 * and integration functions used by sketch.js
 */

// Mock browser APIs that GamepadManager needs
global.navigator = {
    getGamepads: jest.fn(() => [null, null, null, null])
};

global.window = global.window || {};
global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();
global.window.dispatchEvent = jest.fn();

// Mock requestAnimationFrame/cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
    return 1; // Return fake ID
});
global.cancelAnimationFrame = jest.fn();

// Mock KeyboardEvent
global.KeyboardEvent = class KeyboardEvent {
    constructor(type, init = {}) {
        this.type = type;
        this.code = init.code || '';
        this.key = init.key || '';
        this.bubbles = init.bubbles || false;
        this.cancelable = init.cancelable || false;
    }
};

// Mock document.createElement for toast
global.document = global.document || {};
global.document.createElement = jest.fn(() => ({
    style: {},
    textContent: '',
    remove: jest.fn()
}));
global.document.body = { appendChild: jest.fn() };

// Load the GamepadManager into global scope
// The file uses top-level class/const/function declarations for browser <script> loading.
// In Jest's module system we need to explicitly hoist them to global.
const fs = require('fs');
const gpCode = fs.readFileSync(require('path').join(__dirname, '..', 'gamepadmanager.js'), 'utf-8');
// Wrap in a function that returns the declarations, then assign to global
const wrappedCode = `(function() { ${gpCode}; return { GP_MAPS, GamepadManager, initGamepad }; })()`;
const exported = eval(wrappedCode);
global.GP_MAPS = exported.GP_MAPS;
global.GamepadManager = exported.GamepadManager;
global.initGamepad = exported.initGamepad;

describe('GamepadManager', () => {
    let gp;

    beforeEach(() => {
        jest.clearAllMocks();
        gp = new GamepadManager({ toast: false, deadzone: 0.1 });
    });

    afterEach(() => {
        if (gp) gp.destroy();
    });

    // ─── Construction ─────────────────────────────────────────────────────

    test('initializes with default state', () => {
        expect(gp.connected).toBe(false);
        expect(gp.state).toBeNull();
        expect(gp.prevState).toBeNull();
    });

    test('registers connection event listeners', () => {
        // Should register gamepadconnected and gamepaddisconnected
        const calls = window.addEventListener.mock.calls;
        const eventNames = calls.map(c => c[0]);
        expect(eventNames).toContain('gamepadconnected');
        expect(eventNames).toContain('gamepaddisconnected');
    });

    test('starts requestAnimationFrame polling', () => {
        expect(requestAnimationFrame).toHaveBeenCalled();
    });

    // ─── Key Bindings ─────────────────────────────────────────────────────

    test('bindKey stores bindings', () => {
        gp.bindKey('a', 'Space');
        gp.bindKey('dpad.up', 'ArrowUp');
        expect(gp._bindings).toHaveLength(2);
        expect(gp._bindings[0].input).toBe('a');
        expect(gp._bindings[0].key).toBe('Space');
    });

    test('bindKey returns this for chaining', () => {
        const result = gp.bindKey('a', 'Space');
        expect(result).toBe(gp);
    });

    test('unbind clears all bindings when no args', () => {
        gp.bindKey('a', 'Space');
        gp.bindKey('b', 'Escape');
        gp.unbind();
        expect(gp._bindings).toHaveLength(0);
    });

    test('unbind removes specific input bindings', () => {
        gp.bindKey('a', 'Space');
        gp.bindKey('b', 'Escape');
        gp.unbind('a');
        expect(gp._bindings).toHaveLength(1);
        expect(gp._bindings[0].input).toBe('b');
    });

    // ─── State Parsing ────────────────────────────────────────────────────

    test('_parse creates correct state from mock X-mode gamepad', () => {
        gp._map = GP_MAPS.X;
        const mockGP = _createMockGamepad();
        mockGP.buttons[0].pressed = true; // A button

        const state = gp._parse(mockGP);

        expect(state.mode).toBe('X-MODE (Xbox)');
        expect(state.a).toBe(true);
        expect(state.b).toBe(false);
        expect(state.ls.x).toBe(0);
        expect(state.ls.y).toBe(0);
    });

    test('_parse reads left stick values', () => {
        gp._map = GP_MAPS.X;
        const mockGP = _createMockGamepad();
        mockGP.axes[0] = 0.75;  // LX
        mockGP.axes[1] = -0.5;  // LY

        const state = gp._parse(mockGP);

        expect(state.ls.x).toBeCloseTo(0.75);
        expect(state.ls.y).toBeCloseTo(-0.5);
    });

    test('_parse applies deadzone to sticks', () => {
        gp._map = GP_MAPS.X;
        const mockGP = _createMockGamepad();
        mockGP.axes[0] = 0.05;  // Below deadzone (0.1)

        const state = gp._parse(mockGP);

        expect(state.ls.x).toBe(0); // Should be zeroed by deadzone
    });

    test('_parse reads D-pad buttons', () => {
        gp._map = GP_MAPS.X;
        const mockGP = _createMockGamepad();
        mockGP.buttons[12].pressed = true; // D_UP

        const state = gp._parse(mockGP);

        expect(state.dpad.up).toBe(true);
        expect(state.dpad.down).toBe(false);
    });

    test('_parse reads triggers', () => {
        gp._map = GP_MAPS.X;
        const mockGP = _createMockGamepad();
        mockGP.buttons[7].value = 0.8;  // R2 button value

        const state = gp._parse(mockGP);

        expect(state.r2).toBeGreaterThan(0);
    });

    test('_parse reads R2 trigger pressure in S-mode standard layouts', () => {
        gp._map = GP_MAPS.S;
        const mockGP = _createMockGamepad();
        mockGP.buttons[7].pressed = true;
        mockGP.buttons[7].value = 0.9;

        const state = gp._parse(mockGP);

        expect(state.mode).toBe('S-MODE (Switch)');
        expect(state.r2).toBeCloseTo(0.9, 3);
    });

    test('_parse reads D-mode L3/R3 from their dedicated indices', () => {
        gp._map = GP_MAPS.D;
        const mockGP = _createMockGamepad();
        mockGP.buttons[13].pressed = true;
        mockGP.buttons[14].pressed = true;

        const state = gp._parse(mockGP);

        expect(state.l3).toBe(true);
        expect(state.r3).toBe(true);
    });

    test('_parse reads S-mode L3/R3 from their dedicated indices', () => {
        gp._map = GP_MAPS.S;
        const mockGP = _createMockGamepad();
        mockGP.buttons[10].pressed = true;
        mockGP.buttons[11].pressed = true;

        const state = gp._parse(mockGP);

        expect(state.l3).toBe(true);
        expect(state.r3).toBe(true);
    });

    test('_parse keeps X-mode triggers independent from right-stick axes', () => {
        gp._map = GP_MAPS.X;
        const mockGP = _createMockGamepad();
        mockGP.buttons[7].pressed = true;
        mockGP.buttons[7].value = 1;
        mockGP.axes[2] = -1; // Right stick X fully left (must not affect trigger value)

        const state = gp._parse(mockGP);

        expect(state.r2).toBe(1);
    });

    test('_parse falls back to D-mode trigger buttons when axes are idle', () => {
        gp._map = GP_MAPS.D;
        const mockGP = _createMockGamepad();
        mockGP.buttons[9].pressed = true;
        mockGP.buttons[9].value = 1;
        mockGP.axes[3] = 0;

        const state = gp._parse(mockGP);

        expect(state.r2).toBe(1);
    });

    test('_parse preserves D-mode analog trigger pressure from button values', () => {
        gp._map = GP_MAPS.D;
        const mockGP = _createMockGamepad();
        mockGP.buttons[8].value = 0.42;
        mockGP.buttons[9].value = 0.67;
        mockGP.axes[4] = 0;
        mockGP.axes[3] = 0;

        const state = gp._parse(mockGP);

        expect(state.l2).toBeCloseTo(0.42, 3);
        expect(state.r2).toBeCloseTo(0.67, 3);
    });

    test('_parse applies trigger deadzone in D-mode without clamping valid analog values', () => {
        gp._map = GP_MAPS.D;
        const mockGP = _createMockGamepad();

        mockGP.buttons[8].value = 0.08; // below trigger deadzone (0.1)
        mockGP.buttons[9].value = 0.11; // just above trigger deadzone

        const state = gp._parse(mockGP);

        expect(state.l2).toBe(0);
        expect(state.r2).toBeCloseTo(0.11, 3);
    });

    // ─── Edge Detection ───────────────────────────────────────────────────

    test('pressed() returns true only on transition frame', () => {
        // Set up previous and current state
        gp._prev = { a: false, b: false, dpad: { up: false } };
        gp._state = { a: true, b: false, dpad: { up: false } };

        expect(gp.pressed('a')).toBe(true);
        expect(gp.pressed('b')).toBe(false);
    });

    test('pressed() returns false when button was already held', () => {
        gp._prev = { a: true };
        gp._state = { a: true };

        expect(gp.pressed('a')).toBe(false);
    });

    test('released() returns true only on release frame', () => {
        gp._prev = { a: true };
        gp._state = { a: false };

        expect(gp.released('a')).toBe(true);
    });

    test('held() returns true while pressed', () => {
        gp._state = { a: true, b: false };

        expect(gp.held('a')).toBe(true);
        expect(gp.held('b')).toBe(false);
    });

    test('analog() reads float values', () => {
        gp._state = { l2: 0.75, ls: { x: -0.5, y: 0.3 } };

        expect(gp.analog('l2')).toBeCloseTo(0.75);
        expect(gp.analog('ls.x')).toBeCloseTo(-0.5);
    });

    test('analog() returns 0 for missing inputs', () => {
        gp._state = {};
        expect(gp.analog('l2')).toBe(0);
    });

    // ─── Keyboard Bridge ──────────────────────────────────────────────────

    test('_processBindings dispatches keydown for pressed buttons', () => {
        gp.bindKey('a', 'Space');
        gp._state = { a: true };
        gp._prev = { a: false };

        gp._processBindings();

        expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
        const event = window.dispatchEvent.mock.calls[0][0];
        expect(event.type).toBe('keydown');
        expect(event.code).toBe('Space');
    });

    test('_processBindings dispatches keyup for released buttons', () => {
        gp.bindKey('a', 'Space');
        gp._keysHeld.add('Space');
        gp._state = { a: false };

        gp._processBindings();

        expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
        const event = window.dispatchEvent.mock.calls[0][0];
        expect(event.type).toBe('keyup');
        expect(event.code).toBe('Space');
    });

    test('_processBindings handles analog threshold correctly', () => {
        gp.bindKey('l2', 'ShiftLeft', { analog: true, threshold: 0.5 });

        // Below threshold
        gp._state = { l2: 0.3 };
        gp._processBindings();
        expect(window.dispatchEvent).not.toHaveBeenCalled();

        // Above threshold
        gp._state = { l2: 0.6 };
        gp._processBindings();
        expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    });

    // ─── Code-to-Key Mapping ──────────────────────────────────────────────

    test('_codeToKey maps common codes correctly', () => {
        expect(gp._codeToKey('Space')).toBe(' ');
        expect(gp._codeToKey('KeyA')).toBe('a');
        expect(gp._codeToKey('KeyM')).toBe('m');
        expect(gp._codeToKey('ArrowUp')).toBe('ArrowUp');
        expect(gp._codeToKey('Escape')).toBe('Escape');
        expect(gp._codeToKey('Digit1')).toBe('1');
        expect(gp._codeToKey('Comma')).toBe(',');
        expect(gp._codeToKey('Period')).toBe('.');
    });

    // ─── Mode Detection ───────────────────────────────────────────────────

    test('_detectMode selects Xbox mode for standard gamepad', () => {
        gp._detectMode({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)' });
        expect(gp._map.name).toBe('X-MODE (Xbox)');
    });

    test('_detectMode selects Switch mode for Nintendo controller', () => {
        gp._detectMode({ id: 'Pro Controller (057e:2009)' });
        expect(gp._map.name).toBe('S-MODE (Switch)');
    });

    test('_detectMode selects Switch mode for 8BitDo standard-mapped controllers in S-mode', () => {
        gp._detectMode({ id: '8BitDo Ultimate Wireless Controller', mapping: 'standard' });
        expect(gp._map.name).toBe('S-MODE (Switch)');
    });

    test('_detectMode falls back to Xbox mode for unknown standard-mapped controllers', () => {
        gp._detectMode({ id: 'Generic USB Gamepad', mapping: 'standard' });
        expect(gp._map.name).toBe('X-MODE (Xbox)');
    });

    test('_detectMode selects D-MODE for unknown controllers', () => {
        gp._detectMode({ id: '8BitDo Pro 2 Gamepad' });
        expect(gp._map.name).toBe('D-MODE');
    });

    test('_tick marks a pre-connected gamepad as connected even before browser events fire', () => {
        navigator.getGamepads.mockReturnValueOnce([_createMockGamepad(), null, null, null]);

        gp._tick();

        expect(gp.connected).toBe(true);
        expect(gp.state?.mode).toBe('X-MODE (Xbox)');
    });

    // ─── Destroy ──────────────────────────────────────────────────────────

    test('destroy cleans up event listeners and state', () => {
        gp.bindKey('a', 'Space');
        gp._keysHeld.add('Space');

        gp.destroy();

        expect(cancelAnimationFrame).toHaveBeenCalled();
        expect(window.removeEventListener).toHaveBeenCalledTimes(2);
        expect(gp._bindings).toHaveLength(0);
        expect(gp._keysHeld.size).toBe(0);
    });

    // ─── Value Accessors ──────────────────────────────────────────────────

    test('_getVal resolves dotted paths', () => {
        const obj = { dpad: { up: true, down: false }, ls: { x: 0.5 } };

        expect(gp._getVal(obj, 'dpad.up')).toBe(true);
        expect(gp._getVal(obj, 'ls.x')).toBe(0.5);
        expect(gp._getVal(obj, 'nonexistent')).toBeUndefined();
    });

    test('_getBool treats analog values above threshold as true', () => {
        gp._stickThreshold = 0.5;
        const obj = { l2: 0.8, r2: 0.2, a: true, b: false };

        expect(gp._getBool(obj, 'l2')).toBe(true);   // Above threshold
        expect(gp._getBool(obj, 'r2')).toBe(false);   // Below threshold
        expect(gp._getBool(obj, 'a')).toBe(true);     // Boolean true
        expect(gp._getBool(obj, 'b')).toBe(false);    // Boolean false
    });
});

describe('initGamepad', () => {
    test('creates a GamepadManager without implicit keyboard bridge bindings', () => {
        const gp = initGamepad();
        expect(gp).toBeInstanceOf(GamepadManager);
        expect(gp._bindings.length).toBe(0);

        gp.destroy();
    });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _createMockGamepad() {
    const buttons = [];
    for (let i = 0; i < 20; i++) {
        buttons.push({ pressed: false, value: 0, touched: false });
    }
    return {
        id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
        buttons,
        axes: [0, 0, 0, 0, 0, 0],
        connected: true,
        index: 0,
        mapping: 'standard',
        timestamp: 0
    };
}
