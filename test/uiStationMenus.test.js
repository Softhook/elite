const UIStationMenus = require('../uiStationMenus');

describe('UIStationMenus handleBaseClick', () => {
    let menus;
    let mockPlayer;
    let mockAstronaut;
    let mockRepairBtn;
    let mockBackBtn;
    let addMessageMock;
    let saveGameMock;

    beforeEach(() => {
        menus = new UIStationMenus();

        // Mock UIComponents.isClickInArea
        global.UIComponents = {
            isClickInArea: jest.fn((mx, my, area) => {
                if (!area) return false;
                return mx >= area.x && mx <= area.x + area.w && my >= area.y && my <= area.y + area.h;
            })
        };

        // Mock soundManager
        global.soundManager = {
            playSound: jest.fn()
        };

        // Mock saveGame
        saveGameMock = jest.fn();
        global.saveGame = saveGameMock;

        // Mock addMessageFn
        addMessageMock = jest.fn();

        // Set up mock button areas
        mockRepairBtn = { x: 10, y: 10, w: 100, h: 50 };
        mockBackBtn = { x: 200, y: 10, w: 100, h: 50 };

        // Set up mock player ship
        mockPlayer = {
            hull: 100,
            maxHull: 100
        };

        // Set up mock astronaut
        mockAstronaut = {
            health: 50,
            maxHealth: 50,
            heal: jest.fn(function(amount) {
                this.health = Math.min(this.maxHealth, this.health + amount);
            })
        };

        // Set up global surfaceMode
        global.surfaceMode = {
            astronaut: mockAstronaut
        };
    });

    afterEach(() => {
        delete global.UIComponents;
        delete global.soundManager;
        delete global.saveGame;
        delete global.surfaceMode;
    });

    test('should do nothing and return false if click is outside any button area', () => {
        const result = menus.handleBaseClick(0, 0, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);
        expect(result).toBe(false);
        expect(addMessageMock).not.toHaveBeenCalled();
        expect(global.soundManager.playSound).not.toHaveBeenCalled();
        expect(saveGameMock).not.toHaveBeenCalled();
    });

    test('should return BACK when back button is clicked', () => {
        const result = menus.handleBaseClick(250, 25, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);
        expect(result).toBe('BACK');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('click_off');
    });

    test('should show error and play error sound if both ship and astronaut are fully restored', () => {
        mockPlayer.hull = 100;
        mockAstronaut.health = 50;

        const result = menus.handleBaseClick(50, 25, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);
        
        expect(result).toBe(true);
        expect(addMessageMock).toHaveBeenCalledWith('Your ship and astronaut are already fully restored!');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('error');
        expect(mockAstronaut.heal).not.toHaveBeenCalled();
        expect(saveGameMock).not.toHaveBeenCalled();
    });

    test('should show ship-only error if ship is full and astronaut is missing/not present', () => {
        mockPlayer.hull = 100;
        global.surfaceMode = null; // No astronaut

        const result = menus.handleBaseClick(50, 25, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);
        
        expect(result).toBe(true);
        expect(addMessageMock).toHaveBeenCalledWith('Your ship is already fully repaired!');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('error');
        expect(saveGameMock).not.toHaveBeenCalled();
    });

    test('should repair ship only when ship is damaged but astronaut is healthy', () => {
        mockPlayer.hull = 60;
        mockAstronaut.health = 50;

        const result = menus.handleBaseClick(50, 25, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);
        
        expect(result).toBe(true);
        expect(mockPlayer.hull).toBe(100);
        expect(mockAstronaut.heal).not.toHaveBeenCalled();
        expect(addMessageMock).toHaveBeenCalledWith('Ship fully repaired at your base (no charge).');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('upgrade');
        expect(saveGameMock).toHaveBeenCalled();
    });

    test('should heal astronaut only when astronaut is damaged but ship is healthy', () => {
        mockPlayer.hull = 100;
        mockAstronaut.health = 30;

        const result = menus.handleBaseClick(50, 25, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);
        
        expect(result).toBe(true);
        expect(mockPlayer.hull).toBe(100);
        expect(mockAstronaut.heal).toHaveBeenCalledWith(50);
        expect(addMessageMock).toHaveBeenCalledWith('Astronaut fully healed at your base (no charge).');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('upgrade');
        expect(saveGameMock).toHaveBeenCalled();
    });

    test('should repair ship and heal astronaut when both are damaged', () => {
        mockPlayer.hull = 80;
        mockAstronaut.health = 20;

        const result = menus.handleBaseClick(50, 25, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);
        
        expect(result).toBe(true);
        expect(mockPlayer.hull).toBe(100);
        expect(mockAstronaut.heal).toHaveBeenCalledWith(50);
        expect(addMessageMock).toHaveBeenCalledWith('Ship fully repaired and astronaut fully healed at your base (no charge).');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('upgrade');
        expect(saveGameMock).toHaveBeenCalled();
    });
});
