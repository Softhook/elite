// ****** missionTypes/MissionTypeHandler.js ******
// Base class for mission type handlers using the Strategy Pattern.
// Each handler manages one or more mission types and provides:
// - create(): Generate mission data
// - activate(): Type-specific activation logic
// - update(): Runtime monitoring
// - Display helpers for UI

/**
 * Base class for mission type handlers.
 * Subclasses should override static methods as needed.
 */
class MissionTypeHandler {
    /**
     * Mission types this handler manages.
     * @type {string[]}
     */
    static types = [];

    /**
     * Faction required to see these missions (null = public).
     * @type {string|null}
     */
    static requiredFaction = null;

    /**
     * Minimum faction rank required (0 = any member).
     * @type {number}
     */
    static minFactionRank = 0;

    /**
     * Check if this handler can generate missions in the given context.
     * Override for faction-specific or conditional handlers.
     * @param {Object} context - Generation context
     * @param {Object} context.player - Player object
     * @param {Object} context.system - Current star system
     * @param {Object} context.station - Current station
     * @returns {boolean}
     */
    static canGenerate(context) {
        // Check faction requirement
        if (this.requiredFaction) {
            const player = context.player;
            if (!player) return false;

            // Check faction membership
            const playerFaction = player.isPolice ? 'POLICE' : player.playerFaction;
            if (playerFaction !== this.requiredFaction) return false;

            // Check rank requirement
            if (this.minFactionRank > 0) {
                const rank = player.getFactionRank?.(this.requiredFaction) || 0;
                if (rank < this.minFactionRank) return false;
            }
        }
        return true;
    }

    /**
     * Create a mission of this type.
     * @param {Object} context - Generation context
     * @param {Object} context.originSystem - Origin star system
     * @param {Object} context.originStation - Origin station
     * @param {Object} context.galaxy - Galaxy object
     * @param {Object} context.player - Player object
     * @param {string} [context.subtype] - Specific mission subtype if handler manages multiple
     * @returns {Mission|null} Generated mission or null if cannot create
     */
    static create(context) {
        throw new Error(`${this.name}.create() must be implemented by subclass`);
    }

    /**
     * Type-specific activation logic. Called when mission becomes active.
     * @param {Mission} mission - The mission being activated
     * @param {Object} player - Player object
     * @returns {boolean} True if activation successful
     */
    static activate(mission, player) {
        return true; // Default: no special activation needed
    }

    /**
     * Type-specific update logic. Called each frame for active missions.
     * @param {Mission} mission - The active mission
     * @param {Object} currentSystem - Current star system
     */
    static update(mission, currentSystem) {
        // Default: no special monitoring needed
    }

    /**
     * Get the objective string for display.
     * @param {Mission} mission - The mission
     * @returns {string} Objective description
     */
    static getObjective(mission) {
        return '';
    }

    /**
     * Get supplemental details for the mission details panel.
     * @param {Mission} mission - The mission
     * @returns {string} Additional details
     */
    static getSupplementalDetails(mission) {
        return '';
    }

    /**
     * Generate news for mission completion.
     * @param {Mission} mission - Completed mission
     * @param {Object} player - Player object
     */
    static generateNews(mission, player) {
        // Default: no news generation
    }

    /**
     * Get the display color for this mission type.
     * @returns {number[]} RGB color array
     */
    static getDisplayColor() {
        return [200, 200, 200]; // Default gray
    }

    /**
     * Get icon identifier for this mission type.
     * @returns {string} Icon name
     */
    static getIcon() {
        return '📋'; // Default clipboard
    }
}

// Export for module systems, but also attach to global for browser/Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissionTypeHandler;
    global.MissionTypeHandler = MissionTypeHandler;
}
