// ****** missionTypes/FactionMissionHandler.js ******
// Base class for faction-exclusive missions.
// Extend this class to create Imperial, Separatist, Military, or Police missions.

/**
 * Base class for faction-exclusive mission handlers.
 * Provides faction membership checking and rank-based reward scaling.
 */
class FactionMissionHandler extends MissionTypeHandler {
    /**
     * Required faction to access these missions.
     * Override in subclass: 'IMPERIAL', 'SEPARATIST', 'MILITARY', 'POLICE'
     * @type {string}
     */
    static requiredFaction = null; // Must be set by subclass

    /**
     * Minimum faction rank required (0 = any member, 1+ = specific rank).
     * @type {number}
     */
    static minFactionRank = 0;

    /**
     * Reward multiplier based on faction rank.
     * Higher ranks get better rewards.
     * @param {Object} player - Player object
     * @returns {number} Multiplier (1.0 = base, 1.5 = 50% bonus, etc.)
     */
    static getRankRewardMultiplier(player) {
        if (!player || !this.requiredFaction) return 1.0;

        const rank = player.getFactionRank?.(this.requiredFaction) || 0;
        // 10% bonus per rank
        return 1.0 + (rank * 0.1);
    }

    /**
     * Check if player can accept this mission.
     * Verifies faction membership and rank.
     * @param {Object} context - Generation context
     * @returns {boolean}
     */
    static canGenerate(context) {
        const player = context.player;
        if (!player) return false;
        if (!this.requiredFaction) return true;

        // Check faction membership
        const playerFaction = player.isPolice ? 'POLICE' : player.playerFaction;
        if (playerFaction !== this.requiredFaction) return false;

        // Check rank requirement
        if (this.minFactionRank > 0) {
            const rank = player.getFactionRank?.(this.requiredFaction) || 0;
            if (rank < this.minFactionRank) return false;
        }

        return true;
    }

    /**
     * Apply rank-based reward bonus to a mission.
     * @param {Mission} mission - Mission to modify
     * @param {Object} player - Player object
     */
    static applyRankBonus(mission, player) {
        const multiplier = this.getRankRewardMultiplier(player);
        mission.rewardCredits = Math.floor(mission.rewardCredits * multiplier);
    }

    /**
     * Get faction-specific display color.
     * Override in subclass for themed colors.
     */
    static getDisplayColor() {
        switch (this.requiredFaction) {
            case 'IMPERIAL': return (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.IMPERIAL : [160, 80, 220];
            case 'SEPARATIST': return (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.SEPARATIST : [140, 150, 60];
            case 'MILITARY': return (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.MILITARY : [150, 150, 155];
            case 'POLICE': return (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.POLICE : [60, 140, 255];
            default: return [200, 200, 200];
        }
    }

    /**
     * Get faction icon.
     */
    static getIcon() {
        switch (this.requiredFaction) {
            case 'IMPERIAL': return '👑';
            case 'SEPARATIST': return '⚔️';
            case 'MILITARY': return '🎖️';
            case 'POLICE': return '🛡️';
            default: return '🏛️';
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FactionMissionHandler;
}
