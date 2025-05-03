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
        desc: "Standard energy weapon."
    },
    {
        
        name: "Sniper Rail",
        type: "projectile",
        damage: 25,
        color: [200, 200, 255], // Pale blue
        fireRate: 0.7,
        price: 3200,
        desc: "Slow but powerful shot."
    },
    {
        name: "Heavy Cannon",
        type: "projectile",
        damage: 40,
        color: [180, 80, 80], // Brownish
        fireRate: 1.0,
        price: 5000,
        desc: "Very high damage, long cooldown."
    },
    
    // -----------------------------
    // Beam Weapons
    // -----------------------------
    {
        name: "Beam Laser",
        type: "beam",
        damage: 4,
        color: [0, 200, 255], // Cyan
        fireRate: 0.1,
        price: 2500,
        desc: "Continuous beam, high energy use."
    },
    {
        name: "Scatter Beam",
        type: "beam",
        damage: 2,
        color: [255, 255, 180], // Pale yellow
        fireRate: 0.05,
        price: 3500,
        desc: "Low damage, rapid-fire beam."
    },
    {
        name: "Disruptor",
        type: "beam",
        damage: 6,
        color: [255, 0, 80], // Hot pink
        fireRate: 0.25,
        price: 4200,
        desc: "Short beam, disables enemy shields."
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
        price: 1600,
        desc: "Fires two parallel shots."
    },
    {
        name: "Triple Pulse",
        type: "straight3",
        damage: 6,
        color: [255, 0, 255], // Purple
        fireRate: 0.4,
        price: 2500,
        desc: "Fast 3-way parallel shots."
    },
    {
        name: "Quad Pulse",
        type: "straight4",
        damage: 7,
        color: [0, 255, 180], // Aqua
        fireRate: 0.5,
        price: 5000,
        desc: "Four parallel shots."
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
        price: 1400,
        desc: "Two angled shots, good for close range."
    },
    {
        name: "V Punch",
        type: "spread2",
        damage: 18,
        color: [120, 120, 255], // Violet
        fireRate: 0.7,
        price: 2700,
        desc: "Two heavy shots at a wide angle."
    },
    
    // -----------------------------
    // Spread Weapons (3-way)
    // -----------------------------
    {
        name: "Multi-Cannon",
        type: "spread3",
        damage: 13,
        color: [200, 200, 100], // Yellow
        fireRate: 0.25,
        price: 1800,
        desc: "Ballistic, 3-way spread, good vs hull."
    },
    {
        name: "Burst Blaster",
        type: "spread3",
        damage: 8,
        color: [255, 100, 100], // Pinkish
        fireRate: 0.18,
        price: 2000,
        desc: "Fast 3-way spread, good for swarms."
    },
    
    // -----------------------------
    // Spread Weapons (4-way)
    // -----------------------------
    {
        name: "Wide Scatter",
        type: "spread4",
        damage: 9,
        color: [255, 200, 0], // Orange
        fireRate: 0.3,
        price: 2100,
        desc: "Wide 4-way spread, covers more area."
    },

    // -----------------------------
    // Spread Weapons (5-way)
    // -----------------------------
    {
        name: "Quad Cone",
        type: "spread5",
        damage: 9,
        color: [255, 0, 0], // Red
        fireRate: 0.3,
        price: 6100,
        desc: "Tight 5-way spread."
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
        price: 3200,
        desc: "Auto-aims, moderate damage."
    },
    {
        name: "Railgun Turret",
        type: "turret",
        damage: 50,
        color: [255, 80, 255], // Magenta
        fireRate: 1.0,
        price: 4000,
        desc: "High damage, slow fire, auto-aims."
    },
    
    // -----------------------------
    // Special Weapons
    // -----------------------------
    {
        name: "Force Blaster",
        type: "force",
        damage: 300,
        color: [255, 0, 0], // Red
        fireRate: 2, 
        price: 10000,
        maxRadius: 300,
        desc: "Super damage, area effect."
    },
    {
        name: "Jedi Force",
        type: "force",
        damage: 300,
        color: [255, 255, 0], // Purple
        fireRate: 2, 
        price: 10000,
        maxRadius: 750,
        desc: "Super damage, area effect."
    }
];
