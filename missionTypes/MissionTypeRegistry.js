// ****** missionTypes/MissionTypeRegistry.js ******
// Central registry mapping mission types to their handlers.
// Supports faction-aware filtering and easy handler registration.

/**
 * Registry for mission type handlers.
 * Maps mission types to handler classes and provides lookup/filtering.
 */
const MissionTypeRegistry = {
    /**
     * Map of mission type string -> handler class
     * @type {Map<string, typeof MissionTypeHandler>}
     */
    _handlers: new Map(),

    /**
     * All registered handler classes (for iteration)
     * @type {Set<typeof MissionTypeHandler>}
     */
    _handlerClasses: new Set(),

    /**
     * Register a handler class for its declared types.
     * @param {typeof MissionTypeHandler} handlerClass
     */
    register(handlerClass) {
        if (!handlerClass.types || !Array.isArray(handlerClass.types)) {
            console.warn(`MissionTypeRegistry: Handler ${handlerClass.name} has no types array`);
            return;
        }

        this._handlerClasses.add(handlerClass);

        for (const type of handlerClass.types) {
            if (this._handlers.has(type)) {
                console.warn(`MissionTypeRegistry: Overwriting handler for type "${type}"`);
            }
            this._handlers.set(type, handlerClass);
        }

        console.log(`MissionTypeRegistry: Registered ${handlerClass.name} for types: ${handlerClass.types.join(', ')}`);
    },

    /**
     * Get the handler for a specific mission type.
     * @param {string} type - Mission type string
     * @returns {typeof MissionTypeHandler|null}
     */
    getHandler(type) {
        return this._handlers.get(type) || null;
    },

    /**
     * Get all registered mission types.
     * @returns {string[]}
     */
    getAllTypes() {
        return Array.from(this._handlers.keys());
    },

    /**
     * Get all handler classes.
     * @returns {Array<typeof MissionTypeHandler>}
     */
    getAllHandlers() {
        return Array.from(this._handlerClasses);
    },

    /**
     * Get handlers that can generate missions in the given context.
     * Filters based on faction membership and rank requirements.
     * @param {Object} context - Generation context with player, system, station
     * @returns {Array<typeof MissionTypeHandler>}
     */
    getEligibleHandlers(context) {
        const eligible = [];
        for (const handler of this._handlerClasses) {
            if (handler.canGenerate(context)) {
                eligible.push(handler);
            }
        }
        return eligible;
    },

    /**
     * Get handlers for a specific faction (includes public handlers).
     * @param {string|null} faction - Faction key or null for public only
     * @returns {Array<typeof MissionTypeHandler>}
     */
    getHandlersForFaction(faction) {
        const handlers = [];
        for (const handler of this._handlerClasses) {
            // Include if: no faction requirement OR matches the faction
            if (!handler.requiredFaction || handler.requiredFaction === faction) {
                handlers.push(handler);
            }
        }
        return handlers;
    },

    /**
     * Clear all registered handlers (useful for testing).
     */
    clear() {
        this._handlers.clear();
        this._handlerClasses.clear();
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissionTypeRegistry;
}
