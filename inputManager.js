const INPUT_CONTEXTS = {
    TITLE: 'TITLE',
    INSTRUCTIONS: 'INSTRUCTIONS',
    SAVE_SELECTION: 'SAVE_SELECTION',
    GAME_OVER: 'GAME_OVER',
    STATION_MENU: 'STATION_MENU',
    GALAXY_MAP: 'GALAXY_MAP',
    MISSION_OVERLAY: 'MISSION_OVERLAY',
    INVENTORY: 'INVENTORY',
    IN_FLIGHT: 'IN_FLIGHT',
    SURFACE_SHIP: 'SURFACE_SHIP',
    SURFACE_ASTRONAUT: 'SURFACE_ASTRONAUT',
    BEAM_TARGETING: 'BEAM_TARGETING'
};

const INPUT_ACTIONS = {
    CONFIRM: 'CONFIRM',
    BACK: 'BACK',
    FIRE_PRIMARY: 'FIRE_PRIMARY',
    NAV_UP: 'NAV_UP',
    NAV_DOWN: 'NAV_DOWN',
    NAV_LEFT: 'NAV_LEFT',
    NAV_RIGHT: 'NAV_RIGHT',
    TOGGLE_MAP: 'TOGGLE_MAP',
    TOGGLE_INVENTORY: 'TOGGLE_INVENTORY',
    TOGGLE_MISSION: 'TOGGLE_MISSION',
    TOGGLE_WANTED: 'TOGGLE_WANTED',
    TOGGLE_SECRET_NAV: 'TOGGLE_SECRET_NAV',
    AUTOPILOT_PLANET: 'AUTOPILOT_PLANET',
    AUTOPILOT_SERVICE: 'AUTOPILOT_SERVICE',
    MINIMAP_ZOOM_IN: 'MINIMAP_ZOOM_IN',
    MINIMAP_ZOOM_OUT: 'MINIMAP_ZOOM_OUT',
    ACTIVATE_CLOAK: 'ACTIVATE_CLOAK',
    SURFACE_DESCENT: 'SURFACE_DESCENT',
    WEAPON_NEXT: 'WEAPON_NEXT',
    WEAPON_PREV: 'WEAPON_PREV',
    TARGET_NEXT: 'TARGET_NEXT',
    TARGET_PREV: 'TARGET_PREV',
    MAP_MARKET_TOGGLE: 'MAP_MARKET_TOGGLE',
    ALTITUDE_UP: 'ALTITUDE_UP',
    ALTITUDE_DOWN: 'ALTITUDE_DOWN',
    ACTIVATE_BURST: 'ACTIVATE_BURST'
};

const DEFAULT_BEAM_ANCHOR_PLAYER_SIZE = 60;
const MIN_BEAM_ANCHOR_DISTANCE = 120;

class InputManager {
    constructor(gamepadManager) {
        this.gamepad = gamepadManager || null;
        this._beamCursor = { x: 0, y: 0 };
        this._beamModeActive = false;
        this._keyboardMap = this._buildKeyboardMap();
        this._gamepadMap = this._buildGamepadMap();
    }

    _buildKeyboardMap() {
        return {
            [INPUT_CONTEXTS.TITLE]: { Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM },
            [INPUT_CONTEXTS.INSTRUCTIONS]: { Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM, Escape: INPUT_ACTIONS.BACK },
            [INPUT_CONTEXTS.SAVE_SELECTION]: {
                ArrowUp: INPUT_ACTIONS.NAV_UP, ArrowDown: INPUT_ACTIONS.NAV_DOWN, Enter: INPUT_ACTIONS.CONFIRM, Escape: INPUT_ACTIONS.BACK
            },
            [INPUT_CONTEXTS.GAME_OVER]: { Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM },
            [INPUT_CONTEXTS.STATION_MENU]: {
                ArrowUp: INPUT_ACTIONS.NAV_UP, ArrowDown: INPUT_ACTIONS.NAV_DOWN,
                ArrowLeft: INPUT_ACTIONS.NAV_LEFT, ArrowRight: INPUT_ACTIONS.NAV_RIGHT,
                Enter: INPUT_ACTIONS.CONFIRM
            },
            [INPUT_CONTEXTS.GALAXY_MAP]: {
                ArrowUp: INPUT_ACTIONS.NAV_UP, KeyW: INPUT_ACTIONS.NAV_UP,
                ArrowDown: INPUT_ACTIONS.NAV_DOWN, KeyS: INPUT_ACTIONS.NAV_DOWN,
                ArrowLeft: INPUT_ACTIONS.NAV_LEFT, KeyA: INPUT_ACTIONS.NAV_LEFT,
                ArrowRight: INPUT_ACTIONS.NAV_RIGHT, KeyD: INPUT_ACTIONS.NAV_RIGHT,
                Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM,
                KeyM: INPUT_ACTIONS.TOGGLE_MAP, KeyX: INPUT_ACTIONS.MAP_MARKET_TOGGLE, Escape: INPUT_ACTIONS.BACK
            },
            [INPUT_CONTEXTS.MISSION_OVERLAY]: { KeyN: INPUT_ACTIONS.TOGGLE_MISSION, Escape: INPUT_ACTIONS.BACK },
            [INPUT_CONTEXTS.INVENTORY]: { KeyI: INPUT_ACTIONS.TOGGLE_INVENTORY, Escape: INPUT_ACTIONS.BACK },
            [INPUT_CONTEXTS.IN_FLIGHT]: {
                Space: INPUT_ACTIONS.FIRE_PRIMARY,
                KeyI: INPUT_ACTIONS.TOGGLE_INVENTORY,
                KeyM: INPUT_ACTIONS.TOGGLE_MAP,
                KeyN: INPUT_ACTIONS.TOGGLE_MISSION,
                KeyL: INPUT_ACTIONS.TOGGLE_WANTED,
                KeyB: INPUT_ACTIONS.TOGGLE_SECRET_NAV,
                KeyH: INPUT_ACTIONS.AUTOPILOT_PLANET,
                KeyJ: INPUT_ACTIONS.AUTOPILOT_SERVICE,
                Period: INPUT_ACTIONS.MINIMAP_ZOOM_IN,
                Comma: INPUT_ACTIONS.MINIMAP_ZOOM_OUT,
                KeyC: INPUT_ACTIONS.ACTIVATE_CLOAK,
                KeyX: INPUT_ACTIONS.SURFACE_DESCENT,
                KeyR: INPUT_ACTIONS.ACTIVATE_BURST
            },
            [INPUT_CONTEXTS.BEAM_TARGETING]: {
                Space: INPUT_ACTIONS.FIRE_PRIMARY
            },
            [INPUT_CONTEXTS.SURFACE_SHIP]: {
                Space: INPUT_ACTIONS.FIRE_PRIMARY,
                KeyI: INPUT_ACTIONS.TOGGLE_INVENTORY,
                KeyM: INPUT_ACTIONS.TOGGLE_MAP,
                KeyN: INPUT_ACTIONS.TOGGLE_MISSION,
                Period: INPUT_ACTIONS.MINIMAP_ZOOM_IN,
                Comma: INPUT_ACTIONS.MINIMAP_ZOOM_OUT,
                KeyC: INPUT_ACTIONS.ACTIVATE_CLOAK
            },
            [INPUT_CONTEXTS.SURFACE_ASTRONAUT]: {
                Space: INPUT_ACTIONS.FIRE_PRIMARY
            }
        };
    }

    _buildGamepadMap() {
        const sharedMenu = {
            [INPUT_ACTIONS.CONFIRM]: ['a'],
            [INPUT_ACTIONS.BACK]: ['b'],
            [INPUT_ACTIONS.NAV_UP]: ['dpad.up'],
            [INPUT_ACTIONS.NAV_DOWN]: ['dpad.down'],
            [INPUT_ACTIONS.NAV_LEFT]: ['dpad.left'],
            [INPUT_ACTIONS.NAV_RIGHT]: ['dpad.right']
        };

        return {
            D: {
                [INPUT_CONTEXTS.TITLE]: { [INPUT_ACTIONS.CONFIRM]: ['a', 'start'] },
                [INPUT_CONTEXTS.INSTRUCTIONS]: { [INPUT_ACTIONS.CONFIRM]: ['a', 'start'], [INPUT_ACTIONS.BACK]: ['b'] },
                [INPUT_CONTEXTS.SAVE_SELECTION]: { ...sharedMenu, [INPUT_ACTIONS.BACK]: ['b'] },
                [INPUT_CONTEXTS.GAME_OVER]: { [INPUT_ACTIONS.CONFIRM]: ['a', 'start'] },
                [INPUT_CONTEXTS.STATION_MENU]: sharedMenu,
                [INPUT_CONTEXTS.GALAXY_MAP]: {
                    ...sharedMenu,
                    [INPUT_ACTIONS.CONFIRM]: ['a'],
                    [INPUT_ACTIONS.BACK]: ['b'],
                    [INPUT_ACTIONS.TOGGLE_MAP]: ['start'],
                    [INPUT_ACTIONS.MAP_MARKET_TOGGLE]: ['x']
                },
                [INPUT_CONTEXTS.MISSION_OVERLAY]: { 
                    [INPUT_ACTIONS.BACK]: ['b'], 
                    [INPUT_ACTIONS.TOGGLE_MISSION]: ['home'],
                    [INPUT_ACTIONS.NAV_UP]: ['dpad.up'], 
                    [INPUT_ACTIONS.NAV_DOWN]: ['dpad.down'] 
                },
                [INPUT_CONTEXTS.INVENTORY]: { [INPUT_ACTIONS.BACK]: ['b'], [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel'] },
                [INPUT_CONTEXTS.IN_FLIGHT]: {
                    [INPUT_ACTIONS.FIRE_PRIMARY]: ['r1'],
                    [INPUT_ACTIONS.TOGGLE_MAP]: ['start'],
                    [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel'],
                    [INPUT_ACTIONS.TOGGLE_MISSION]: ['home'],
                    [INPUT_ACTIONS.TOGGLE_WANTED]: [''],
                    [INPUT_ACTIONS.ACTIVATE_BURST]: ['x'],
                    [INPUT_ACTIONS.AUTOPILOT_PLANET]: ['l4'],
                    [INPUT_ACTIONS.AUTOPILOT_SERVICE]: ['l1'],
                    [INPUT_ACTIONS.MINIMAP_ZOOM_IN]: ['pr'],
                    [INPUT_ACTIONS.MINIMAP_ZOOM_OUT]: ['pl'],
                    [INPUT_ACTIONS.ACTIVATE_CLOAK]: ['y'],
                    [INPUT_ACTIONS.SURFACE_DESCENT]: ['b'],
                    [INPUT_ACTIONS.WEAPON_NEXT]: ['dpad.right'],
                    [INPUT_ACTIONS.WEAPON_PREV]: ['dpad.left'],
                    [INPUT_ACTIONS.TARGET_NEXT]: ['dpad.up'],
                    [INPUT_ACTIONS.TARGET_PREV]: ['dpad.down']
                },
                [INPUT_CONTEXTS.BEAM_TARGETING]: {
                    [INPUT_ACTIONS.FIRE_PRIMARY]: ['r1']
                },
                [INPUT_CONTEXTS.SURFACE_SHIP]: {
                    [INPUT_ACTIONS.FIRE_PRIMARY]: ['a', 'r1'],
                    [INPUT_ACTIONS.TOGGLE_MAP]: ['start'],
                    [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel'],
                    [INPUT_ACTIONS.TOGGLE_MISSION]: ['home'],
                    [INPUT_ACTIONS.MINIMAP_ZOOM_IN]: ['pr'],
                    [INPUT_ACTIONS.MINIMAP_ZOOM_OUT]: ['pl'],
                    [INPUT_ACTIONS.ACTIVATE_CLOAK]: ['y'],
                    [INPUT_ACTIONS.ALTITUDE_UP]: ['l1', 'dpad.up'],
                    [INPUT_ACTIONS.ALTITUDE_DOWN]: ['l4', 'dpad.down'],
                    [INPUT_ACTIONS.ACTIVATE_BURST]: ['x']
                },
                [INPUT_CONTEXTS.SURFACE_ASTRONAUT]: {
                    [INPUT_ACTIONS.FIRE_PRIMARY]: ['a', 'r1']
                }
            },
            S: {
                [INPUT_CONTEXTS.TITLE]: { [INPUT_ACTIONS.CONFIRM]: ['a', 'start'] },
                [INPUT_CONTEXTS.INSTRUCTIONS]: { [INPUT_ACTIONS.CONFIRM]: ['a', 'start'], [INPUT_ACTIONS.BACK]: ['b'] },
                [INPUT_CONTEXTS.SAVE_SELECTION]: { ...sharedMenu, [INPUT_ACTIONS.BACK]: ['b'] },
                [INPUT_CONTEXTS.GAME_OVER]: { [INPUT_ACTIONS.CONFIRM]: ['a', 'start'] },
                [INPUT_CONTEXTS.STATION_MENU]: sharedMenu,
                [INPUT_CONTEXTS.GALAXY_MAP]: {
                    ...sharedMenu,
                    [INPUT_ACTIONS.CONFIRM]: ['a'],
                    [INPUT_ACTIONS.BACK]: ['b'],
                    [INPUT_ACTIONS.TOGGLE_MAP]: ['start'],
                    [INPUT_ACTIONS.MAP_MARKET_TOGGLE]: ['x']
                },
                [INPUT_CONTEXTS.MISSION_OVERLAY]: { 
                    [INPUT_ACTIONS.BACK]: ['b'], 
                    [INPUT_ACTIONS.TOGGLE_MISSION]: ['x'],
                    [INPUT_ACTIONS.NAV_UP]: ['dpad.up'], 
                    [INPUT_ACTIONS.NAV_DOWN]: ['dpad.down'] 
                },
                [INPUT_CONTEXTS.INVENTORY]: { [INPUT_ACTIONS.BACK]: ['b'], [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel'] },
                [INPUT_CONTEXTS.IN_FLIGHT]: {
                    [INPUT_ACTIONS.FIRE_PRIMARY]: ['a', 'r1'],
                    [INPUT_ACTIONS.TOGGLE_MAP]: ['start'],
                    [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel'],
                    [INPUT_ACTIONS.TOGGLE_MISSION]: ['x'],
                    [INPUT_ACTIONS.ACTIVATE_CLOAK]: ['y'],
                    [INPUT_ACTIONS.WEAPON_NEXT]: ['dpad.right'],
                    [INPUT_ACTIONS.WEAPON_PREV]: ['dpad.left'],
                    [INPUT_ACTIONS.TARGET_NEXT]: ['dpad.up'],
                    [INPUT_ACTIONS.TARGET_PREV]: ['dpad.down'],
                    [INPUT_ACTIONS.SURFACE_DESCENT]: ['b'],
                    [INPUT_ACTIONS.ACTIVATE_BURST]: ['x']
                },
                [INPUT_CONTEXTS.BEAM_TARGETING]: {
                    [INPUT_ACTIONS.FIRE_PRIMARY]: ['a', 'r1']
                },
                [INPUT_CONTEXTS.SURFACE_SHIP]: {
                    [INPUT_ACTIONS.FIRE_PRIMARY]: ['a', 'r1'],
                    [INPUT_ACTIONS.TOGGLE_MAP]: ['start'],
                    [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel'],
                    [INPUT_ACTIONS.ALTITUDE_UP]: ['l1', 'dpad.up'],
                    [INPUT_ACTIONS.ALTITUDE_DOWN]: ['l4', 'dpad.down'],
                    [INPUT_ACTIONS.ACTIVATE_BURST]: ['x']
                },
                [INPUT_CONTEXTS.SURFACE_ASTRONAUT]: {
                    [INPUT_ACTIONS.FIRE_PRIMARY]: ['a', 'r1']
                }
            }
        };
    }

    _codeFromP5(keyValue, keyCodeValue) {
        if (typeof keyCodeValue === 'number') {
            if (keyCodeValue >= 65 && keyCodeValue <= 90) return `Key${String.fromCharCode(keyCodeValue)}`;
            if (keyCodeValue >= 48 && keyCodeValue <= 57) return `Digit${String.fromCharCode(keyCodeValue)}`;
            if (keyCodeValue === 32) return 'Space';
            if (keyCodeValue === 13) return 'Enter';
            if (keyCodeValue === 27) return 'Escape';
            if (typeof UP_ARROW !== 'undefined' && keyCodeValue === UP_ARROW) return 'ArrowUp';
            if (typeof DOWN_ARROW !== 'undefined' && keyCodeValue === DOWN_ARROW) return 'ArrowDown';
            if (typeof LEFT_ARROW !== 'undefined' && keyCodeValue === LEFT_ARROW) return 'ArrowLeft';
            if (typeof RIGHT_ARROW !== 'undefined' && keyCodeValue === RIGHT_ARROW) return 'ArrowRight';
            if (keyCodeValue === 188) return 'Comma';
            if (keyCodeValue === 190) return 'Period';
        }
        if (keyValue === ',') return 'Comma';
        if (keyValue === '.') return 'Period';
        if (keyValue === ' ') return 'Space';
        return null;
    }

    _currentGamepadMode() {
        const mode = this.gamepad?.state?.mode;
        return mode && mode.startsWith('S-') ? 'S' : 'D';
    }

    resolveContext({ gameState, showingMissionOverlay, showingInventory, isSurfaceShipControl, isSurfaceAstronautControl, beamWeaponActive, beamTargetingRequested }) {
        if (showingMissionOverlay && (gameState === 'IN_FLIGHT' || gameState === 'SURFACE_MODE')) return INPUT_CONTEXTS.MISSION_OVERLAY;
        if (showingInventory && (gameState === 'IN_FLIGHT' || gameState === 'SURFACE_MODE')) return INPUT_CONTEXTS.INVENTORY;

        if (gameState === 'TITLE_SCREEN') return INPUT_CONTEXTS.TITLE;
        if (gameState === 'INSTRUCTIONS') return INPUT_CONTEXTS.INSTRUCTIONS;
        if (gameState === 'SAVE_SELECTION') return INPUT_CONTEXTS.SAVE_SELECTION;
        if (gameState === 'GAME_OVER') return INPUT_CONTEXTS.GAME_OVER;
        if (gameState === 'GALAXY_MAP') return INPUT_CONTEXTS.GALAXY_MAP;
        if (typeof STATION_STATES !== 'undefined' && STATION_STATES.includes(gameState)) return INPUT_CONTEXTS.STATION_MENU;
        if (isSurfaceAstronautControl) return INPUT_CONTEXTS.SURFACE_ASTRONAUT;

        const shipContext = isSurfaceShipControl ? INPUT_CONTEXTS.SURFACE_SHIP : INPUT_CONTEXTS.IN_FLIGHT;
        if (beamWeaponActive && beamTargetingRequested) return INPUT_CONTEXTS.BEAM_TARGETING;
        return shipContext;
    }

    getKeyboardAction(keyValue, keyCodeValue, context) {
        const ctxMap = this._keyboardMap[context] || {};
        const code = this._codeFromP5(keyValue, keyCodeValue);
        if (!code) return null;
        return ctxMap[code] || null;
    }

    _isMappedGamepadInputActive(inputName, pressedOnly = false) {
        if (!this.gamepad?.state) return false;
        return pressedOnly ? this.gamepad.pressed(inputName) : this.gamepad.held(inputName);
    }

    isGamepadActionPressed(action, context) {
        const mode = this._currentGamepadMode();
        const ctxMap = this._gamepadMap[mode]?.[context] || {};
        const inputs = ctxMap[action] || [];
        return inputs.some(i => this._isMappedGamepadInputActive(i, true));
    }

    isGamepadActionHeld(action, context) {
        const mode = this._currentGamepadMode();
        const ctxMap = this._gamepadMap[mode]?.[context] || {};
        const inputs = ctxMap[action] || [];
        return inputs.some(i => this._isMappedGamepadInputActive(i, false));
    }

    getGamepadShipControls(context) {
        const s = this.gamepad?.state;
        const beamTargeting = context === INPUT_CONTEXTS.BEAM_TARGETING;
        return {
            strafeX: s?.ls?.x || 0,
            thrustY: s?.ls?.y || 0,
            rotateX: beamTargeting ? 0 : (s?.rs?.x || 0),
            forwardThrottle: s?.r2 || 0,
            reverseThrottle: s?.l2 || 0,
            beamAimX: beamTargeting ? (s?.rs?.x || 0) : 0,
            beamAimY: beamTargeting ? (s?.rs?.y || 0) : 0
        };
    }

    updateBeamTargetCursor(context, playerRef = null) {
        if (context !== INPUT_CONTEXTS.BEAM_TARGETING || !this.gamepad?.state) {
            this._beamModeActive = false;
            return;
        }

        if (!this._beamModeActive) {
            this._beamModeActive = true;
            const playerSize = typeof playerRef?.size === 'number' ? playerRef.size : DEFAULT_BEAM_ANCHOR_PLAYER_SIZE;
            const anchorDistance = Math.max(MIN_BEAM_ANCHOR_DISTANCE, playerSize * 2);
            const anchorAngle = typeof playerRef?.angle === 'number' ? playerRef.angle : 0;
            this._beamCursor.x = constrain(width * 0.5 + Math.cos(anchorAngle) * anchorDistance, 0, width);
            this._beamCursor.y = constrain(height * 0.5 + Math.sin(anchorAngle) * anchorDistance, 0, height);
        }

        const shipControls = this.getGamepadShipControls(context);
        const speed = 14;
        const mx = shipControls.beamAimX * speed;
        const my = shipControls.beamAimY * speed;
        this._beamCursor.x = constrain(this._beamCursor.x + mx, 0, width);
        this._beamCursor.y = constrain(this._beamCursor.y + my, 0, height);
    }

    isBeamTargetingActive() {
        return this._beamModeActive;
    }

    getBeamTargetScreenPoint() {
        if (!this._beamModeActive) return null;
        return { x: this._beamCursor.x, y: this._beamCursor.y };
    }

    describeBindings(context) {
        return {
            context,
            keyboard: this._keyboardMap[context] || {},
            gamepadMode: this._currentGamepadMode(),
            gamepad: this._gamepadMap[this._currentGamepadMode()]?.[context] || {}
        };
    }
}
