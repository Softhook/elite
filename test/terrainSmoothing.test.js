/**
 * Terrain Smoothing Tests
 * Tests for the instant terrain buffer swap system (no alpha transitions)
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
            MESH_SIZE: 5000,
            MESH_RESOLUTION: 120,
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

    test('should initialize with swap interval', () => {
        expect(terrain.minSwapInterval).toBeGreaterThan(0);
    });

    test('should enforce minimum swap interval', () => {
        // Simulate receiving first buffer
        const mockBitmap1 = { width: 5500, height: 5500, close: jest.fn() };
        terrain.pendingBuffer = { bitmap: mockBitmap1, gridX: 0, gridY: 0 };
        
        // Set time to 0
        global.performance.now.mockReturnValue(0);
        
        // First update should swap immediately
        const swapped1 = terrain.update(0, 0, false);
        expect(swapped1).toBe(true);
        expect(terrain.currentBuffer).toBe(mockBitmap1);

        // Simulate receiving second buffer immediately
        const mockBitmap2 = { width: 5500, height: 5500, close: jest.fn() };
        terrain.pendingBuffer = { bitmap: mockBitmap2, gridX: 1, gridY: 1 };
        
        // Time hasn't advanced enough (only 50ms)
        global.performance.now.mockReturnValue(50);
        
        // Second update should NOT swap due to cooldown
        const swapped2 = terrain.update(0, 0, false);
        expect(swapped2).toBe(false);
        expect(terrain.currentBuffer).toBe(mockBitmap1);
        expect(terrain.pendingBuffer).not.toBeNull();

        // Time advances past cooldown (150ms total, more than minSwapInterval of 100ms)
        global.performance.now.mockReturnValue(150);
        
        // Now it should swap
        const swapped3 = terrain.update(0, 0, false);
        expect(swapped3).toBe(true);
        expect(terrain.currentBuffer).toBe(mockBitmap2);
        // Old buffer should be closed immediately
        expect(mockBitmap1.close).toHaveBeenCalled();
    });

    test('should swap buffers instantly without transition', () => {
        // Set up initial buffer
        const mockBitmap1 = { width: 5500, height: 5500, close: jest.fn() };
        terrain.currentBuffer = mockBitmap1;
        terrain.currentGridX = 0;
        terrain.currentGridY = 0;
        
        global.performance.now.mockReturnValue(0);
        terrain.lastSwapTime = 0;

        // Prepare new buffer
        const mockBitmap2 = { width: 5500, height: 5500, close: jest.fn() };
        terrain.pendingBuffer = { bitmap: mockBitmap2, gridX: 1, gridY: 1 };
        
        // Advance time past cooldown (150ms, more than minSwapInterval of 100ms)
        global.performance.now.mockReturnValue(150);

        // Update should swap instantly (no alpha transition)
        const swapped = terrain.update(0, 0, false);
        expect(swapped).toBe(true);
        expect(terrain.currentBuffer).toBe(mockBitmap2); // New buffer is current
        expect(mockBitmap1.close).toHaveBeenCalled(); // Old buffer closed immediately
    });

    test('should handle buffer cleanup properly', () => {
        const mockBitmap1 = { width: 5500, height: 5500, close: jest.fn() };
        
        terrain.currentBuffer = mockBitmap1;
        
        terrain.cleanup();
        
        expect(mockBitmap1.close).toHaveBeenCalled();
        expect(terrain.currentBuffer).toBeNull();
    });

    test('should not have stroke calls in worker code', () => {
        const fs = require('fs');
        const workerCode = fs.readFileSync(__dirname + '/../surface_worker.js', 'utf8');
        
        // Should not contain ctx.stroke() calls
        expect(workerCode).not.toContain('ctx.stroke()');
        
        // Should still have fill calls
        expect(workerCode).toContain('ctx.fill()');
    });

    test('should use instant swap approach without alpha blending', () => {
        const fs = require('fs');
        const terrainCode = fs.readFileSync(__dirname + '/../surfaceTerrain.js', 'utf8');
        
        // Should NOT use transition alpha anymore
        expect(terrainCode).not.toContain('transitionAlpha');
        expect(terrainCode).not.toContain('transitionBuffer');
    });
});
