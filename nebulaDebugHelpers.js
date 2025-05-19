// Debug helpers for nebulae effects
function toggleNebulaDebug() {
    // Toggle debug for all nebulae in current system
    const system = gameStateManager.activeSystem;
    if (!system || !system.nebulae || !system.nebulae.length) {
        console.log("No nebulae found in the current system");
        return;
    }
    
    for (let nebula of system.nebulae) {
        const debugStatus = nebula.toggleDebug();
        console.log(`Toggled debug for ${nebula.type} nebula: ${debugStatus ? 'ON' : 'OFF'}`);
    }
}

function checkEntityNebulaEffects() {
    // Check which entities are affected by nebulae
    const system = gameStateManager.activeSystem;
    if (!system || !system.nebulae || !system.nebulae.length) {
        console.log("No nebulae found in the current system");
        return;
    }
    
    console.log("=== NEBULA EFFECTS DEBUG ===");
    for (let nebula of system.nebulae) {
        console.log(`Nebula type: ${nebula.type}, position: (${nebula.pos.x.toFixed(0)}, ${nebula.pos.y.toFixed(0)}), radius: ${nebula.radius}`);
        console.log(`Affected entities: ${nebula.affectedEntities.size}`);
        
        // Check player
        if (system.player) {
            const playerInNebula = nebula.contains(system.player.pos);
            console.log(`  Player in nebula: ${playerInNebula}`);
            if (playerInNebula) {
                console.log(`    Player effects: weaponsDisabled=${system.player.weaponsDisabled}, shieldsDisabled=${system.player.shieldsDisabled}`);
            }
        }
        
        // Check enemies
        let affectedEnemyCount = 0;
        for (let enemy of system.enemies) {
            const enemyInNebula = nebula.contains(enemy.pos);
            if (enemyInNebula) {
                affectedEnemyCount++;
                console.log(`  Enemy ${enemy.id || '?'} (${enemy.shipTypeName}) in nebula`);
                console.log(`    Effects: weaponsDisabled=${enemy.weaponsDisabled}, shieldsDisabled=${enemy.shieldsDisabled}`);
            }
        }
        console.log(`  Total enemies affected: ${affectedEnemyCount}`);
    }
    console.log("==========================");
}

// Make functions available in the global scope
window.toggleNebulaDebug = toggleNebulaDebug;
window.checkEntityNebulaEffects = checkEntityNebulaEffects;

console.log("Nebula debug helpers loaded. Use toggleNebulaDebug() and checkEntityNebulaEffects() to debug nebulae.");
