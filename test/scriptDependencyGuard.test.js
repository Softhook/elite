const { ScriptDependencyGuard } = require('../scriptDependencyGuard');

describe('ScriptDependencyGuard', () => {
    test('returns missing globals from provided scope', () => {
        const scope = { SoundManager: () => { }, Galaxy: 1 };
        const missing = ScriptDependencyGuard.getMissingGlobals(['SoundManager', 'Galaxy', 'MissingGlobal'], scope);
        expect(missing).toEqual(['MissingGlobal']);
    });

    test('throws a clear error when required globals are missing', () => {
        expect(() => {
            ScriptDependencyGuard.validateRequiredGlobals(['Exists', 'MissingThing'], { Exists: true });
        }).toThrow(/Missing global dependencies required for setup: MissingThing/);
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
});
