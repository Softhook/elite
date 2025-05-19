// Debug script for nebulae persistence
function checkNebulaeSaveLoad() {
    console.log("======= NEBULAE DEBUG INFO =======");
    
    // Check current system's nebulae
    const currentSystem = galaxy.getCurrentSystem();
    console.log(`Current System: ${currentSystem ? currentSystem.name : 'None'}`);
    
    if (currentSystem && currentSystem.nebulae) {
        console.log(`Nebulae count: ${currentSystem.nebulae.length}`);
        console.log("Nebulae details:");
        currentSystem.nebulae.forEach((nebula, index) => {
            console.log(`  Nebula ${index+1}:`);
            console.log(`    Type: ${nebula.type}`);
            console.log(`    Position: x=${nebula.pos.x.toFixed(1)}, y=${nebula.pos.y.toFixed(1)}`);
            console.log(`    Radius: ${nebula.radius}`);
        });
    } else {
        console.log("No nebulae in current system");
    }
    
    // Add to window object for console access
    window.checkNebulaeSaveLoad = checkNebulaeSaveLoad;
    
    console.log("===================================");
    console.log("To check again after saving/loading, run checkNebulaeSaveLoad() in console");
    
    return "Nebulae check complete";
}

// Test serialization of a nebula
function testNebulaSerialization() {
    const currentSystem = galaxy.getCurrentSystem();
    if (!currentSystem || !currentSystem.nebulae || currentSystem.nebulae.length === 0) {
        console.log("No nebulae to test serialization");
        return;
    }
    
    const originalNebula = currentSystem.nebulae[0];
    console.log("Original nebula:", originalNebula);
    
    const serialized = originalNebula.toJSON();
    console.log("Serialized:", serialized);
    
    const deserialized = Nebula.fromJSON(serialized);
    console.log("Deserialized:", deserialized);
    
    // Compare properties
    console.log("Property comparison:");
    console.log(`Type: ${originalNebula.type === deserialized.type ? 'Match' : 'Mismatch'}`);
    console.log(`Radius: ${originalNebula.radius === deserialized.radius ? 'Match' : 'Mismatch'}`);
    console.log(`Position X: ${Math.abs(originalNebula.pos.x - deserialized.pos.x) < 0.001 ? 'Match' : 'Mismatch'}`);
    console.log(`Position Y: ${Math.abs(originalNebula.pos.y - deserialized.pos.y) < 0.001 ? 'Match' : 'Mismatch'}`);
}

// Add to window object for console access
window.checkNebulaeSaveLoad = checkNebulaeSaveLoad;
window.testNebulaSerialization = testNebulaSerialization;

console.log("Nebulae debug functions loaded!");
console.log("Run checkNebulaeSaveLoad() to check current nebulae");
console.log("Run testNebulaSerialization() to test serialization");
