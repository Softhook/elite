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

    test('should launch in Escape Capsule and park original ship when takeoff button is clicked', () => {
        // Setup mock takeoff button area
        const mockTakeoffBtn = { x: 120, y: 10, w: 100, h: 50 };
        menus.baseTakeoffButtonArea = mockTakeoffBtn;

        // Mock ParkedPlayerShip globally
        global.ParkedPlayerShip = class {
            constructor(x, y, state) {
                this.x = x;
                this.y = y;
                this.shipState = state;
                this.type = "ParkedPlayerShip";
            }
        };

        // Augment mock player
        mockPlayer.applyShipDefinition = jest.fn();
        mockPlayer.pos = {
            x: 100,
            y: 100,
            set: jest.fn(function(nx, ny) {
                this.x = nx;
                this.y = ny;
            })
        };
        mockPlayer.weapons = [];
        mockPlayer.cargo = [];

        // Setup global uiManager
        global.uiManager = {
            currentBaseObject: {
                pos: { x: 500, y: 500 }
            }
        };

        // Initialize surfaceObjects mock array and planet
        global.surfaceMode.surfaceObjects = [];
        global.surfaceMode.planet = { playerBuiltSurfaceObjects: [] };
        global.surfaceMode.objectCache = new Map();
        global.surfaceMode._getTerrainHeightAt = jest.fn(() => 50);

        // Click takeoff button (x=150, y=25 is inside mockTakeoffBtn)
        const result = menus.handleBaseClick(150, 25, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);

        expect(result).toBe('BACK');
        expect(mockPlayer.applyShipDefinition).toHaveBeenCalledWith('EscapeCapsule');
        expect(mockPlayer.shield).toBe(0);
        expect(mockPlayer.maxShield).toBe(0);
        expect(mockPlayer.weapons.length).toBe(0);
        expect(global.surfaceMode.controlMode).toBe('SHIP');
        expect(global.surfaceMode.astronaut).toBeNull();
        expect(global.surfaceMode.surfaceObjects.length).toBe(1);
        expect(global.surfaceMode.surfaceObjects[0]).toBeInstanceOf(global.ParkedPlayerShip);
        expect(global.surfaceMode.surfaceObjects[0].x).toBe(100);
        expect(global.surfaceMode.surfaceObjects[0].y).toBe(100);
        expect(global.surfaceMode.objectCache.get('2,2_parkedShip')).toBe(global.surfaceMode.surfaceObjects[0]);
        expect(mockPlayer.pos.set).toHaveBeenCalledWith(650, 650); // 500 + 150 offset
        expect(global.surfaceMode.altitude).toBe(200); // 50 (ground) + 150 height
        expect(global.surfaceMode.parkedShipDescriptor).toBeDefined();
        expect(global.surfaceMode.parkedShipDescriptor.type).toBe('ParkedPlayerShip');
        expect(global.surfaceMode.planet.playerBuiltSurfaceObjects.length).toBe(1);
        expect(global.surfaceMode.planet.playerBuiltSurfaceObjects[0].type).toBe('ParkedPlayerShip');
        expect(global.uiManager.currentBaseObject).toBeNull();
        expect(addMessageMock).toHaveBeenCalledWith('Launched in Escape Capsule! Original ship remains parked on surface.', [100, 255, 100]);
        expect(global.soundManager.playSound).toHaveBeenCalledWith('upgrade');
        expect(saveGameMock).toHaveBeenCalled();

        // Clean up global uiManager and ParkedPlayerShip
        delete global.uiManager;
        delete global.ParkedPlayerShip;
    });

    test('should transfer minerals from base storage to nearest ship (active ship)', () => {
        // Setup mock base storage button
        const mockStorageBtn = { x: 50, y: 50, w: 100, h: 50 };
        menus.baseMiningStorageButtonArea = mockStorageBtn;

        // Setup base mining storage with minerals
        global.uiManager = {
            currentBaseObject: {
                miningStorage: [{ name: 'Minerals', quantity: 10 }]
            }
        };

        // Active ship has space
        mockPlayer.shipTypeName = 'Cobra';
        mockPlayer.pos = { x: 100, y: 100 };
        mockPlayer.cargo = [];
        mockPlayer.addCargo = jest.fn((name, qty, partial) => {
            mockPlayer.cargo.push({ name, quantity: qty });
            return { success: true, added: qty };
        });

        // Click storage button (x=100, y=75 is inside mockStorageBtn)
        const result = menus.handleBaseClick(100, 75, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);

        expect(result).toBe(true);
        expect(mockPlayer.addCargo).toHaveBeenCalledWith('Minerals', 10, true);
        expect(global.uiManager.currentBaseObject.miningStorage.length).toBe(0); // Depleted
        expect(addMessageMock).toHaveBeenCalledWith('Collected 10t of Minerals into Cobra.');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('cargo');
        expect(saveGameMock).toHaveBeenCalled();

        delete global.uiManager;
    });

    test('should transfer minerals to nearest ship (parked ship) when active ship is Escape Capsule', () => {
        // Setup mock base storage button
        const mockStorageBtn = { x: 50, y: 50, w: 100, h: 50 };
        menus.baseMiningStorageButtonArea = mockStorageBtn;

        // Setup base mining storage with minerals
        global.uiManager = {
            currentBaseObject: {
                miningStorage: [{ name: 'Minerals', quantity: 10 }]
            }
        };

        // Active ship is EscapeCapsule (0 capacity, cannot hold cargo)
        mockPlayer.shipTypeName = 'EscapeCapsule';
        mockPlayer.pos = { x: 500, y: 500 };
        mockPlayer.addCargo = jest.fn(() => ({ success: false, added: 0 }));

        // Setup a parked ship nearby
        const mockParkedShip = {
            type: 'ParkedPlayerShip',
            displayName: 'My Parked Cobra',
            pos: { x: 110, y: 100 }, // Close to astronaut
            shipState: {
                shipTypeName: 'Cobra',
                installedUpgrades: { cargo: 0 },
                cargo: [{ name: 'Minerals', quantity: 2 }]
            }
        };
        global.surfaceMode.surfaceObjects = [mockParkedShip];

        // Define global SHIP_DEFINITIONS
        global.SHIP_DEFINITIONS = {
            Cobra: { cargoCapacity: 20 },
            EscapeCapsule: { cargoCapacity: 0 }
        };

        // Astronaut position is at (100, 100)
        global.surfaceMode.astronaut = {
            pos: { x: 100, y: 100 }
        };

        // Click storage button (x=100, y=75 is inside mockStorageBtn)
        const result = menus.handleBaseClick(100, 75, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);

        expect(result).toBe(true);
        expect(mockPlayer.addCargo).not.toHaveBeenCalled();
        expect(mockParkedShip.shipState.cargo[0].quantity).toBe(12); // 2 + 10 = 12
        expect(global.uiManager.currentBaseObject.miningStorage.length).toBe(0); // Depleted
        expect(addMessageMock).toHaveBeenCalledWith('Collected 10t of Minerals into My Parked Cobra.');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('cargo');
        expect(saveGameMock).toHaveBeenCalled();

        delete global.uiManager;
        delete global.SHIP_DEFINITIONS;
    });

    test('should show error if nearest ship does not have enough cargo space', () => {
        const mockStorageBtn = { x: 50, y: 50, w: 100, h: 50 };
        menus.baseMiningStorageButtonArea = mockStorageBtn;

        global.uiManager = {
            currentBaseObject: {
                miningStorage: [{ name: 'Minerals', quantity: 10 }]
            }
        };

        // Active ship has no space
        mockPlayer.shipTypeName = 'Sidewinder';
        mockPlayer.pos = { x: 100, y: 100 };
        mockPlayer.addCargo = jest.fn(() => ({ success: false, added: 0 }));

        const result = menus.handleBaseClick(100, 75, mockPlayer, mockRepairBtn, mockBackBtn, addMessageMock);

        expect(result).toBe(true);
        expect(addMessageMock).toHaveBeenCalledWith('Not enough cargo space in Sidewinder!');
        expect(global.soundManager.playSound).toHaveBeenCalledWith('error');

        delete global.uiManager;
    });
});

describe('UIStationMenus handleWeaponDetailClick', () => {
    let menus;
    let mockPlayer;
    let addMessageMock;

    beforeEach(() => {
        menus = new UIStationMenus();

        // Mock UIComponents.isClickInArea
        global.UIComponents = {
            isClickInArea: jest.fn(() => true) // Default to clicking the buy button
        };

        // Mock soundManager
        global.soundManager = {
            playSound: jest.fn()
        };

        // Mock addMessageFn
        addMessageMock = jest.fn();

        mockPlayer = {
            shipTypeName: 'EscapeCapsule',
            maxWeapons: 0,
            credits: 1000
        };

        menus.weaponDetailButtons = {
            buy: { x: 0, y: 0, w: 100, h: 50 }
        };
    });

    afterEach(() => {
        delete global.UIComponents;
        delete global.soundManager;
    });

    test('should block ship upgrade purchase for Escape Capsule', () => {
        menus.selectedWeaponForDetail = {
            weaponDef: {
                type: 'engine',
                name: 'Engine Upgrade L1',
                price: 100
            }
        };

        const result = menus.handleWeaponDetailClick(50, 25, mockPlayer, addMessageMock);

        expect(result).toBe(true);
        expect(addMessageMock).toHaveBeenCalledWith('The Escape Capsule cannot be upgraded!', [255, 100, 100]);
        expect(global.soundManager.playSound).toHaveBeenCalledWith('error');
    });

    test('should block weapon purchase for Escape Capsule', () => {
        menus.selectedWeaponForDetail = {
            weaponDef: {
                type: 'projectile',
                name: 'Pulse Laser',
                price: 100
            }
        };

        const result = menus.handleWeaponDetailClick(50, 25, mockPlayer, addMessageMock);

        expect(result).toBe(true);
        expect(addMessageMock).toHaveBeenCalledWith('Your ship cannot mount weapons!', [255, 100, 100]);
        expect(global.soundManager.playSound).toHaveBeenCalledWith('error');
    });
});
