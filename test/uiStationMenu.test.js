// Mocks for UI dependencies
global.UIHUD = class { trackCombatSound() { } cleanupBattleIndicators() { } drawBattleIndicators() { } drawHUD() { } drawWeaponSelector() { } drawTargetOverlay() { } drawGameOverScreen() { } drawFramerate() { } };
global.UIMinimap = class { draw() { } };
global.UIMarket = class { drawSpaceObjectMarket() { } drawStationMarket() { } handleSpaceObjectTrade() { } };
global.UIStationMenus = class { drawRepairsMenu() { } drawSpaceObjectRepairsMenu() { } handleShipyardClick() { } handleUpgradesClick() { } handleShipDetailClick() { } handleWeaponDetailClick() { } };
global.UIMissions = class { drawMissionBoard() { } };
global.UIGalaxyMap = class { drawGalaxyMap() { } handleGalaxyMapClicks() { } };
global.UIFactionRecruitment = class { drawPoliceRecruitmentMenu() { } };

// Mock UIComponents
global.UIComponents = {
    drawPanelBG: jest.fn(),
    drawDockedObjectBackground: jest.fn(),
    drawMenuButtonList: jest.fn((options) => {
        // Return dummy button areas based on input options
        return options.map((opt, i) => ({
            state: opt.state,
            action: opt.action,
            text: opt.text,
            x: 0, y: i * 50, w: 100, h: 40
        }));
    }),
    drawStationHeader: jest.fn().mockReturnValue(50),
    setTextStyle: jest.fn(),
    drawCenteredBackButton: jest.fn()
};

// Mock p5 globals
global.push = jest.fn();
global.pop = jest.fn();
global.textFont = jest.fn();
global.text = jest.fn();
global.width = 1000;
global.height = 800;
global.color = jest.fn(() => 'color');
global.fill = jest.fn();
global.stroke = jest.fn();
global.rect = jest.fn();
global.image = jest.fn();
global.frameRate = jest.fn(() => 60);
global.font = 'Arial';

// Mock UI Manager config
global.UI_MANAGER_CONFIG = {
    MINIMAP_DEFAULT_SIZE: 200,
    MINIMAP_EXPANDED_SIZE: 360,
    MINIMAP_MARGIN: 15,
    MINIMAP_WORLD_VIEW_RANGES: [5000, 10000],
    FPS_MAX_SAMPLES: 30,
    FPS_UPDATE_INTERVAL: 10,
    MESSAGE_DISPLAY_TIME: 4000,
    MAX_MESSAGES_TO_SHOW: 4,
    COMMUNICATION_DISPLAY_TIME: 15000,
    MAX_COMMUNICATION_MESSAGES: 5,
    COMMUNICATION_QUEUE_LIMIT: 12,
    BUTTON_REPEAT_DELAY: 150
};
global.STANDARD_PANEL_BG = 'bg';

// Require UIManager
const UIManager = require('../uiManager');

describe('UI Station Menus', () => {
    let ui;
    let mockStation;
    let mockPlayer;
    let mockSystem;

    beforeEach(() => {
        // Setup Globals
        mockSystem = {
            name: 'Test System',
            economyType: 'Industrial',
            techLevel: 5,
            securityLevel: 'Safe',
            station: null
        };

        global.galaxy = {
            getCurrentSystem: () => mockSystem
        };

        global.gameStateManager = {
            currentState: 'DOCKED',
            currentDockedSpaceObject: null,
            _returnFromRecordState: null
        };

        // Instantiate UIManager
        ui = new UIManager();

        // Mock drawStationHeader helper used in drawStationMainMenu
        ui.drawStationHeader = jest.fn().mockReturnValue(50);

        mockStation = {
            name: 'Test Station',
            type: 'starport',
            isSecret: false
        };
        mockSystem.station = mockStation;

        mockPlayer = {
            credits: 1000,
            cargoCapacity: 50,
            getCargoAmount: () => 10,
            getFactionRank: () => 0
        };
    });

    it('should show Market and Protection for normal stations', () => {
        mockStation.isSecret = false;

        ui.drawStationMainMenu(mockStation, mockPlayer);

        const buttons = ui.stationMenuButtonAreas;
        expect(buttons).toBeDefined();
        expect(buttons.length).toBeGreaterThan(0);

        const marketBtn = buttons.find(b => b.state === 'VIEWING_MARKET');
        const protectBtn = buttons.find(b => b.state === 'VIEWING_PROTECTION');

        expect(marketBtn).toBeDefined();
        expect(protectBtn).toBeDefined();
    });

    it('should HIDE Market and Protection for secret bases', () => {
        mockStation.isSecret = true;

        ui.drawStationMainMenu(mockStation, mockPlayer);

        const buttons = ui.stationMenuButtonAreas;
        expect(buttons).toBeDefined();

        const marketBtn = buttons.find(b => b.state === 'VIEWING_MARKET');
        const protectBtn = buttons.find(b => b.state === 'VIEWING_PROTECTION');

        expect(marketBtn).toBeUndefined(); // Should be hidden
        expect(protectBtn).toBeUndefined(); // Should be hidden

        // Ensure other buttons are still there
        const shipyardBtn = buttons.find(b => b.state === 'VIEWING_SHIPYARD');
        expect(shipyardBtn).toBeDefined();
    });
});
