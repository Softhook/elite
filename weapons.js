const WEAPON_UPGRADES = [
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
        name: "Beam Laser",
        type: "beam",
        damage: 4,
        color: [0, 200, 255], // Cyan
        fireRate: 0.1,
        price: 2500,
        desc: "Continuous beam, high energy use."
    },
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
        name: "Railgun Turret",
        type: "turret",
        damage: 50,
        color: [255, 80, 255], // Magenta
        fireRate: 1.0,
        price: 4000,
        desc: "High damage, slow fire, auto-aims."
    },
    {
        name: "Force Blaster",
        type: "force",
        damage: 300,
        color: [255, 0, 0], // Red
        fireRate: 2, 
        price: 10000,
        desc: "Super damage, area effect."
    },
    {
        name: "Twin Pulse",
        type: "straight2",
        damage: 8,
        color: [0, 180, 255], // Blue
        fireRate: 0.35,
        price: 1600,
        desc: "Fires two parallel shots."
    },
    {
        name: "Quad Pulse",
        type: "straight4",
        damage: 7,
        color: [0, 255, 180], // Aqua
        fireRate: 0.5,
        price: 2200,
        desc: "Fires four parallel shots."
    },
    {
        name: "Wide Scatter",
        type: "spread4",
        damage: 9,
        color: [255, 200, 0], // Orange
        fireRate: 0.3,
        price: 2100,
        desc: "Wide 4-way spread, covers more area."
    },
    {
        name: "Double Shot",
        type: "spread2",
        damage: 12,
        color: [255, 255, 0], // Yellow
        fireRate: 0.4,
        price: 1400,
        desc: "Two angled shots, good for close range."
    },
    {
        name: "Heavy Cannon",
        type: "projectile",
        damage: 25,
        color: [180, 80, 80], // Brownish
        fireRate: 1.2,
        price: 3200,
        desc: "Slow but powerful single shot."
    },
    {
        name: "Sniper Rail",
        type: "projectile",
        damage: 40,
        color: [200, 200, 255], // Pale blue
        fireRate: 2.0,
        price: 5000,
        desc: "Very high damage, long cooldown."
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
        name: "Burst Blaster",
        type: "spread3",
        damage: 8,
        color: [255, 100, 100], // Pinkish
        fireRate: 0.18,
        price: 2000,
        desc: "Fast 3-way spread, good for swarms."
    },
    {
        name: "Arc Projector",
        type: "spread2",
        damage: 15,
        color: [120, 120, 255], // Violet
        fireRate: 0.7,
        price: 2700,
        desc: "Two heavy shots at a wide angle."
    },
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
        name: "Pulse Array",
        type: "straight3",
        damage: 4,
        color: [255, 0, 255], // Purple
        fireRate: 0.32,
        price: 2500,
        desc: "Fast 3-way parallel shots."
    },
    {
        name: "Disruptor",
        type: "beam",
        damage: 6,
        color: [255, 0, 80], // Hot pink
        fireRate: 0.25,
        price: 4200,
        desc: "Short beam, disables enemy shields."
    }
];
