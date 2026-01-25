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
    REPAIR: 'Repair'
};

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
