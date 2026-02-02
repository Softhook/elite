/**
 * Terrain Smoothing Tests
 * Tests for the smooth terrain buffer transition system
 */

describe('SurfaceTerrain Smoothing', () => {
    let terrain;
    let mockConfig;
    let mockPlanet;

    beforeEach(() => {
        // Mock performance.now for consistent timing
        global.performance = {
            now: jest.fn(() => 0)
        };

        // Mock Worker
        global.Worker = jest.fn().mockImplementation(() => ({
            postMessage: jest.fn(),
            terminate: jest.fn(),
            onmessage: null
        }));

        mockConfig = {
            MESH_SIZE: 6000,
            MESH_RESOLUTION: 160,
            DEFAULT_FEATURE_SEED: 12345,
            SUN_ANGLE: -Math.PI / 4,
            EXTRUSION_ANGLE: 0.5
        };

        mockPlanet = {
            seed: 12345,
            featureRand: 0.5,
            palette: [
                { levels: [80, 60, 40] },
                { levels: [120, 100, 70] }
            ]
        };

        // Make SurfaceTerrain available
        global.SURFACE_CONFIG = mockConfig;
        require('../surfaceTerrain.js');
        terrain = new global.SurfaceTerrain(mockConfig);
        terrain.setPlanet(mockPlanet);
    });

    afterEach(() => {
        if (terrain) {
            terrain.cleanup();
        }
    });

    test('should initialize with transition properties', () => {
        expect(terrain.transitionBuffer).toBeNull();
        expect(terrain.transitionAlpha).toBe(0);
        expect(terrain.transitionDuration).toBeGreaterThan(0);
        expect(terrain.minSwapInterval).toBeGreaterThan(0);
    });

    test('should enforce minimum swap interval', () => {
        // Simulate receiving first buffer
        const mockBitmap1 = { width: 6600, height: 6600, close: jest.fn() };
        terrain.pendingBuffer = { bitmap: mockBitmap1, gridX: 0, gridY: 0 };
        
        // Set time to 0
        global.performance.now.mockReturnValue(0);
        
        // First update should swap immediately
        const swapped1 = terrain.update(0, 0, false);
        expect(swapped1).toBe(true);
        expect(terrain.currentBuffer).toBe(mockBitmap1);

        // Simulate receiving second buffer immediately
        const mockBitmap2 = { width: 6600, height: 6600, close: jest.fn() };
        terrain.pendingBuffer = { bitmap: mockBitmap2, gridX: 1, gridY: 1 };
        
        // Time hasn't advanced enough (only 50ms)
        global.performance.now.mockReturnValue(50);
        
        // Second update should NOT swap due to cooldown
        const swapped2 = terrain.update(0, 0, false);
        expect(swapped2).toBe(false);
        expect(terrain.currentBuffer).toBe(mockBitmap1);
        expect(terrain.pendingBuffer).not.toBeNull();

        // Time advances past cooldown (250ms total)
        global.performance.now.mockReturnValue(250);
        
        // Now it should swap
        const swapped3 = terrain.update(0, 0, false);
        expect(swapped3).toBe(true);
        expect(terrain.currentBuffer).toBe(mockBitmap2);
    });

    test('should create transition buffer when swapping', () => {
        // Set up initial buffer
        const mockBitmap1 = { width: 6600, height: 6600, close: jest.fn() };
        terrain.currentBuffer = mockBitmap1;
        terrain.currentGridX = 0;
        terrain.currentGridY = 0;
        
        global.performance.now.mockReturnValue(0);
        terrain.lastSwapTime = 0;

        // Prepare new buffer
        const mockBitmap2 = { width: 6600, height: 6600, close: jest.fn() };
        terrain.pendingBuffer = { bitmap: mockBitmap2, gridX: 1, gridY: 1 };
        
        // Advance time past cooldown
        global.performance.now.mockReturnValue(250);

        // Update should swap and create transition
        const swapped = terrain.update(0, 0, false);
        expect(swapped).toBe(true);
        expect(terrain.transitionBuffer).toBe(mockBitmap1); // Old buffer becomes transition
        expect(terrain.transitionAlpha).toBe(0); // Starting fade
        expect(terrain.currentBuffer).toBe(mockBitmap2); // New buffer is current
    });

    test('should update transition alpha over time', () => {
        // Set up transition state
        const mockBitmap1 = { width: 6600, height: 6600, close: jest.fn() };
        terrain.transitionBuffer = mockBitmap1;
        terrain.transitionAlpha = 0;
        terrain.transitionStartTime = 0;
        terrain.transitionDuration = 300;
        
        // After 150ms (50% of duration)
        global.performance.now.mockReturnValue(150);
        terrain.update(0, 0, false);
        expect(terrain.transitionAlpha).toBeCloseTo(0.5, 1);

        // After 300ms (100% of duration)
        global.performance.now.mockReturnValue(300);
        terrain.update(0, 0, false);
        expect(terrain.transitionAlpha).toBe(1);
        
        // After completion, transition buffer should be cleaned up
        global.performance.now.mockReturnValue(301);
        terrain.update(0, 0, false);
        expect(mockBitmap1.close).toHaveBeenCalled();
        expect(terrain.transitionBuffer).toBeNull();
    });

    test('should handle buffer cleanup properly', () => {
        const mockBitmap1 = { width: 6600, height: 6600, close: jest.fn() };
        const mockBitmap2 = { width: 6600, height: 6600, close: jest.fn() };
        
        terrain.currentBuffer = mockBitmap1;
        terrain.transitionBuffer = mockBitmap2;
        
        terrain.cleanup();
        
        expect(mockBitmap1.close).toHaveBeenCalled();
        expect(mockBitmap2.close).toHaveBeenCalled();
        expect(terrain.currentBuffer).toBeNull();
        expect(terrain.transitionBuffer).toBeNull();
    });

    test('should not have stroke calls in worker code', () => {
        const fs = require('fs');
        const workerCode = fs.readFileSync(__dirname + '/../surface_worker.js', 'utf8');
        
        // Should not contain ctx.stroke() calls
        expect(workerCode).not.toContain('ctx.stroke()');
        
        // Should still have fill calls
        expect(workerCode).toContain('ctx.fill()');
    });

    test('should have alpha blending in draw method', () => {
        const fs = require('fs');
        const terrainCode = fs.readFileSync(__dirname + '/../surfaceTerrain.js', 'utf8');
        
        // Should use globalAlpha for blending
        expect(terrainCode).toContain('globalAlpha');
        
        // Should handle transition alpha
        expect(terrainCode).toContain('transitionAlpha');
    });
});
