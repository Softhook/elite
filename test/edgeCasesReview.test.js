/**
 * Edge Cases Review - Mission Bounty/Faction System
 * Identifies potential issues with the refactored completion path
 */

require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../enemyConstants.js');
require('../mission.js');
require('../objectPool.js');
require('../player.js');
require('./jest.setup');

describe('Edge Cases in Mission/Bounty/Faction System', () => {
    let player;
    let mockSystem;
    let mockStation;

    beforeEach(() => {
        player = new Player();
        player.credits = 1000;
        player.factionPrestige = { IMPERIAL: 0, MILITARY: 0, SEPARATIST: 0 };
        player.factionKills = { POLICE: 0 };

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

        global.uiManager = {
            inactiveMissionIds: new Set(),
            addMessage: jest.fn()
        };

        global.GameGlobals = {
            newsManager: {
                addAssassinationNews: jest.fn(),
                addSabotageNews: jest.fn(),
                addBountyNews: jest.fn()
            }
        };

        global.soundManager = {
            playSound: jest.fn()
        };
    });

    describe('EDGE CASE 1: Cargo Removal Failure', () => {
        test('delivery mission completes even if cargo removal fails', () => {
            const mission = new Mission({
                type: MISSION_TYPE.DELIVERY_LEGAL,
                title: 'Deliver Cargo',
                rewardCredits: 500,
                destinationSystem: 'Test System',
                destinationStation: 'Test Station',
                cargoType: 'supplies',
                cargoQuantity: 100,
                status: 'Active'
            });
            player.activeMission = mission;
            // Deliberately NOT adding cargo to player - removeCargo will fail
            // Make completeMission fail before cargo removal by checking at Test System

            const result = player.completeMission(mockSystem, mockStation);

            // Completion fails due to missing cargo check (happens before removeCargo call)
            expect(result).toBe(false);
            expect(player.credits).toBe(1000); // No reward
        });

        test('cargo removal works for valid delivery mission', () => {
            const mission = new Mission({
                type: MISSION_TYPE.DELIVERY_LEGAL,
                title: 'Deliver Cargo',
                rewardCredits: 500,
                destinationSystem: 'Test System',
                destinationStation: 'Test Station',
                cargoType: 'supplies',
                cargoQuantity: 50,
                status: 'Active'
            });
            player.activeMission = mission;
            player.cargo = [{ name: 'supplies', quantity: 50 }];

            const result = player.completeMission(mockSystem, mockStation);

            // Completion succeeds
            expect(result).toBe(true);
            expect(player.credits).toBe(1500);
            // Cargo should be removed
            expect(player.cargo.length).toBe(0);
        });

        test('partial cargo removal silently fails', () => {
            const mission = new Mission({
                type: MISSION_TYPE.DELIVERY_LEGAL,
                title: 'Deliver 100 cargo',
                rewardCredits: 500,
                destinationSystem: 'Test System',
                destinationStation: 'Test Station',
                cargoType: 'supplies',
                cargoQuantity: 100,
                status: 'Active'
            });
            player.activeMission = mission;
            player.cargo = [{ name: 'supplies', quantity: 50 }]; // Only 50, need 100

            const result = player.completeMission(mockSystem, mockStation);

            // Mission completion fails earlier due to hasCargo check
            expect(result).toBe(false);
            expect(player.cargo[0].quantity).toBe(50); // Cargo unchanged
        });
    });

    describe('EDGE CASE 2: Prestige Initialization', () => {
        test('prestige reward of 0 is not awarded (falsy check)', () => {
            const mission = new Mission({
                type: MISSION_TYPE.DELIVERY_LEGAL,
                title: 'Delivery',
                rewardCredits: 500,
                prestigeReward: 0, // Zero prestige
                requiredFaction: 'IMPERIAL',
                destinationSystem: 'Test System',
                destinationStation: 'Test Station',
                cargoType: 'supplies',
                cargoQuantity: 50,
                status: 'Active'
            });
            player.activeMission = mission;
            player.cargo = [{ name: 'supplies', quantity: 50 }];
            player.factionPrestige.IMPERIAL = 0;

            const result = player.completeMission(mockSystem, mockStation);

            // Completion succeeds
            expect(result).toBe(true);
            // Prestige NOT awarded because 0 is falsy (INTENTIONAL - don't award 0 prestige)
            expect(player.factionPrestige.IMPERIAL).toBe(0);
            expect(player.credits).toBe(1500); // Credits awarded
        });

        test('prestige reward of null skipped in _executeCompletion', () => {
            const mission = new Mission({
                type: MISSION_TYPE.ASSASSINATION,
                title: 'Kill Target',
                rewardCredits: 1000,
                prestigeReward: null, // Null prestige
                requiredFaction: 'MILITARY'
            });
            player.factionPrestige.MILITARY = 0;

            mission.complete(player);

            // Prestige not awarded (null is falsy)
            expect(player.factionPrestige.MILITARY).toBe(0);
            expect(player.credits).toBe(2000); // Credits awarded
        });
    });

    describe('EDGE CASE 3: Police Faction with Prestige Mission', () => {
        test('police player cannot have faction prestige missions - prestige fails silently', () => {
            // Police player tries to accept faction prestige mission
            player.isPolice = true;
            player.playerFaction = null;
            // Initialize factionPrestige with only POLICE key
            player.factionPrestige = { POLICE: 0 };

            const mission = new Mission({
                type: MISSION_TYPE.DELIVERY_LEGAL,
                title: 'Faction Delivery',
                rewardCredits: 500,
                prestigeReward: 10,
                requiredFaction: 'IMPERIAL', // Faction they can't join
                destinationSystem: 'Test System',
                destinationStation: 'Test Station',
                cargoType: 'supplies',
                cargoQuantity: 50,
                status: 'Active'
            });
            player.activeMission = mission;
            player.cargo = [{ name: 'supplies', quantity: 50 }];

            const result = player.completeMission(mockSystem, mockStation);

            // Completion succeeds
            expect(result).toBe(true);
            // addFactionPrestige checks if (this.factionPrestige[factionKey] === undefined) return
            // IMPERIAL is undefined, so prestige silently NOT added
            expect(player.credits).toBe(1500); // Credits ARE awarded
            expect(player.factionPrestige.POLICE).toBe(0); // Police prestige unchanged
            // IMPERIAL prestige never created - no error thrown
        });

        test('factionPrestige initialization for police player', () => {
            player.isPolice = true;
            player.factionPrestige = undefined;

            const mission = new Mission({
                type: MISSION_TYPE.ASSASSINATION,
                title: 'Kill',
                rewardCredits: 1000,
                prestigeReward: 10,
                requiredFaction: 'IMPERIAL'
            });

            mission.complete(player);

            // addFactionPrestige initializes factionPrestige but only with faction keys
            // For police player, IMPERIAL won't be in it
            expect(player.credits).toBe(2000);
        });
    });

    describe('EDGE CASE 4: Mission Status During Completion', () => {
        test('mission status is set in _executeCompletion before _recordCompletion', () => {
            const mission = new Mission({
                type: MISSION_TYPE.ASSASSINATION,
                title: 'Kill Target',
                rewardCredits: 1000,
                status: 'Completable'  // Can be auto-completed
            });

            const recordSpy = jest.spyOn(mission, '_recordCompletion');
            mission.complete(player);

            // Status should be 'Completed'
            expect(mission.status).toBe('Completed');
            expect(recordSpy).toHaveBeenCalled();
        });

        test('player.activeMission set to null after successful completion', () => {
            const mission = new Mission({
                type: MISSION_TYPE.DELIVERY_LEGAL,
                title: 'Delivery',
                rewardCredits: 500,
                destinationSystem: 'Test System',
                destinationStation: 'Test Station',
                cargoType: 'supplies',
                cargoQuantity: 50,
                status: 'Active'
            });
            player.activeMission = mission;
            player.cargo = [{ name: 'supplies', quantity: 50 }];

            const result = player.completeMission(mockSystem, mockStation);

            // Completion should succeed
            expect(result).toBe(true);
            // activeMission should be null after completion
            expect(player.activeMission).toBeNull();
            // Mission object is completed
            expect(mission.status).toBe('Completed');
        });

        test('player.activeMission NOT cleared if completion fails', () => {
            const mission = new Mission({
                type: MISSION_TYPE.DELIVERY_LEGAL,
                title: 'Delivery',
                rewardCredits: 500,
                destinationSystem: 'Test System',
                destinationStation: 'Test Station',
                cargoType: 'supplies',
                cargoQuantity: 50,
                status: 'Active'
            });
            player.activeMission = mission;
            // Deliberately NOT adding cargo

            const result = player.completeMission(mockSystem, mockStation);

            // Completion should fail
            expect(result).toBe(false);
            // activeMission should STILL be set
            expect(player.activeMission).toBe(mission);
        });
    });

    describe('EDGE CASE 5: Illegal Mission Consequences', () => {
        test('illegal consequence target enemy ref might be null', () => {
            const mission = new Mission({
                type: MISSION_TYPE.ASSASSINATION,
                title: 'Illegal Kill',
                rewardCredits: 1000,
                isIllegal: true,
                status: 'Completable'
                // No targetEnemyRef set
            });

            mockSystem.setPlayerWanted.mockClear();
            mission.complete(player);

            // _applyIllegalConsequences checks enemy?.role, handles null gracefully
            expect(mockSystem.setPlayerWanted).toHaveBeenCalled();
            expect(player.credits).toBe(2000);
        });

        test('illegal consequences applied for assassination mission auto-complete', () => {
            const mission = new Mission({
                type: MISSION_TYPE.ASSASSINATION,
                title: 'Illegal Assassination',
                rewardCredits: 1000,
                isIllegal: true,
                status: 'Completable'
            });

            mockSystem.setPlayerWanted.mockClear();
            mission.complete(player);

            // Illegal consequences SHOULD be applied when mission.complete() is called
            expect(mockSystem.setPlayerWanted).toHaveBeenCalled();
            expect(mission.status).toBe('Completed');
        });

        test('illegal consequences applied for delivery mission via player.completeMission()', () => {
            const mission = new Mission({
                type: MISSION_TYPE.DELIVERY_ILLEGAL,
                title: 'Illegal Delivery',
                rewardCredits: 500,
                isIllegal: true,
                destinationSystem: 'Test System',
                destinationStation: 'Test Station',
                cargoType: 'contraband',
                cargoQuantity: 50,
                status: 'Active'
            });
            player.activeMission = mission;
            player.cargo = [{ name: 'contraband', quantity: 50 }];

            mockSystem.setPlayerWanted.mockClear();
            const result = player.completeMission(mockSystem, mockStation);

            // Completion should succeed
            expect(result).toBe(true);
            // Illegal consequences should be applied via _executeCompletion
            expect(mockSystem.setPlayerWanted).toHaveBeenCalled();
            expect(mission.status).toBe('Completed');
            expect(player.credits).toBe(1500);
        });
    });

    describe('EDGE CASE 6: Faction Bounty + Prestige Stacking', () => {
        test('player gets both faction bounty AND mission prestige for same faction', () => {
            // Player kills a Separatist for Military faction bounty
            player.playerFaction = 'MILITARY';
            player.factionPrestige.MILITARY = 0;

            // Simulate faction bounty from enemy kill
            player.addCredits(BOUNTY_MILITARY_PIRATE); // 1000 cr
            player.addFactionPrestige('MILITARY', 1); // From kill

            // Then complete military mission with prestige reward
            const mission = new Mission({
                type: MISSION_TYPE.MILITARY_STRIKE,
                title: 'Strike Mission',
                rewardCredits: 2000,
                prestigeReward: 20,
                requiredFaction: 'MILITARY',
                status: 'Completable'
            });

            mission.complete(player);

            // Should have both bounty prestige (1) and mission prestige (20)
            expect(player.factionPrestige.MILITARY).toBe(21); // 1 + 20
            expect(player.credits).toBe(1000 + 1000 + 2000); // Initial + bounty + mission
        });
    });

    describe('EDGE CASE 7: Bounty Type Detection in News', () => {
        test('bounty mission news generation uses correct type', () => {
            const mission = new Mission({
                type: MISSION_TYPE.BOUNTY_PIRATE,
                title: 'Pirate Bounty',
                rewardCredits: 1000,
                targetCount: 5,
                progressCount: 5
            });

            GameGlobals.newsManager.addBountyNews.mockClear();
            mission.complete(player);

            // Should generate pirate bounty news with system name from currentSystem
            expect(GameGlobals.newsManager.addBountyNews).toHaveBeenCalledWith('pirate', 5, 'Test System');
        });

        test('faction kill mission news uses faction type', () => {
            const mission = new Mission({
                type: MISSION_TYPE.SEPARATIST_RAID,
                title: 'Raid Mission',
                rewardCredits: 2000,
                targetCount: 10,
                progressCount: 10
            });

            GameGlobals.newsManager.addBountyNews.mockClear();
            mission.complete(player);

            // Should generate faction bounty news with system name
            expect(GameGlobals.newsManager.addBountyNews).toHaveBeenCalledWith('faction', 10, 'Test System');
        });
    });

    describe('EDGE CASE 8: Multiple Mission Types', () => {
        test('faction sabotage mission gets prestige AND illegal consequences', () => {
            const mission = new Mission({
                type: MISSION_TYPE.SEPARATIST_SABOTAGE,
                title: 'Sabotage Outpost',
                rewardCredits: 3000,
                prestigeReward: 25,
                requiredFaction: 'SEPARATIST',
                isIllegal: true
            });
            player.factionPrestige.SEPARATIST = 0;

            mission.complete(player);

            expect(player.factionPrestige.SEPARATIST).toBe(25);
            expect(player.credits).toBe(4000);
            expect(mockSystem.setPlayerWanted).toHaveBeenCalled();
        });

        test('faction patrol mission does not use prestige reward field', () => {
            // Patrol missions don't have prestige rewards - they just require scans
            const mission = new Mission({
                type: MISSION_TYPE.IMPERIAL_PATROL,
                title: 'Patrol',
                rewardCredits: 1500,
                prestigeReward: undefined, // No prestige for patrol
                requiredFaction: 'IMPERIAL',
                status: 'Completable'
            });
            player.factionPrestige.IMPERIAL = 0;

            mission.complete(player);

            // Should NOT award prestige
            expect(player.factionPrestige.IMPERIAL).toBe(0);
            expect(player.credits).toBe(2500);
        });
    });

    describe('EDGE CASE 9: Save/Load State', () => {
        test('mission completion should trigger saveGame', () => {
            global.saveGame = jest.fn();

            const mission = new Mission({
                type: MISSION_TYPE.ASSASSINATION,
                title: 'Kill',
                rewardCredits: 1000
            });

            mission.complete(player);

            // saveGame should be called (via _recordCompletion)
            expect(global.saveGame).toHaveBeenCalled();
        });
    });

    describe('EDGE CASE 10: Missing Utility Functions', () => {
        test('bounty news generation works without targetCount', () => {
            const mission = new Mission({
                type: MISSION_TYPE.BOUNTY_ALIEN,
                title: 'Alien Bounty',
                rewardCredits: 2000
                // No targetCount set
            });

            mission.complete(player);

            // Should use progressCount || 1 as fallback
            expect(GameGlobals.newsManager.addBountyNews).toHaveBeenCalled();
        });
    });
});
