// ****** scriptDependencyGuard.js ******
// Validates critical global dependencies so script load-order failures fail fast with clear errors.

const SETUP_REQUIRED_GLOBALS = Object.freeze([
    // p5.js primitives used during setup initialization
    'displayDensity', 'pixelDensity', 'createCanvas', 'angleMode', 'textAlign', 'textSize', 'frameRate',
    'RADIANS', 'CENTER',

    // Logging / constants used during setup
    'UI_LOG', 'STATION_TEXT_SIZE',

    // Constructor/function globals required by setup flow
    'SoundManager', 'AmbientSoundManager', 'StationMusicManager', 'SpaceMusicManager', 'EventManager',
    'WeaponSystem', 'ObjectPool', 'SHIP_DEFINITIONS', 'GameStateManager', 'Galaxy', 'Player', 'UIManager',
    'TitleScreen', 'InventoryScreen', 'MissionOverlay', 'SaveSelectionScreen', 'CommunicationSystem', 'NewsManager'
]);

function getMissingGlobals(requiredGlobals = SETUP_REQUIRED_GLOBALS, scope = globalThis) {
    return requiredGlobals.filter((name) => typeof scope[name] === 'undefined');
}

function validateRequiredGlobals(requiredGlobals = SETUP_REQUIRED_GLOBALS, scope = globalThis) {
    const missingGlobals = getMissingGlobals(requiredGlobals, scope);
    if (missingGlobals.length > 0) {
        throw new Error(
            `FATAL ERROR: Missing global dependencies required for setup: ${missingGlobals.join(', ')}. ` +
            'Check script inclusion order in index.htm.'
        );
    }
    return true;
}

const ScriptDependencyGuard = {
    SETUP_REQUIRED_GLOBALS,
    getMissingGlobals,
    validateRequiredGlobals
};

if (typeof globalThis !== 'undefined') {
    globalThis.ScriptDependencyGuard = ScriptDependencyGuard;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScriptDependencyGuard };
}
