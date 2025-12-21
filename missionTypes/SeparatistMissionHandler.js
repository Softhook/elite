// ****** missionTypes/SeparatistMissionHandler.js ******
// Handler for Separatist exclusive missions.
// Requires SEPARATIST faction membership.

/**
 * Separatist Forces exclusive missions.
 * 
 * Example mission types that could be added:
 * - Raid Imperial Convoys: Attack supply lines
 * - Rescue Prisoners: Extract captured operatives
 * - Supply Rebel Bases: Bring equipment to hidden outposts
 * - Sabotage Imperial Infrastructure: Targeted destruction
 */
class SeparatistMissionHandler extends FactionMissionHandler {
    static types = ['SEPARATIST_RAID', 'SEPARATIST_SUPPLY', 'SEPARATIST_RESCUE'];
    static requiredFaction = 'SEPARATIST';
    static minFactionRank = 0;

    /**
     * Create a Separatist mission.
     * @param {Object} context - Generation context
     * @returns {Mission|null}
     */
    static create(context) {
        const { originSystem, originStation, galaxy, player, subtype } = context;

        const missionSubtype = subtype || random(['SEPARATIST_RAID', 'SEPARATIST_SUPPLY']);

        switch (missionSubtype) {
            case 'SEPARATIST_SUPPLY':
                return this._createSupplyMission(originSystem, originStation, galaxy, player);
            case 'SEPARATIST_RAID':
            default:
                return this._createRaidMission(originSystem, originStation, galaxy, player);
        }
    }

    /**
     * Create a raid mission targeting Imperial forces.
     * @private
     */
    static _createRaidMission(originSystem, originStation, galaxy, player) {
        const targetCount = floor(random(1, 4));
        const baseReward = 1200 + (originSystem.techLevel || 5) * 80;
        let reward = Math.floor(baseReward + random(400, 1200));

        // Apply rank bonus
        const multiplier = this.getRankRewardMultiplier(player);
        reward = Math.floor(reward * multiplier);

        return new Mission({
            type: 'SEPARATIST_RAID',
            title: `Freedom Strike: Destroy ${targetCount} Imperial Ships`,
            description: `The cause requires action. Eliminate ${targetCount} Imperial vessels to weaken their grip on the sector. For freedom!`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Imperial vessels`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false, // Legal within Separatist space
            progressCount: 0,
            requiredFaction: 'SEPARATIST'
        });
    }

    /**
     * Create a supply mission to rebel outposts.
     * @private
     */
    static _createSupplyMission(originSystem, originStation, galaxy, player) {
        const destinationInfo = MissionGenerator.findNearbyDestination(originSystem, galaxy, true, 4);
        if (!destinationInfo) return null;

        const cargoTypes = ['Weapons', 'Medicine', 'Machinery'];
        const cargo = random(cargoTypes);
        const quantity = floor(random(5, 15));

        const baseReward = 600 + quantity * 50;
        let reward = Math.floor(baseReward + random(200, 500));

        // Apply rank bonus
        const multiplier = this.getRankRewardMultiplier(player);
        reward = Math.floor(reward * multiplier);

        return new Mission({
            type: 'SEPARATIST_SUPPLY',
            title: `Supply Run: ${quantity}t ${cargo} to Rebel Cell`,
            description: `Our operatives need supplies. Deliver ${quantity}t of ${cargo} to resistance contacts at ${destinationInfo.station.name}. Discretion advised.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: destinationInfo.system.name,
            destinationStation: destinationInfo.station.name,
            cargoType: cargo,
            cargoQuantity: quantity,
            rewardCredits: reward,
            isIllegal: true, // Supplying rebels is illegal in Imperial space
            requiredFaction: 'SEPARATIST'
        });
    }

    static getObjective(mission) {
        if (mission.cargoType) {
            return `Rebel Objective: Deliver ${mission.cargoQuantity}t ${mission.cargoType}`;
        }
        if (mission.targetDesc) {
            return `Rebel Objective: ${mission.targetDesc}`;
        }
        return '';
    }

    static getDisplayColor() {
        return [100, 200, 100]; // Separatist green
    }

    static getIcon() {
        return '⚔️';
    }
}

// Register with the registry
if (typeof MissionTypeRegistry !== 'undefined') {
    MissionTypeRegistry.register(SeparatistMissionHandler);
}
