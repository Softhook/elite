// Color Distance Analysis for colorConstants.js
// This script calculates the perceptual distance between all colors to ensure good visual separation

const FACTION_COLORS = {
    IMPERIAL: [255, 235, 180],
    SEPARATIST: [128, 128, 0],
    MILITARY: [160, 160, 170],
    ALIEN: [50, 205, 50],
};

const ROLE_COLORS = {
    PIRATE: [220, 20, 20],
    POLICE: [30, 144, 255],
    HAULER: [255, 215, 0],
    TRANSPORT: [204, 119, 34],
    MINER: [204, 119, 34],
    ALIEN: [50, 205, 50],
    BOUNTY_HUNTER: [255, 69, 0],
    GUARD: [100, 100, 255],
    COMBAT: [255, 100, 100],
};

const ECONOMY_COLORS = {
    Industrial: [60, 120, 200],
    Agricultural: [180, 120, 40],
    Mining: [160, 160, 170],
    Refinery: [160, 40, 40],
    "Post Human": [0, 200, 200],
    Tourism: [200, 80, 200],
    Service: [200, 255, 255],
    Military: [200, 50, 50],
    Offworld: [100, 180, 100],
    Separatist: [128, 128, 0],
    Imperial: [255, 235, 180],
    Alien: [50, 205, 50],
    Default: [150, 150, 150]
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
