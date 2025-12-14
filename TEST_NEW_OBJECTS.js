// Console Test Commands for New Advanced Space Objects
// Copy and paste these into your browser console to spawn the new objects!

// Make sure you're in the game and have access to starSystem

// ========================================
// SPAWN INDIVIDUAL OBJECTS
// ========================================

// Spawn Advanced Research Station
if (typeof starSystem !== 'undefined' && starSystem.spaceObjects) {
    const station = new SpaceObject(player.pos.x + 300, player.pos.y, 'advancedResearchStation');
    starSystem.spaceObjects.push(station);
    console.log('✅ Spawned Advanced Research Station');
}

// Spawn Power Station
if (typeof starSystem !== 'undefined' && starSystem.spaceObjects) {
    const power = new SpaceObject(player.pos.x - 300, player.pos.y, 'powerStation');
    starSystem.spaceObjects.push(power);
    console.log('✅ Spawned Power Station');
}

// Spawn Communication Hub
if (typeof starSystem !== 'undefined' && starSystem.spaceObjects) {
    const comm = new SpaceObject(player.pos.x, player.pos.y + 300, 'commHub');
    starSystem.spaceObjects.push(comm);
    console.log('✅ Spawned Communication Hub');
}

// Spawn Alien Monolith
if (typeof starSystem !== 'undefined' && starSystem.spaceObjects) {
    const alien = new SpaceObject(player.pos.x, player.pos.y - 300, 'alienMonolith');
    starSystem.spaceObjects.push(alien);
    console.log('✅ Spawned Alien Monolith');
}

// ========================================
// SPAWN ALL AT ONCE (arranged in circle around player)
// ========================================

function spawnAllNewObjects() {
    if (typeof starSystem === 'undefined' || !starSystem.spaceObjects) {
        console.error('❌ Star system not available');
        return;
    }

    const types = ['advancedResearchStation', 'powerStation', 'commHub', 'alienMonolith'];
    const radius = 500;

    types.forEach((type, i) => {
        const angle = (i / types.length) * Math.PI * 2;
        const x = player.pos.x + Math.cos(angle) * radius;
        const y = player.pos.y + Math.sin(angle) * radius;
        const obj = new SpaceObject(x, y, type);
        starSystem.spaceObjects.push(obj);
    });

    console.log('✅ Spawned all 4 new advanced objects in a circle');
    console.log('   - Advanced Research Station (torus, domes, cones, lattice)');
    console.log('   - Power Station (helix coils, torus stack, geodesic dome)');
    console.log('   - Communication Hub (cylinders, rods, inverted domes)');
    console.log('   - Alien Monolith (ALL primitives with pulsing animation)');
}

// Run this to spawn all:
// spawnAllNewObjects();

// ========================================
// CLEAR ALL SPACE OBJECTS
// ========================================

function clearAllSpaceObjects() {
    if (typeof starSystem !== 'undefined' && starSystem.spaceObjects) {
        starSystem.spaceObjects = [];
        console.log('✅ Cleared all space objects');
    }
}

// ========================================
// SPAWN A COMPARISON GRID (OLD VS NEW)
// ========================================

function spawnComparisonGrid() {
    if (typeof starSystem === 'undefined' || !starSystem.spaceObjects) {
        console.error('❌ Star system not available');
        return;
    }

    // Spawn some old objects
    const oldTypes = ['satellite', 'telescope', 'relay', 'habitat', 'outpost', 'observatoryDome'];
    oldTypes.forEach((type, i) => {
        const x = player.pos.x - 600;
        const y = player.pos.y - 400 + (i * 150);
        starSystem.spaceObjects.push(new SpaceObject(x, y, type));
    });

    // Spawn new objects
    const newTypes = ['advancedResearchStation', 'powerStation', 'commHub', 'alienMonolith'];
    newTypes.forEach((type, i) => {
        const x = player.pos.x + 600;
        const y = player.pos.y - 400 + (i * 200);
        starSystem.spaceObjects.push(new SpaceObject(x, y, type));
    });

    console.log('✅ Spawned comparison grid');
    console.log('   LEFT: Old objects using basic primitives');
    console.log('   RIGHT: New objects using advanced primitives');
}

// Run this to see the difference:
// spawnComparisonGrid();

// ========================================
// QUICK REFERENCE
// ========================================

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NEW ADVANCED SPACE OBJECTS - TEST COMMANDS          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Spawn All (in circle):                                       ║
║    spawnAllNewObjects();                                      ║
║                                                               ║
║  Comparison Grid:                                             ║
║    spawnComparisonGrid();                                     ║
║                                                               ║
║  Clear All Objects:                                           ║
║    clearAllSpaceObjects();                                    ║
║                                                               ║
║  Individual Spawns (already executed above):                  ║
║    ✅ Advanced Research Station (300px right)                  ║
║    ✅ Power Station (300px left)                               ║
║    ✅ Communication Hub (300px down)                           ║
║    ✅ Alien Monolith (300px up)                                ║
║                                                               ║
║  NEW PRIMITIVES USED:                                         ║
║    • drawDome() - smooth hemispheres                          ║
║    • drawCylinder() - smooth cylinders                        ║
║    • drawCone() - pointed cones                               ║
║    • drawHelix() - spiral coils                               ║
║    • drawLattice() - grid frameworks                          ║
║    • drawRod() - antennas with tips                           ║
║    • drawGeodesicDome() - faceted domes                       ║
║    • drawTorus() - donut rings                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
