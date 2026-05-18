// ****** scriptDependencyGuard.js ******
// Generic startup dependency validation helpers for script-order/global dependency checks.

function getMissingGlobals(requiredGlobals = [], scope = globalThis) {
    return requiredGlobals.filter((name) => typeof scope[name] === 'undefined');
}

function validateRequiredGlobals(requiredGlobals = [], scope = globalThis, contextName = 'setup') {
    const missingGlobals = getMissingGlobals(requiredGlobals, scope);
    if (missingGlobals.length > 0) {
        throw new Error(
            `FATAL ERROR: Missing global dependencies required for ${contextName}: ${missingGlobals.join(', ')}. ` +
            'Check script inclusion order in index.htm.'
        );
    }
    return true;
}

function runInitializationPhases(phases = [], scope = globalThis) {
    phases.forEach((phase, index) => {
        const phaseName = phase?.name || `phase[${index}]`;

        if (!phase || typeof phase.run !== 'function') {
            throw new Error(
                `FATAL ERROR: Invalid initialization phase definition for ${phaseName}: ` +
                'missing run() function.'
            );
        }

        validateRequiredGlobals(phase.requiredGlobals || [], scope, phaseName);
        phase.run();
    });
}

const ScriptDependencyGuard = {
    getMissingGlobals,
    validateRequiredGlobals,
    runInitializationPhases
};

if (typeof globalThis !== 'undefined') {
    globalThis.ScriptDependencyGuard = ScriptDependencyGuard;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScriptDependencyGuard };
}
