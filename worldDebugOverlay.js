// ****** worldDebugOverlay.js ******

/**
 * WorldDebugOverlay provides debug visualization for the living universe.
 * Shows pilot counts, economy stats, and mission activity.
 */
class WorldDebugOverlay {
    constructor() {
        this.enabled = false; // Toggle with 'W' key
        this.panelX = 10;
        this.panelY = 100;
        this.panelWidth = 300;
        this.panelHeight = 400;
    }

    /**
     * Toggle the debug overlay on/off.
     */
    toggle() {
        this.enabled = !this.enabled;
        console.log(`World Debug Overlay: ${this.enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Draw the debug overlay if enabled.
     */
    draw() {
        if (!this.enabled || !worldSimulation || !worldSimulation.isInitialized) {
            return;
        }

        push();
        
        // Semi-transparent background panel
        fill(0, 0, 0, 200);
        stroke(100, 200, 255);
        strokeWeight(2);
        rect(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 5);

        // Header
        fill(100, 200, 255);
        noStroke();
        textAlign(LEFT, TOP);
        textSize(18);
        text("Living Universe Debug", this.panelX + 10, this.panelY + 10);

        let y = this.panelY + 40;
        const lineHeight = 20;
        fill(255);
        textSize(14);

        // Pilot Statistics
        const pilots = worldSimulation.pilotRegistry?.pilots || [];
        const alivePilots = pilots.filter(p => p.alive);
        const dockedPilots = alivePilots.filter(p => p.dockedStationId);
        const travelingPilots = alivePilots.filter(p => !p.dockedStationId && p.itinerary.length > 0);

        text(`=== Pilots (${alivePilots.length}) ===`, this.panelX + 10, y);
        y += lineHeight;
        
        text(`Docked: ${dockedPilots.length}`, this.panelX + 20, y);
        y += lineHeight;
        
        text(`Traveling: ${travelingPilots.length}`, this.panelX + 20, y);
        y += lineHeight;

        // Role breakdown
        const roleCount = {};
        alivePilots.forEach(p => {
            roleCount[p.role] = (roleCount[p.role] || 0) + 1;
        });
        
        text(`Roles:`, this.panelX + 20, y);
        y += lineHeight;
        
        for (const role in roleCount) {
            text(`  ${role}: ${roleCount[role]}`, this.panelX + 30, y);
            y += lineHeight;
        }

        y += 10;

        // Current System Stats
        if (player && player.currentSystem) {
            const currentSystemIndex = galaxy.currentSystemIndex;
            const pilotsHere = worldSimulation.getActivePilotsInSystem(currentSystemIndex);
            
            text(`=== Current System ===`, this.panelX + 10, y);
            y += lineHeight;
            
            text(`NPCs here: ${pilotsHere.length}`, this.panelX + 20, y);
            y += lineHeight;

            // Show some pilot names if any
            if (pilotsHere.length > 0) {
                text(`Pilots:`, this.panelX + 20, y);
                y += lineHeight;
                
                const showCount = Math.min(3, pilotsHere.length);
                for (let i = 0; i < showCount; i++) {
                    const p = pilotsHere[i];
                    const status = p.dockedStationId ? 'docked' : 'in space';
                    text(`  ${p.name} (${p.role}) - ${status}`, this.panelX + 30, y);
                    y += lineHeight;
                }
                
                if (pilotsHere.length > showCount) {
                    text(`  ...and ${pilotsHere.length - showCount} more`, this.panelX + 30, y);
                    y += lineHeight;
                }
            }
        }

        y += 10;

        // Economy Stats
        const stations = worldSimulation.stationEconomyRegistry?.stationIds || [];
        text(`=== Economy ===`, this.panelX + 10, y);
        y += lineHeight;
        
        text(`Stations: ${stations.length}`, this.panelX + 20, y);
        y += lineHeight;

        // Current station economy if docked
        if (player && player.currentSystem && player.currentSystem.station) {
            const stationId = player.currentSystem.station.name;
            const economy = worldSimulation.getStationEconomy(stationId);
            
            if (economy) {
                text(`Station: ${stationId}`, this.panelX + 20, y);
                y += lineHeight;
                
                // Show a sample commodity
                const sampleComm = 'Food';
                const stock = Math.floor(economy.stock[sampleComm] || 0);
                const price = worldSimulation.getPrice(stationId, sampleComm);
                
                text(`${sampleComm}: ${stock} units @ $${price}`, this.panelX + 30, y);
                y += lineHeight;
            }
        }

        y += 10;

        // Mission Stats
        const missions = worldSimulation.missionRegistry?.missions || [];
        const postedMissions = missions.filter(m => m.status === 'posted');
        const acceptedMissions = missions.filter(m => m.status === 'accepted');
        
        text(`=== Missions (${missions.length}) ===`, this.panelX + 10, y);
        y += lineHeight;
        
        text(`Posted: ${postedMissions.length}`, this.panelX + 20, y);
        y += lineHeight;
        
        text(`Accepted: ${acceptedMissions.length}`, this.panelX + 20, y);
        y += lineHeight;

        // Footer help text
        y = this.panelY + this.panelHeight - 25;
        fill(150);
        textSize(12);
        text("Press 'W' to toggle this overlay", this.panelX + 10, y);

        pop();
    }
}
