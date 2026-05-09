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
});
