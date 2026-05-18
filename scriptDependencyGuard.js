// ****** scriptDependencyGuard.js ******
// Validates critical global dependencies so script load-order failures fail fast with clear errors.

// Keep this list in sync with setup() dependencies in sketch.js initialize path.
// When setup() starts using a new global constructor/function/constant, add it here,
// then run `npm test -- --runInBand test/scriptDependencyGuard.test.js` to validate guard behavior.
const SETUP_REQUIRED_GLOBALS = Object.freeze([
    // Phase 1: p5.js primitives used by initializeCanvas()
    'displayDensity', 'pixelDensity', 'createCanvas', 'angleMode', 'textAlign', 'textSize', 'frameRate',
    'RADIANS', 'CENTER',

    // Phase 1: logging + text constants referenced while initializing canvas/setup logs
    'UI_LOG', 'STATION_TEXT_SIZE',

    // Phase 2+: constructors/functions used by initializeManagers(), initializeWeaponSystem(),
    // validateShipDefinitions(), and initializeGameObjects()
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
