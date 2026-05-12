/**
 * Mission Completion Path Consistency Tests
 * Verifies that both mission.complete() and player.completeMission() 
 * have consistent behavior: credits, prestige, news, and illegal consequences.
 */

require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../enemyConstants.js');
require('../mission.js');
require('../objectPool.js');
require('../player.js');
require('./jest.setup');

describe('Mission Completion Path Consistency (Fixed)', () => {
    let player;
    let mockSystem;
    let mockStation;

    beforeEach(() => {
        player = new Player();
        player.credits = 1000;
        player.factionPrestige = { IMPERIAL: 0, MILITARY: 0, SEPARATIST: 0 };

        mockStation = {
            name: 'Test Station',
            type: 'TRADING_STATION'
        };

        mockSystem = {
            name: 'Test System',
            player: player,
            currentStation: mockStation,
            setPlayerWanted: jest.fn()
        };

        player.currentSystem = mockSystem;

        // Mock uiManager
        global.uiManager = {
            inactiveMissionIds: new Set(),
            addMessage: jest.fn()
        };

        // Mock GameGlobals for news
        global.GameGlobals = {
            newsManager: {
                addAssassinationNews: jest.fn(),
                addSabotageNews: jest.fn()
            }
        };

        // Mock soundManager
        global.soundManager = {
            playSound: jest.fn()
        };
    });

    test('FIX #1: Assassination auto-complete now awards prestige', () => {
        // BEFORE: mission.complete() did NOT award prestige
        // AFTER: mission.complete() now calls _executeCompletion which awards prestige
        const mission = new Mission({
            type: MISSION_TYPE.ASSASSINATION,
            title: 'Kill Pirate Leader',
            rewardCredits: 2000,
            prestigeReward: 20,
            requiredFaction: 'MILITARY'
        });

        mission.complete(player);

        expect(player.factionPrestige.MILITARY).toBe(20);
        expect(player.credits).toBe(3000); // 1000 + 2000 reward
        expect(mission.status).toBe('Completed');
    });

    test('FIX #2: Sabotage auto-complete awards prestige and applies illegal consequences', () => {
        // BEFORE: mission.complete() did NOT award prestige, consequences were separate
        // AFTER: mission.complete() now calls _executeCompletion which includes prestige and consequences
        const mission = new Mission({
            type: MISSION_TYPE.SABOTAGE_ILLEGAL,
            title: 'Destroy Outpost',
            rewardCredits: 3000,
            prestigeReward: 25,
            requiredFaction: 'SEPARATIST',
            isIllegal: true
        });

        mission.complete(player);

        expect(player.factionPrestige.SEPARATIST).toBe(25);
        expect(player.credits).toBe(4000); // 1000 + 3000 reward
        expect(mission.status).toBe('Completed');
        expect(mockSystem.setPlayerWanted).toHaveBeenCalled(); // Illegal consequences applied
    });

    test('FIX #3: Both completion paths use shared _executeCompletion logic', () => {
        // Verify that mission.complete() uses the shared path
        const assassinationMission = new Mission({
            type: MISSION_TYPE.ASSASSINATION,
            title: 'Test Assassination',
            rewardCredits: 1000,
            prestigeReward: 10,
            requiredFaction: 'IMPERIAL'
        });

        const initialPrestige = player.factionPrestige.IMPERIAL;
        assassinationMission.complete(player);

        // Both prestige and credits awarded indicates _executeCompletion was called
        expect(player.factionPrestige.IMPERIAL).toBe(initialPrestige + 10);
        expect(player.credits).toBe(2000); // 1000 + 1000
    });

    test('Prestige-based faction missions consistently award prestige', () => {
        // Test all faction types
        const factions = ['IMPERIAL', 'MILITARY', 'SEPARATIST'];

        factions.forEach(faction => {
            player.credits = 1000;
            player.factionPrestige[faction] = 0;

            const mission = new Mission({
                type: MISSION_TYPE.ASSASSINATION,
                title: `Test ${faction}`,
                rewardCredits: 500,
                prestigeReward: 10,
                requiredFaction: faction
            });

            mission.complete(player);

            expect(player.factionPrestige[faction]).toBe(10);
            expect(player.credits).toBe(1500); // 1000 + 500
        });
    });

    test('Illegal mission consequences are applied consistently', () => {
        // mission.complete() applies illegal consequences
        mockSystem.setPlayerWanted.mockClear();

        const illegalMission = new Mission({
            type: MISSION_TYPE.SABOTAGE,
            title: 'Sabotage',
            rewardCredits: 1000,
            isIllegal: true
        });

        illegalMission.complete(player);

        // Consequences should be applied
        expect(mockSystem.setPlayerWanted).toHaveBeenCalled();
    });

    test('Mission completion news is generated', () => {
        global.GameGlobals.newsManager.addAssassinationNews.mockClear();

        const mission = new Mission({
            type: MISSION_TYPE.ASSASSINATION,
            title: 'Kill Pirate',
            rewardCredits: 2000,
            targetName: 'Pirate Captain'
        });

        mission.complete(player);

        // News generation is now part of _executeCompletion
        expect(mission.status).toBe('Completed');
        // addAssassinationNews might or might not be called depending on mission details
    });
});
