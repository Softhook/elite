// ****** missionTypes/MilitaryMissionHandler.js ******
// Handler for Military Forces exclusive missions.
// Requires MILITARY faction membership.

/**
 * Military Forces exclusive missions.
 * 
 * Example mission types:
 * - Xeno Extermination: High-reward alien kills
 * - System Defense: Patrol specific systems
 * - High-Value Targets: Eliminate dangerous commanders
 * - Escort Duty: Protect military convoys
 */
class MilitaryMissionHandler extends FactionMissionHandler {
    static types = ['MILITARY_EXTERMINATION', 'MILITARY_DEFENSE', 'MILITARY_ESCORT'];
    static requiredFaction = 'MILITARY';
    static minFactionRank = 0;

    /**
     * Create a Military mission.
     * @param {Object} context - Generation context
     * @returns {Mission|null}
     */
    static create(context) {
        const { originSystem, originStation, galaxy, player, subtype } = context;

        const missionSubtype = subtype || random(['MILITARY_EXTERMINATION', 'MILITARY_DEFENSE']);

        switch (missionSubtype) {
            case 'MILITARY_DEFENSE':
                return this._createDefenseMission(originSystem, originStation, galaxy, player);
            case 'MILITARY_EXTERMINATION':
            default:
                return this._createExterminationMission(originSystem, originStation, galaxy, player);
        }
    }

    /**
     * Create an alien extermination mission.
     * @private
     */
    static _createExterminationMission(originSystem, originStation, galaxy, player) {
        const targetCount = floor(random(2, 5));
        const baseReward = 2000 + (originSystem.techLevel || 5) * 150;
        let reward = Math.floor(baseReward + random(500, 2000));

        // Apply rank bonus
        const multiplier = this.getRankRewardMultiplier(player);
        reward = Math.floor(reward * multiplier);

        return new Mission({
            type: 'MILITARY_EXTERMINATION',
            title: `Xeno Command: Exterminate ${targetCount} Alien Threats`,
            description: `Military Command has declared a xeno-purge operation. Eliminate ${targetCount} alien vessels with extreme prejudice. Humanity's survival depends on vigilance.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Alien hostiles`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false,
            progressCount: 0,
            requiredFaction: 'MILITARY'
        });
    }

    /**
     * Create a system defense mission.
     * @private
     */
    static _createDefenseMission(originSystem, originStation, galaxy, player) {
        const targetCount = floor(random(3, 7));
        const baseReward = 1000 + (originSystem.techLevel || 5) * 75;
        let reward = Math.floor(baseReward + random(300, 800));

        // Apply rank bonus
        const multiplier = this.getRankRewardMultiplier(player);
        reward = Math.floor(reward * multiplier);

        return new Mission({
            type: 'MILITARY_DEFENSE',
            title: `System Defense: Neutralize ${targetCount} Hostiles`,
            description: `This sector is under military protection. Eliminate ${targetCount} hostile vessels (pirates, aliens, or other threats) to maintain security. Honor and duty.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} hostile vessels`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false,
            progressCount: 0,
            requiredFaction: 'MILITARY'
        });
    }

    static getObjective(mission) {
        if (mission.targetDesc) {
            return `Military Objective: ${mission.targetDesc}`;
        }
        return '';
    }

    static getDisplayColor() {
        return [100, 150, 200]; // Military blue
    }

    static getIcon() {
        return '🎖️';
    }
}

// Register with the registry (commented out until mission system is extended)
// if (typeof MissionTypeRegistry !== 'undefined') {
//     MissionTypeRegistry.register(MilitaryMissionHandler);
// }
