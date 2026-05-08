/**
 * Tests for the centralized InputManager action/context architecture.
 */
global.navigator = {
    getGamepads: jest.fn(() => [null, null, null, null])
};

global.window = global.window || {};
global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();
global.window.dispatchEvent = jest.fn();

global.requestAnimationFrame = jest.fn(() => 1);
global.cancelAnimationFrame = jest.fn();
global.KeyboardEvent = class KeyboardEvent {
    constructor(type, init = {}) {
        this.type = type;
        this.code = init.code || '';
        this.key = init.key || '';
    }
};

global.width = 1000;
global.height = 700;
global.constrain = (v, min, max) => Math.max(min, Math.min(max, v));
global.UP_ARROW = 38;
global.DOWN_ARROW = 40;
global.LEFT_ARROW = 37;
global.RIGHT_ARROW = 39;
global.STATION_STATES = ['DOCKED', 'VIEWING_MARKET'];

const fs = require('fs');
const path = require('path');
const gpCode = fs.readFileSync(path.join(__dirname, '..', 'gamepadmanager.js'), 'utf-8');
const inputCode = fs.readFileSync(path.join(__dirname, '..', 'inputManager.js'), 'utf-8');

const exported = eval(`(function() { ${gpCode}; ${inputCode}; return { GamepadManager, InputManager, INPUT_CONTEXTS, INPUT_ACTIONS }; })()`);

describe('InputManager', () => {
    let gp;
    let input;

    beforeEach(() => {
        gp = new exported.GamepadManager({ toast: false });
        input = new exported.InputManager(gp);
    });

    afterEach(() => {
        gp.destroy();
    });

    test('resolves station/menu/overlay contexts consistently', () => {
        expect(input.resolveContext({
            gameState: 'DOCKED',
            showingMissionOverlay: false,
            showingInventory: false,
            isSurfaceShipControl: false,
            isSurfaceAstronautControl: false,
            beamWeaponActive: false,
            beamTargetingRequested: false
        })).toBe(exported.INPUT_CONTEXTS.STATION_MENU);

        expect(input.resolveContext({
            gameState: 'IN_FLIGHT',
            showingMissionOverlay: true,
            showingInventory: false,
            isSurfaceShipControl: false,
            isSurfaceAstronautControl: false,
            beamWeaponActive: false,
            beamTargetingRequested: false
        })).toBe(exported.INPUT_CONTEXTS.MISSION_OVERLAY);
    });

    test('maps keyboard keys contextually', () => {
        expect(input.getKeyboardAction('i', 73, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(exported.INPUT_ACTIONS.TOGGLE_INVENTORY);
        expect(input.getKeyboardAction('i', 73, exported.INPUT_CONTEXTS.GALAXY_MAP)).toBeNull();
        expect(input.getKeyboardAction(' ', 32, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(exported.INPUT_ACTIONS.FIRE_PRIMARY);
        expect(input.getKeyboardAction('', 27, exported.INPUT_CONTEXTS.SAVE_SELECTION)).toBe(exported.INPUT_ACTIONS.BACK);
        expect(input.getKeyboardAction('', 27, exported.INPUT_CONTEXTS.INSTRUCTIONS)).toBe(exported.INPUT_ACTIONS.BACK);
    });

    test('maps gamepad actions by mode', () => {
        gp._state = { mode: 'D-MODE', l4: true };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TOGGLE_WANTED, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(true);

        gp._state = { mode: 'S-MODE (Switch)', l4: true };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TOGGLE_WANTED, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(false);

        gp._prev = { b: false };
        gp._state = { mode: 'D-MODE', b: true };
        expect(input.isGamepadActionPressed(exported.INPUT_ACTIONS.BACK, exported.INPUT_CONTEXTS.SAVE_SELECTION)).toBe(true);
    });

    test('enters beam targeting context and updates cursor from left stick', () => {
        gp._state = { mode: 'D-MODE', ls: { x: 0.5, y: -0.5 } };
        input.updateBeamTargetCursor(exported.INPUT_CONTEXTS.BEAM_TARGETING);
        const target = input.getBeamTargetScreenPoint();
        expect(target).not.toBeNull();
        expect(target.x).toBeGreaterThan(width / 2);
        expect(target.y).toBeLessThan(height / 2);
    });

    test('supports contextual surface altitude actions in S and D gamepad modes', () => {
        gp._state = { mode: 'D-MODE', dpad: { up: true }, l1: false };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.ALTITUDE_UP, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(true);

        gp._state = { mode: 'S-MODE (Switch)', dpad: { up: false, down: true }, l4: false };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.ALTITUDE_DOWN, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(true);
    });
});
