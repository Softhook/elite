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
    SURFACE_ASTRONAUT: 'SURFACE_ASTRONAUT'
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
    TOGGLE_TARGET_SELECTION_MODE: 'TOGGLE_TARGET_SELECTION_MODE',
    MAP_MARKET_TOGGLE: 'MAP_MARKET_TOGGLE',
    ALTITUDE_UP: 'ALTITUDE_UP',
    ALTITUDE_DOWN: 'ALTITUDE_DOWN',
    ACTIVATE_BURST: 'ACTIVATE_BURST',
    WEAPON_SLOT_1: 'WEAPON_SLOT_1',
    WEAPON_SLOT_2: 'WEAPON_SLOT_2',
    WEAPON_SLOT_3: 'WEAPON_SLOT_3',
    WEAPON_SLOT_4: 'WEAPON_SLOT_4',
    WEAPON_SLOT_5: 'WEAPON_SLOT_5',
    WEAPON_SLOT_6: 'WEAPON_SLOT_6',
    WEAPON_SLOT_7: 'WEAPON_SLOT_7',
    WEAPON_SLOT_8: 'WEAPON_SLOT_8',
    WEAPON_SLOT_9: 'WEAPON_SLOT_9'
};

class InputManager {
    constructor(gamepadManager) {
        this.gamepad = gamepadManager || null;

        // ── Twin-stick beam aiming state ──
        // The smoothed aim angle that the beam fires along.
        // Initialized to null so it seeds from the ship angle on first use.
        this._beamAimAngle = null;
        // Whether the gamepad is actively aiming the beam (right stick deflected while firing)
        this._beamGamepadAiming = false;
        // Visual reticle screen position (for HUD drawing)
        this._beamReticle = { x: 0, y: 0, active: false, alpha: 0 };
        this._targetSelectionModeEnabled = false;
        this._targetSelectionStickLatched = false;
        this._targetSelectionStickAngle = null;
        this._keyboardMap = this._buildKeyboardMap();
        this._gamepadMap = this._buildGamepadMap();
    }

    _buildKeyboardMap() {
        const weaponSlotBindings = {
            Digit1: INPUT_ACTIONS.WEAPON_SLOT_1,
            Digit2: INPUT_ACTIONS.WEAPON_SLOT_2,
            Digit3: INPUT_ACTIONS.WEAPON_SLOT_3,
            Digit4: INPUT_ACTIONS.WEAPON_SLOT_4,
            Digit5: INPUT_ACTIONS.WEAPON_SLOT_5,
            Digit6: INPUT_ACTIONS.WEAPON_SLOT_6,
            Digit7: INPUT_ACTIONS.WEAPON_SLOT_7,
            Digit8: INPUT_ACTIONS.WEAPON_SLOT_8,
            Digit9: INPUT_ACTIONS.WEAPON_SLOT_9
        };

        return {
            [INPUT_CONTEXTS.TITLE]: { Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM },
            [INPUT_CONTEXTS.INSTRUCTIONS]: { Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM, Escape: INPUT_ACTIONS.BACK },
            [INPUT_CONTEXTS.SAVE_SELECTION]: {
                ArrowUp: INPUT_ACTIONS.NAV_UP, ArrowDown: INPUT_ACTIONS.NAV_DOWN,
                ArrowLeft: INPUT_ACTIONS.NAV_LEFT, ArrowRight: INPUT_ACTIONS.NAV_RIGHT,
                Enter: INPUT_ACTIONS.CONFIRM, Escape: INPUT_ACTIONS.BACK
            },
            [INPUT_CONTEXTS.GAME_OVER]: { Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM },
            [INPUT_CONTEXTS.STATION_MENU]: {
                ArrowUp: INPUT_ACTIONS.NAV_UP, KeyW: INPUT_ACTIONS.NAV_UP,
                ArrowDown: INPUT_ACTIONS.NAV_DOWN, KeyS: INPUT_ACTIONS.NAV_DOWN,
                ArrowLeft: INPUT_ACTIONS.NAV_LEFT, KeyA: INPUT_ACTIONS.NAV_LEFT,
                ArrowRight: INPUT_ACTIONS.NAV_RIGHT, KeyD: INPUT_ACTIONS.NAV_RIGHT,
                Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM, Escape: INPUT_ACTIONS.BACK
            },
            [INPUT_CONTEXTS.GALAXY_MAP]: {
                ArrowUp: INPUT_ACTIONS.NAV_UP, KeyW: INPUT_ACTIONS.NAV_UP,
                ArrowDown: INPUT_ACTIONS.NAV_DOWN, KeyS: INPUT_ACTIONS.NAV_DOWN,
                ArrowLeft: INPUT_ACTIONS.NAV_LEFT, KeyA: INPUT_ACTIONS.NAV_LEFT,
                ArrowRight: INPUT_ACTIONS.NAV_RIGHT, KeyD: INPUT_ACTIONS.NAV_RIGHT,
                Enter: INPUT_ACTIONS.CONFIRM, Space: INPUT_ACTIONS.CONFIRM,
                KeyM: INPUT_ACTIONS.TOGGLE_MAP, KeyX: INPUT_ACTIONS.MAP_MARKET_TOGGLE, Escape: INPUT_ACTIONS.BACK
            },
            [INPUT_CONTEXTS.MISSION_OVERLAY]: {
                ArrowUp: INPUT_ACTIONS.NAV_UP,
                ArrowDown: INPUT_ACTIONS.NAV_DOWN,
                KeyN: INPUT_ACTIONS.TOGGLE_MISSION,
                Escape: INPUT_ACTIONS.BACK
            },
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
                KeyR: INPUT_ACTIONS.ACTIVATE_BURST,
                ...weaponSlotBindings
            },
            // BEAM_TARGETING keyboard context removed — beam now aims via mouse position
            // in all contexts. Space fires the beam in the normal IN_FLIGHT context.
            [INPUT_CONTEXTS.SURFACE_SHIP]: {
                Space: INPUT_ACTIONS.FIRE_PRIMARY,
                KeyI: INPUT_ACTIONS.TOGGLE_INVENTORY,
                KeyM: INPUT_ACTIONS.TOGGLE_MAP,
                KeyN: INPUT_ACTIONS.TOGGLE_MISSION,
                Period: INPUT_ACTIONS.MINIMAP_ZOOM_IN,
                Comma: INPUT_ACTIONS.MINIMAP_ZOOM_OUT,
                KeyC: INPUT_ACTIONS.ACTIVATE_CLOAK,
                KeyR: INPUT_ACTIONS.ACTIVATE_BURST,
                ...weaponSlotBindings
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

        const buildMissionOverlay = (missionToggle) => ({
            [INPUT_ACTIONS.BACK]: ['b'],
            [INPUT_ACTIONS.TOGGLE_MISSION]: [missionToggle],
            [INPUT_ACTIONS.NAV_UP]: ['dpad.up'],
            [INPUT_ACTIONS.NAV_DOWN]: ['dpad.down']
        });

        const buildInventory = () => ({
            [INPUT_ACTIONS.BACK]: ['b'],
            [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel']
        });

        const buildFlightContext = ({
            firePrimary,
            missionToggle,
            includeSecretNav = false,
            includeMinimapZoom = false
        }) => {
            const actions = {
                [INPUT_ACTIONS.FIRE_PRIMARY]: firePrimary,
                [INPUT_ACTIONS.TOGGLE_MAP]: ['start'],
                [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel'],
                [INPUT_ACTIONS.TOGGLE_MISSION]: [missionToggle],
                [INPUT_ACTIONS.ACTIVATE_CLOAK]: ['y'],
                [INPUT_ACTIONS.AUTOPILOT_PLANET]: ['l1'],
                [INPUT_ACTIONS.AUTOPILOT_SERVICE]: ['l2'],
                [INPUT_ACTIONS.SURFACE_DESCENT]: ['b'],
                [INPUT_ACTIONS.WEAPON_NEXT]: ['dpad.right'],
                [INPUT_ACTIONS.WEAPON_PREV]: ['dpad.left'],
                [INPUT_ACTIONS.TARGET_NEXT]: ['dpad.up'],
                [INPUT_ACTIONS.TARGET_PREV]: ['dpad.down'],
                [INPUT_ACTIONS.TOGGLE_TARGET_SELECTION_MODE]: ['l3'],
                [INPUT_ACTIONS.ACTIVATE_BURST]: ['x']
            };

            if (includeSecretNav) actions[INPUT_ACTIONS.TOGGLE_SECRET_NAV] = ['r4'];
            if (includeMinimapZoom) {
                actions[INPUT_ACTIONS.MINIMAP_ZOOM_IN] = ['pr'];
                actions[INPUT_ACTIONS.MINIMAP_ZOOM_OUT] = ['pl'];
            }

            return actions;
        };

        const buildSurfaceShipContext = ({
            firePrimary,
            missionToggle = null,
            altitudeDown,
            includeMinimapZoom = false
        }) => {
            const actions = {
                [INPUT_ACTIONS.FIRE_PRIMARY]: firePrimary,
                [INPUT_ACTIONS.TOGGLE_MAP]: ['start'],
                [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['sel'],
                [INPUT_ACTIONS.ACTIVATE_CLOAK]: ['y'],
                [INPUT_ACTIONS.ALTITUDE_UP]: ['l1', 'dpad.up'],
                [INPUT_ACTIONS.ALTITUDE_DOWN]: altitudeDown,
                [INPUT_ACTIONS.WEAPON_NEXT]: ['dpad.right'],
                [INPUT_ACTIONS.WEAPON_PREV]: ['dpad.left'],
                [INPUT_ACTIONS.ACTIVATE_BURST]: ['x']
            };

            if (missionToggle) actions[INPUT_ACTIONS.TOGGLE_MISSION] = [missionToggle];
            if (includeMinimapZoom) {
                actions[INPUT_ACTIONS.MINIMAP_ZOOM_IN] = ['pr'];
                actions[INPUT_ACTIONS.MINIMAP_ZOOM_OUT] = ['pl'];
            }

            return actions;
        };

        const buildModeContexts = ({
            missionToggle,
            inFlightFirePrimary,
            surfaceShipFirePrimary,
            surfaceAltitudeDown,
            includeSecretNav = false,
            includeFlightMinimapZoom = false,
            includeSurfaceMissionToggle = false,
            includeSurfaceMinimapZoom = false
        }) => ({
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
            [INPUT_CONTEXTS.MISSION_OVERLAY]: buildMissionOverlay(missionToggle),
            [INPUT_CONTEXTS.INVENTORY]: buildInventory(),
            [INPUT_CONTEXTS.IN_FLIGHT]: buildFlightContext({
                firePrimary: inFlightFirePrimary,
                missionToggle,
                includeSecretNav,
                includeMinimapZoom: includeFlightMinimapZoom
            }),
            // BEAM_TARGETING gamepad context removed — twin-stick aiming uses
            // the right stick direction directly while holding fire in IN_FLIGHT.
            [INPUT_CONTEXTS.SURFACE_SHIP]: buildSurfaceShipContext({
                firePrimary: surfaceShipFirePrimary,
                missionToggle: includeSurfaceMissionToggle ? missionToggle : null,
                altitudeDown: surfaceAltitudeDown,
                includeMinimapZoom: includeSurfaceMinimapZoom
            }),
            [INPUT_CONTEXTS.SURFACE_ASTRONAUT]: {
                [INPUT_ACTIONS.FIRE_PRIMARY]: ['a', 'r1']
            }
        });

        return {
            D: buildModeContexts({
                missionToggle: 'home',
                inFlightFirePrimary: ['r1'],
                surfaceShipFirePrimary: ['a', 'r1'],
                surfaceAltitudeDown: ['l2', 'l4', 'dpad.down'],
                includeSecretNav: true,
                includeFlightMinimapZoom: true,
                includeSurfaceMissionToggle: true,
                includeSurfaceMinimapZoom: true
            }),
            X: buildModeContexts({
                missionToggle: 'x',
                inFlightFirePrimary: ['r1'],
                surfaceShipFirePrimary: ['a', 'r1'],
                surfaceAltitudeDown: ['l2', 'dpad.down'],
                includeFlightMinimapZoom: true,
                includeSurfaceMinimapZoom: true
            }),
            S: buildModeContexts({
                missionToggle: 'home',
                inFlightFirePrimary: ['a', 'r1'],
                surfaceShipFirePrimary: ['a', 'r1'],
                surfaceAltitudeDown: ['l2', 'l4', 'dpad.down'],
                includeSecretNav: true
            })
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
        if (!mode) return 'D';
        if (mode.startsWith('S-')) return 'S';
        if (mode.startsWith('X-')) return 'X';
        return 'D';
    }

    resolveContext({ gameState, showingMissionOverlay, showingInventory, isSurfaceShipControl, isSurfaceAstronautControl }) {
        if (showingMissionOverlay && (gameState === 'IN_FLIGHT' || gameState === 'SURFACE_MODE')) return INPUT_CONTEXTS.MISSION_OVERLAY;
        if (showingInventory && (gameState === 'IN_FLIGHT' || gameState === 'SURFACE_MODE')) return INPUT_CONTEXTS.INVENTORY;

        if (gameState === 'TITLE_SCREEN') return INPUT_CONTEXTS.TITLE;
        if (gameState === 'INSTRUCTIONS') return INPUT_CONTEXTS.INSTRUCTIONS;
        if (gameState === 'SAVE_SELECTION') return INPUT_CONTEXTS.SAVE_SELECTION;
        if (gameState === 'GAME_OVER') return INPUT_CONTEXTS.GAME_OVER;
        if (gameState === 'GALAXY_MAP') return INPUT_CONTEXTS.GALAXY_MAP;
        if (typeof STATION_STATES !== 'undefined' && STATION_STATES.includes(gameState)) return INPUT_CONTEXTS.STATION_MENU;
        if (isSurfaceAstronautControl) return INPUT_CONTEXTS.SURFACE_ASTRONAUT;

        return isSurfaceShipControl ? INPUT_CONTEXTS.SURFACE_SHIP : INPUT_CONTEXTS.IN_FLIGHT;
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

    getGamepadShipControls() {
        const s = this.gamepad?.state;
        return {
            strafeX: s?.ls?.x || 0,
            thrustY: s?.ls?.y || 0,
            rotateX: s?.rs?.x || 0,
            rotateY: s?.rs?.y || 0,
            forwardThrottle: s?.r2 || 0
        };
    }

    // ── Twin-stick beam aiming ────────────────────────────────────────────────

    /**
     * Update the beam aim angle from the right stick.
     * Call every frame while in a ship-control context.
     *
     * Design:
     * - The right stick always steers the ship (unchanged).
     * - When the player holds fire with a beam weapon, the right stick's angle
     *   is ALSO used as the beam's aim direction.
     * - If the stick is near center while firing, the beam fires along the
     *   ship's facing angle.
     * - An exponential ease smooths rapid aim changes for a premium feel.
     * - A visible reticle is projected at the aim point for visual feedback.
     *
     * @param {boolean} isFiringBeam - true when fire is held and current weapon is beam
     * @param {Object}  playerRef    - the player object (for angle & position)
     * @param {number}  dt           - deltaTime in ms
     */
    updateBeamAim(isFiringBeam, playerRef, dt = 16.67) {
        const s = this.gamepad?.state;
        const rsX = s?.rs?.x || 0;
        const rsY = s?.rs?.y || 0;
        const rsMag = Math.sqrt(rsX * rsX + rsY * rsY);
        const stickActive = rsMag > 0.15;
        const playerAngle = typeof playerRef?.angle === 'number' ? playerRef.angle : 0;

        if (!isFiringBeam || !s) {
            // Not firing beam — reset tracking so it re-seeds cleanly next time
            this._beamAimAngle = null;
            this._beamGamepadAiming = false;
            // Fade reticle out
            this._beamReticle.active = false;
            this._beamReticle.alpha = Math.max(0, (this._beamReticle.alpha || 0) - dt * 0.008);
            return;
        }

        // ── Determine raw target angle ──
        let targetAngle;
        if (stickActive) {
            // Stick is deflected: use stick direction as aim
            targetAngle = Math.atan2(rsY, rsX);
            this._beamGamepadAiming = true;
        } else {
            // Stick centered while firing: aim along ship facing
            targetAngle = playerAngle;
            this._beamGamepadAiming = true;
        }

        // ── Seed the smoothed angle on first frame ──
        if (this._beamAimAngle === null) {
            this._beamAimAngle = stickActive ? targetAngle : playerAngle;
        }

        // ── Smooth angular interpolation ──
        // Exponential ease (60fps-normalised) gives a ~4-frame lag at 60fps.
        // Higher stick deflection = snappier response, giving fine aim at
        // small deflections and fast sweeps at full tilt.
        const baseLerpSpeed = 0.18;
        const magnitudeBoost = stickActive ? (0.5 + rsMag * 0.5) : 0.4;
        const lerpFactor = 1 - Math.pow(1 - baseLerpSpeed * magnitudeBoost, dt / 16.67);

        // Shortest-arc angular error
        let err = targetAngle - this._beamAimAngle;
        while (err > Math.PI) err -= 2 * Math.PI;
        while (err < -Math.PI) err += 2 * Math.PI;

        this._beamAimAngle += err * lerpFactor;

        // Normalise to [0, 2PI)
        const TWO_PI_VAL = Math.PI * 2;
        this._beamAimAngle = ((this._beamAimAngle % TWO_PI_VAL) + TWO_PI_VAL) % TWO_PI_VAL;

        // ── Update reticle screen position ──
        const reticleDistance = 200; // pixels from screen centre
        const cx = (typeof width !== 'undefined' ? width : 800) * 0.5;
        const cy = (typeof height !== 'undefined' ? height : 600) * 0.5;
        this._beamReticle.x = cx + Math.cos(this._beamAimAngle) * reticleDistance;
        this._beamReticle.y = cy + Math.sin(this._beamAimAngle) * reticleDistance;
        this._beamReticle.active = true;
        this._beamReticle.alpha = Math.min(1, (this._beamReticle.alpha || 0) + dt * 0.012);
    }

    /**
     * Returns the beam aim angle for gamepad, or null if gamepad isn't aiming.
     * When non-null, player.fireWeapon() should use this angle instead of the mouse.
     */
    getBeamAimAngle() {
        if (!this._beamGamepadAiming || this._beamAimAngle === null) return null;
        return this._beamAimAngle;
    }

    /**
     * Returns reticle draw info for the HUD to render.
     * @returns {{ x: number, y: number, active: boolean, alpha: number }}
     */
    getBeamReticle() {
        return this._beamReticle;
    }

    /**
     * Toggles flight target-selection mode for left-stick spatial targeting.
     * Resets stick-latch state so the next deflection immediately emits a direction.
     * @returns {boolean} True when mode is enabled after toggle, false otherwise
     */
    toggleTargetSelectionMode() {
        this._targetSelectionModeEnabled = !this._targetSelectionModeEnabled;
        this._targetSelectionStickLatched = false;
        this._targetSelectionStickAngle = null;
        return this._targetSelectionModeEnabled;
    }

    /**
     * @returns {boolean} Whether left-stick target-selection mode is currently enabled
     */
    isTargetSelectionModeEnabled() {
        return !!this._targetSelectionModeEnabled;
    }

    /**
     * Consumes a left-stick direction for target selection.
     * Returns a direction only when stick deflection is significant and either:
     * 1) this is a fresh deflection after release, or
     * 2) the stick angle rotates at least 45° from the previously latched angle.
     * @param {number} x - Left stick X value
     * @param {number} y - Left stick Y value
     * @returns {{x:number, y:number}|null} Spatial direction when a new selection should trigger
     */
    consumeTargetSelectionStickDirection(x, y) {
        const STICK_ACTIVATION_THRESHOLD = 0.35;
        const STICK_ROTATION_THRESHOLD_RAD = Math.PI / 4;

        if (!this._targetSelectionModeEnabled) {
            this._targetSelectionStickLatched = false;
            this._targetSelectionStickAngle = null;
            return null;
        }

        const magnitude = Math.sqrt((x * x) + (y * y));
        if (magnitude < STICK_ACTIVATION_THRESHOLD) {
            this._targetSelectionStickLatched = false;
            this._targetSelectionStickAngle = null;
            return null;
        }

        const angle = Math.atan2(y, x);
        if (!this._targetSelectionStickLatched) {
            this._targetSelectionStickLatched = true;
            this._targetSelectionStickAngle = angle;
            return { x, y };
        }

        let delta = angle - this._targetSelectionStickAngle;
        while (delta > Math.PI) delta -= (Math.PI * 2);
        while (delta < -Math.PI) delta += (Math.PI * 2);

        if (Math.abs(delta) >= STICK_ROTATION_THRESHOLD_RAD) {
            this._targetSelectionStickAngle = angle;
            return { x, y };
        }

        return null;
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
