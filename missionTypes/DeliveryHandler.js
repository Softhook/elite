// ****** missionTypes/DeliveryHandler.js ******
// Handler for delivery missions (legal and illegal).

/**
 * Handler for DELIVERY_LEGAL and DELIVERY_ILLEGAL mission types.
 */
class DeliveryHandler extends MissionTypeHandler {
    static types = [MISSION_TYPE.DELIVERY_LEGAL, MISSION_TYPE.DELIVERY_ILLEGAL];
    static requiredFaction = null; // Public missions

    /**
     * Create a delivery mission.
     * @param {Object} context - Generation context
     * @returns {Mission|null}
     */
    static create(context) {
        const { originSystem, originStation, galaxy, player, subtype } = context;

        if (subtype === MISSION_TYPE.DELIVERY_ILLEGAL) {
            return this._createIllegal(originSystem, originStation, galaxy, player);
        }
        return this._createLegal(originSystem, originStation, galaxy, player);
    }

    /**
     * Create a legal delivery mission.
     * @private
     */
    static _createLegal(originSystem, originStation, galaxy, player) {
        const destinationInfo = MissionGenerator.findNearbyDestination(originSystem, galaxy, true, 4);
        if (!destinationInfo) return null;

        // Select cargo based on economy
        const originEconomy = originSystem.economyType || 'Default';
        const destinationEconomy = destinationInfo.system.economyType || 'Default';

        const exports = ECONOMY_EXPORTS[originEconomy] || ECONOMY_EXPORTS['Default'];
        const imports = ECONOMY_IMPORTS[destinationEconomy] || ECONOMY_IMPORTS['Default'];

        const legalExports = exports.filter(item => LEGAL_CARGO.includes(item));
        const legalImports = imports.filter(item => LEGAL_CARGO.includes(item));

        // Cargo selection priority
        let possibleCargo = legalImports.filter(item => legalExports.includes(item));
        if (possibleCargo.length === 0) possibleCargo = legalImports;
        if (possibleCargo.length === 0) possibleCargo = legalExports;
        if (possibleCargo.length === 0) possibleCargo = LEGAL_CARGO;

        const cargo = random(possibleCargo);
        if (!cargo) return null;

        const quantity = floor(random(5, 16));

        // Calculate jump distance and reward
        const jumpDistance = this._getJumpDistance(originSystem, destinationInfo.system, galaxy);
        if (!isFinite(jumpDistance) || jumpDistance <= 0) return null;

        const market = originStation?.market;
        const cargoData = market?.commodities?.find(c => c.name === cargo);
        const baseCargoValue = cargoData?.baseSell || 50;

        const reward = Math.floor(
            100 +
            Math.floor(jumpDistance * 250) +
            Math.floor(quantity * baseCargoValue * 0.15) +
            floor(random(50, 250))
        );

        const jumpText = jumpDistance === 1 ? "1 jump" : `${jumpDistance} jumps`;

        return new Mission({
            type: MISSION_TYPE.DELIVERY_LEGAL,
            title: `Deliver ${quantity}t ${cargo} to ${destinationInfo.station.name} (${jumpText})`,
            description: `Transport ${quantity}t of ${cargo} to ${destinationInfo.station.name} station in ${destinationInfo.system.name} (${jumpText} away). Standard contract. Payment upon delivery.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: destinationInfo.system.name,
            destinationStation: destinationInfo.station.name,
            cargoType: cargo,
            cargoQuantity: quantity,
            rewardCredits: reward,
            isIllegal: false
        });
    }

    /**
     * Create an illegal smuggling mission.
     * @private
     */
    static _createIllegal(originSystem, originStation, galaxy, player) {
        const destinationInfo = MissionGenerator.findNearbyDestination(originSystem, galaxy, true, 3);
        if (!destinationInfo) return null;

        // Less likely to smuggle to high security
        if (destinationInfo.system.securityLevel === 'High' && random() < 0.85) return null;

        const cargo = random(ILLEGAL_CARGO);
        const quantity = floor(random(3, 10));

        const jumpDistance = this._getJumpDistance(originSystem, destinationInfo.system, galaxy);
        if (!isFinite(jumpDistance) || jumpDistance <= 0) return null;

        const market = originStation?.market;
        const cargoData = market?.commodities?.find(c => c.name === cargo);
        const baseCargoValue = cargoData?.baseSell || 100;

        const reward = Math.floor(
            300 +
            Math.floor(jumpDistance * 400) +
            Math.floor(quantity * baseCargoValue * 0.25) +
            floor(random(100, 500))
        );

        const jumpText = jumpDistance === 1 ? "1 jump" : `${jumpDistance} jumps`;

        return new Mission({
            type: MISSION_TYPE.DELIVERY_ILLEGAL,
            title: `Smuggle ${quantity}t ${cargo} to ${destinationInfo.station.name} (${jumpText})`,
            description: `Discreet transport of ${quantity}t of restricted goods (${cargo}) to ${destinationInfo.station.name} in ${destinationInfo.system.name} (${jumpText} away). Avoid scans. High payment on delivery.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: destinationInfo.system.name,
            destinationStation: destinationInfo.station.name,
            cargoType: cargo,
            cargoQuantity: quantity,
            rewardCredits: reward,
            isIllegal: true
        });
    }

    /**
     * Helper to get jump distance.
     * @private
     */
    static _getJumpDistance(originSystem, destSystem, galaxy) {
        const originIndex = originSystem?.systemIndex;
        const destIndex = destSystem?.systemIndex;
        if (typeof originIndex !== 'number' || typeof destIndex !== 'number') return Infinity;

        try {
            return galaxy.getJumpDistance(originIndex, destIndex);
        } catch (e) {
            console.error("Error getting jump distance:", e);
            return Infinity;
        }
    }

    /**
     * Activate delivery mission - load cargo onto player ship.
     */
    static activate(mission, player) {
        if (!mission.cargoType || mission.cargoQuantity <= 0) return true;
        if (!player) return true;

        const usedSpace = player.cargo.reduce((sum, item) => sum + item.quantity, 0);
        const availableSpace = player.cargoCapacity - usedSpace;

        if (availableSpace < mission.cargoQuantity) {
            console.warn(`Not enough cargo space! Need ${mission.cargoQuantity}t, have ${availableSpace}t`);
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(`Insufficient cargo space! Need ${mission.cargoQuantity}t, have ${availableSpace}t available`, [255, 100, 100]);
            }
            return false;
        }

        // Add cargo to player
        const existingItem = player.cargo.find(item => item.name === mission.cargoType);
        if (existingItem) {
            existingItem.quantity += mission.cargoQuantity;
        } else {
            player.cargo.push({ name: mission.cargoType, quantity: mission.cargoQuantity });
        }

        MISSION_LOG(`Added ${mission.cargoQuantity}t ${mission.cargoType} to player cargo`);
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage(`Loaded ${mission.cargoQuantity}t ${mission.cargoType} into cargo hold`);
        }
        return true;
    }

    /**
     * Get objective string for delivery missions.
     */
    static getObjective(mission) {
        if (mission.cargoType) {
            return `Objective: Deliver ${mission.cargoQuantity}t ${mission.cargoType}`;
        }
        return '';
    }

    /**
     * Get display color for delivery missions.
     */
    static getDisplayColor() {
        return [100, 200, 100]; // Green for trade
    }

    static getIcon() {
        return '📦';
    }
}

// Register with the registry
if (typeof MissionTypeRegistry !== 'undefined') {
    MissionTypeRegistry.register(DeliveryHandler);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeliveryHandler;
    global.DeliveryHandler = DeliveryHandler;
}
