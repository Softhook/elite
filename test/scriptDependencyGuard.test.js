const { ScriptDependencyGuard } = require('../scriptDependencyGuard');

describe('ScriptDependencyGuard', () => {
    test('returns missing globals from provided scope', () => {
        const scope = { SoundManager: () => { }, Galaxy: 1 };
        const missing = ScriptDependencyGuard.getMissingGlobals(['SoundManager', 'Galaxy', 'MissingGlobal'], scope);
        expect(missing).toEqual(['MissingGlobal']);
    });

    test('throws a clear error when required globals are missing', () => {
        expect(() => {
            ScriptDependencyGuard.validateRequiredGlobals(['Exists', 'MissingThing'], { Exists: true }, 'initializeManagers');
        }).toThrow(/Missing global dependencies required for initializeManagers: MissingThing/);
    });

    test('passes when all required globals exist', () => {
        expect(
            ScriptDependencyGuard.validateRequiredGlobals(['A', 'B'], { A: 1, B: 2 })
        ).toBe(true);
    });

    test('treats undefined as missing but accepts null as defined', () => {
        const missing = ScriptDependencyGuard.getMissingGlobals(['DefinedNull', 'UndefinedValue'], {
            DefinedNull: null,
            UndefinedValue: undefined
        });
        expect(missing).toEqual(['UndefinedValue']);
    });

    test('can resolve lexical-style dependencies via provided resolver', () => {
        const resolver = (name) => name === 'LexicalThing';
        const missing = ScriptDependencyGuard.getMissingGlobals(
            ['LexicalThing', 'MissingThing'],
            {},
            resolver
        );

        expect(missing).toEqual(['MissingThing']);
    });

    test('runs initialization phases in order when dependencies are present', () => {
        const calls = [];
        ScriptDependencyGuard.runInitializationPhases(
            [
                { name: 'first', requiredGlobals: ['A'], run: () => calls.push('first') },
                { name: 'second', requiredGlobals: ['B'], run: () => calls.push('second') }
            ],
            { A: true, B: true }
        );
        expect(calls).toEqual(['first', 'second']);
    });

    test('fails with phase-specific message when phase dependencies are missing', () => {
        expect(() => {
            ScriptDependencyGuard.runInitializationPhases(
                [{ name: 'initializeCanvas', requiredGlobals: ['createCanvas'], run: () => { } }],
                {}
            );
        }).toThrow(/Missing global dependencies required for initializeCanvas: createCanvas/);
    });

    test('fails with explicit phase context for malformed phase definitions', () => {
        expect(() => {
            ScriptDependencyGuard.runInitializationPhases([{ name: 'badPhase' }], {});
        }).toThrow(/Invalid initialization phase definition for badPhase: missing run\(\) function/);
    });
});
