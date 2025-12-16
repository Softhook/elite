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
        desc: "Standard-issue energy weapon found across the galaxy. Reliable, affordable, and effective against most targets."
    },
    {

        name: "Sniper Rail",
        type: "projectile",
        damage: 35,
        color: [200, 200, 255], // Pale blue
        fireRate: 0.7,
        price: 2500,
        desc: "Electromagnetic accelerator that trades fire rate for devastating penetration power."
    },
    {
        name: "Heavy Cannon",
        type: "projectile",
        damage: 60,
        color: [180, 80, 80], // Brownish
        fireRate: 1.0,
        price: 3000,
        desc: "Military-grade kinetic cannon delivering massive damage per shot. The long reload demands tactical timing."
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
        desc: "Sustained coherent light projection. Highly effective but generates significant thermal buildup."
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
        desc: "High-frequency micro-pulse beam optimized for sustained fire with minimal heat accumulation."
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
        desc: "Specialized beam tuned to destabilize shield harmonics. Short range but highly effective against protected targets."
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
        desc: "Dual-barrel configuration providing improved hit probability against maneuvering targets."
    },
    {
        name: "Triple Pulse",
        type: "straight3",
        damage: 6,
        color: [255, 0, 255], // Purple
        fireRate: 0.4,
        price: 1100,
        desc: "Triple parallel emitters delivering concentrated firepower in a tight formation."
    },
    {
        name: "Quad Pulse",
        type: "straight4",
        damage: 7,
        color: [0, 255, 180], // Aqua
        fireRate: 0.5,
        price: 1300,
        desc: "Four-barrel array creating a wall of plasma. Effective against larger or slower targets."
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
        desc: "Diverging twin shots ideal for close-quarters engagements where precision matters less than coverage."
    },
    {
        name: "V Punch",
        type: "spread2",
        damage: 18,
        color: [120, 120, 255], // Violet
        fireRate: 0.7,
        price: 1400,
        desc: "Heavy-hitting spread variant sacrificing fire rate for substantial damage per volley."
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
        desc: "Kinetic projectile weapon that bypasses shields effectively. Favored for anti-hull operations."
    },
    {
        name: "Burst Blaster",
        type: "spread3",
        damage: 6,
        color: [255, 100, 100], // Pinkish
        fireRate: 0.18,
        price: 2000,
        desc: "Rapid-fire spread weapon designed for engaging multiple hostiles or fast-moving targets."
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
        desc: "Wide-angle dispersal pattern providing excellent area coverage at the cost of focused damage."
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
        desc: "Five-way cone pattern maximizing hit probability. Devastating at close range."
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
        desc: "Automated targeting system tracks and engages hostiles independently. Moderate output with consistent accuracy."
    },
    {
        name: "Railgun Turret",
        type: "turret",
        damage: 50,
        color: [255, 80, 255], // Magenta
        fireRate: 1.0,
        price: 4500,
        desc: "Heavy auto-tracking railgun mounting. Premium cost justified by its lethal precision."
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
        desc: "Generates an expanding kinetic shockwave affecting all nearby vessels. Effective for breaking formations."
    },
    {
        name: "Jedi Force",
        type: "force",
        damage: 100,
        color: [255, 255, 0], // Purple
        fireRate: 2,
        price: 40600,
        maxRadius: 750,
        desc: "Advanced force projection technology with extended range and devastating power. Origin classified."
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
        desc: "Slow-moving guided munition with exceptional tracking. Patient pursuit ensures target acquisition."
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
        desc: "High-velocity cruise missile offering minimal flight time to target. Limited maneuverability at speed."
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
        desc: "Standard guided missile platform. Balanced performance suitable for most combat scenarios."
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
        desc: "Heavy warhead designed to eliminate hardened targets. Extended reload cycle requires tactical consideration."
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
        desc: "Projects energy tethers that restrict target movement and rotation. Effective for disabling fleeing vessels."
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
        desc: "Magnetic grapple that creates a physical tether between ships. Cable integrity depends on relative velocity."
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
        desc: "Industrial-strength immobilization system capable of restraining even capital-class vessels."
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
        desc: "Proximity-triggered explosive device. Deployable during combat or for area denial operations."
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
        desc: "Enhanced mine variant with increased blast radius and improved damage output."
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
        desc: "Heavily armored high-yield mine. Resistant to point defense fire and capable of crippling large vessels."
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
        desc: "Generates a protective energy field reducing incoming damage by half. Limited duration requires tactical deployment."
    },
    {
        name: "Shield Dome",
        type: "barrier",
        damageReduction: 0.6, // 60% damage reduction
        duration: 15.0,        // 10 seconds
        fireRate: 20.0,       // Cooldown in seconds
        color: [154, 205, 50], // Green visual effect
        price: 13500,
        desc: "Advanced barrier projection offering superior damage mitigation. Extended uptime for sustained engagements."
    },
    {
        name: "Halo",
        type: "barrier",
        damageReduction: 0.8, // 80% damage reduction
        duration: 15.0,        // 10 seconds
        fireRate: 20.0,       // Cooldown in seconds
        color: [255, 215, 0], // Gold for visual effect
        price: 18000,
        desc: "Top-tier defensive system providing near-complete damage immunity. The gold standard in personal protection."
    }

];
