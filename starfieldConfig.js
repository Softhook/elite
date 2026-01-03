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
    BITMAP_PROCESS_MIN_COUNT: 1        // Always process at least this many per frame if available
};
