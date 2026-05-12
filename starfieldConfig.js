/**
 * =============================================================================
 * STARFIELD CONFIGURATION
 * =============================================================================
 * Centralized configuration for the Starfield rendering system.
 * Used by StarSystem.js and starfield_benchmark.html
 */
const STARFIELD_CONFIG = {
    TILE_SIZE: 768,
    MAX_TILES_PER_FRAME: 3,   // Increased from 2 to clear queue faster during fast travel
    MAX_CACHED_TILES: 64,
    // Optimization Tuning:
    // Benchmark at 768px tiles shows 'Baseline' (no boost/prediction) is fastest (~2890 FPS).
    // Boost/Prediction caused a regression to ~2200-2400 FPS.
    // Setting these to 0 effectively disables them.
    DIRECTION_BOOST: 500,
    PREDICTION_FRAMES: 60,    // Increased from 30 to predict further ahead during fast travel

    CLEANUP_INTERVAL_MS: 5000,
    WORKER_ENABLED: (typeof Worker !== 'undefined') && (typeof OffscreenCanvas !== 'undefined'),
    // Deep space dark blue background (not pure black for visual depth)
    BACKGROUND_COLOR: { r: 10, g: 15, b: 40 },
    BACKGROUND_CSS: '#0a0f28',

    // Deferred bitmap processing - prevents frame spikes from worker callbacks
    MAX_PENDING_BITMAPS: 20,           // Maximum bitmaps to queue before dropping oldest
    BITMAP_PROCESS_TIME_MS: 8,         // Max milliseconds per frame for bitmap processing (~half a frame at 60fps)
    BITMAP_PROCESS_MIN_COUNT: 1,       // Always process at least this many per frame if available

    // Layered parallax overlays for improved depth perception in space.
    // Each layer is deterministic and screen-bounded for predictable performance.
    // Depth model (parallax 0..1 = background..tied to player; >1 = faster than player):
    //   1. deep-stars   (0.08)  – distant star field, faint blue/white
    //   2. nebula       (0.15)  – large soft gradient cloud puffs
    //   3. midfield     (0.38)  – mid-distance stars, warmer / more varied colors
    //   4. near-dust    (0.88)  – fine particle dust, cold blue tint
    //   5. foreground   (1.4)   – tiny crisp specks flying past the ship
    PARALLAX_ENABLED: true,
    PARALLAX_LAYERS: [
        {
            // Layer 1 – deep, distant stars. Very slow, high density, faint twinkle.
            type: 'star',
            parallax: 0.08,
            cellSize: 200,
            chance: 0.82,
            maxPerCell: 2,
            sizeRange: [0.7, 1.8],
            alphaRange: [55, 150],
            twinkleSpeed: 0.002,
            colors: [[210, 225, 255], [255, 250, 220], [185, 210, 255]]
        },
        {
            // Layer 2 – deep nebula cloud puffs, very slow drift.
            type: 'nebula',
            parallax: 0.15,
            cellSize: 950,
            chance: 0.32,
            maxPerCell: 1,
            sizeRange: [240, 560],
            // Nebula alpha is normalized (0..1) because this layer renders via drawingContext rgba().
            // Other layers use p5 fill/stroke APIs that expect 0..255 alpha values.
            alphaRange: [0.07, 0.2],
            drift: [0.003, 0.002],
            colors: [[110, 75, 210], [80, 140, 215], [160, 85, 165], [55, 120, 175]]
        },
        {
            // Layer 3 – mid-field stars. Slightly larger, warmer hues; provides separation
            // from the deep star layer and the near-field layers.
            type: 'star',
            parallax: 0.38,
            cellSize: 320,
            chance: 0.55,
            maxPerCell: 1,
            sizeRange: [1.0, 2.4],
            alphaRange: [80, 170],
            twinkleSpeed: 0.003,
            colors: [[255, 220, 160], [200, 225, 255], [255, 200, 130], [180, 230, 255]]
        },
        {
            // Layer 4 – near-field dust: cold micro-motes at mid-high parallax.
            type: 'dust',
            parallax: 0.88,
            cellSize: 160,
            chance: 0.58,
            maxPerCell: 1,
            sizeRange: [1.0, 2.2],
            alphaRange: [28, 75],
            colors: [[160, 185, 230], [195, 208, 240]]
        },
        {
            // Layer 5 – crisp foreground specks racing past the ship.
            // parallax > 1 means they move faster than the base starfield on screen.
            type: 'particle',
            parallax: 1.4,
            cellSize: 140,
            chance: 0.35,
            maxPerCell: 1,
            sizeRange: [0.8, 1.6],
            alphaRange: [60, 140],
            twinkleSpeed: 0,
            colors: [[230, 240, 255], [255, 255, 255]]
        }
    ]
};
