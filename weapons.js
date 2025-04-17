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
        type: "spread",
        damage: 13,
        color: [200, 200, 100], // Yellow
        fireRate: 0.25,
        price: 1800,
        desc: "Ballistic, good vs hull."
    },
    {
        name: "Railgun Turret",
        type: "turret",
        damage: 50,
        color: [255, 80, 255], // Magenta
        fireRate: 1.0,
        price: 4000,
        desc: "High damage, slow fire."
    },
    {
        name: "Force Blaster",
        type: "force",
        damage: 3,
        color: [255, 0, 0], // Red
        fireRate: 0.5, 
        price: 10000,
        desc: "Super damage."
    }
];
