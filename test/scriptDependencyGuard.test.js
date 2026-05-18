const { ScriptDependencyGuard } = require('../scriptDependencyGuard');

describe('ScriptDependencyGuard', () => {
    test('returns missing globals from provided scope', () => {
        const scope = { Foo: () => { }, Bar: 1 };
        const missing = ScriptDependencyGuard.getMissingGlobals(['Foo', 'Bar', 'Baz'], scope);
        expect(missing).toEqual(['Baz']);
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
});
