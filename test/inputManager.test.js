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
        expect(input.getKeyboardAction('', 37, exported.INPUT_CONTEXTS.SAVE_SELECTION)).toBe(exported.INPUT_ACTIONS.NAV_LEFT);
        expect(input.getKeyboardAction('', 39, exported.INPUT_CONTEXTS.SAVE_SELECTION)).toBe(exported.INPUT_ACTIONS.NAV_RIGHT);
        expect(input.getKeyboardAction('r', 82, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(exported.INPUT_ACTIONS.ACTIVATE_BURST);
        expect(input.getKeyboardAction('', 27, exported.INPUT_CONTEXTS.STATION_MENU)).toBe(exported.INPUT_ACTIONS.BACK);
        expect(input.getKeyboardAction('', 13, exported.INPUT_CONTEXTS.STATION_MENU)).toBe(exported.INPUT_ACTIONS.CONFIRM);
        expect(input.getKeyboardAction('', 38, exported.INPUT_CONTEXTS.STATION_MENU)).toBe(exported.INPUT_ACTIONS.NAV_UP);
        expect(input.getKeyboardAction('1', 49, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(exported.INPUT_ACTIONS.WEAPON_SLOT_1);
        expect(input.getKeyboardAction('9', 57, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(exported.INPUT_ACTIONS.WEAPON_SLOT_9);
        expect(input.getKeyboardAction('1', 49, exported.INPUT_CONTEXTS.SAVE_SELECTION)).toBeNull();
    });

    test('maps gamepad actions by mode', () => {
        gp._state = { mode: 'D-MODE', r1: true };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.FIRE_PRIMARY, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(true);

        gp._state = { mode: 'X-MODE (Xbox)', x: true, r1: false };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TOGGLE_MISSION, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(true);

        gp._state = { mode: 'S-MODE (Switch)', home: true, dpad: { up: false, down: false, left: false, right: false } };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TOGGLE_MISSION, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(true);
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.NAV_UP, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(false);

        gp._state = { mode: 'S-MODE (Switch)', l4: true, r4: false };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TOGGLE_WANTED, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(false);
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TOGGLE_SECRET_NAV, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(false);

        gp._state = { mode: 'S-MODE (Switch)', l4: false, r4: true };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TOGGLE_SECRET_NAV, exported.INPUT_CONTEXTS.IN_FLIGHT)).toBe(true);

        gp._prev = { b: false };
        gp._state = { mode: 'D-MODE', b: true };
        expect(input.isGamepadActionPressed(exported.INPUT_ACTIONS.BACK, exported.INPUT_CONTEXTS.SAVE_SELECTION)).toBe(true);
    });

    test('supports contextual surface altitude actions in S and D gamepad modes', () => {
        gp._state = { mode: 'D-MODE', dpad: { up: true }, l1: false };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.ALTITUDE_UP, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(true);

        gp._state = { mode: 'S-MODE (Switch)', dpad: { up: false, down: true }, l2: 0, l4: false };
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.ALTITUDE_DOWN, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(true);
    });

    test('keeps surface D-pad left/right mapped to weapon controls', () => {
        gp._state = { mode: 'D-MODE', dpad: { up: true, down: true, left: true, right: true } };

        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.WEAPON_NEXT, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(true);
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.WEAPON_PREV, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(true);
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TARGET_NEXT, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(false);
        expect(input.isGamepadActionHeld(exported.INPUT_ACTIONS.TARGET_PREV, exported.INPUT_CONTEXTS.SURFACE_SHIP)).toBe(false);
    });

    test('describes mode-specific bindings without changing controller behavior', () => {
        gp._state = { mode: 'D-MODE' };
        let bindings = input.describeBindings(exported.INPUT_CONTEXTS.IN_FLIGHT);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.TOGGLE_MISSION]).toEqual(['home']);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.MINIMAP_ZOOM_IN]).toEqual(['pr']);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.TOGGLE_SECRET_NAV]).toEqual(['r4']);

        gp._state = { mode: 'X-MODE (Xbox)' };
        bindings = input.describeBindings(exported.INPUT_CONTEXTS.SURFACE_SHIP);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.TOGGLE_MISSION]).toBeUndefined();
        expect(bindings.gamepad[exported.INPUT_ACTIONS.MINIMAP_ZOOM_OUT]).toEqual(['pl']);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.ALTITUDE_DOWN]).toEqual(['l2', 'dpad.down']);

        gp._state = { mode: 'S-MODE (Switch)' };
        bindings = input.describeBindings(exported.INPUT_CONTEXTS.IN_FLIGHT);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.FIRE_PRIMARY]).toEqual(['a', 'r1']);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.MINIMAP_ZOOM_IN]).toBeUndefined();
        expect(bindings.gamepad[exported.INPUT_ACTIONS.TOGGLE_SECRET_NAV]).toEqual(['r4']);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.TOGGLE_MISSION]).toEqual(['home']);
        expect(bindings.gamepad[exported.INPUT_ACTIONS.ACTIVATE_BURST]).toEqual(['x']);
    });

    test('keeps save-selection gamepad bindings consistent across controller modes', () => {
        for (const mode of ['D-MODE', 'X-MODE (Xbox)', 'S-MODE (Switch)']) {
            gp._state = { mode };
            const bindings = input.describeBindings(exported.INPUT_CONTEXTS.SAVE_SELECTION).gamepad;

            expect(bindings[exported.INPUT_ACTIONS.CONFIRM]).toEqual(['a']);
            expect(bindings[exported.INPUT_ACTIONS.BACK]).toEqual(['b']);
            expect(bindings[exported.INPUT_ACTIONS.NAV_UP]).toEqual(['dpad.up']);
            expect(bindings[exported.INPUT_ACTIONS.NAV_DOWN]).toEqual(['dpad.down']);
            expect(bindings[exported.INPUT_ACTIONS.NAV_LEFT]).toEqual(['dpad.left']);
            expect(bindings[exported.INPUT_ACTIONS.NAV_RIGHT]).toEqual(['dpad.right']);
        }
    });
});
