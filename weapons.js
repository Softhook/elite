const DEFAULT_WEAPON_CONFIG = {
    PROJECTILE_SPEED: 10,
    MISSILE_SPEED: 4,
    TANGLE_SPEED: 6,
    HARPOON_SPEED: 30,
    TURRET_SPEED: 15,
    DRONE_SPEED: 12,
    PROJECTILE_DAMAGE: 10,
    PROJECTILE_LIFESPAN: 90,
    MISSILE_LIFESPAN: 180,
    TANGLE_LIFESPAN: 60,
    HARPOON_LIFESPAN: 120,
    MISSILE_TURN_RATE: 0.05
};

const WEAPON_UPGRADES = [
    // -----------------------------
    // Single Shot Projectiles
    // -----------------------------
    {
        name: "Pulse Laser",
        type: "projectile",
        damage: 10,
        color: [0, 255, 0], // Green
        fireRate: 0.4,
        price: 1200,
        desc: "Standard-issue energy weapon found across the galaxy. Faulcon DeLacy's best-selling model for three centuries running."
    },
    {

        name: "Sniper Rail",
        type: "projectile",
        damage: 35,
        color: [200, 200, 255], // Pale blue
        fireRate: 0.7,
        price: 2500,
        desc: "Electromagnetic accelerator that trades fire rate for devastating penetration power. Preferred by bounty hunters who value the one-shot kill."
    },
    {
        name: "Heavy Cannon",
        type: "projectile",
        damage: 60,
        color: [180, 80, 80], // Brownish
        fireRate: 1.0,
        price: 3000,
        desc: "Military-grade kinetic cannon delivering massive damage per shot. Gutamaya discontinued civilian sales, but black market units remain plentiful."
    },

    // -----------------------------
    // Beam Weapons
    // -----------------------------
    {
        name: "Beam Laser",
        type: "beam",
        damage: 4,
        color: [0, 200, 255], // Cyan
        fireRate: 0.15,
        maxHeat: 1.0,
        heatPerShot: 0.12,
        heatDissipation: 0.35,
        heatRecoveryFactor: 0.3,
        price: 1600,
        desc: "Sustained coherent light projection derived from alien technology. Watch the heat gauge—overheating can be catastrophic."
    },
    {
        name: "Mining Laser",
        type: "beam",
        damage: 4,
        color: [255, 165, 0], // Orange
        fireRate: 0.15,
        maxHeat: 1.0,
        heatPerShot: 0.08, // More efficient than combat beam
        heatDissipation: 0.35,
        heatRecoveryFactor: 0.3,
        price: 2200,
        desc: "High-intensity industrial beam tuned for mineral extraction. Exceptionally effective against asteroids."
    },
    {
        name: "Scatter Beam",
        type: "beam",
        damage: 3,
        color: [255, 255, 180], // Pale yellow
        fireRate: 0.08,
        maxHeat: 1.0,
        heatPerShot: 0.08,
        heatDissipation: 0.42,
        heatRecoveryFactor: 0.28,
        price: 2200,
        desc: "High-frequency micro-pulse beam reverse-engineered from Thargoid weapons. Optimized for sustained fire with minimal heat."
    },
    {
        name: "Disruptor",
        type: "beam",
        damage: 6,
        color: [255, 0, 80], // Hot pink
        fireRate: 0.25,
        maxHeat: 1.1,
        heatPerShot: 0.18,
        heatDissipation: 0.32,
        heatRecoveryFactor: 0.35,
        price: 1400,
        desc: "Specialized beam tuned to destabilize shield harmonics. Based on xeno-tech recovered from frontier conflicts."
    },

    // -----------------------------
    // Multi-Shot Parallel (Straight)
    // -----------------------------
    {
        name: "Twin Pulse",
        type: "straight2",
        damage: 4,
        color: [0, 180, 255], // Blue
        fireRate: 0.35,
        price: 800,
        desc: "Dual-barrel configuration providing improved hit probability. A Lakon Spaceways classic found on traders and fighters alike."
    },
    {
        name: "Triple Pulse",
        type: "straight3",
        damage: 6,
        color: [255, 0, 255], // Purple
        fireRate: 0.4,
        price: 1100,
        desc: "Triple parallel emitters delivering concentrated firepower in a tight formation. Popular with escort pilots."
    },
    {
        name: "Quad Pulse",
        type: "straight4",
        damage: 7,
        color: [0, 255, 180], // Aqua
        fireRate: 0.5,
        price: 1300,
        desc: "Four-barrel array creating a wall of plasma. Saud Kruger originally designed it for asteroid clearing."
    },

    // -----------------------------
    // Spread Weapons (2-way)
    // -----------------------------
    {
        name: "V Spread",
        type: "spread2",
        damage: 12,
        color: [255, 255, 0], // Yellow
        fireRate: 0.4,
        price: 1700,
        desc: "Diverging twin shots ideal for close-quarters engagements. Federation Navy standard issue for boarding defense."
    },
    {
        name: "V Punch",
        type: "spread2",
        damage: 18,
        color: [120, 120, 255], // Violet
        fireRate: 0.7,
        price: 1400,
        desc: "Heavy-hitting spread variant sacrificing fire rate for substantial damage per volley. Manticore Arms' signature design."
    },

    // -----------------------------
    // Spread Weapons (3-way)
    // -----------------------------
    {
        name: "Multi-Cannon",
        type: "spread3",
        damage: 10,
        color: [200, 200, 100], // Yellow
        fireRate: 0.25,
        price: 2400,
        desc: "Kinetic projectile weapon that bypasses shields effectively. Remlock manufactures these under exclusive military contract."
    },
    {
        name: "Burst Blaster",
        type: "spread3",
        damage: 6,
        color: [255, 100, 100], // Pinkish
        fireRate: 0.2,
        price: 2000,
        desc: "Rapid-fire spread weapon designed for engaging multiple hostiles. Achilles Corporation's answer to pirate swarms."
    },

    // -----------------------------
    // Spread Weapons (4-way)
    // -----------------------------
    {
        name: "Wide Scatter",
        type: "spread4",
        damage: 6,
        color: [255, 200, 0], // Orange
        fireRate: 0.3,
        price: 1400,
        desc: "Wide-angle dispersal pattern providing excellent area coverage. Pilots call it 'the wall' for good reason."
    },

    // -----------------------------
    // Spread Weapons (5-way)
    // -----------------------------
    {
        name: "Quad Cone",
        type: "spread5",
        damage: 6,
        color: [255, 0, 0], // Red
        fireRate: 0.3,
        price: 1600,
        desc: "Five-way cone pattern maximizing hit probability. Devastatingly effective at close range."
    },

    // -----------------------------
    // Turret Weapons (Auto-aiming)
    // -----------------------------
    {
        name: "Mini-Turret",
        type: "turret",
        damage: 18,
        color: [80, 255, 80], // Light green
        fireRate: 0.7,
        price: 2300,
        desc: "Automated targeting system that tracks and engages hostiles independently. Whatt and Pritney's entry-level turret."
    },
    {
        name: "Railgun Turret",
        type: "turret",
        damage: 50,
        color: [255, 80, 255], // Magenta
        fireRate: 1.0,
        price: 4500,
        desc: "Heavy auto-tracking railgun mounting. Expensive, but Vodel's precision engineering justifies every credit."
    },

    // -----------------------------
    // Special Weapons
    // -----------------------------
    {
        name: "Force Blaster",
        type: "force",
        damage: 60,
        color: [255, 0, 0], // Red
        fireRate: 2,
        price: 32500,
        maxRadius: 300,
        desc: "Generates an expanding kinetic shockwave affecting all nearby vessels. Reverse-engineered from recovered alien artifacts."
    },
    {
        name: "Jedi Force",
        type: "force",
        damage: 100,
        color: [255, 255, 0], // Purple
        fireRate: 2,
        price: 40600,
        maxRadius: 750,
        desc: "Advanced force projection technology with extended range and devastating power. Derived from Thargoid weapon systems."
    },
    // -----------------------------
    // Missile Weapons
    // -----------------------------
    {
        name: "Loiter Munition",
        type: "missile",
        damage: 100,
        color: [0, 255, 255],
        projectileSize: 7,
        fireRate: 5.0,         // Long reload
        price: 2400,
        speed: 2,              // Missile projectile speed
        turnRate: 0.3,        // How sharply it can turn (radians per update step, adjust based on deltaTime scaling)
        lifespan: 400,         // Longer life to find target (frames or time units)
        missileHull: 30,       // Hull for destructible missiles
        desc: "Slow-moving guided munition with exceptional tracking capabilities. Nicknamed 'the patient hunter' by pilots."
    },
    {
        name: "Kalibr Missile",
        type: "missile",
        damage: 100,
        color: [255, 255, 255], // White
        projectileSize: 5,
        fireRate: 5.0,         // Long reload
        price: 2400,
        speed: 10,              // Missile projectile speed
        turnRate: 0.2,        // How sharply it can turn (radians per update step, adjust based on deltaTime scaling)
        lifespan: 400,         // Longer life to find target (frames or time units)
        missileHull: 30,       // Hull for destructible missiles
        desc: "High-velocity cruise missile offering minimal flight time to target. Based on old Earth naval designs."
    },
    {
        name: "Guardian Missile",
        type: "missile",
        damage: 60,
        color: [255, 150, 50], // Orange-ish
        projectileSize: 5,
        fireRate: 4.0,         // Long reload
        price: 1800,
        speed: 5,              // Missile projectile speed
        turnRate: 0.08,        // How sharply it can turn (radians per update step, adjust based on deltaTime scaling)
        lifespan: 240,         // Longer life to find target (frames or time units)
        missileHull: 10,       // Hull for destructible missiles
        desc: "Standard guided missile platform with balanced performance. Reliable Ramsay Industries engineering."
    },
    {
        name: "Avenger Missile",
        type: "missile",
        damage: 200,
        color: [255, 100, 100], // Reddish
        projectileSize: 5,
        fireRate: 7.0,          // Very long reload
        price: 3400,
        speed: 4,               // Slightly slower, heavier
        turnRate: 0.08,
        lifespan: 300,
        missileHull: 50,       // Hull for destructible missiles
        desc: "Heavy warhead designed to eliminate hardened targets. The extended reload cycle is worth the wait."
    },
    // -----------------------------
    // Tangle weapons
    // -----------------------------
    {
        name: "Tangle Projector",
        type: "tangle",
        damage: 5,           // low direct damage
        color: [20, 200, 100], // Green
        fireRate: 0.5,       // Good firing rate (slightly faster)
        price: 2200,
        tangleDuration: 8.0, // Seconds target is affected by tangle
        dragMultiplier: 2.0, // Strong drag effect
        rotationBlockMultiplier: 0.1, // Severely reduces rotation speed
        projectileSize: 5,   // Medium projectile
        desc: "Projects energy tethers that restrict target movement and rotation. Used by police and military."
    },
    {
        name: "Harpoon Launcher",
        type: "harpoon",
        damage: 8,
        color: [180, 220, 255], // pale cyan
        fireRate: 1.5,
        price: 4200,
        projectileSize: 6,
        speed: 30,
        desc: "Magnetic grapple that creates a physical tether between ships. Derived from deep-space salvage equipment."
    },
    {
        name: "Heavy Tangle",
        type: "tangle",
        damage: 10,           //Direct damage
        color: [30, 240, 120], // Brighter green
        fireRate: 1.0,       // Slower firing rate
        price: 2200,
        tangleDuration: 15.0, // Longer tangle effect
        dragMultiplier: 5.0, // Nearly stops ships completely
        rotationBlockMultiplier: 0.01, // Almost completely blocks rotation
        projectileSize: 7,   // Larger projectile
        desc: "Industrial-strength immobilization system capable of restraining capital-class vessels. Not subtle, but effective."
    },

    // -----------------------------
    // Proximity Mines
    // -----------------------------
    {
        name: "Basic Mine",
        type: "mine",
        damage: 100,
        blastRadius: 140,
        triggerRadius: 70,
        mineHealth: 25,
        color: [255, 100, 0], // Orange
        fireRate: 3.0,
        price: 2500,
        desc: "Proximity-triggered explosive device for area denial. Achilles Corporation's most affordable ordnance."
    },
    {
        name: "Advanced Mine",
        type: "mine",
        damage: 150,
        blastRadius: 180,
        triggerRadius: 90,
        mineHealth: 40,
        color: [255, 50, 0], // Red-orange
        fireRate: 4.0,
        price: 2800,
        desc: "Enhanced mine variant with increased blast radius and improved damage output. Popular in pirate ambushes."
    },
    {
        name: "Heavy Mine",
        type: "mine",
        damage: 300,
        blastRadius: 250,
        triggerRadius: 150,
        mineHealth: 60,
        color: [200, 0, 0], // Dark red
        fireRate: 5.0,
        price: 4500,
        desc: "Heavily armored high-yield mine resistant to point defense fire. One well-placed unit can end a pursuit."
    },

    // -----------------------------
    // Defensive Systems
    // -----------------------------
    {
        name: "Barrier Field",
        type: "barrier",
        damageReduction: 0.5, // 50% damage reduction
        duration: 10.0,        // 10 seconds
        fireRate: 15.0,       // Cooldown in seconds
        color: [100, 100, 255], // Light blue for visual effect
        price: 7500,
        desc: "Generates a protective energy field reducing incoming damage by half. Sirius Corporation's defensive breakthrough."
    },
    {
        name: "Shield Dome",
        type: "barrier",
        damageReduction: 0.6, // 60% damage reduction
        duration: 15.0,        // 10 seconds
        fireRate: 20.0,       // Cooldown in seconds
        color: [154, 205, 50], // Green visual effect
        price: 13500,
        desc: "Advanced barrier projection offering superior damage mitigation. Developed from alien shield technology."
    },
    {
        name: "Halo",
        type: "barrier",
        damageReduction: 0.8, // 80% damage reduction
        duration: 15.0,        // 10 seconds
        fireRate: 20.0,       // Cooldown in seconds
        color: [255, 215, 0], // Gold for visual effect
        price: 18000,
        desc: "Top-tier defensive system providing near-complete damage immunity. Named for its distinctive golden glow."
    },

    // -----------------------------
    // Storm Weapons (Alien Specialty)
    // -----------------------------
    {
        name: "EMP Storm",
        type: "storm",
        stormType: "electromagnetic",
        damage: 0,
        color: [80, 100, 255], // Blue - matches electromagnetic storm
        fireRate: 8.0,         // Long cooldown
        stormRadius: 200,       // Miniature storm radius
        stormDuration: 10000,     // 10 seconds
        projectileSpeed: 6,
        projectileSize: 6,
        price: 999999,         // Not purchasable
        desc: "Deploys a localized electromagnetic disturbance that disrupts targeting systems."
    },
    {
        name: "Gravity Well",
        type: "storm",
        stormType: "gravitational",
        damage: 0,
        color: [255, 200, 50], // Gold - matches gravitational storm
        fireRate: 10.0,
        stormRadius: 200,
        stormDuration: 10000,  // 10 seconds
        projectileSpeed: 5,
        projectileSize: 8,
        price: 999999,
        desc: "Creates a temporary gravitational anomaly that pulls nearby vessels toward its center."
    },
    {
        name: "Radiation Burst",
        type: "storm",
        stormType: "radiation",
        damage: 0,
        color: [100, 255, 50], // Green - matches radiation storm
        fireRate: 6.0,
        stormRadius: 200,
        stormDuration: 10000,   // 10 seconds
        projectileSpeed: 7,
        projectileSize: 5,
        price: 999999,
        desc: "Releases a concentrated radiation cloud that damages hull integrity over time."
    },
    {
        name: "Ion Disruptor",
        type: "storm",
        stormType: "ion",
        damage: 0,
        color: [180, 100, 255], // Purple - matches ion storm
        fireRate: 7.0,
        stormRadius: 200,
        stormDuration: 10000,   // 10 seconds
        projectileSpeed: 6,
        projectileSize: 6,
        price: 999999,
        desc: "Generates an ion field that completely disables enemy shields."
    },

    // -----------------------------
    // Industrial/Construction Weapons
    // -----------------------------
    {
        name: "Base Builder",
        type: "base_build",
        damage: 0,
        color: [100, 255, 255], // Cyan construction beam
        fireRate: 5.0,         // 5 second cooldown
        price: 8500,
        desc: "Industrial construction module for building surface bases. Projects a focused energy beam that materializes prefabricated structures on planetary surfaces. Essential for frontier colonization."
    }

];

// Export for module systems and browsers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WEAPON_UPGRADES, DEFAULT_WEAPON_CONFIG };
    global.WEAPON_UPGRADES = WEAPON_UPGRADES;
    global.DEFAULT_WEAPON_CONFIG = DEFAULT_WEAPON_CONFIG;
} else if (typeof window !== 'undefined') {
    window.WEAPON_UPGRADES = WEAPON_UPGRADES;
    window.DEFAULT_WEAPON_CONFIG = DEFAULT_WEAPON_CONFIG;
}
