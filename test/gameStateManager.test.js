const { GameStateManager } = require('../gameStateManager');

describe('GameStateManager Jump Logic', () => {
    let gameStateManager;
    let mockGalaxy;
    let mockPlayer;
    let mockUiManager;
    let mockSoundManager;

    beforeEach(() => {
        // Setup mocks
        mockPlayer = {
            pos: { x: 0, y: 0 },
            vel: { mult: jest.fn() },
            currentSystem: null
        };

        mockGalaxy = {
            systems: [
                { name: 'System A', jumpZoneCenter: { x: 0, y: 0 }, jumpZoneRadius: 500, connectedSystemIndices: [1] },
                { name: 'System B', jumpZoneCenter: { x: 0, y: 0 }, jumpZoneRadius: 500, connectedSystemIndices: [0] }
            ],
            getCurrentSystem: jest.fn(),
            getSystemByIndex: jest.fn((idx) => mockGalaxy.systems[idx]),
            jumpToSystem: jest.fn(),
            teleportToRandomSystem: jest.fn(),
            currentSystemIndex: 0
        };
        mockGalaxy.getCurrentSystem.mockReturnValue(mockGalaxy.systems[0]);

        mockUiManager = {
            addMessage: jest.fn(),
            clearEventMarkers: jest.fn()
        };

        mockSoundManager = {
            playSound: jest.fn()
        };

        // Globals setup
        global.galaxy = mockGalaxy;
        global.player = mockPlayer;
        global.uiManager = mockUiManager;
        global.soundManager = mockSoundManager;
        global.deltaTime = 16;
        global.millis = jest.fn(() => 1000);
        global.width = 1000;
        global.height = 800;
        global.STATION_TEXT_SIZE = { BODY: 12 };
        global.GS_LOG = jest.fn();
        global.MISSION_LOG = jest.fn();

        gameStateManager = new GameStateManager();
    });

    afterEach(() => {
        delete global.galaxy;
        delete global.player;
        delete global.uiManager;
        delete global.soundManager;
    });

    test('startQuantumGateFade should be blocked if jump is already charging', () => {
        // Arrange: Start a normal jump
        gameStateManager.startJump(1);
        expect(gameStateManager.isJumpCharging).toBe(true);

        // Act: Try to start quantum gate fade
        const result = gameStateManager.startQuantumGateFade();

        // Assert: Should be blocked
        expect(result).toBe(false);
        expect(gameStateManager.quantumGateTeleportPending).toBe(false);
    });

    test('startJump should be blocked if quantum teleport is pending (existing check)', () => {
        // Arrange: Simulate pending quantum teleport
        gameStateManager.quantumGateTeleportPending = true;

        // Act: Start a jump attempt
        gameStateManager.startJump(1);

        // Assert: The jump should be blocked, so pending state remains true (it's up to the quantum logic or manual cancel/timeout to clear it)
        // OR: If the intent is that startJump *overrides* pending quantum, then logic needs to change. 
        // Given "mutually exclusive", blocking is safer.
        expect(gameStateManager.isJumpCharging).toBe(false);
    });

    test('Quantum teleportation should reset isJumpCharging to false', () => {
        // Arrange: Start quantum fade
        gameStateManager.startQuantumGateFade();
        // Manually set isJumpCharging to true to simulate the "stuck" bug scenario
        // (In the bug, if they happen close together, this stays true)
        gameStateManager.isJumpCharging = true;

        // Advance fade to completion
        gameStateManager.jumpFadeState = "FADE_OUT";
        gameStateManager.jumpFadeOpacity = 0.95;

        // Act: Update fade to trigger transition
        gameStateManager._updateJumpFade();
        gameStateManager._updateJumpFade(); // Need a few calls to push opacity >= 1.0 (0.95 + 0.03 + 0.03 > 1.0)

        // Assert: Teleport occurred
        // CRITICAL CHECK: The bug causes this to remain true. We want it to be false.
        expect(gameStateManager.isJumpCharging).toBe(false);
    });

    test('startJump should be blocked if quantum teleport is pending', () => {
        // Arrange: Simulate pending quantum teleport
        gameStateManager.quantumGateTeleportPending = true;

        // Act: Try to start a normal jump
        gameStateManager.startJump(1);

        // Assert: Jump charging should NOT start because quantum teleport is pending
        // Note: The previous logic merely cleared the flag. Now we want to BLOCK the jump entirely.
        expect(gameStateManager.isJumpCharging).toBe(false);
        expect(gameStateManager.jumpTargetSystemIndex).toBe(-1); // Should remain default
    });
});

describe('GameStateManager Space Object Undocking', () => {
    let gameStateManager;
    let mockPlayer;
    let mockStation;
    let mockSpaceObject;
    let mockGalaxy;

    beforeEach(() => {
        mockStation = {
            pos: { x: 500, y: 500, copy: jest.fn(() => ({ x: 500, y: 500, add: jest.fn(() => ({ x: 500, y: 430 })) })) },
            dockingRadius: 160,
            size: 160,
            getMarket: jest.fn()
        };

        mockSpaceObject = {
            pos: { x: 200, y: 200, copy: jest.fn(() => ({ x: 200, y: 200, add: jest.fn(() => ({ x: 200, y: 120 })) })) },
            dockingRadius: 80,
            size: 80
        };

        mockPlayer = {
            pos: { x: 0, y: 0, add: jest.fn(), set: jest.fn() },
            vel: { mult: jest.fn(), set: jest.fn() },
            size: 20,
            isDockedAndInvulnerable: false,
            isCloaked: false,
            activeBodyguards: [],
            clearSessionTradeTracking: jest.fn()
        };

        mockGalaxy = {
            systems: [{ name: 'Test System', jumpZoneCenter: { x: 0, y: 0 }, jumpZoneRadius: 500, connectedSystemIndices: [], station: mockStation }],
            getCurrentSystem: jest.fn(() => mockGalaxy.systems[0]),
            getSystemByIndex: jest.fn((idx) => mockGalaxy.systems[idx]),
            jumpToSystem: jest.fn(),
            teleportToRandomSystem: jest.fn(),
            currentSystemIndex: 0
        };

        global.galaxy = mockGalaxy;
        global.player = mockPlayer;
        global.uiManager = { addMessage: jest.fn(), clearEventMarkers: jest.fn() };
        global.soundManager = { playSound: jest.fn() };
        global.deltaTime = 16;
        global.millis = jest.fn(() => 1000);
        global.width = 1000;
        global.height = 800;
        global.STATION_TEXT_SIZE = { BODY: 12 };
        global.GS_LOG = jest.fn();
        global.MISSION_LOG = jest.fn();
        global.createVector = jest.fn((x, y) => ({ x, y }));

        gameStateManager = new GameStateManager();
    });

    afterEach(() => {
        delete global.galaxy;
        delete global.player;
        delete global.uiManager;
        delete global.soundManager;
        delete global.createVector;
    });

    test('_handleUndocking uses space object position when prevState is DOCKED_SPACE_OBJECT', () => {
        gameStateManager.currentDockedSpaceObject = mockSpaceObject;
        gameStateManager.currentDockedStation = mockStation;

        gameStateManager._handleUndocking('DOCKED_SPACE_OBJECT');

        // Player should be repositioned relative to the space object (not the station)
        expect(mockSpaceObject.pos.copy).toHaveBeenCalled();
        expect(mockStation.pos.copy).not.toHaveBeenCalled();
        // Space object reference should be cleared after undocking
        expect(gameStateManager.currentDockedSpaceObject).toBeNull();
    });

    test('_handleUndocking uses station position when prevState is DOCKED', () => {
        gameStateManager.currentDockedSpaceObject = mockSpaceObject;
        gameStateManager.currentDockedStation = mockStation;

        gameStateManager._handleUndocking('DOCKED');

        // Player should be repositioned relative to the station (not the space object)
        expect(mockStation.pos.copy).toHaveBeenCalled();
        expect(mockSpaceObject.pos.copy).not.toHaveBeenCalled();
    });

    test('back from VIEWING_RECORD with space object context routes undocking to space object', () => {
        // Set up: player is docked at a space object, navigated to Personal Record
        gameStateManager.currentDockedSpaceObject = mockSpaceObject;
        gameStateManager.currentDockedStation = mockStation;
        gameStateManager._returnFromRecordState = 'DOCKED_SPACE_OBJECT';

        // Simulate what the gamepad B-button handler does: consume _returnFromRecordState
        // to determine the correct return state
        const returnState = gameStateManager._returnFromRecordState || 'DOCKED';
        gameStateManager._returnFromRecordState = null;

        // _returnFromRecordState must route back to space object, not station
        expect(returnState).toBe('DOCKED_SPACE_OBJECT');
        // Field must be cleared to prevent stale state on subsequent navigation
        expect(gameStateManager._returnFromRecordState).toBeNull();

        // When the player subsequently undocks from DOCKED_SPACE_OBJECT, the space
        // object position must be used (not the station)
        gameStateManager._handleUndocking(returnState);
        expect(mockSpaceObject.pos.copy).toHaveBeenCalled();
        expect(mockStation.pos.copy).not.toHaveBeenCalled();
    });

    test('back from VIEWING_RECORD without space object context routes undocking to station', () => {
        // Set up: player came from a regular station (no _returnFromRecordState set)
        gameStateManager.currentDockedSpaceObject = null;
        gameStateManager.currentDockedStation = mockStation;
        // _returnFromRecordState is undefined - no space object context

        // Simulate the gamepad B-button handler with no space object context
        const returnState = gameStateManager._returnFromRecordState || 'DOCKED';
        gameStateManager._returnFromRecordState = null;

        // Should fall back to DOCKED (station)
        expect(returnState).toBe('DOCKED');

        // When the player subsequently undocks from DOCKED, the station position must be used
        gameStateManager._handleUndocking(returnState);
        expect(mockStation.pos.copy).toHaveBeenCalled();
    });
});
