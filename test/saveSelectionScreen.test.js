const SaveSelectionScreen = require('../saveSelectionScreen');

describe('SaveSelectionScreen gamepad-style action selection', () => {
    beforeEach(() => {
        global.soundManager = { playSound: jest.fn() };
        global.gameStateManager = { setState: jest.fn() };
        global.UP_ARROW = 38;
        global.DOWN_ARROW = 40;
        global.LEFT_ARROW = 37;
        global.RIGHT_ARROW = 39;
        global.ENTER = 13;
        global.ESCAPE = 27;
    });

    afterEach(() => {
        delete global.gameStateManager;
    });

    test('left/right key handling switches action column and vertical nav resets to load/continue', () => {
        const screen = Object.create(SaveSelectionScreen.prototype);
        screen.selectedOption = 0;
        screen.totalOptions = 3;
        screen.selectedActionColumn = 0;
        screen.addHoverEffect = jest.fn();
        screen.confirmSelection = jest.fn();

        screen.handleKeyPressed(null, RIGHT_ARROW);
        expect(screen.selectedActionColumn).toBe(1);

        screen.handleKeyPressed(null, LEFT_ARROW);
        expect(screen.selectedActionColumn).toBe(0);

        screen.selectedActionColumn = 1;
        screen.handleKeyPressed(null, DOWN_ARROW);
        expect(screen.selectedOption).toBe(1);
        expect(screen.selectedActionColumn).toBe(0);
    });

    test('confirmSelection starts a new game when Start New action is selected', () => {
        const screen = Object.create(SaveSelectionScreen.prototype);
        screen.selectedOption = 1;
        screen.selectedActionColumn = 1;
        screen.savedGamePreviews = [null, { slot: 'existing-save' }, null];
        screen.startNewGame = jest.fn();
        screen.loadSavedGame = jest.fn();

        screen.confirmSelection();

        expect(screen.startNewGame).toHaveBeenCalledWith(1);
        expect(screen.loadSavedGame).not.toHaveBeenCalled();
    });

    test('escape resets action column before returning to title', () => {
        const screen = Object.create(SaveSelectionScreen.prototype);
        screen.selectedActionColumn = 1;
        screen.resetActionSelection = SaveSelectionScreen.prototype.resetActionSelection;

        screen.handleKeyPressed(null, ESCAPE);

        expect(screen.selectedActionColumn).toBe(0);
        expect(global.gameStateManager.setState).toHaveBeenCalledWith('TITLE_SCREEN');
    });

    test('constructor restores the last active save slot when stored data is valid', () => {
        const originalInitBackgroundStars = SaveSelectionScreen.prototype.initBackgroundStars;
        const originalLoadAllSavePreviews = SaveSelectionScreen.prototype.loadAllSavePreviews;

        global.localStorage = {
            getItem: jest.fn((key) => key === 'eliteP5_lastActiveSlot' ? '2' : null),
            removeItem: jest.fn()
        };

        SaveSelectionScreen.prototype.initBackgroundStars = jest.fn();
        SaveSelectionScreen.prototype.loadAllSavePreviews = jest.fn();

        const screen = new SaveSelectionScreen();

        expect(screen.selectedOption).toBe(2);
        expect(global.localStorage.removeItem).not.toHaveBeenCalled();

        SaveSelectionScreen.prototype.initBackgroundStars = originalInitBackgroundStars;
        SaveSelectionScreen.prototype.loadAllSavePreviews = originalLoadAllSavePreviews;
    });

    test('loadAllSavePreviews recovers from backup save data when primary data is invalid', () => {
        global.Storage = function Storage() { };
        global.localStorage = {
            getItem: jest.fn((key) => {
                if (key === 'eliteP5_save_0') return '{"broken":true}';
                if (key === 'eliteP5_save_0_bak') {
                    return JSON.stringify({
                        playerData: { credits: 1234 },
                        galaxyData: { systems: [] },
                        currentSystemIndex: 1,
                        savedAt: 9999
                    });
                }
                return null;
            })
        };

        const screen = Object.create(SaveSelectionScreen.prototype);
        screen.savedGamePreviews = new Array(3).fill(null);

        screen.loadAllSavePreviews();

        expect(screen.savedGamePreviews[0]).toMatchObject({
            currentSystemIndex: 1,
            savedAt: 9999,
            __recovered: true
        });
        expect(screen.savedGamePreviews[1]).toBeNull();
        expect(screen.savedGamePreviews[2]).toBeNull();
    });
});
