
// Visualization of spatial distribution
// Generates an ASCII map to show clustering

// Mock p5 noise function (Simplex-ish)
// A simple 2D noise implementation for testing
const SimpleNoise = (function () {
    const perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 0; i < 256; i++) {
        const j = Math.floor(Math.random() * 256);
        [perm[i], perm[j]] = [perm[j], perm[i]];
        perm[i + 256] = perm[i];
    }

    function dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }

    const grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];

    return {
        noise2D: function (xin, yin) {
            // Very rough noise approximation just for visualization distribution
            // In real p5 it's Perlin, here let's just use some sin waves as a proxy
            // if we don't want to implement full Perlin.
            // Actually, let's just use sin/cos for determinism and gradient visualization
            const v = Math.sin(xin) * Math.cos(yin) * 0.5 + 0.5;
            // add some higher freq
            const v2 = Math.sin(xin * 2.1 + 10) * Math.cos(yin * 1.9 + 5) * 0.5 + 0.5;
            return (v * 0.7 + v2 * 0.3);
        }
    };
})();

// Recreate the logic we want to test
const GRID_W = 60;
const GRID_H = 30;
const SPECIES_CHARS = ['A', 'C', 'T', 'S', 'B', 'H', 'P', 'F'];
// AlienTree, Crystal, Tentacle, Spore, Bubble, Hex, Pyramid, Fungi

function renderMap(seed, useRestrictedPalette = false) {
    console.log(`\n--- Map (Restricted Palette: ${useRestrictedPalette}) ---`);

    // Palette generation (mock)
    let palette = [0, 1, 2, 3, 4, 5, 6, 7];
    if (useRestrictedPalette) {
        // Deterministic shuffle based on seed
        const shuffled = [...palette];
        /* simplified shuffle for mock */
        const start = seed % 8;
        palette = [];
        for (let i = 0; i < 4; i++) palette.push((start + i) % 8);
        console.log("Palette: " + palette.map(i => SPECIES_CHARS[i]).join(', '));
    }

    for (let y = 0; y < GRID_H; y++) {
        let row = "";
        for (let x = 0; x < GRID_W; x++) {
            // Coordinate scaling (frequency)
            // Current is 0.05
            const freq = 0.05;
            const noiseVal = SimpleNoise.noise2D(x * freq + seed, y * freq + seed);

            let char = '.';

            if (useRestrictedPalette) {
                // New Logic: 4 buckets
                let idx = Math.floor(noiseVal * 4);
                if (idx > 3) idx = 3;
                char = SPECIES_CHARS[palette[idx]];
            } else {
                // Old Logic: 8 buckets
                // Plus the contrast stretch
                let adj = noiseVal;
                if (adj < 0.5) adj = Math.max(0, adj - 0.1) * 1.25;
                else adj = Math.min(1, adj + 0.1) * 0.8 + 0.2;

                let idx = Math.floor(adj * 8);
                if (idx > 7) idx = 7;

                // Plus rotation
                idx = (idx + (seed % 8)) % 8;

                char = SPECIES_CHARS[idx];
            }
            row += char;
        }
        console.log(row);
    }
}

renderMap(123, false); // Current "Jumbled"
renderMap(123, true);  // Proposed "Clean"
