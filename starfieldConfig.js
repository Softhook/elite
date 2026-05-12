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
    PARALLAX_ENABLED: true,
    PARALLAX_LAYERS: [
        {
            type: 'star',
            parallax: 0.12,
            cellSize: 240,
            chance: 0.78,
            maxPerCell: 2,
            sizeRange: [0.8, 2.0],
            alphaRange: [70, 165],
            twinkleSpeed: 0.0025,
            colors: [[215, 230, 255], [255, 245, 210], [200, 220, 255]]
        },
        {
            type: 'nebula',
            parallax: 0.2,
            cellSize: 900,
            chance: 0.35,
            maxPerCell: 1,
            sizeRange: [220, 520],
            // Nebula alpha is normalized (0..1) because this layer renders via drawingContext rgba().
            // Other layers use p5 fill/stroke APIs that expect 0..255 alpha values.
            alphaRange: [0.1, 0.24],
            drift: [0.003, 0.002],
            colors: [[120, 80, 220], [90, 150, 220], [170, 90, 170]]
        },
        {
            type: 'dust',
            parallax: 1.05,
            cellSize: 180,
            chance: 0.62,
            maxPerCell: 1,
            sizeRange: [1.3, 2.8],
            alphaRange: [35, 95],
            colors: [[170, 190, 235], [200, 210, 240]]
        },
        {
            type: 'particle',
            // Foreground particles intentionally use >1 parallax to move faster than the base starfield.
            parallax: 1.3,
            cellSize: 150,
            chance: 0.4,
            maxPerCell: 1,
            sizeRange: [1.5, 3.8],
            alphaRange: [55, 155],
            twinkleSpeed: 0.0045,
            colors: [[210, 235, 255], [255, 255, 255]]
        }
    ]
};
