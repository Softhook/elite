// ****** scriptDependencyGuard.js ******
// Generic startup dependency validation helpers for script-order/global dependency checks.

function isDependencyDefined(name, scope, lexicalIdentifierChecker) {
    if (typeof scope[name] !== 'undefined') {
        return true;
    }

    if (typeof lexicalIdentifierChecker === 'function') {
        try {
            return Boolean(lexicalIdentifierChecker(name));
        } catch (_) {
            // A checker may throw for malformed/unresolvable names; treat as missing.
            return false;
        }
    }

    return false;
}

function getMissingGlobals(requiredGlobals = [], scope = globalThis, lexicalIdentifierChecker) {
    return requiredGlobals.filter((name) => !isDependencyDefined(name, scope, lexicalIdentifierChecker));
}

function validateRequiredGlobals(requiredGlobals = [], scope = globalThis, contextName = 'setup', lexicalIdentifierChecker) {
    const missingGlobals = getMissingGlobals(requiredGlobals, scope, lexicalIdentifierChecker);
    if (missingGlobals.length > 0) {
        throw new Error(
            `FATAL ERROR: Missing global dependencies required for ${contextName}: ${missingGlobals.join(', ')}. ` +
            'Check script inclusion order in index.htm.'
        );
    }
    return true;
}

function runInitializationPhases(phases = [], scope = globalThis, lexicalIdentifierChecker) {
    phases.forEach((phase, index) => {
        const phaseName = phase?.name || `phase[${index}]`;

        if (!phase || typeof phase.run !== 'function') {
            throw new Error(
                `FATAL ERROR: Invalid initialization phase definition for ${phaseName}: ` +
                'missing run() function.'
            );
        }

        validateRequiredGlobals(phase.requiredGlobals || [], scope, phaseName, lexicalIdentifierChecker);
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
