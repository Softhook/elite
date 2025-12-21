// ****** missionTypes/BountyHandler.js ******
// Handler for bounty hunting missions (pirate, police, alien).

/**
 * Handler for bounty hunting mission types.
 */
class BountyHandler extends MissionTypeHandler {
    static types = [MISSION_TYPE.BOUNTY_PIRATE, MISSION_TYPE.BOUNTY_POLICE, MISSION_TYPE.BOUNTY_ALIEN];
    static requiredFaction = null; // Public missions

    /**
     * Create a bounty mission.
     * @param {Object} context - Generation context
     * @returns {Mission|null}
     */
    static create(context) {
        const { originSystem, originStation, galaxy, player, subtype } = context;

        if (subtype === MISSION_TYPE.BOUNTY_POLICE) {
            return this._createCopKiller(originSystem, originStation, galaxy, player);
        } else if (subtype === MISSION_TYPE.BOUNTY_ALIEN) {
            return this._createAlienBounty(originSystem, originStation, galaxy, player);
        }
        return this._createPirateBounty(originSystem, originStation, galaxy, player);
    }

    /**
     * Create a pirate bounty mission.
     * @private
     */
    static _createPirateBounty(originSystem, originStation, galaxy, player) {
        const targetCount = floor(random(2, 6));
        const baseBountyPerShip = 300;
        const techLevelBonus = (originSystem.techLevel || 5) * 10;
        const securityPenalty = originSystem.securityLevel === 'High' ? -50 :
            (originSystem.securityLevel === 'Anarchy' ? 100 : 0);

        const reward = Math.max(100, Math.floor(
            targetCount * baseBountyPerShip + techLevelBonus + securityPenalty + random(50, 300)
        ));

        return new Mission({
            type: MISSION_TYPE.BOUNTY_PIRATE,
            title: `Pirate Cull: Destroy ${targetCount} Pirates`,
            description: `Pirate activity is a scourge across the galaxy. Eliminate ${targetCount} pirate vessels. Payment will be processed automatically upon fulfilling the contract.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Pirate vessels (any system)`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false,
            progressCount: 0
        });
    }

    /**
     * Create a cop killer mission (targets police).
     * @private
     */
    static _createCopKiller(originSystem, originStation, galaxy, player) {
        let targetCount = floor(random(2, 5));
        if (originSystem.securityLevel === 'Anarchy') {
            targetCount = floor(random(3, 6));
        }

        const baseBountyPerCop = 300;
        const techLevelBonus = (originSystem.techLevel || 5) * 15;

        const reward = Math.max(250, Math.floor(
            targetCount * baseBountyPerCop + techLevelBonus + random(200, 600)
        ));

        const completionFlagName = `copKillerMission_${originSystem.name}_${targetCount}_${Date.now() % 10000}`;

        return new Mission({
            type: MISSION_TYPE.BOUNTY_POLICE,
            title: `Eliminate ${targetCount} Police Ships`,
            description: `Certain parties require the disruption of security operations. Eliminate ${targetCount} police vessels anywhere you can find them. Payment will be processed automatically upon completion. Warning: This action will result in WANTED status in multiple systems.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Police vessels (any system)`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: true,
            completionFlagName: completionFlagName
        });
    }

    /**
     * Create an alien bounty mission.
     * @private
     */
    static _createAlienBounty(originSystem, originStation, galaxy, player) {
        const targetCount = floor(random(1, 4));
        const baseBountyPerAlien = 1250;
        const techLevelBonus = (originSystem.techLevel || 5) * 50;

        const reward = Math.max(1500, Math.floor(
            targetCount * baseBountyPerAlien + techLevelBonus + random(500, 2000)
        ));

        return new Mission({
            type: MISSION_TYPE.BOUNTY_ALIEN,
            title: `Xeno Threat: Neutralize ${targetCount} Alien Hostiles`,
            description: `Alien vessels have been threatening human systems and shipping. High command authorizes the neutralization of ${targetCount} such xeno-threats. Payment will be processed automatically upon confirmation of kills. Extreme caution advised.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Alien vessels (any system)`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false,
            progressCount: 0
        });
    }

    /**
     * Get objective string for bounty missions.
     */
    static getObjective(mission) {
        if (mission.targetDesc) {
            return `Objective: ${mission.targetDesc}`;
        }
        return '';
    }

    /**
     * Get supplemental details for bounty missions (progress).
     */
    static getSupplementalDetails(mission) {
        if (mission.progressCount > 0) {
            return `Progress: ${mission.progressCount}/${mission.targetCount}`;
        }
        return '';
    }

    /**
     * Generate news for bounty completion.
     */
    static generateNews(mission, player) {
        if (typeof GameGlobals === 'undefined' || !GameGlobals.newsManager) return;

        const systemName = player.currentSystem?.name || mission.originSystem || 'Unknown';
        const bountyType = mission.type === MISSION_TYPE.BOUNTY_PIRATE ? 'pirate' :
            mission.type === MISSION_TYPE.BOUNTY_POLICE ? 'police' : 'alien';

        try {
            GameGlobals.newsManager.addBountyNews(bountyType, mission.targetCount || mission.progressCount || 1, systemName);
        } catch (e) {
            MISSION_LOG('Error generating bounty news:', e);
        }
    }

    /**
     * Get display color for bounty missions.
     */
    static getDisplayColor() {
        return [200, 100, 100]; // Red for combat
    }

    static getIcon() {
        return '🎯';
    }
}

// Register with the registry
if (typeof MissionTypeRegistry !== 'undefined') {
    MissionTypeRegistry.register(BountyHandler);
}
