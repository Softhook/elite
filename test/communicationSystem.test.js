const { CommunicationSystem } = require('../communicationSystem');

// Mock dependencies if not handled by setup
global.millis = () => Date.now();
global.random = () => 0.5;
global.AI_ROLE = {
    POLICE: 'Police',
    PIRATE: 'Pirate',
    ALIEN: 'Alien',
    BOUNTY_HUNTER: 'Bounty Hunter',
    HAULER: 'Hauler',
    TRANSPORT: 'Transport',
    REPAIR: 'Repair',
    COMBAT: 'Combat',
    GUARD: 'Guard',
};

describe('CommunicationSystem Summon/Support Delays', () => {
    let commSystem;
    let addCommunicationMessage;

    beforeEach(() => {
        jest.useFakeTimers();
        commSystem = new CommunicationSystem();
        addCommunicationMessage = jest.fn();
        commSystem.uiManager = { addCommunicationMessage };
        commSystem._queueSpeech = jest.fn();
        commSystem._getEnemyKey = (ship) => ship && ship.id ? ship.id : null;
        commSystem._getShipFaction = (ship) => ship && ship.faction ? ship.faction : null;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('emitSummonCall does NOT show the call message immediately', () => {
        const caller = { id: 'caller-1', role: 'PIRATE', faction: 'PIRATE', pos: { x: 0, y: 0 } };
        const target = { id: 'tgt-1', shipTypeName: 'Cobra' };
        commSystem.emitSummonCall(caller, target, []);
        expect(addCommunicationMessage).not.toHaveBeenCalled();
    });

    test('emitSummonCall shows the call message after ~1 s delay', () => {
        const caller = { id: 'caller-2', role: 'PIRATE', faction: 'PIRATE', pos: { x: 0, y: 0 } };
        const target = { id: 'tgt-2', shipTypeName: 'Cobra' };
        commSystem.emitSummonCall(caller, target, []);
        jest.advanceTimersByTime(commSystem._summonCallDelayMs);
        expect(addCommunicationMessage).toHaveBeenCalledTimes(1);
    });

    test('emitSummonCall shows ally response only after call delay + response base delay', () => {
        const caller = { id: 'caller-3', role: 'PIRATE', faction: 'PIRATE', pos: { x: 0, y: 0 } };
        const ally   = { id: 'ally-3',   role: 'PIRATE', faction: 'PIRATE', pos: { x: 10, y: 0 } };
        const target = { id: 'tgt-3', shipTypeName: 'Cobra' };
        // Ensure ally is not filtered out by increasing _summonResponseMaxCount
        commSystem._summonResponseMaxCount = 2;
        commSystem.emitSummonCall(caller, target, [ally]);

        // No messages yet
        expect(addCommunicationMessage).not.toHaveBeenCalled();

        // Advance to just after the call delay — only call message should appear
        jest.advanceTimersByTime(commSystem._summonCallDelayMs);
        expect(addCommunicationMessage).toHaveBeenCalledTimes(1);

        // Advance by the response base delay — response should now appear
        jest.advanceTimersByTime(commSystem._summonResponseBaseDelayMs);
        expect(addCommunicationMessage).toHaveBeenCalledTimes(2);
    });

    test('handlePlayerUnderAttack does NOT show the aid message immediately', () => {
        global.COMBAT_ALLY_SUMMON_RADIUS = 2000;
        global.Enemy = class {};
        const attacker = { id: 'atk-1', faction: 'PIRATE' };
        const ally = { id: 'ally-aid-1', role: 'Police', faction: 'POLICE', pos: { x: 0, y: 0 }, isTargetValid: () => true };
        commSystem.player = { isPolice: true, playerFaction: null, pos: { x: 0, y: 0 } };
        const system = { enemies: [ally] };
        commSystem._isPlayerFactionAlly = () => true;

        commSystem.handlePlayerUnderAttack(attacker, system);
        expect(addCommunicationMessage).not.toHaveBeenCalled();
    });

    test('handlePlayerUnderAttack shows the aid message after ~1 s delay', () => {
        global.COMBAT_ALLY_SUMMON_RADIUS = 2000;
        const attacker = { id: 'atk-2', faction: 'PIRATE' };
        const ally = { id: 'ally-aid-2', role: 'Police', faction: 'POLICE', pos: { x: 0, y: 0 }, isTargetValid: () => true };
        commSystem.player = { isPolice: true, playerFaction: null, pos: { x: 0, y: 0 } };
        const system = { enemies: [ally] };
        commSystem._isPlayerFactionAlly = () => true;

        commSystem.handlePlayerUnderAttack(attacker, system);
        jest.advanceTimersByTime(commSystem._factionAllyAidMessageDelayMs);
        expect(addCommunicationMessage).toHaveBeenCalledTimes(1);
    });
});

describe('CommunicationSystem Friendly Fire Logic', () => {
    let commSystem;
    let player;
    let policeEnemy;

    beforeEach(() => {
        // Setup mocks
        commSystem = new CommunicationSystem();

        // Mock internal methods to isolate unit test
        commSystem._getShipFaction = (ship) => ship.faction || "UNKNOWN";
        commSystem._maybeSend = jest.fn();

        // Mock templates
        commSystem.templates = {
            allyWarning: ["Watch your fire!", "I'm on your team!", "Check your targets!"]
        };

        player = {
            isPolice: false,
            playerFaction: "UNKNOWN"
        };

        policeEnemy = {
            faction: "POLICE",
            role: "Police",
            shipTypeName: "Interceptor"
        };
    });

    test('should trigger ally warning when Police Player hits Police NPC', () => {
        // Arrange
        player.isPolice = true;

        // Act
        // Damage amount 10
        commSystem.handlePlayerDamageReaction(policeEnemy, player, 10);

        // Assert
        expect(commSystem._maybeSend).toHaveBeenCalled();
        const callArgs = commSystem._maybeSend.mock.calls[0];
        expect(callArgs[0]).toBe(policeEnemy); // Enemy speaking
        expect(callArgs[1]).toBe('ally_warning'); // Message type
    });

    test('should trigger ally warning when Police Player hits Unmarked Police NPC (Role check)', () => {
        // Arrange
        player.isPolice = true;
        const unmarkedPolice = {
            faction: null, // Unknown/Neutral faction ship
            role: "Police",
            shipTypeName: "Sidewinder"
        };

        // Act
        commSystem.handlePlayerDamageReaction(unmarkedPolice, player, 10);

        // Assert
        expect(commSystem._maybeSend).toHaveBeenCalled();
        const callArgs = commSystem._maybeSend.mock.calls[0];
        expect(callArgs[0]).toBe(unmarkedPolice);
        expect(callArgs[1]).toBe('ally_warning');
    });

    test('should NOT trigger ally warning when Civilian Player hits Police NPC', () => {
        // Arrange
        player.isPolice = false;

        // Act
        commSystem.handlePlayerDamageReaction(policeEnemy, player, 10);

        // Assert
        // Check filtering calls
        const calls = commSystem._maybeSend.mock.calls;
        const allyWarningCalls = calls.filter(call => call[1] === 'ally_warning');
        expect(allyWarningCalls.length).toBe(0);
    });

    test('should trigger ally warning when Player with same faction hits faction NPC', () => {
        // Arrange
        player.isPolice = false;
        player.playerFaction = "IMPERIAL";
        const imperialEnemy = { faction: "IMPERIAL" };

        // Act
        commSystem.handlePlayerDamageReaction(imperialEnemy, player, 10);

        // Assert
        expect(commSystem._maybeSend).toHaveBeenCalled();
        const callArgs = commSystem._maybeSend.mock.calls[0];
        expect(callArgs[1]).toBe('ally_warning');
    });

    test('should NOT trigger ally warning when Player hits different faction NPC', () => {
        // Arrange
        player.playerFaction = "IMPERIAL";
        const separatistEnemy = { faction: "SEPARATIST" };

        // Act
        commSystem.handlePlayerDamageReaction(separatistEnemy, player, 10);

        // Assert
        const calls = commSystem._maybeSend.mock.calls;
        const allyWarningCalls = calls.filter(call => call[1] === 'ally_warning');
        expect(allyWarningCalls.length).toBe(0);
    });
});
