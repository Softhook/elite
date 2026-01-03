// Color Distance Analysis for colorConstants.js
// This script calculates the perceptual distance between all colors to ensure good visual separation

const FACTION_COLORS = {
    IMPERIAL: [160, 80, 220],       // Purple
    SEPARATIST: [140, 150, 60],     // Olive Green
    MILITARY: [150, 150, 155],      // Gray
    ALIEN: [50, 220, 80],           // Green
    POLICE: [60, 140, 255],         // Blue
};

const ROLE_COLORS = {
    POLICE: [60, 140, 255],         // Blue
    PIRATE: [255, 50, 50],          // Bright Red
    ALIEN: [50, 220, 80],           // Green
    MILITARY: [150, 150, 155],      // Gray
    IMPERIAL: [160, 80, 220],       // Purple
    SEPARATIST: [140, 150, 60],     // Olive Green
    // Commercial ships: Yellow/Orange/Brown spectrum (spread out)
    HAULER: [255, 210, 60],         // Bright Yellow
    TRANSPORT: [255, 150, 80],      // Light Orange
    REPAIR: [180, 220, 140],        // Light Green-Yellow (distinct from browns)
    MINER: [160, 120, 80],          // Dark Brown
    // Combat-adjacent roles
    BOUNTY_HUNTER: [255, 80, 180],  // Magenta-Pink (distinct from orange)
    GUARD: [220, 200, 120],         // Light Khaki/Cream
    COMBAT: [200, 60, 100]          // Dark Pink/Maroon (distinct from pirate red)
};

const ECONOMY_COLORS = {
    Industrial: [60, 120, 200, 210],        // Blue
    Agricultural: [180, 120, 40, 210],      // Brown/Orange
    Mining: [160, 160, 170, 210],           // Light Grey/Silver
    Refinery: [160, 40, 40, 210],           // Maroon
    "Post Human": [0, 200, 200, 210],       // Cyan
    Tourism: [200, 80, 200, 210],           // Purple/Pink
    Service: [200, 255, 255, 210],          // Light cyan
    Military: [160, 160, 170, 210],         // Neutral gray (matches MILITARY faction)
    Offworld: [100, 180, 100, 210],         // Light Green

    // Faction-based economies
    Separatist: [128, 128, 0, 210],         // Olive (matches faction)
    Imperial: [255, 235, 180, 210],         // White gold (matches faction)
    Alien: [50, 205, 50, 210],              // Green (matches faction)

    Default: [150, 150, 150, 210]           // Default grey if type unknown
};

// Calculate Euclidean distance in RGB space
function colorDistance(color1, color2) {
    const r = color1[0] - color2[0];
    const g = color1[1] - color2[1];
    const b = color1[2] - color2[2];
    return Math.sqrt(r * r + g * g + b * b);
}

// Calculate perceptual distance (weighted for human perception)
// Humans are more sensitive to green, less to blue
function perceptualDistance(color1, color2) {
    const r = (color1[0] - color2[0]) * 0.30;
    const g = (color1[1] - color2[1]) * 0.59;
    const b = (color1[2] - color2[2]) * 0.11;
    return Math.sqrt(r * r + g * g + b * b);
}

console.log("=".repeat(80));
console.log("COLOR DISTANCE ANALYSIS");
console.log("=".repeat(80));

// Threshold for "too similar" (out of max distance ~441)
const EUCLIDEAN_THRESHOLD = 80;  // Colors closer than this may be hard to distinguish
const PERCEPTUAL_THRESHOLD = 40;

let warnings = [];

// Check FACTION colors against each other
console.log("\n FACTION COLORS:");
const factionNames = Object.keys(FACTION_COLORS);
for (let i = 0; i < factionNames.length; i++) {
    for (let j = i + 1; j < factionNames.length; j++) {
        const name1 = factionNames[i];
        const name2 = factionNames[j];
        const dist = colorDistance(FACTION_COLORS[name1], FACTION_COLORS[name2]);
        const perceptDist = perceptualDistance(FACTION_COLORS[name1], FACTION_COLORS[name2]);

        console.log(`  ${name1} vs ${name2}: Euclidean=${dist.toFixed(1)}, Perceptual=${perceptDist.toFixed(1)}`);

        if (dist < EUCLIDEAN_THRESHOLD || perceptDist < PERCEPTUAL_THRESHOLD) {
            warnings.push(`⚠️  FACTION: ${name1} and ${name2} are too similar! (dist=${dist.toFixed(1)})`);
        }
    }
}

// Check ROLE colors against each other
console.log("\n🎯 ROLE COLORS:");
const roleNames = Object.keys(ROLE_COLORS);
for (let i = 0; i < roleNames.length; i++) {
    for (let j = i + 1; j < roleNames.length; j++) {
        const name1 = roleNames[i];
        const name2 = roleNames[j];
        const dist = colorDistance(ROLE_COLORS[name1], ROLE_COLORS[name2]);
        const perceptDist = perceptualDistance(ROLE_COLORS[name1], ROLE_COLORS[name2]);

        // Skip TRANSPORT/MINER since they're intentionally the same
        if ((name1 === 'TRANSPORT' && name2 === 'MINER') || (name1 === 'MINER' && name2 === 'TRANSPORT')) {
            console.log(`  ${name1} vs ${name2}: IDENTICAL (by design)`);
            continue;
        }

        console.log(`  ${name1} vs ${name2}: Euclidean=${dist.toFixed(1)}, Perceptual=${perceptDist.toFixed(1)}`);

        if (dist < EUCLIDEAN_THRESHOLD || perceptDist < PERCEPTUAL_THRESHOLD) {
            warnings.push(`⚠️  ROLE: ${name1} and ${name2} are too similar! (dist=${dist.toFixed(1)})`);
        }
    }
}

// Check most important cross-category comparisons (FACTION vs ROLE colors that might appear together)
console.log("\n🔄 CROSS-CATEGORY CHECKS (Faction vs Role):");
for (const fName of factionNames) {
    for (const rName of roleNames) {
        const dist = colorDistance(FACTION_COLORS[fName], ROLE_COLORS[rName]);
        const perceptDist = perceptualDistance(FACTION_COLORS[fName], ROLE_COLORS[rName]);

        if (dist < 60) { // Slightly lower threshold for cross-category
            console.log(`  ${fName} vs ${rName}: Euclidean=${dist.toFixed(1)}, Perceptual=${perceptDist.toFixed(1)} ⚠️`);
            warnings.push(`⚠️  CROSS: Faction ${fName} and Role ${rName} are very similar! (dist=${dist.toFixed(1)})`);
        }
    }
}

// Summary
console.log("\n" + "=".repeat(80));
if (warnings.length === 0) {
    console.log("✅ ALL COLORS HAVE GOOD SEPARATION");
} else {
    console.log(`❌ FOUND ${warnings.length} COLOR SIMILARITY WARNINGS:\n`);
    warnings.forEach(w => console.log(w));
}
console.log("=".repeat(80));

// Display color palette summary
console.log("\n📊 COLOR PALETTE SUMMARY:");
console.log("\nFACTIONS:");
for (const [name, color] of Object.entries(FACTION_COLORS)) {
    console.log(`  ${name.padEnd(15)} RGB(${color[0]}, ${color[1]}, ${color[2]})`);
}
console.log("\nROLES:");
for (const [name, color] of Object.entries(ROLE_COLORS)) {
    console.log(`  ${name.padEnd(15)} RGB(${color[0]}, ${color[1]}, ${color[2]})`);
}
