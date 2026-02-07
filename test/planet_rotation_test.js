
// Simulation of the new planet-based rotation logic

const PLANET_COUNT = 20;
const ITERATIONS_PER_PLANET = 5000;
const SPECIES_NAMES = [
    'AlienTree', 'CrystalPlant', 'TentaclePlant', 'SporeStalk',
    'BubbleBush', 'HexPalm', 'PyramidCactus', 'LuminescentFungi'
];

console.log(`Simulating flora distribution across ${PLANET_COUNT} planets...`);
console.log(`Goal: Prove that different planets have different dominant species.`);

for (let p = 0; p < PLANET_COUNT; p++) {
    // Simulate a planet seed
    const planetSeed = Math.floor(Math.random() * 1000000);
    const speciesRotation = planetSeed % 8;

    // Count species on this planet
    const counts = new Array(8).fill(0);

    for (let i = 0; i < ITERATIONS_PER_PLANET; i++) {
        // Simulate Perlin noise (Gaussian-like around 0.5)
        // Using average of 3 randoms to approximate bell curve
        let speciesNoise = (Math.random() + Math.random() + Math.random()) / 3;

        let adjustedNoise = speciesNoise;
        // The contrast stretch logic we implemented
        if (adjustedNoise < 0.5) adjustedNoise = Math.max(0, adjustedNoise - 0.1) * 1.25;
        else adjustedNoise = Math.min(1, adjustedNoise + 0.1) * 0.8 + 0.2;

        const baseIndex = Math.floor(adjustedNoise * 7.999); // Use 7.999 to be safe
        const finalIndex = (baseIndex + speciesRotation) % 8;

        counts[finalIndex]++;
    }

    // Find dominant species
    let maxCount = 0;
    let dominantIndex = -1;
    for (let i = 0; i < 8; i++) {
        if (counts[i] > maxCount) {
            maxCount = counts[i];
            dominantIndex = i;
        }
    }

    const dominantName = SPECIES_NAMES[dominantIndex];
    const dominantPercent = (maxCount / ITERATIONS_PER_PLANET * 100).toFixed(1);
    const fungiPercent = (counts[7] / ITERATIONS_PER_PLANET * 100).toFixed(1);

    console.log(`Planet ${p + 1} (Offset ${speciesRotation}): Dominant = ${dominantName} (${dominantPercent}%), Fungi = ${fungiPercent}%`);
}
