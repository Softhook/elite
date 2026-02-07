
// Simulation of the new flora spawning logic
// This script verifies that the balanced noise logic produces a fair distribution

const ITERATIONS = 100000;
const counts = {
    'AlienTree': 0,
    'CrystalPlant': 0,
    'TentaclePlant': 0,
    'SporeStalk': 0,
    'BubbleBush': 0,
    'HexPalm': 0,
    'PyramidCactus': 0,
    'LuminescentFungi': 0
};

// Simulate 8 mock classes
class AlienTree { }
class CrystalPlant { }
class TentaclePlant { }
class SporeStalk { }
class BubbleBush { }
class HexPalm { }
class PyramidCactus { }
class LuminescentFungi { }

console.log(`Running ${ITERATIONS} iterations of flora spawning simulation...`);

for (let i = 0; i < ITERATIONS; i++) {
    // Simulate speciesNoise. 
    // In the actual game, this is Perlin noise. 
    // Perlin noise distribution is bell-curve-ish around 0.5.
    // To be rigorous, let's simulate a non-uniform distribution to prove the wrapping works.
    // Let's use (Math.random() + Math.random()) / 2 which is triangular centered at 0.5.
    const speciesNoise = (Math.random() + Math.random()) / 2;

    // The NEW balanced logic
    const balancedNoise = (speciesNoise * 8.0) % 1.0;

    let floraType = 'AlienTree'; // Default

    if (balancedNoise < 0.125) {
        floraType = 'AlienTree';
    } else if (balancedNoise < 0.25) {
        floraType = 'CrystalPlant';
    } else if (balancedNoise < 0.375) {
        floraType = 'TentaclePlant';
    } else if (balancedNoise < 0.5) {
        floraType = 'SporeStalk';
    } else if (balancedNoise < 0.625) {
        floraType = 'BubbleBush';
    } else if (balancedNoise < 0.75) {
        floraType = 'HexPalm';
    } else if (balancedNoise < 0.875) {
        floraType = 'PyramidCactus';
    } else {
        floraType = 'LuminescentFungi';
    }

    counts[floraType]++;
}

console.log('Distribution results:');
let total = 0;
for (const [type, count] of Object.entries(counts)) {
    const percentage = (count / ITERATIONS * 100).toFixed(2);
    console.log(`${type}: ${count} (${percentage}%)`);
    total += count;
}

// Verification assertions
const fungiPercent = counts['LuminescentFungi'] / ITERATIONS;
if (fungiPercent < 0.08) { // Expect ~12.5%, so < 8% is a failure
    console.error(`FAIL: LuminescentFungi too rare! (${(fungiPercent * 100).toFixed(2)}%)`);
    process.exit(1);
} else {
    console.log(`SUCCESS: LuminescentFungi distribution look good (${(fungiPercent * 100).toFixed(2)}%)`);
    process.exit(0);
}
