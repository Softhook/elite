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
