// ****** ships.js ******
// Contains ship drawing functions and the global SHIP_DEFINITIONS object.
// MUST be loaded AFTER p5.js but BEFORE player.js, enemy.js, etc.
// MODIFIED FOR EDITOR: Includes vertexData array and updated draw functions.
// REFACTORED: Consolidated drawing logic into generic function.

// --- Global Ship Definitions Object ---
// Stores base stats AND VERTEX DATA for each ship type.
// Note: drawFunction is assigned at the bottom of this file.
const SHIP_DEFINITIONS = {
    "ACAB": {
        name: "ACAB", role: "Police", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.05236,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 12,
        armament: ["Tangle Projector", "Pulse Laser"],
        costCategory: "Low", description: "Standard Police.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7821, y: 0.0000 }, { x: 0.0321, y: 0.4929 }, { x: -0.7821, y: 0.6286 }, { x: -0.7179, y: 0.0000 }, { x: -0.7821, y: -0.6286 }, { x: 0.0321, y: -0.4929 }],
                fillColor: [100, 150, 200],
                strokeColor: [151, 181, 196],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: -0.1800, y: 0.3000 }, { x: -0.3400, y: 0.1800 }, { x: -0.3400, y: -0.1800 }, { x: -0.1800, y: -0.3000 }, { x: -0.0200, y: -0.2200 }, { x: 0.1800, y: -0.1200 }, { x: 0.3000, y: -0.0000 }, { x: 0.1800, y: 0.1200 }, { x: -0.0200, y: 0.2200 }],
                fillColor: [101, 171, 236],
                strokeColor: [0, 0, 0],
                strokeW: 1.00
            }
        ],
        fillColor: [100, 150, 200],
        strokeColor: [151, 181, 196],
        strokeW: 1.00,
        typicalCargo: [],
        price: 15900,
        aiRoles: ["POLICE"],
        techLevel: 1 // Starter
    },
    "Adder": {
        name: "Adder", role: "Trader/Explorer", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.05236,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 30,
        armament: ["Pulse Laser"],
        costCategory: "Low", description: "Affordable entry-level freighter or explorer.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8500, y: 0.0500 }, { x: 0.2500, y: 0.8500 }, { x: -0.8500, y: 0.7500 }, { x: -0.6500, y: 0.0500 }, { x: -0.8500, y: -0.8500 }, { x: 0.1500, y: -0.6500 }],
                fillColor: [160, 160, 140],
                strokeColor: [200, 200, 180],
                strokeW: 1.00
            }
        ],
        fillColor: [160, 160, 140], strokeColor: [200, 200, 180], strokeW: 1,
        typicalCargo: ["Food", "Textiles", "Minerals"],
        price: 11000,
        aiRoles: ["HAULER"],
        techLevel: 1 // Starter
    },
    "Anaconda": {
        name: "Anaconda", role: "Heavy Combat/Multi", sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRate: 0.02094,
        baseHull: 400, baseShield: 350, shieldRecharge: 1, cargoCapacity: 150,
        armament: ["Force Blaster", "Guardian Missile", "Barrier Field", "Advanced Mine"],
        costCategory: "Very High", description: "A mobile fortress, the pinnacle of conventional design.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1500, y: 0.0000 }, { x: 0.8500, y: 0.3000 }, { x: -0.9500, y: 0.4000 }, { x: -1.1500, y: 0.2000 }, { x: -1.1500, y: -0.2000 }, { x: -0.9500, y: -0.4000 }, { x: 0.8500, y: -0.3000 }],
                fillColor: [80, 90, 100],
                strokeColor: [150, 160, 170],
                strokeW: 2.50
            }
        ],
        fillColor: [80, 90, 100], strokeColor: [150, 160, 170], strokeW: 2.5,
        typicalCargo: ["Luxury Goods", "Adv Components", "Metals", "Machinery", "Minerals"],
        price: 53800,
        aiRoles: ["COMBAT", "MILITARY"],
        techLevel: 3 // Mid-tier
    },
    "AspExplorer": {
        name: "Asp Explorer", role: "Explorer/Multi-Role", sizeCategory: "Medium", size: 55,
        baseMaxSpeed: 5.5, baseThrust: 0.09, baseTurnRate: 0.05585,
        baseHull: 150, baseShield: 180, shieldRecharge: 1.3, cargoCapacity: 80,
        armament: ["Beam Laser", "Twin Pulse"],
        costCategory: "Medium-High", description: "Iconic explorer with excellent visibility and jump range.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.3627, y: 0.5133 }, { x: -0.4750, y: 0.8750 }, { x: -0.9500, y: 0.3000 }, { x: -0.9500, y: -0.3000 }, { x: -0.4750, y: -0.8750 }, { x: 0.3627, y: -0.5133 }],
                fillColor: [200, 180, 80],
                strokeColor: [100, 90, 40],
                strokeW: 1.50
            }
        ],
        fillColor: [200, 180, 80],
        strokeColor: [100, 90, 40],
        strokeW: 1.50,
        typicalCargo: ["Minerals", "Minerals", "Minerals", "Minerals", "Medicine", "Computers"],
        price: 23600,
        aiRoles: ["EXPLORER", "HAULER"],
        techLevel: 2 // Mid-tier
    },
    "BioFrigate": {
        name: "Bio-Frigate (Alien)", role: "Alien Cruiser", sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.0, baseThrust: 0.1, baseTurnRate: 0.03491,
        baseHull: 500, baseShield: 250, shieldRecharge: 2.5,
        armament: ["Force Blaster", "Disruptor", "Barrier Field"],
        costCategory: "N/A", description: "Large, organic alien vessel. Slow but durable.",
        fillColor: [80, 140, 100],
        strokeColor: [40, 80, 50],
        strokeW: 2.50,
        vertexLayers: [
            {
                vertexData: [{ x: 0.9619, y: 0.0000 }, { x: 0.5195, y: 0.6500 }, { x: 0.1625, y: 0.7625 }, { x: -0.1625, y: 0.7625 }, { x: -0.5195, y: 0.6500 }, { x: -0.7517, y: 0.4402 }, { x: -0.9000, y: 0.2000 }, { x: -0.9619, y: 0.0000 }, { x: -0.9000, y: -0.2000 }, { x: -0.7517, y: -0.4402 }, { x: -0.5386, y: -0.6424 }, { x: -0.1701, y: -0.7854 }, { x: 0.1701, y: -0.7854 }, { x: 0.5386, y: -0.6424 }],
                fillColor: [80, 140, 100],
                strokeColor: [40, 80, 50],
                strokeW: 2.50
            },
            {
                vertexData: [{ x: 0.0000, y: -0.5162 }, { x: 0.3110, y: -0.1819 }, { x: 0.9574, y: 0.0000 }, { x: 0.3110, y: 0.1819 }, { x: 0.0000, y: 0.5162 }, { x: -0.3857, y: 0.0000 }],
                fillColor: [230, 61, 120],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        typicalCargo: ["Metals", "Chemicals", "Adv Components"],
        price: 999999,
        aiRoles: ["ALIEN"],
        techLevel: 5 // Alien
    },
    "CenturionGunship": {
        name: "Centurion Gunship", role: "Heavy Fighter", sizeCategory: "Large", size: 72,
        baseMaxSpeed: 4.8, baseThrust: 0.13, baseTurnRate: 0.04538,
        baseHull: 320, baseShield: 220, shieldRecharge: 1.0, cargoCapacity: 20,
        armament: ["Quad Pulse", "Beam Laser", "Avenger Missile", "Harpoon Launcher", "Barrier Field", "Heavy Mine"], // Balanced heavy firepower
        costCategory: "High", description: "Slow, heavily armed and armored gun platform.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9421, y: 0.0000 }, { x: 0.7579, y: 0.4000 }, { x: 0.0865, y: 0.5048 }, { x: 0.4546, y: 0.6548 }, { x: 0.2506, y: 0.8786 }, { x: -0.5596, y: 0.8810 }, { x: -0.9421, y: 0.6000 }, { x: -0.7690, y: 0.0000 }, { x: -0.9421, y: -0.6000 }, { x: -0.5596, y: -0.8810 }, { x: 0.2506, y: -0.8786 }, { x: 0.4546, y: -0.6548 }, { x: 0.0865, y: -0.5048 }, { x: 0.7579, y: -0.4000 }],
                fillColor: [100, 105, 115],
                strokeColor: [160, 165, 175],
                strokeW: 1.20
            }
        ],
        fillColor: [100, 105, 115],
        strokeColor: [160, 165, 175],
        strokeW: 2.20,
        typicalCargo: ["Weapons", "Metals", "Machinery"],
        price: 55600,
        aiRoles: ["MILITARY"],
        techLevel: 3 // Mid-tier
    },
    "CobraMkIII": {
        name: "Cobra Mk III", role: "Multi-Role", sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 6.0, baseThrust: 0.10, baseTurnRate: 0.06109,
        baseHull: 120, baseShield: 100, shieldRecharge: 1, cargoCapacity: 44,
        armament: ["Twin Pulse", "Tangle Projector"], // Versatile loadout with defense
        costCategory: "Medium", description: "The legendary jack-of-all-trades.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8867, y: 0.0000 }, { x: 0.1867, y: 0.5270 }, { x: -0.6178, y: 0.5634 }, { x: -0.6133, y: 0.2000 }, { x: -0.8867, y: 0.1770 }, { x: -0.8867, y: -0.1770 }, { x: -0.6133, y: -0.2000 }, { x: -0.6178, y: -0.5634 }, { x: 0.1867, y: -0.5270 }],
                fillColor: [100, 150, 200],
                strokeColor: [200, 220, 255],
                strokeW: 1.50
            },
            {
                vertexData: [{ x: -0.0793, y: 0.3000 }, { x: -0.2393, y: 0.1800 }, { x: -0.2393, y: -0.1800 }, { x: -0.0793, y: -0.3000 }, { x: 0.0807, y: -0.2200 }, { x: 0.2807, y: -0.1200 }, { x: 0.4007, y: -0.0000 }, { x: 0.2807, y: 0.1200 }, { x: 0.0807, y: 0.2200 }],
                fillColor: [101, 171, 236],
                strokeColor: [0, 0, 0],
                strokeW: 1.00
            }
        ],
        fillColor: [100, 150, 200],
        strokeColor: [200, 220, 255],
        strokeW: 1.50,
        typicalCargo: ["Food"],
        price: 21600,
        aiRoles: ["POLICE", "HAULER"],
        techLevel: 2 // Utility
    },
    "DiamondbackExplorer": {
        name: "Diamondback Explorer", role: "Explorer/Light Combat", sizeCategory: "Medium", size: 45,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRate: 0.05236,
        baseHull: 130, baseShield: 100, shieldRecharge: 1.1, cargoCapacity: 40,
        armament: ["Beam Laser", "V Spread"], // Explorer with some punch
        costCategory: "Medium", description: "Utilitarian explorer known for good heat management.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.1500, y: 0.4000 }, { x: -0.5500, y: 0.9000 }, { x: -0.9500, y: 0.5000 }, { x: -0.8500, y: 0.0000 }, { x: -0.9500, y: -0.5000 }, { x: -0.5500, y: -0.9000 }, { x: 0.1500, y: -0.4000 }],
                fillColor: [100, 110, 90],
                strokeColor: [160, 170, 150],
                strokeW: 1.50
            }
        ],
        fillColor: [100, 110, 90], strokeColor: [160, 170, 150], strokeW: 1.5,
        typicalCargo: ["Minerals", "Metals", "Adv Components"],
        price: 20800,
        aiRoles: ["EXPLORER", "HAULER"],
        techLevel: 3 // Mid-tier
    },
    "Destroyer": {
        name: "Destroyer", role: "Military", sizeCategory: "Large", size: 160,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.02094,
        baseHull: 800, baseShield: 400, shieldRecharge: 10.0, cargoCapacity: 100,
        armament: ["Disruptor", "Twin Pulse", "Force Blaster", "Avenger Missile", "Harpoon Launcher", "Barrier Field"],
        costCategory: "Low", description: "Standard Police.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0832, y: 0.0000 }, { x: 1.0832, y: 0.0000 }, { x: -0.9327, y: 1.0053 }, { x: -1.0832, y: 0.0000 }, { x: -0.9327, y: -1.0053 }, { x: 1.0832, y: 0.0000 }],
                fillColor: [143, 143, 148],
                strokeColor: [180, 180, 200],
                strokeW: 0.50
            },
            {
                vertexData: [{ x: -0.7335, y: 0.6180 }, { x: 0.5918, y: 0.0000 }, { x: -0.7335, y: -0.6180 }, { x: -0.8380, y: 0.0000 }],
                fillColor: [191, 191, 196],
                strokeColor: [50, 50, 60],
                strokeW: 0.50
            },
            {
                vertexData: [{ x: -0.6159, y: 0.1967 }, { x: -0.2833, y: 0.0000 }, { x: -0.6159, y: -0.1967 }],
                fillColor: [84, 84, 84],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [100, 150, 200],
        strokeColor: [151, 181, 196],
        strokeW: 1.00,
        typicalCargo: [],
        price: 69700,
        aiRoles: ["MILITARY"],
        techLevel: 4, // Advanced
        canDualEngage: true // Large ships can engage two targets simultaneously
    },
    "FederalAssaultShip": {
        name: "Federal Assault Ship", role: "Heavy Fighter", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 5.0, baseThrust: 0.12, baseTurnRate: 0.04363,
        baseHull: 400, baseShield: 300, shieldRecharge: 0.9, cargoCapacity: 30,
        armament: ["Multi-Cannon", "Railgun Turret", "Avenger Missile", "Harpoon Launcher", "Barrier Field", "Heavy Mine"], // Military arsenal
        costCategory: "High", description: "Federation military vessel. Tough hull, good firepower.",
        fillColor: [110, 120, 130],
        strokeColor: [180, 190, 200],
        strokeW: 2.00,
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.7500, y: 0.5000 }, { x: -0.1500, y: 0.6000 }, { x: -0.7500, y: 0.8000 }, { x: -0.9500, y: 0.4000 }, { x: -0.9500, y: -0.4000 }, { x: -0.7500, y: -0.8000 }, { x: -0.1500, y: -0.6000 }, { x: 0.7500, y: -0.5000 }],
                fillColor: [110, 120, 130],
                strokeColor: [180, 190, 200],
                strokeW: 2.00
            },
            {
                vertexData: [{ x: -0.7067, y: -0.3486 }, { x: 0.8067, y: -0.3486 }, { x: -0.6161, y: -0.5037 }],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                vertexData: [{ x: -0.6839, y: 0.3453 }, { x: 0.7905, y: 0.3453 }, { x: -0.5867, y: 0.4955 }],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            }
        ],
        typicalCargo: ["Computers", "Computers", "Computers", "Weapons", "Metals", "Adv Components"],
        price: 59300,
        aiRoles: ["MILITARY"],
        techLevel: 4 // Advanced
    },
    "FerDeLance": {
        name: "Fer-de-Lance", role: "Heavy Combat", sizeCategory: "Large", size: 65,
        baseMaxSpeed: 6.5, baseThrust: 0.11, baseTurnRate: 0.05236,
        baseHull: 180, baseShield: 350, shieldRecharge: 1.8, cargoCapacity: 24,
        armament: ["Sniper Rail", "Force Blaster", "Triple Pulse", "Kalibr Missile", "Harpoon Launcher", "Barrier Field", "Heavy Mine"],
        costCategory: "Very High", description: "Luxury high-performance combat ship.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.1000, y: 0.5000 }, { x: -0.7000, y: 0.6000 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.7000, y: -0.6000 }, { x: 0.1000, y: -0.5000 }],
                fillColor: [60, 65, 70],
                strokeColor: [140, 150, 160],
                strokeW: 2.00
            },
            {
                vertexData: [{ x: -0.9998, y: -0.2009 }, { x: -0.1000, y: -0.2431 }, { x: -0.7013, y: -0.5970 }],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                vertexData: [{ x: -0.9995, y: 0.2035 }, { x: -0.7020, y: 0.5957 }, { x: -0.1000, y: 0.3052 }],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                vertexData: [{ x: 0.4349, y: 0.0000 }, { x: 0.1360, y: 0.1505 }, { x: 0.1360, y: -0.1505 }],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            }
        ],
        fillColor: [60, 65, 70], strokeColor: [140, 150, 160], strokeW: 2,
        typicalCargo: ["Computers", "Computers", "Computers", "Computers", "Luxury Goods", "Weapons", "Narcotics"],
        price: 64200,
        aiRoles: ["MILITARY", "BOUNTY_HUNTER"],
        techLevel: 4 // Advanced
    },
    "GeometricDrone": {
        name: "Geometric Drone (Alien)", role: "Alien Scout?", sizeCategory: "Tiny", size: 15,
        baseMaxSpeed: 9.0, baseThrust: 0.2, baseTurnRate: 0.13963,
        baseHull: 20, baseShield: 40, shieldRecharge: 1.5, cargoCapacity: 0,
        armament: ["Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Small, fast, rotating alien drone. Unknown purpose.",
        vertexData: [{ x: 1, y: 0 }, { x: 0.5, y: 0.87 }, { x: -0.5, y: 0.87 }, { x: -1, y: 0 }, { x: -0.5, y: -0.87 }, { x: 0.5, y: -0.87 }], // Regular Hexagon
        fillColor: [50, 50, 60], strokeColor: [200, 200, 255], strokeW: 1.0, // Dark metallic, light stroke
        typicalCargo: [],
        price: 999999,
        aiRoles: ["ALIEN"],
        techLevel: 5 // Cutting-edge
    },
    "GladiusFighter": {
        name: "Gladius Fighter", role: "Medium Fighter", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRate: 0.06981,
        baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 12,
        armament: ["Burst Blaster", "Twin Pulse", "Kalibr Missile"], // Fast attack loadout
        costCategory: "Medium", description: "Balanced space superiority fighter. Agile and well-armed.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: 0.2500, y: 0.4000 }, { x: -0.2500, y: 0.7000 }, { x: -0.9500, y: 0.5000 }, { x: -1.0500, y: 0.0000 }, { x: -0.9500, y: -0.5000 }, { x: -0.2500, y: -0.7000 }, { x: 0.2500, y: -0.4000 }],
                fillColor: [190, 195, 200],
                strokeColor: [120, 125, 140],
                strokeW: 1.50
            }
        ],
        fillColor: [190, 195, 200], strokeColor: [120, 125, 140], strokeW: 1.5, // Light grey / medium grey
        typicalCargo: ["Computers"],
        price: 28400,
        aiRoles: ["MILITARY", "BOUNTY_HUNTER", "GUARD"],
        techLevel: 3 // Mid-tier
    },
    "Geister": {
        name: "Geister", role: "Medium Fighter", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRate: 0.06981,
        baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 12,
        armament: ["Burst Blaster", "Beam Laser", "Harpoon Launcher"], // Fast attack loadout
        costCategory: "Medium", description: "Fast Stealth Ship.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7205, y: 0.0000 }, { x: 0.5929, y: 0.4300 }, { x: -0.6050, y: 0.6968 }, { x: -0.3295, y: 0.4865 }, { x: -0.5929, y: 0.4300 }, { x: -0.3295, y: 0.1830 }, { x: -0.7205, y: 0.0000 }, { x: -0.3295, y: -0.1830 }, { x: -0.5929, y: -0.4300 }, { x: -0.3295, y: -0.4865 }, { x: -0.6050, y: -0.6968 }, { x: 0.5929, y: -0.4300 }],
                fillColor: [65, 48, 197],
                strokeColor: [120, 125, 140],
                strokeW: 1.50
            },
            {
                vertexData: [{ x: 0.6165, y: 0.0000 }, { x: 0.3009, y: 0.1809 }, { x: 0.3009, y: -0.1809 }],
                fillColor: [250, 100, 0],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: 0.0000, y: 0.1777 }, { x: 0.2510, y: 0.0000 }, { x: 0.0000, y: -0.1777 }],
                fillColor: [250, 100, 0],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [190, 195, 200], strokeColor: [120, 125, 140], strokeW: 1.5, // Light grey / medium grey
        typicalCargo: ["Computers"],
        price: 18400,
        aiRoles: ["PIRATE"],
        techLevel: 3 // Mid-tier
    },
    "GnatInterceptor": { // NEW - Light Fighter 1
        name: "Gnat Interceptor", role: "Light Interceptor", sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 9.5, baseThrust: 0.22, baseTurnRate: 0.09963,
        baseHull: 30, baseShield: 30, shieldRecharge: 1.2, cargoCapacity: 4,
        armament: ["Twin Pulse"],
        costCategory: "Very Low", description: "Extremely fast and small, but fragile interceptor.",
        vertexData: [{ x: 1.1, y: 0 }, { x: -0.8, y: 0.4 }, { x: -1.0, y: 0 }, { x: -0.8, y: -0.4 }],
        fillColor: [200, 60, 60], strokeColor: [255, 150, 150], strokeW: 0.8,
        typicalCargo: [],
        price: 10900,
        aiRoles: ["MILITARY", "BOUNTY_HUNTER"],
        techLevel: 1 // Starter
    },
    "HammerheadCorvette": { // NEW - Unique 2
        name: "Hammerhead Corvette", role: "Corvette/Patrol", sizeCategory: "Large", size: 80,
        baseMaxSpeed: 4.0, baseThrust: 0.09, baseTurnRate: 0.04014,
        baseHull: 350, baseShield: 280, shieldRecharge: 1.0, cargoCapacity: 60,
        armament: ["Heavy Cannon", "Railgun Turret", "Wide Scatter", "Kalibr Missile", "Harpoon Launcher", "Barrier Field", "Advanced Mine"], // Military loadout
        costCategory: "High", description: "Distinctive forward 'hammerhead' module, likely housing sensors or weapons.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8795, y: 0.3500 }, { x: 0.5844, y: 0.4670 }, { x: 0.4207, y: 0.7285 }, { x: 0.1427, y: 0.8587 }, { x: -0.1705, y: 0.5488 }, { x: -0.9254, y: 0.4670 }, { x: -0.9252, y: 0.3625 }, { x: -0.5529, y: 0.1330 }, { x: -0.5529, y: -0.1330 }, { x: -0.9252, y: -0.3625 }, { x: -0.9295, y: -0.4650 }, { x: -0.1705, y: -0.5488 }, { x: 0.1427, y: -0.8587 }, { x: 0.4207, y: -0.7285 }, { x: 0.5885, y: -0.4650 }, { x: 0.8795, y: -0.3500 }, { x: 0.9295, y: 0.0000 }],
                fillColor: [70, 100, 130],
                strokeColor: [150, 180, 210],
                strokeW: 2.00
            },
            {
                vertexData: [{ x: 0.1421, y: -0.7686 }, { x: 0.3536, y: -0.6314 }, { x: -0.0093, y: -0.4986 }, { x: -0.0093, y: -0.4986 }],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 0.10
            },
            {
                vertexData: [{ x: -0.0093, y: 0.4871 }, { x: -0.0093, y: 0.4871 }, { x: 0.3864, y: 0.6086 }, { x: 0.1621, y: 0.7857 }],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 0.10
            },
            {
                vertexData: [{ x: 0.3297, y: 0.2149 }, { x: 0.5680, y: 0.2548 }, { x: 0.7417, y: 0.0000 }, { x: 0.5680, y: -0.2548 }, { x: 0.3297, y: -0.2149 }],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [70, 100, 130],
        strokeColor: [150, 180, 210],
        strokeW: 2.00, // Blue-grey
        typicalCargo: ["Machinery", "Metals", "Food", "Metals", "Weapons"],
        price: 63700,
        aiRoles: ["MILITARY"],
        techLevel: 4 // Advanced
    },
    "ImperialClipper": {
        name: "Imperial Clipper", role: "Multi-Role/Trader", sizeCategory: "Large", size: 95,
        baseMaxSpeed: 7.0, baseThrust: 0.10, baseTurnRate: 0.02618,
        baseHull: 180, baseShield: 180, shieldRecharge: 1.4, cargoCapacity: 180,
        armament: ["V Punch", "Mini-Turret", "Beam Laser", "Heavy Tangle"], // Elegant, balanced
        costCategory: "High", description: "Elegant and fast Imperial ship, good shield charging.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: 0.6500, y: 0.2000 }, { x: 0.0500, y: 0.9000 }, { x: -0.8500, y: 0.8000 }, { x: -1.0500, y: 0.4000 }, { x: -1.0500, y: -0.4000 }, { x: -0.8500, y: -0.8000 }, { x: 0.0500, y: -0.9000 }, { x: 0.6500, y: -0.2000 }],
                fillColor: [220, 225, 230],
                strokeColor: [100, 150, 200],
                strokeW: 1.50
            },
            {
                vertexData: [{ x: 0.4246, y: 0.0632 }, { x: 0.6612, y: 0.0067 }, { x: 0.4246, y: -0.0499 }],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.50
            },
            {
                vertexData: [{ x: -0.4673, y: 0.0000 }, { x: -0.6264, y: 0.0588 }, { x: -0.6332, y: 0.2283 }, { x: -0.7382, y: 0.0951 }, { x: -0.9015, y: 0.1411 }, { x: -0.8073, y: 0.0000 }, { x: -0.9015, y: -0.1411 }, { x: -0.7382, y: -0.0951 }, { x: -0.6332, y: -0.2283 }, { x: -0.6264, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],
        fillColor: [220, 225, 230], strokeColor: [100, 150, 200], strokeW: 1.5,
        typicalCargo: ["Luxury Goods", "Medicine", "Textiles", "Textiles", "Textiles"],
        price: 42900,
        aiRoles: ["IMPERIAL"],
        techLevel: 4 // Advanced
    },
    "ImperialCourier": {
        name: "Imperial Courier", role: "Light Fighter/Multi", sizeCategory: "Small", size: 32,
        baseMaxSpeed: 7.8, baseThrust: 0.16, baseTurnRate: 0.07505,
        baseHull: 70, baseShield: 150, shieldRecharge: 1.7, cargoCapacity: 12,
        armament: ["Twin Pulse", "Beam Laser"], // Elegant, refined
        costCategory: "Medium", description: "Fast, sleek Imperial ship with good shields for its size.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.4000, y: 0.3000 }, { x: -0.5000, y: 0.5000 }, { x: -0.9000, y: 0.4000 }, { x: -1.0000, y: 0.0000 }, { x: -0.9000, y: -0.4000 }, { x: -0.5000, y: -0.5000 }, { x: 0.4000, y: -0.3000 }],
                fillColor: [210, 215, 220],
                strokeColor: [80, 130, 180],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: 0.2400, y: 0.0000 }, { x: 0.0809, y: 0.0588 }, { x: 0.0742, y: 0.2283 }, { x: -0.0309, y: 0.0951 }, { x: -0.1942, y: 0.1411 }, { x: -0.1000, y: 0.0000 }, { x: -0.1942, y: -0.1411 }, { x: -0.0309, y: -0.0951 }, { x: 0.0742, y: -0.2283 }, { x: 0.0809, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],
        fillColor: [210, 215, 220], strokeColor: [80, 130, 180], strokeW: 1,
        typicalCargo: ["Luxury Goods", "Medicine"],
        price: 20100,
        aiRoles: ["IMPERIAL"],
        techLevel: 2 // Utility
    },
    "JackalMultirole": { // NEW - Multi-role
        name: "Jackal Multirole", role: "Multi-Role", sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.8, baseThrust: 0.1, baseTurnRate: 0.06283,
        baseHull: 140, baseShield: 160, shieldRecharge: 1.2, cargoCapacity: 60,
        armament: ["Multi-Cannon", "Railgun Turret"], // Versatile
        costCategory: "Medium", description: "Adaptable, angular multi-purpose vessel.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.4000, y: 0.5000 }, { x: -0.3000, y: 0.8000 }, { x: -0.9000, y: 0.6000 }, { x: -0.5103, y: 0.1697 }, { x: -0.5103, y: -0.1697 }, { x: -0.9000, y: -0.6000 }, { x: -0.3000, y: -0.8000 }, { x: 0.4000, y: -0.5000 }],
                fillColor: [170, 160, 150],
                strokeColor: [90, 80, 70],
                strokeW: 1.50
            }
        ],
        fillColor: [170, 160, 150],
        strokeColor: [90, 80, 70],
        strokeW: 1.50, // Sandy grey
        typicalCargo: ["Machinery", "Metals", "Food"],
        price: 23100,
        aiRoles: ["COMBAT", "MILITARY"],
        techLevel: 2 // Utility
    },
    "Keelback": {
        name: "Keelback", role: "Combat Trader", sizeCategory: "Medium", size: 42,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.04363,
        baseHull: 180, baseShield: 90, shieldRecharge: 0.9, cargoCapacity: 50,
        armament: ["Twin Pulse", "Railgun Turret"], // Combat trader
        costCategory: "Medium", description: "A Type-6 variant retrofitted for combat, can carry a fighter.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8168, y: 0.0000 }, { x: 0.6865, y: 0.5114 }, { x: -0.0134, y: 0.6114 }, { x: -0.6135, y: 0.8114 }, { x: -0.8168, y: 0.5917 }, { x: -0.3705, y: 0.2745 }, { x: -0.6039, y: 0.1373 }, { x: -0.5974, y: -0.1373 }, { x: -0.3705, y: -0.2745 }, { x: -0.8168, y: -0.5917 }, { x: -0.6135, y: -0.8114 }, { x: -0.0134, y: -0.6114 }, { x: 0.6865, y: -0.5114 }],
                fillColor: [180, 150, 80],
                strokeColor: [100, 80, 40],
                strokeW: 1.50
            }
        ],
        fillColor: [180, 150, 80],
        strokeColor: [100, 80, 40],
        strokeW: 1.50,
        typicalCargo: ["Minerals", "Metals", "Machinery"],
        price: 20600,
        aiRoles: ["HAULER"],
        techLevel: 2 // Utility
    },
    "KraitMKI": {
        name: "Krait MKI", role: "Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 6.2, baseThrust: 0.15, baseTurnRate: 0.06632,
        baseHull: 60, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 15,
        armament: ["Pulse Laser"],
        costCategory: "High", description: "Fighter popular with pirates.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.5772, y: -0.0058 }, { x: 0.2343, y: 0.4129 }, { x: -0.5772, y: 0.4129 }, { x: -0.5772, y: -0.4129 }, { x: 0.2343, y: -0.4129 }],
                fillColor: [100, 120, 100],
                strokeColor: [140, 160, 140],
                strokeW: 1.50
            }
        ],
        fillColor: [100, 120, 100],
        strokeColor: [140, 160, 140],
        strokeW: 1.50,
        typicalCargo: [],
        price: 14600,
        aiRoles: ["PIRATE"],
        techLevel: 2 // Utility
    },

    "KraitMKII": {
        name: "Krait MKII", role: "Multi-Role/Fighter", sizeCategory: "Medium", size: 60,
        baseMaxSpeed: 5.2, baseThrust: 0.11, baseTurnRate: 0.04014,
        baseHull: 100, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 82,
        armament: ["Mini-Turret"], // Combat focused Pirate
        costCategory: "High", description: "Multi-role ship, popular with pirates.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.5500, y: 0.5000 }, { x: -0.4500, y: 0.6000 }, { x: -0.9500, y: 0.4000 }, { x: -0.9500, y: -0.4000 }, { x: -0.4500, y: -0.6000 }, { x: 0.5500, y: -0.5000 }],
                fillColor: [100, 120, 100],
                strokeColor: [140, 160, 140],
                strokeW: 1.50
            }
        ],
        fillColor: [100, 120, 100], strokeColor: [140, 160, 140], strokeW: 1.5,
        typicalCargo: ["Food", "Minerals"],
        price: 17200,
        aiRoles: ["PIRATE"],
        techLevel: 2 // Utility
    },
    "MantaHauler": { // NEW - Unique 1
        name: "Manta Hauler", role: "Wide Cargo Hauler", sizeCategory: "Large", size: 85,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRate: 0.02793,
        baseHull: 250, baseShield: 150, shieldRecharge: 0.7, cargoCapacity: 300,
        armament: ["Mini-Turret", "Force Blaster", "Barrier Field"], // Defensive
        costCategory: "Medium-High", description: "Extremely wide cargo ship, resembling a manta ray.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.3000, y: 0.3000 }, { x: -0.5000, y: 0.9000 }, { x: -0.8000, y: 0.7000 }, { x: -0.9000, y: 0.0000 }, { x: -0.8000, y: -0.7000 }, { x: -0.5000, y: -0.9000 }, { x: 0.3000, y: -0.3000 }],
                fillColor: [60, 80, 90],
                strokeColor: [130, 160, 180],
                strokeW: 2.00
            },
            {
                vertexData: [{ x: 0.0560, y: 0.1290 }, { x: 0.3195, y: 0.0000 }, { x: 0.0560, y: -0.1290 }],
                fillColor: [250, 250, 255],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [60, 80, 90], strokeColor: [130, 160, 180], strokeW: 2.0, // Dark blue/teal
        typicalCargo: ["Minerals", "Metals", "Machinery", "Food", "Textiles"],
        price: 34600,
        aiRoles: ["HAULER"],
        techLevel: 3 // Mid-tier
    },
    "MuleFreighter": { // NEW - Small Transporter
        name: "Mule Freighter", role: "Local Transport", sizeCategory: "Small", size: 25,
        baseMaxSpeed: 3.8, baseThrust: 0.05, baseTurnRate: 0.04887,
        baseHull: 70, baseShield: 0, shieldRecharge: 0.8, cargoCapacity: 20,
        armament: [],
        costCategory: "Very Low", description: "Slow, cheap, boxy short-range cargo shuttle.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8000, y: 0.7500 }, { x: -0.6000, y: 0.8500 }, { x: -0.8000, y: 0.4500 }, { x: -0.8000, y: -0.4500 }, { x: -0.5000, y: -0.8500 }, { x: 0.8000, y: -0.7500 }],
                fillColor: [140, 130, 120],
                strokeColor: [80, 75, 70],
                strokeW: 1.20
            }
        ],
        fillColor: [140, 130, 120], strokeColor: [80, 75, 70], strokeW: 1.2, // Brownish grey
        typicalCargo: ["Food", "Machinery", "Metals"],
        price: 4200,
        aiRoles: ["TRANSPORT"],
        techLevel: 1 // Starter
    },
    "NomadVoyager": {
        name: "Nomad Voyager", role: "Deep Space Explorer", sizeCategory: "Medium", size: 58,
        baseMaxSpeed: 5.2, baseThrust: 0.07, baseTurnRate: 0.05061,
        baseHull: 180, baseShield: 220, shieldRecharge: 1.5, cargoCapacity: 70,
        armament: ["Beam Laser", "Mini-Turret"], // Long range exploration
        costCategory: "High", description: "Self-sufficient long-range vessel built for endurance.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.8000, y: 0.5000 }, { x: 0.2000, y: 0.8000 }, { x: -0.7000, y: 0.7000 }, { x: -1.0000, y: 0.0000 }, { x: -0.7000, y: -0.7000 }, { x: 0.2000, y: -0.8000 }, { x: 0.8000, y: -0.5000 }],
                fillColor: [200, 200, 190],
                strokeColor: [100, 100, 90],
                strokeW: 1.50
            }
        ],
        fillColor: [200, 200, 190], strokeColor: [100, 100, 90], strokeW: 1.5, // Off-white / beige
        typicalCargo: ["Minerals", "Food", "Medicine"],
        price: 24600,
        aiRoles: ["EXPLORER", "HAULER"],
        techLevel: 4 // Advanced
    },
    "PathfinderSurvey": {
        name: "Pathfinder Survey", role: "Long Range Scanner", sizeCategory: "Medium", size: 62,
        baseMaxSpeed: 5.0, baseThrust: 0.06, baseTurnRate: 0.04363,
        baseHull: 120, baseShield: 150, shieldRecharge: 1.2, cargoCapacity: 50,
        armament: [],
        costCategory: "Medium", description: "Designed for exploration and detailed surface scanning.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1000, y: 0.0000 }, { x: 0.7000, y: 0.2000 }, { x: -0.6000, y: 0.5000 }, { x: -1.1000, y: 0.3000 }, { x: -1.1000, y: -0.3000 }, { x: -0.6000, y: -0.5000 }, { x: 0.7000, y: -0.2000 }],
                fillColor: [130, 160, 170],
                strokeColor: [200, 230, 240],
                strokeW: 1.20
            },
            {
                vertexData: [{ x: -0.2751, y: -0.5092 }, { x: -0.2751, y: 0.5092 }, { x: -0.1000, y: 0.7714 }, { x: -0.1000, y: -0.7714 }],
                fillColor: [30, 77, 46],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [130, 160, 170], strokeColor: [200, 230, 240], strokeW: 1.2, // Teal / Light Blue-grey
        typicalCargo: ["Food", "Food", "Minerals", "Minerals", "Metals"],
        price: 10200,
        aiRoles: ["EXPLORER", "HAULER"],
        techLevel: 3 // Mid-tier
    },
    "ProspectorMiner": { // NEW - Miner
        name: "Prospector Miner", role: "Mining Vessel", sizeCategory: "Medium", size: 48,
        baseMaxSpeed: 3.5, baseThrust: 0.08, baseTurnRate: 0.03840,
        baseHull: 200, baseShield: 80, shieldRecharge: 0.9, cargoCapacity: 40, // Includes refinery space
        armament: [],
        costCategory: "Medium", description: "Dedicated mining ship with processing capabilities.",
        vertexData: [{ x: 0.6, y: 0 }, { x: 0.4, y: 0.8 }, { x: -0.4, y: 0.9 }, { x: -0.9, y: 0.6 }, { x: -1.0, y: -0.3 }, { x: -0.9, y: -0.6 }, { x: -0.4, y: -0.9 }, { x: 0.4, y: -0.8 }], // Bulky, functional
        fillColor: [180, 170, 160], strokeColor: [100, 95, 90], strokeW: 1.8, // Industrial grey/brown
        typicalCargo: ["Minerals"],
        price: 8700,
        aiRoles: ["TRANSPORT"],
        techLevel: 2 // Utility
    },
    "Python": {
        name: "Python", role: "Heavy Multi/Trader", sizeCategory: "Large", size: 75,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.03840,
        baseHull: 280, baseShield: 250, shieldRecharge: 0.9, cargoCapacity: 220,
        armament: ["Heavy Cannon", "V Punch", "Mini-Turret", "Kalibr Missile", "Heavy Tangle", "Barrier Field"], // Versatile heavy combat
        costCategory: "High", description: "Versatile heavy multi-role. Good trader, capable fighter.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.7000, y: 0.7000 }, { x: -0.5000, y: 0.9000 }, { x: -0.9000, y: 0.6000 }, { x: -0.9000, y: -0.6000 }, { x: -0.5000, y: -0.9000 }, { x: 0.7000, y: -0.7000 }],
                fillColor: [140, 140, 150],
                strokeColor: [180, 180, 190],
                strokeW: 2.00
            }
        ],
        fillColor: [140, 140, 150], strokeColor: [180, 180, 190], strokeW: 2,
        typicalCargo: ["Luxury Goods", "Medicine", "Metals", "Chemicals", "Medicine", "Metals", "Chemicals"],
        price: 57300,
        aiRoles: ["HAULER"],
        techLevel: 4 // Advanced
    },
    "ShardInterceptor": {
        name: "Shard Interceptor", role: "Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 8.5, baseThrust: 0.18, baseTurnRate: 0.08727,
        baseHull: 50, baseShield: 100, shieldRecharge: 1.8, cargoCapacity: 4, // Crystalline structure?
        armament: ["Disruptor", "Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Fast fighter incorporating alien technology of crystalline structures.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1741, y: 0.0000 }, { x: 0.5245, y: 0.2433 }, { x: -0.1035, y: 0.1331 }, { x: -0.7045, y: 0.8065 }, { x: -1.1741, y: 0.4935 }, { x: -0.6173, y: 0.0000 }, { x: -1.1741, y: -0.4935 }, { x: -0.7045, y: -0.8065 }, { x: -0.1035, y: -0.1331 }, { x: 0.5245, y: -0.2433 }],
                fillColor: [180, 180, 240],
                strokeColor: [240, 240, 255],
                strokeW: 1.00
            }
        ],
        fillColor: [180, 180, 240],
        strokeColor: [240, 240, 255],
        strokeW: 1.00, // Set in draw func: Blue/Purple/White
        typicalCargo: [],
        price: 30400,
        aiRoles: ["MILITARY", "BOUNTY_HUNTER"],
        techLevel: 5
    },
    "Sidewinder": {
        name: "Sidewinder", role: "Starter", sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRate: 0.06981,
        baseHull: 50, baseShield: 50, shieldRecharge: 1.0, cargoCapacity: 10,
        armament: ["Pulse Laser", "Guardian Missile"], // Starter weapon
        costCategory: "N/A", description: "Cheap, agile starter ship.",
        vertexData: [{ x: 0.9, y: 0 }, { x: -0.7, y: 0.8 }, { x: -0.9, y: 0 }, { x: -0.7, y: -0.8 }],
        fillColor: [180, 100, 20], strokeColor: [220, 150, 50], strokeW: 1,
        typicalCargo: ["Food"],
        price: 9800,
        aiRoles: ["PIRATE"],
        techLevel: 1 // Starter
    },
    "StarlinerCruiser": {
        name: "Starliner Cruiser", role: "Passenger Transport", sizeCategory: "Large", size: 105,
        baseMaxSpeed: 5.5, baseThrust: 0.07, baseTurnRate: 0.02443,
        baseHull: 200, baseShield: 250, shieldRecharge: 1.1, cargoCapacity: 100, // Less cargo, more cabins assumed
        armament: ["Mini-Turret", "Force Blaster", "Halo"], // Defensive passenger ship
        costCategory: "High", description: "Long, sleek vessel designed for passenger comfort.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1500, y: 0.0000 }, { x: 0.9500, y: 0.2000 }, { x: -0.9500, y: 0.3000 }, { x: -1.1500, y: 0.1000 }, { x: -1.1500, y: -0.1000 }, { x: -0.9500, y: -0.3000 }, { x: 0.9500, y: -0.2000 }],
                fillColor: [230, 230, 235],
                strokeColor: [180, 180, 200],
                strokeW: 1.50
            }
        ],
        fillColor: [230, 230, 235], strokeColor: [180, 180, 200], strokeW: 1.5, // White/Silver
        typicalCargo: ["Luxury Goods", "Food", "Medicine", "Food", "Medicine"],
        price: 36000,
        aiRoles: ["HAULER"],
        techLevel: 4 // Advanced
    },
    "Thargoid": {
        name: "Thargoid Interceptor", role: "Alien Combat", sizeCategory: "Large", size: 60,
        baseMaxSpeed: 8.0, baseThrust: 0.20, baseTurnRate: 0.10472,
        baseHull: 200, baseShield: 300, shieldRecharge: 2.0, cargoCapacity: 0,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam"], // Alien arsenal
        costCategory: "N/A", description: "Hostile alien vessel. Highly dangerous.",
        vertexData: [], // Not editable via vertex data in this setup
        typicalCargo: ["Chemicals", "Weapons", "Narcotics"],
        price: 999999,
        aiRoles: ["ALIEN"],
        techLevel: 5 // Alien
    },
    "Type6Transporter": {
        name: "Type-6 Transporter", role: "Trader", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 4.2, baseThrust: 0.06, baseTurnRate: 0.03491,
        baseHull: 150, baseShield: 60, shieldRecharge: 0.8, cargoCapacity: 100,
        armament: ["Twin Pulse", "Mini-Turret"], // Basic trader defense
        costCategory: "Low-Medium", description: "Dedicated Lakon transport vessel. Boxy but efficient.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8500, y: 0.3000 }, { x: 0.8500, y: 0.7000 }, { x: -0.6500, y: 0.8000 }, { x: -0.8500, y: 0.6000 }, { x: -0.8500, y: -0.6000 }, { x: -0.6500, y: -0.8000 }, { x: 0.8500, y: -0.7000 }, { x: 0.8500, y: -0.3000 }],
                fillColor: [210, 160, 70],
                strokeColor: [120, 90, 40],
                strokeW: 1.50
            }
        ],
        fillColor: [210, 160, 70], strokeColor: [120, 90, 40], strokeW: 1.5,
        typicalCargo: ["Food", "Textiles", "Minerals", "Metals", "Machinery"],
        price: 20100,
        aiRoles: ["HAULER"],
        techLevel: 2 // Utility
    },
    "Type9Heavy": {
        name: "Type-9 Heavy", role: "Heavy Trader", sizeCategory: "Very Large", size: 110,
        baseMaxSpeed: 2.5, baseThrust: 0.04, baseTurnRate: 0.01396,
        baseHull: 550, baseShield: 250, shieldRecharge: 0.6, cargoCapacity: 500,
        armament: ["Mini-Turret", "Force Blaster"], // Defensive cargo hauler
        costCategory: "High", description: "The quintessential Lakon heavy cargo hauler. Slow and massive.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9104, y: 0.2000 }, { x: 0.7896, y: 0.8000 }, { x: -0.7104, y: 0.9000 }, { x: -0.9104, y: 0.8000 }, { x: -0.9104, y: -0.8000 }, { x: -0.7104, y: -0.9000 }, { x: 0.7896, y: -0.8000 }, { x: 0.9104, y: -0.2000 }],
                fillColor: [190, 140, 60],
                strokeColor: [110, 80, 30],
                strokeW: 2.50
            }
        ],
        fillColor: [190, 140, 60],
        strokeColor: [110, 80, 30],
        strokeW: 2.50,
        typicalCargo: ["Food", "Textiles", "Minerals", "Metals", "Machinery", "Chemicals", "Computers"],
        price: 43100,
        aiRoles: ["HAULER"],
        techLevel: 3 // Mid-tier
    },
    "Viper": {
        name: "Viper", role: "Fighter", sizeCategory: "Small", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRate: 0.07854,
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Twin Pulse", "Guardian Missile", "Basic Mine"], // Fast fighter
        costCategory: "Medium", description: "Fast, agile police and bounty hunter interceptor.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: -0.6500, y: 0.5000 }, { x: -1.0500, y: 0.3000 }, { x: -1.0500, y: -0.3000 }, { x: -0.6500, y: -0.5000 }],
                fillColor: [210, 210, 220],
                strokeColor: [100, 100, 150],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: -0.1800, y: 0.3000 }, { x: -0.3400, y: 0.1800 }, { x: -0.3400, y: -0.1800 }, { x: -0.1800, y: -0.3000 }, { x: -0.0200, y: -0.2200 }, { x: 0.1800, y: -0.1200 }, { x: 0.3000, y: -0.0000 }, { x: 0.1800, y: 0.1200 }, { x: -0.0200, y: 0.2200 }],
                fillColor: [154, 200, 244],
                strokeColor: [0, 0, 0],
                strokeW: 1.00
            }
        ],
        fillColor: [210, 210, 220], strokeColor: [100, 100, 150], strokeW: 1,
        typicalCargo: ["Computers", "Weapons", "Narcotics"],
        price: 24500,
        aiRoles: ["COMBAT", "MILITARY", "BOUNTY_HUNTER", "GUARD"],
        techLevel: 3 // Mid-tier
    },
    "Vulture": {
        name: "Vulture", role: "Heavy Fighter", sizeCategory: "Small", size: 38,
        baseMaxSpeed: 5.5, baseThrust: 0.14, baseTurnRate: 0.09599,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.6, cargoCapacity: 15,
        armament: ["Heavy Cannon", "Burst Blaster", "Loiter Munition", "Basic Mine"], // Aggressive fighter
        costCategory: "Medium-High", description: "Agile heavy fighter with powerful hardpoints but power-hungry.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9001, y: 0.0951 }, { x: -0.0202, y: 0.3805 }, { x: -0.1034, y: 1.0132 }, { x: -0.6000, y: 1.1822 }, { x: -0.6457, y: 0.4692 }, { x: -0.9001, y: 0.2000 }, { x: -0.9001, y: -0.2000 }, { x: -0.6457, y: -0.4692 }, { x: -0.6000, y: -1.1822 }, { x: -0.1034, y: -1.0132 }, { x: -0.0202, y: -0.3805 }, { x: 0.9001, y: -0.0951 }],
                fillColor: [210, 4, 4],
                strokeColor: [138, 138, 138],
                strokeW: 1.50
            }
        ],
        fillColor: [210, 4, 4],
        strokeColor: [138, 138, 138],
        strokeW: 1.50,
        typicalCargo: ["Computers", "Computers", "Weapons", "Narcotics", "Slaves"],
        price: 31300,
        aiRoles: ["COMBAT", "MILITARY", "BOUNTY_HUNTER", "GUARD"],
        techLevel: 3 // Mid-tier
    },
    "WaspAssault": {
        name: "Wasp Assault Craft", role: "Assault Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster"], // All-out attack fighter
        costCategory: "Low", description: "Aggressive, agile fighter with forward-swept wings.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: -0.0973, y: 0.3081 }, { x: -0.2646, y: 0.9825 }, { x: -0.4994, y: 0.9822 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.4994, y: -0.9822 }, { x: -0.2646, y: -0.9825 }, { x: -0.0973, y: -0.3081 }],
                fillColor: [210, 190, 80],
                strokeColor: [120, 100, 30],
                strokeW: 1.00
            }
        ],
        fillColor: [210, 190, 80],
        strokeColor: [120, 100, 30],
        strokeW: 1.00,
        typicalCargo: ["Computers"],
        price: 12500,
        aiRoles: ["MILITARY", "BOUNTY_HUNTER", "GUARD"],
        techLevel: 2 // Utility
    },
    "Bat": {
        name: "Bat Assault", role: "Assault Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster"], // All-out attack fighter
        costCategory: "Low", description: "Agile fighter with forward-swept wings.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9752, y: -0.1801 }, { x: 1.1813, y: 0.0000 }, { x: 0.9752, y: 0.1801 }, { x: 0.0000, y: 0.3081 }, { x: 0.3537, y: 1.4732 }, { x: -0.4994, y: 0.9822 }, { x: -0.3861, y: 0.5960 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.3861, y: -0.5960 }, { x: -0.4994, y: -0.9822 }, { x: 0.5794, y: -1.4143 }, { x: 0.0000, y: -0.3081 }],
                fillColor: [118, 150, 244],
                strokeColor: [212, 255, 0],
                strokeW: 1.00
            }
        ],
        fillColor: [210, 190, 80],
        strokeColor: [120, 100, 30],
        strokeW: 1.00,
        typicalCargo: ["Computers"],
        price: 12500,
        aiRoles: ["MILITARY", "BOUNTY_HUNTER", "GUARD"],
        techLevel: 2 // Utility
    },
    "HummingBird": {
        name: "Humming Bird", role: "Assault Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster", "Basic Mine"], // All-out attack fighter
        costCategory: "Low", description: "Agile fighter with forward-swept wings.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7893, y: 0.0000 }, { x: -0.2224, y: 0.3805 }, { x: -0.2224, y: 1.0132 }, { x: -0.7107, y: 1.1822 }, { x: -0.4976, y: 0.3415 }, { x: -0.7893, y: 0.2472 }, { x: -0.7893, y: -0.2472 }, { x: -0.4976, y: -0.3415 }, { x: -0.7107, y: -1.1822 }, { x: -0.2224, y: -1.0132 }, { x: -0.2224, y: -0.3805 }, { x: 0.7893, y: 0.0000 }],
                fillColor: [8, 210, 4],
                strokeColor: [138, 138, 138],
                strokeW: 0.50
            }
        ],
        fillColor: [210, 190, 80],
        strokeColor: [120, 100, 30],
        strokeW: 1.00,
        typicalCargo: ["Computers"],
        price: 17500,
        aiRoles: ["MILITARY", "BOUNTY_HUNTER", "GUARD"],
        techLevel: 2 // Utility
    },
    "HarlequinJester": {
        name: "Harlequin Jester", role: "Light Fighter", sizeCategory: "Tiny", size: 22,
        baseMaxSpeed: 8.0, baseThrust: 0.18, baseTurnRate: 0.09,
        baseHull: 40, baseShield: 60, shieldRecharge: 1.4, cargoCapacity: 5,
        armament: ["Pulse Laser", "Twin Pulse"],
        costCategory: "Low-Medium", description: "A nimble and brightly colored Harlequin skirmisher.",
        vertexData: [{ x: 1, y: 0 }, { x: -0.5, y: 0.6 }, { x: -0.2, y: 0 }, { x: -0.5, y: -0.6 }],
        fillColor: [255, 0, 0], strokeColor: [0, 0, 255], strokeW: 1.2,
        typicalCargo: [], price: 32000, techLevel: 2,
        aiRoles: ["PIRATE", "BOUNTY_HUNTER"]
    },
    "HarlequinPierrot": {
        name: "Harlequin Pierrot", role: "Medium Trader", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.04,
        baseHull: 100, baseShield: 80, shieldRecharge: 0.9, cargoCapacity: 80,
        armament: ["Mini-Turret"],
        costCategory: "Medium", description: "A surprisingly capable Harlequin trader, often underestimated.",
        vertexData: [{ x: 0.8, y: 0.5 }, { x: -0.8, y: 0.5 }, { x: -0.8, y: -0.5 }, { x: 0.8, y: -0.5 }],
        fillColor: [255, 255, 0], strokeColor: [0, 128, 0], strokeW: 1.5,
        typicalCargo: ["Luxury Goods", "Narcotics", "Slaves"], price: 55000, techLevel: 3,
        aiRoles: ["HAULER", "PIRATE"]
    },
    "HarlequinColumbine": {
        name: "Harlequin Columbine", role: "Explorer/Scout", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 6.5, baseThrust: 0.12, baseTurnRate: 0.07,
        baseHull: 60, baseShield: 90, shieldRecharge: 1.6, cargoCapacity: 20,
        armament: ["Beam Laser"],
        costCategory: "Medium", description: "A swift Harlequin scout, adept at slipping past blockades.",
        vertexData: [{ x: 0.9, y: 0 }, { x: 0, y: 0.7 }, { x: -0.9, y: 0 }, { x: 0, y: -0.7 }],
        fillColor: [128, 0, 128], strokeColor: [255, 165, 0], strokeW: 1.0,
        typicalCargo: ["Luxury Goods", "Computers"], price: 48000, techLevel: 3,
        aiRoles: ["PIRATE"]
    },
    "HarlequinPantaloon": {
        name: "Harlequin Pantaloon", role: "Heavy Freighter", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRate: 0.025,
        baseHull: 250, baseShield: 150, shieldRecharge: 0.7, cargoCapacity: 250,
        armament: ["Twin Pulse", "Mini-Turret"],
        costCategory: "Medium-High", description: "A surprisingly large and garish Harlequin cargo vessel.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.4000 }, { x: 0.5000, y: 0.8000 }, { x: -0.2369, y: 0.9045 }, { x: -1.0000, y: 0.8000 }, { x: -0.9216, y: 0.0000 }, { x: -1.0000, y: -0.8000 }, { x: -0.2369, y: -0.9045 }, { x: 0.5000, y: -0.8000 }, { x: 1.0000, y: -0.4000 }],
                fillColor: [0, 200, 200],
                strokeColor: [200, 0, 200],
                strokeW: 2.00
            }
        ],
        fillColor: [0, 200, 200], strokeColor: [200, 0, 200], strokeW: 2.0,
        typicalCargo: ["Slaves", "Narcotics", "Weapons"], price: 95000, techLevel: 4,
        aiRoles: ["HAULER", "PIRATE"]
    },
    "HarlequinScaramouche": {
        name: "Harlequin Scaramouche", role: "Multi-Role Combat", sizeCategory: "Medium", size: 55,
        baseMaxSpeed: 5.5, baseThrust: 0.11, baseTurnRate: 0.055,
        baseHull: 150, baseShield: 180, shieldRecharge: 1.3, cargoCapacity: 40,
        armament: ["Multi-Cannon", "Beam Laser", "Railgun Turret", "Loiter Munition", "Barrier Field"],
        costCategory: "High", description: "A versatile and deadly Harlequin ship, adaptable to many combat roles.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.5499, y: 1.0647 }, { x: 0.0000, y: 0.4255 }, { x: -0.3751, y: 0.6831 }, { x: -0.9000, y: 0.6000 }, { x: -0.9000, y: -0.6000 }, { x: -0.3751, y: -0.6831 }, { x: 0.0000, y: -0.4255 }, { x: 0.5499, y: -1.0647 }],
                fillColor: [150, 219, 0],
                strokeColor: [255, 255, 255],
                strokeW: 1.50
            }
        ],
        fillColor: [50, 50, 50], strokeColor: [255, 255, 255], strokeW: 1.5,
        typicalCargo: ["Weapons", "Adv Components"], price: 115000, techLevel: 4,
        aiRoles: ["BOUNTY_HUNTER", "PIRATE"]
    },
    "LocalHopper": {
        name: "Local Hopper", role: "Light Transport", sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 3.5, baseThrust: 0.04, baseTurnRate: 0.05,
        baseHull: 40, baseShield: 0, shieldRecharge: 0.5, cargoCapacity: 15,
        armament: [],
        costCategory: "Very Low", description: "A very basic, slow, and cheap short-range shuttle.",
        vertexData: [{ x: 0.6, y: 0.6 }, { x: -0.6, y: 0.6 }, { x: -0.6, y: -0.6 }, { x: 0.6, y: -0.6 }],
        fillColor: [150, 150, 150], strokeColor: [100, 100, 100], strokeW: 1.0,
        typicalCargo: ["Food", "Textiles"], price: 1800, techLevel: 1,
        aiRoles: ["TRANSPORT"]
    },
    "ErrandRunner": {
        name: "Errand Runner", role: "Light Transport", sizeCategory: "Small", size: 24,
        baseMaxSpeed: 4.0, baseThrust: 0.05, baseTurnRate: 0.045,
        baseHull: 50, baseShield: 10, shieldRecharge: 0.6, cargoCapacity: 25,
        armament: [],
        costCategory: "Low", description: "Slightly more capable than a Hopper, used for inter-station deliveries.",
        vertexData: [{ x: 0.7, y: 0.4 }, { x: -0.7, y: 0.4 }, { x: -0.9, y: 0 }, { x: -0.7, y: -0.4 }, { x: 0.7, y: -0.4 }],
        fillColor: [130, 140, 150], strokeColor: [80, 90, 100], strokeW: 1.0,
        typicalCargo: ["Machinery", "Medicine"], price: 4500, techLevel: 1,
        aiRoles: ["TRANSPORT", "HAULER"]
    },
    "SystemShuttle": {
        name: "System Shuttle", role: "Medium Transport", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 3.8, baseThrust: 0.06, baseTurnRate: 0.04,
        baseHull: 80, baseShield: 20, shieldRecharge: 0.7, cargoCapacity: 40,
        armament: [],
        costCategory: "Low", description: "A common sight carrying goods within a star system.",
        vertexData: [{ x: 0.8, y: 0.5 }, { x: 0.6, y: 0.7 }, { x: -0.8, y: 0.7 }, { x: -0.8, y: -0.7 }, { x: 0.6, y: -0.7 }, { x: 0.8, y: -0.5 }],
        fillColor: [160, 150, 140], strokeColor: [100, 90, 80], strokeW: 1.2,
        typicalCargo: ["Minerals", "Food", "Machinery"], price: 12000, techLevel: 2,
        aiRoles: ["TRANSPORT"]
    },
    "CargoWagon": {
        name: "Cargo Wagon", role: "Heavy Local Transport", sizeCategory: "Medium", size: 45,
        baseMaxSpeed: 3.0, baseThrust: 0.045, baseTurnRate: 0.03,
        baseHull: 120, baseShield: 30, shieldRecharge: 0.5, cargoCapacity: 120,
        armament: [],
        costCategory: "Low-Medium", description: "Slow but spacious, for bulk local transport. Little more than an engine strapped to containers.",
        vertexData: [{ x: 1, y: 0.6 }, { x: 0.8, y: 0.8 }, { x: -0.8, y: 0.8 }, { x: -1, y: 0.6 }, { x: -1, y: -0.6 }, { x: -0.8, y: -0.8 }, { x: 0.8, y: -0.8 }, { x: 1, y: -0.6 }],
        fillColor: [100, 90, 80], strokeColor: [60, 50, 40], strokeW: 1.5,
        typicalCargo: ["Machinery", "Metals", "Chemicals"], price: 22000, techLevel: 2,
        aiRoles: ["TRANSPORT"]
    },
    "PirateCutlass": {
        name: "Pirate Cutlass", role: "Fast Attack Fighter", sizeCategory: "Small", size: 32,
        baseMaxSpeed: 7.2, baseThrust: 0.16, baseTurnRate: 0.08,
        baseHull: 70, baseShield: 90, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Multi-Cannon", "Pulse Laser", "Guardian Missile"],
        costCategory: "Medium", description: "A common, modified fighter favored by pirates for its speed and bite.",
        vertexData: [{ x: 1, y: 0 }, { x: -0.4, y: 0.5 }, { x: -0.8, y: 0.3 }, { x: -0.8, y: -0.3 }, { x: -0.4, y: -0.5 }],
        fillColor: [80, 20, 20], strokeColor: [150, 100, 100], strokeW: 1.0,
        typicalCargo: ["Adv Components", "Narcotics"], price: 45000, techLevel: 3,
        aiRoles: ["PIRATE", "BOUNTY_HUNTER"]
    },
    "PirateMarauder": {
        name: "Pirate Marauder", role: "Raider/Boarding Craft", sizeCategory: "Medium", size: 48,
        baseMaxSpeed: 5.0, baseThrust: 0.09, baseTurnRate: 0.045,
        baseHull: 150, baseShield: 100, shieldRecharge: 0.8, cargoCapacity: 50,
        armament: ["Heavy Cannon", "Twin Pulse", "Mini-Turret", "Guardian Missile"],
        costCategory: "Medium-High", description: "A heavily armed pirate vessel designed for disabling and looting targets.",
        vertexData: [{ x: 0.9, y: 0.3 }, { x: 0.2, y: 0.7 }, { x: -0.9, y: 0.7 }, { x: -0.9, y: -0.7 }, { x: 0.2, y: -0.7 }, { x: 0.9, y: -0.3 }],
        fillColor: [50, 50, 50], strokeColor: [100, 100, 100], strokeW: 1.5,
        typicalCargo: ["Slaves", "Weapons", "Adv Components"], price: 75000, techLevel: 4,
        aiRoles: ["PIRATE"]
    },
    "PirateReaver": {
        name: "Pirate Reaver", role: "Heavy Pirate Cruiser", sizeCategory: "Large", size: 75,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.03,
        baseHull: 300, baseShield: 200, shieldRecharge: 0.9, cargoCapacity: 100,
        armament: ["Multi-Cannon", "Force Blaster", "Mini-Turret", "Railgun Turret", "Guardian Missile"],
        costCategory: "High", description: "A formidable pirate capital ship, often a captured and modified freighter or military vessel.",
        vertexData: [{ x: 1, y: 0.1 }, { x: 0.5, y: 0.6 }, { x: -0.5, y: 0.8 }, { x: -1, y: 0.4 }, { x: -1, y: -0.4 }, { x: -0.5, y: -0.8 }, { x: 0.5, y: -0.6 }, { x: 1, y: -0.1 }],
        fillColor: [40, 60, 40], strokeColor: [80, 100, 80], strokeW: 2.0,
        typicalCargo: ["Narcotics", "Slaves", "Weapons"], price: 140000, techLevel: 5,
        aiRoles: ["PIRATE"]
    },
    "PirateBrigand": {
        name: "Pirate Brigand", role: "Fast Cargo Thief", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 6.8, baseThrust: 0.13, baseTurnRate: 0.065,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.1, cargoCapacity: 30,
        armament: ["Pulse Laser", "Mini-Turret"],
        costCategory: "Medium", description: "A swift pirate ship designed for quick raids on unsuspecting haulers.",
        vertexData: [{ x: 0.8, y: 0 }, { x: 0.2, y: 0.4 }, { x: -0.8, y: 0.4 }, { x: -0.8, y: -0.4 }, { x: 0.2, y: -0.4 }],
        fillColor: [100, 60, 20], strokeColor: [150, 100, 50], strokeW: 1.0,
        typicalCargo: ["Food", "Textiles", "Minerals"], price: 38000, techLevel: 2,
        aiRoles: ["PIRATE"]
    },
    "PirateInterceptorMKII": {
        name: "Pirate Interceptor MkII", role: "Heavy Interceptor", sizeCategory: "Medium", size: 42,
        baseMaxSpeed: 7.0, baseThrust: 0.15, baseTurnRate: 0.075,
        baseHull: 100, baseShield: 150, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Beam Laser", "Multi-Cannon", "Disruptor"],
        costCategory: "Medium-High", description: "An upgraded pirate interceptor, bristling with stolen tech.",
        vertexData: [{ x: 1.1, y: 0 }, { x: -0.2, y: 0.5 }, { x: -0.9, y: 0.5 }, { x: -0.7, y: 0 }, { x: -0.9, y: -0.5 }, { x: -0.2, y: -0.5 }],
        fillColor: [60, 20, 60], strokeColor: [120, 80, 120], strokeW: 1.3,
        typicalCargo: ["Narcotics", "Weapons"], price: 68000, techLevel: 4,
        aiRoles: ["PIRATE", "BOUNTY_HUNTER"]
    },
    "SeparatistLiberator": {
        name: "Separatist Liberator", role: "Assault Fighter", sizeCategory: "Small", size: 36,
        baseMaxSpeed: 6.5, baseThrust: 0.14, baseTurnRate: 0.07,
        baseHull: 90, baseShield: 110, shieldRecharge: 1.2, cargoCapacity: 12,
        armament: ["Multi-Cannon", "Burst Blaster"],
        costCategory: "Medium", description: "Core fighter of Separatist cells, rugged and reliable.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.6000, y: 0.6000 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.6000, y: -0.6000 }],
                fillColor: [100, 40, 40],
                strokeColor: [160, 100, 100],
                strokeW: 1.20
            },
            {
                vertexData: [{ x: 0.2200, y: 0.0000 }, { x: 0.1100, y: 0.1905 }, { x: -0.1100, y: 0.1905 }, { x: -0.2200, y: 0.0000 }, { x: -0.1100, y: -0.1905 }, { x: 0.1100, y: -0.1905 }],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [100, 40, 40], strokeColor: [160, 100, 100], strokeW: 1.2,
        typicalCargo: ["Weapons", "Food"], price: 52000, techLevel: 3,
        aiRoles: ["SEPARATIST"]
    },
    "SeparatistDefiant": {
        name: "Separatist Defiant", role: "Gunship", sizeCategory: "Medium", size: 58,
        baseMaxSpeed: 4.8, baseThrust: 0.1, baseTurnRate: 0.04,
        baseHull: 250, baseShield: 180, shieldRecharge: 0.9, cargoCapacity: 30,
        armament: ["Heavy Cannon", "Railgun Turret", "Twin Pulse", "Guardian Missile"],
        costCategory: "Medium-High", description: "A heavily armed Separatist gunship, designed to break blockades.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.4000 }, { x: 0.4000, y: 0.8000 }, { x: -0.7765, y: 0.8000 }, { x: -0.9000, y: 0.4000 }, { x: -0.9000, y: -0.4000 }, { x: -0.7765, y: -0.8000 }, { x: 0.4000, y: -0.8000 }, { x: 0.9000, y: -0.4000 }],
                fillColor: [70, 70, 70],
                strokeColor: [120, 120, 120],
                strokeW: 1.80
            }
        ],
        fillColor: [70, 70, 70], strokeColor: [120, 120, 120], strokeW: 1.8,
        typicalCargo: ["Weapons", "Chemicals"], price: 90000, techLevel: 4,
        aiRoles: ["SEPARATIST"]
    },
    "SeparatistOutlander": {
        name: "Separatist Outlander", role: "Long-Range Scout/Raider", sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.5, baseThrust: 0.09, baseTurnRate: 0.05,
        baseHull: 120, baseShield: 150, shieldRecharge: 1.3, cargoCapacity: 40, // For supplies or loot
        armament: ["Beam Laser", "Mini-Turret"],
        costCategory: "Medium", description: "Separatist vessel for deep space operations and hit-and-run attacks.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.3000, y: 0.3000 }, { x: -0.2000, y: 0.7000 }, { x: -1.0000, y: 0.3000 }, { x: -1.0000, y: -0.3000 }, { x: -0.2000, y: -0.7000 }, { x: 0.3000, y: -0.3000 }],
                fillColor: [60, 80, 60],
                strokeColor: [100, 120, 100],
                strokeW: 1.40
            },
            {
                vertexData: [{ x: -0.3532, y: 0.0000 }, { x: -0.4632, y: 0.1905 }, { x: -0.6832, y: 0.1905 }, { x: -0.7932, y: 0.0000 }, { x: -0.6832, y: -0.1905 }, { x: -0.4632, y: -0.1905 }],
                fillColor: [212, 22, 22],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [60, 80, 60], strokeColor: [100, 120, 100], strokeW: 1.4, // Olive Drab
        typicalCargo: ["Computers", "Adv Components", "Food"], price: 70000, techLevel: 4,
        aiRoles: ["SEPARATIST", "PIRATE"]
    },
    "SeparatistVanguard": {
        name: "Separatist Vanguard", role: "Heavy Assault Cruiser", sizeCategory: "Large", size: 85,
        baseMaxSpeed: 4.2, baseThrust: 0.08, baseTurnRate: 0.035,
        baseHull: 400, baseShield: 300, shieldRecharge: 1.0, cargoCapacity: 80,
        armament: ["Force Blaster", "Railgun Turret", "Quad Pulse", "Guardian Missile"],
        costCategory: "High", description: "Lead ship in Separatist fleets, heavily armed and armored.",
        vertexData: [{ x: 1, y: 0.2 }, { x: 0.6, y: 0.7 }, { x: -0.6, y: 0.9 }, { x: -1, y: 0.5 }, { x: -1, y: -0.5 }, { x: -0.6, y: -0.9 }, { x: 0.6, y: -0.7 }, { x: 1, y: -0.2 }], // Imposing, angular
        fillColor: [50, 30, 30], strokeColor: [100, 80, 80], strokeW: 2.2, // Dark Brownish Red
        typicalCargo: ["Weapons", "Machinery"], price: 160000, techLevel: 5,
        aiRoles: ["COMBAT", "SEPARATIST"]
    },
    "SeparatistPartisan": {
        name: "Separatist Partisan", role: "Light Skirmisher", sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 7.5, baseThrust: 0.17, baseTurnRate: 0.085,
        baseHull: 35, baseShield: 45, shieldRecharge: 1.1, cargoCapacity: 4,
        armament: ["Pulse Laser"],
        costCategory: "Low", description: "A small, expendable fighter used by Separatist militias.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: -0.7000, y: 0.5000 }, { x: -0.9000, y: 0.0000 }, { x: -0.7000, y: -0.5000 }],
                fillColor: [80, 80, 60],
                strokeColor: [120, 120, 100],
                strokeW: 0.80
            },
            {
                vertexData: [{ x: -0.2265, y: 0.0000 }, { x: -0.3365, y: 0.1905 }, { x: -0.5565, y: 0.1905 }, { x: -0.6665, y: 0.0000 }, { x: -0.5565, y: -0.1905 }, { x: -0.3365, y: -0.1905 }],
                fillColor: [182, 17, 17],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [80, 80, 60], strokeColor: [120, 120, 100], strokeW: 0.8, // Muddy Yellow
        typicalCargo: [], price: 28000, techLevel: 2,
        aiRoles: ["COMBAT", "SEPARATIST", "GUARD"]
    },
    "SeparatistBulwark": {
        name: "Separatist Bulwark", role: "Mobile Defense Platform", sizeCategory: "Very Large", size: 130,
        baseMaxSpeed: 2.5, baseThrust: 0.04, baseTurnRate: 0.015,
        baseHull: 700, baseShield: 500, shieldRecharge: 0.8, cargoCapacity: 150,
        armament: ["Railgun Turret", "Mini-Turret", "Wide Scatter", "Avenger Missile", "Barrier Field"],
        costCategory: "Very High", description: "A heavily fortified Separatist ship, slow but incredibly tough.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.7000 }, { x: 0.7000, y: 1.0000 }, { x: -0.7000, y: 1.0000 }, { x: -1.0000, y: 0.7000 }, { x: -1.0000, y: -0.7000 }, { x: -0.7000, y: -1.0000 }, { x: 0.7000, y: -1.0000 }, { x: 1.0000, y: -0.7000 }],
                fillColor: [52, 65, 64],
                strokeColor: [90, 90, 100],
                strokeW: 3.00
            },
            {
                vertexData: [{ x: -0.2512, y: -0.1969 }, { x: -0.3612, y: -0.0064 }, { x: -0.5812, y: -0.0064 }, { x: -0.6912, y: -0.1969 }, { x: -0.5812, y: -0.3874 }, { x: -0.3612, y: -0.3874 }],
                fillColor: [212, 12, 42],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: -0.2512, y: 0.1969 }, { x: -0.3612, y: 0.0064 }, { x: -0.5812, y: 0.0064 }, { x: -0.6912, y: 0.1969 }, { x: -0.5812, y: 0.3874 }, { x: -0.3612, y: 0.3874 }],
                fillColor: [212, 12, 42],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: -0.3522, y: 0.0016 }, { x: -0.2422, y: 0.1922 }, { x: -0.0222, y: 0.1922 }, { x: 0.0878, y: 0.0016 }, { x: -0.0222, y: -0.1889 }, { x: -0.2422, y: -0.1889 }],
                fillColor: [212, 12, 42],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [40, 40, 50], strokeColor: [90, 90, 100], strokeW: 3.0,
        typicalCargo: ["Metals", "Machinery"], price: 250000, techLevel: 5,
        aiRoles: ["COMBAT", "SEPARATIST"],
        canDualEngage: true // Large ships can engage two targets simultaneously
    },
    "SeparatistShadow": {
        name: "Separatist Shadow", role: "Stealth Infiltrator", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 6.0, baseThrust: 0.11, baseTurnRate: 0.06,
        baseHull: 50, baseShield: 70, shieldRecharge: 1.2, cargoCapacity: 10,
        armament: ["Pulse Laser", "Disruptor"],
        costCategory: "Medium-High", description: "Separatist ship with basic stealth capabilities, used for infiltration and sabotage.",
        vertexData: [{ x: 1, y: 0 }, { x: -0.3, y: 0.4 }, { x: -0.8, y: 0.1 }, { x: -0.8, y: -0.1 }, { x: -0.3, y: -0.4 }],
        fillColor: [30, 30, 30], strokeColor: [70, 70, 70], strokeW: 1.0,
        typicalCargo: ["Adv Components", "Computers"], price: 65000, techLevel: 4,
        aiRoles: ["PIRATE", "SEPARATIST"]
    },
    "SeparatistSupplyRunner": {
        name: "Separatist Supply Runner", role: "Armored Transport", sizeCategory: "Medium", size: 52,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.035,
        baseHull: 180, baseShield: 120, shieldRecharge: 0.8, cargoCapacity: 100,
        armament: ["Twin Pulse", "Mini-Turret"],
        costCategory: "Medium", description: "A Separatist transport designed to get vital supplies through hostile territory.",
        vertexData: [{ x: 0.9, y: 0.6 }, { x: 0.7, y: 0.8 }, { x: -0.7, y: 0.8 }, { x: -0.9, y: 0.6 }, { x: -0.9, y: -0.6 }, { x: -0.7, y: -0.8 }, { x: 0.7, y: -0.8 }, { x: 0.9, y: -0.6 }],
        fillColor: [90, 70, 50], strokeColor: [130, 110, 90], strokeW: 1.6,
        typicalCargo: ["Food", "Medicine", "Weapons", "Chemicals"], price: 48000, techLevel: 3,
        aiRoles: ["HAULER"]
    },
    "ImperialGuardian": {
        name: "Imperial Guardian", role: "System Patrol Cutter", sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.8, baseThrust: 0.1, baseTurnRate: 0.05,
        baseHull: 160, baseShield: 200, shieldRecharge: 1.5, cargoCapacity: 25,
        armament: ["Beam Laser", "Twin Pulse", "Mini-Turret"],
        costCategory: "Medium-High", description: "A common Imperial patrol ship, faster than the ACAB, well-shielded.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.5000, y: 0.4000 }, { x: -0.5000, y: 0.7000 }, { x: -1.0000, y: 0.3000 }, { x: -1.0000, y: -0.3000 }, { x: -0.5000, y: -0.7000 }, { x: 0.5000, y: -0.4000 }],
                fillColor: [220, 220, 240],
                strokeColor: [100, 120, 200],
                strokeW: 1.50
            },
            {
                vertexData: [{ x: -0.4091, y: 0.0000 }, { x: -0.5682, y: 0.0588 }, { x: -0.5750, y: 0.2283 }, { x: -0.6800, y: 0.0951 }, { x: -0.8433, y: 0.1411 }, { x: -0.7491, y: 0.0000 }, { x: -0.8433, y: -0.1411 }, { x: -0.6800, y: -0.0951 }, { x: -0.5750, y: -0.2283 }, { x: -0.5682, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],
        fillColor: [220, 220, 240], strokeColor: [100, 120, 200], strokeW: 1.5,
        typicalCargo: ["Slaves", "Narcotics"], price: 85000, techLevel: 4,
        aiRoles: ["COMBAT", "IMPERIAL"]
    },
    "ImperialPaladin": {
        name: "Imperial Paladin", role: "Heavy Assault Frigate", sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.5, baseThrust: 0.09, baseTurnRate: 0.038,
        baseHull: 350, baseShield: 400, shieldRecharge: 1.7, cargoCapacity: 70,
        armament: ["Heavy Cannon", "Mini-Turret", "Force Blaster", "Heavy Tangle", "Halo"],
        costCategory: "High", description: "An Imperial warship known for its powerful shields and broadside capability.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8444, y: 0.0813 }, { x: 0.3896, y: 0.3191 }, { x: -0.3614, y: 0.3732 }, { x: -0.5719, y: 0.6322 }, { x: -0.8444, y: 0.5000 }, { x: -0.8444, y: -0.5000 }, { x: -0.5719, y: -0.6322 }, { x: -0.3614, y: -0.3732 }, { x: 0.3896, y: -0.3191 }, { x: 0.8444, y: -0.0813 }],
                fillColor: [240, 240, 250],
                strokeColor: [180, 180, 100],
                strokeW: 2.00
            },
            {
                vertexData: [{ x: -0.3352, y: 0.0041 }, { x: -0.4943, y: 0.0629 }, { x: -0.5010, y: 0.2323 }, { x: -0.6061, y: 0.0992 }, { x: -0.7693, y: 0.1452 }, { x: -0.6752, y: 0.0041 }, { x: -0.7693, y: -0.1370 }, { x: -0.6061, y: -0.0910 }, { x: -0.5010, y: -0.2242 }, { x: -0.4943, y: -0.0547 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],
        fillColor: [240, 240, 250], strokeColor: [180, 180, 100], strokeW: 2.0,
        typicalCargo: ["Weapons", "Luxury Goods"], price: 170000, techLevel: 4,
        aiRoles: ["COMBAT", "IMPERIAL"],
        canDualEngage: true // Large ships can engage two targets simultaneously
    },
    "ImperialLancer": {
        name: "Imperial Lancer", role: "Fast Attack Interceptor", sizeCategory: "Small", size: 34,
        baseMaxSpeed: 8.2, baseThrust: 0.19, baseTurnRate: 0.085,
        baseHull: 70, baseShield: 130, shieldRecharge: 1.6, cargoCapacity: 8,
        armament: ["Twin Pulse", "Sniper Rail"],
        costCategory: "Medium", description: "A high-speed Imperial interceptor designed for surgical strikes.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.5000, y: 0.3000 }, { x: -1.0000, y: 0.1000 }, { x: -1.0000, y: -0.1000 }, { x: -0.5000, y: -0.3000 }],
                fillColor: [200, 210, 230],
                strokeColor: [80, 100, 180],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: -0.3304, y: 0.0000 }, { x: -0.4895, y: 0.0588 }, { x: -0.4962, y: 0.2283 }, { x: -0.6013, y: 0.0951 }, { x: -0.7645, y: 0.1411 }, { x: -0.6704, y: 0.0000 }, { x: -0.7645, y: -0.1411 }, { x: -0.6013, y: -0.0951 }, { x: -0.4962, y: -0.2283 }, { x: -0.4895, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],
        fillColor: [200, 210, 230], strokeColor: [80, 100, 180], strokeW: 1.0,
        typicalCargo: [], price: 62000, techLevel: 4,
        aiRoles: ["COMBAT", "IMPERIAL", "GUARD"]
    },
    "ImperialJusticar": {
        name: "Imperial Justicar", role: "Heavy Gunboat", sizeCategory: "Medium", size: 62,
        baseMaxSpeed: 5.0, baseThrust: 0.11, baseTurnRate: 0.042,
        baseHull: 280, baseShield: 320, shieldRecharge: 1.4, cargoCapacity: 40,
        armament: ["Quad Pulse", "Railgun Turret", "Beam Laser", "Heavy Tangle", "Barrier Field"],
        costCategory: "High", description: "A heavily armed Imperial vessel used for enforcing blockades and punitive actions.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.5000 }, { x: 0.5000, y: 0.9000 }, { x: -0.5000, y: 0.9000 }, { x: -0.9000, y: 0.5000 }, { x: -0.9000, y: -0.5000 }, { x: -0.5000, y: -0.9000 }, { x: 0.5000, y: -0.9000 }, { x: 0.9000, y: -0.5000 }],
                fillColor: [180, 190, 210],
                strokeColor: [120, 140, 190],
                strokeW: 1.80
            },
            {
                vertexData: [{ x: -0.7571, y: -0.4875 }, { x: 0.0000, y: -0.3393 }, { x: 0.7571, y: -0.4875 }, { x: -0.3319, y: -0.7334 }],
                fillColor: [255, 255, 255],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: -0.3956, y: 0.7037 }, { x: 0.7252, y: 0.4089 }, { x: 0.0000, y: 0.2726 }, { x: -0.7252, y: 0.4089 }],
                fillColor: [255, 255, 255],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            },
            {
                vertexData: [{ x: -0.3938, y: 0.0000 }, { x: -0.5529, y: 0.0588 }, { x: -0.5596, y: 0.2283 }, { x: -0.6647, y: 0.0951 }, { x: -0.8279, y: 0.1411 }, { x: -0.7338, y: 0.0000 }, { x: -0.8279, y: -0.1411 }, { x: -0.6647, y: -0.0951 }, { x: -0.5596, y: -0.2283 }, { x: -0.5529, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],
        fillColor: [180, 190, 210], strokeColor: [120, 140, 190], strokeW: 1.8,
        typicalCargo: ["Weapons", "Slaves"], price: 125000, techLevel: 4,
        aiRoles: ["COMBAT", "IMPERIAL"]
    },
    "ImperialEnvoy": {
        name: "Imperial Envoy", role: "Diplomatic Transport", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 6.0, baseThrust: 0.08, baseTurnRate: 0.03,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.8, cargoCapacity: 50,
        armament: ["Mini-Turret", "Pulse Laser"],
        costCategory: "High", description: "An unarmed or lightly armed Imperial ship for diplomatic missions, fast and well-shielded.",

        vertexLayers: [
            {
                vertexData: [{ x: 1.1000, y: 0.0000 }, { x: 0.8000, y: 0.3000 }, { x: -0.8000, y: 0.4000 }, { x: -1.1000, y: 0.0000 }, { x: -0.8000, y: -0.4000 }, { x: 0.8000, y: -0.3000 }],
                fillColor: [250, 250, 255],
                strokeColor: [200, 180, 120],
                strokeW: 1.50
            },
            {
                vertexData: [{ x: -0.4994, y: 0.0000 }, { x: -0.6585, y: 0.0588 }, { x: -0.6652, y: 0.2283 }, { x: -0.7703, y: 0.0951 }, { x: -0.9336, y: 0.1411 }, { x: -0.8394, y: 0.0000 }, { x: -0.9336, y: -0.1411 }, { x: -0.7703, y: -0.0951 }, { x: -0.6652, y: -0.2283 }, { x: -0.6585, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],

        fillColor: [250, 250, 255], strokeColor: [200, 180, 120], strokeW: 1.5,
        typicalCargo: ["Luxury Goods"], price: 105000, techLevel: 4,
        aiRoles: ["IMPERIAL"]
    },
    "ImperialSentinel": {
        name: "Imperial Sentinel", role: "Border Patrol Corvette", sizeCategory: "Large", size: 78,
        baseMaxSpeed: 5.2, baseThrust: 0.095, baseTurnRate: 0.04,
        baseHull: 300, baseShield: 350, shieldRecharge: 1.6, cargoCapacity: 60,
        armament: ["Mini-Turret", "Multi-Cannon", "Twin Pulse"],
        costCategory: "High", description: "A dedicated Imperial corvette for long-duration border patrols and customs enforcement.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.3000 }, { x: 0.4000, y: 0.6000 }, { x: -0.4000, y: 0.8000 }, { x: -1.0000, y: 0.6000 }, { x: -1.0000, y: -0.6000 }, { x: -0.4000, y: -0.8000 }, { x: 0.4000, y: -0.6000 }, { x: 1.0000, y: -0.3000 }],
                fillColor: [210, 215, 225],
                strokeColor: [90, 110, 170],
                strokeW: 1.90
            },
            {
                vertexData: [{ x: -0.3762, y: 0.0000 }, { x: -0.5353, y: 0.0588 }, { x: -0.5420, y: 0.2283 }, { x: -0.6471, y: 0.0951 }, { x: -0.8103, y: 0.1411 }, { x: -0.7162, y: 0.0000 }, { x: -0.8103, y: -0.1411 }, { x: -0.6471, y: -0.0951 }, { x: -0.5420, y: -0.2283 }, { x: -0.5353, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],
        fillColor: [210, 215, 225], strokeColor: [90, 110, 170], strokeW: 1.9,
        typicalCargo: ["Adv Components", "Slaves"], price: 145000, techLevel: 5,
        aiRoles: ["COMBAT", "IMPERIAL"]
    },
    "ImperialEagleMkII": {
        name: "Imperial Eagle MkII", role: "Superiority Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 7.8, baseThrust: 0.18, baseTurnRate: 0.092,
        baseHull: 60, baseShield: 140, shieldRecharge: 1.7, cargoCapacity: 6,
        armament: ["Twin Pulse", "Beam Laser"],
        costCategory: "Medium", description: "An upgraded version of the classic Eagle, exclusive to Imperial pilots. Even faster and better shielded.",

        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.6000, y: 0.4000 }, { x: -0.9000, y: 0.2000 }, { x: -0.9000, y: -0.2000 }, { x: -0.6000, y: -0.4000 }],
                fillColor: [230, 230, 245],
                strokeColor: [150, 150, 220],
                strokeW: 1.10
            },
            {
                vertexData: [{ x: -0.3680, y: 0.0000 }, { x: -0.5271, y: 0.0588 }, { x: -0.5338, y: 0.2283 }, { x: -0.6389, y: 0.0951 }, { x: -0.8022, y: 0.1411 }, { x: -0.7080, y: 0.0000 }, { x: -0.8022, y: -0.1411 }, { x: -0.6389, y: -0.0951 }, { x: -0.5338, y: -0.2283 }, { x: -0.5271, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],

        fillColor: [230, 230, 245], strokeColor: [150, 150, 220], strokeW: 1.1,
        typicalCargo: [], price: 58000, techLevel: 3,
        aiRoles: ["COMBAT", "IMPERIAL", "GUARD"]
    },
    "ImperialCutterLite": {
        name: "Imperial Cutter Lite", role: "Fast Armed Trader", sizeCategory: "Large", size: 80,
        baseMaxSpeed: 6.5, baseThrust: 0.09, baseTurnRate: 0.028,
        baseHull: 200, baseShield: 280, shieldRecharge: 1.6, cargoCapacity: 150,
        armament: ["Beam Laser", "Twin Pulse", "Mini-Turret"],
        costCategory: "High", description: "A smaller, more agile version of the Cutter, still capable of significant cargo and defense.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1000, y: 0.0000 }, { x: 0.7000, y: 0.2500 }, { x: 0.0000, y: 0.7000 }, { x: -0.9000, y: 0.6000 }, { x: -1.1000, y: 0.3000 }, { x: -1.1000, y: -0.3000 }, { x: -0.9000, y: -0.6000 }, { x: 0.0000, y: -0.7000 }, { x: 0.7000, y: -0.2500 }],
                fillColor: [225, 230, 240],
                strokeColor: [120, 160, 210],
                strokeW: 1.70
            },
            {
                vertexData: [{ x: -0.4765, y: 0.0000 }, { x: -0.6356, y: 0.0588 }, { x: -0.6423, y: 0.2283 }, { x: -0.7474, y: 0.0951 }, { x: -0.9107, y: 0.1411 }, { x: -0.8165, y: 0.0000 }, { x: -0.9107, y: -0.1411 }, { x: -0.7474, y: -0.0951 }, { x: -0.6423, y: -0.2283 }, { x: -0.6356, y: -0.0588 }],
                fillColor: [220, 200, 80],
                strokeColor: [120, 90, 20],
                strokeW: 1.00
            }
        ],
        fillColor: [225, 230, 240], strokeColor: [120, 160, 210], strokeW: 1.7,
        typicalCargo: ["Luxury Goods", "Adv Components", "Computers"], price: 130000, techLevel: 5,
        aiRoles: ["COMBAT", "IMPERIAL"]
    },
    "ObeliskSentinel": {
        name: "Obelisk Sentinel (Alien)", role: "Alien Guardian", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 6.2, baseThrust: 0.13, baseTurnRate: 0.075,
        baseHull: 120, baseShield: 180, shieldRecharge: 2.0, cargoCapacity: 0,
        armament: ["Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Tall, monolithic alien ship with layered crystal armor.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.0000, y: 1.1037 }, { x: 0.4791, y: 0.7567 }, { x: 0.4276, y: 0.0000 }, { x: 0.4791, y: -0.7567 }, { x: 0.0000, y: -1.1037 }, { x: -0.4937, y: -0.7636 }, { x: -0.4276, y: 0.0000 }, { x: -0.4937, y: 0.7636 }],
                fillColor: [60, 255, 180],
                strokeColor: [0, 200, 120],
                strokeW: 2.00
            },
            {
                vertexData: [{ x: 0.9369, y: 0.0000 }, { x: 0.6113, y: -0.1659 }, { x: -0.9369, y: 0.0000 }, { x: 0.6113, y: 0.1659 }],
                fillColor: [0, 255, 120],
                strokeColor: [0, 180, 90],
                strokeW: 1.00
            }
        ],
        fillColor: [60, 255, 180], strokeColor: [0, 200, 120], strokeW: 2.0,
        typicalCargo: ["Chemicals", "Metals"], price: 999999, aiRoles: ["ALIEN"]
    },
    "SpiralWarden": {
        name: "Spiral Warden (Alien)", role: "Alien Interceptor", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 8.0, baseThrust: 0.19, baseTurnRate: 0.11,
        baseHull: 60, baseShield: 90, shieldRecharge: 1.7, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with spiral, shell-like armor.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.7, y: 0.7 }, { x: 1.0, y: 0.0 }, { x: 0.7, y: -0.7 }, { x: 0.0, y: -1.0 }, { x: -0.7, y: -0.7 }, { x: -1.0, y: 0.0 }, { x: -0.7, y: 0.7 }], fillColor: [180, 255, 220], strokeColor: [0, 200, 180], strokeW: 1.2 },
            { vertexData: [{ x: 0.0, y: 0.5 }, { x: 0.35, y: 0.35 }, { x: 0.5, y: 0.0 }, { x: 0.35, y: -0.35 }, { x: 0.0, y: -0.5 }, { x: -0.35, y: -0.35 }, { x: -0.5, y: 0.0 }, { x: -0.35, y: 0.35 }], fillColor: [100, 255, 200], strokeColor: [0, 180, 150], strokeW: 0.8 }
        ],
        fillColor: [180, 255, 220], strokeColor: [0, 200, 180], strokeW: 1.2,
        typicalCargo: ["Chemicals"], price: 999999, aiRoles: ["ALIEN"]
    },
    "TriadProbe": {
        name: "Triad Probe (Alien)", role: "Alien Scout", sizeCategory: "Tiny", size: 16,
        baseMaxSpeed: 9.0, baseThrust: 0.25, baseTurnRate: 0.15,
        baseHull: 25, baseShield: 30, shieldRecharge: 1.0, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Three-lobed alien probe, fast and evasive.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.5, y: 0.5 }, { x: 1.0, y: 0.0 }, { x: 0.5, y: -0.5 }, { x: 0.0, y: -1.0 }, { x: -0.5, y: -0.5 }, { x: -1.0, y: 0.0 }, { x: -0.5, y: 0.5 }], fillColor: [200, 255, 180], strokeColor: [0, 200, 100], strokeW: 1.0 },
            { vertexData: [{ x: 0.0, y: 0.3 }, { x: 0.2, y: 0.0 }, { x: 0.0, y: -0.3 }, { x: -0.2, y: 0.0 }], fillColor: [255, 255, 100], strokeColor: [200, 200, 0], strokeW: 1.0 }
        ],

        fillColor: [200, 255, 180], strokeColor: [0, 200, 100], strokeW: 1.0,
        typicalCargo: [], price: 999999, aiRoles: ["ALIEN"]
    },
    "HexaManta": {
        name: "Hexa-Manta (Alien)", role: "Alien Cruiser", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 6.0, baseThrust: 0.12, baseTurnRate: 0.07,
        baseHull: 220, baseShield: 320, shieldRecharge: 2.2, cargoCapacity: 30,
        armament: ["Disruptor", "Force Blaster"],
        costCategory: "N/A", description: "Wide, six-winged alien ship with layered fins.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.8, y: 0.6 }, { x: 1.0, y: 0.0 }, { x: 0.8, y: -0.6 }, { x: 0.0, y: -1.0 }, { x: -0.8, y: -0.6 }, { x: -1.0, y: 0.0 }, { x: -0.8, y: 0.6 }], fillColor: [0, 255, 180], strokeColor: [0, 180, 120], strokeW: 2.0 },
            { vertexData: [{ x: 0.0, y: 0.7 }, { x: 0.42, y: 0.56 }, { x: 0.7, y: 0.0 }, { x: 0.42, y: -0.56 }, { x: 0.0, y: -0.7 }, { x: -0.42, y: -0.56 }, { x: -0.7, y: 0.0 }, { x: -0.42, y: 0.56 }], fillColor: [255, 100, 255], strokeColor: [180, 0, 180], strokeW: 2.0 },
            { vertexData: [{ x: 0.0, y: 0.3 }, { x: 0.21, y: 0.21 }, { x: 0.3, y: 0.0 }, { x: 0.21, y: -0.21 }, { x: 0.0, y: -0.3 }, { x: -0.21, y: -0.21 }, { x: -0.3, y: 0.0 }, { x: -0.21, y: 0.21 }], fillColor: [255, 255, 255], strokeColor: [180, 0, 180], strokeW: 1.0 }
        ],
        fillColor: [0, 255, 180], strokeColor: [0, 180, 120], strokeW: 2.0,
        typicalCargo: ["Metals", "Chemicals"], price: 999999, aiRoles: ["ALIEN"]
    },
    "FractalRay": {
        name: "Fractal Ray (Alien)", role: "Alien Destroyer", sizeCategory: "Large", size: 85,
        baseMaxSpeed: 7.0, baseThrust: 0.15, baseTurnRate: 0.09,
        baseHull: 260, baseShield: 350, shieldRecharge: 2.5, cargoCapacity: 40,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with fractal, lightning-like arms.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.5, y: 0.5 }, { x: 1.0, y: 0.0 }, { x: 0.5, y: -0.5 }, { x: 0.0, y: -1.0 }, { x: -0.5, y: -0.5 }, { x: -1.0, y: 0.0 }, { x: -0.5, y: 0.5 }], fillColor: [255, 255, 180], strokeColor: [200, 200, 0], strokeW: 2.0 },
            { vertexData: [{ x: 0.0, y: 0.3 }, { x: 0.2, y: 0.0 }, { x: 0.0, y: -0.3 }, { x: -0.2, y: 0.0 }], fillColor: [255, 255, 100], strokeColor: [200, 200, 0], strokeW: 1.0 }
        ],
        fillColor: [255, 255, 180], strokeColor: [200, 200, 0], strokeW: 2.0,
        typicalCargo: ["Weapons", "Chemicals"], price: 999999, aiRoles: ["ALIEN"]
    },
    "PetalSpinner": {
        name: "Petal Spinner (Alien)", role: "Alien Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 8.2, baseThrust: 0.21, baseTurnRate: 0.12,
        baseHull: 55, baseShield: 70, shieldRecharge: 1.5, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with spinning, flower-like petals.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.5, y: 0.5 }, { x: 1.0, y: 0.0 }, { x: 0.5, y: -0.5 }, { x: 0.0, y: -1.0 }, { x: -0.5, y: -0.5 }, { x: -1.0, y: 0.0 }, { x: -0.5, y: 0.5 }], fillColor: [255, 180, 255], strokeColor: [180, 0, 180], strokeW: 1.2 },
            { vertexData: [{ x: 0.0, y: 0.2 }, { x: 0.1, y: 0.0 }, { x: 0.0, y: -0.2 }, { x: -0.1, y: 0.0 }], fillColor: [255, 100, 255], strokeColor: [180, 0, 180], strokeW: 0.7 }
        ],
        fillColor: [255, 180, 255], strokeColor: [180, 0, 180], strokeW: 1.2,
        typicalCargo: [], price: 999999, aiRoles: ["ALIEN"]
    },
    "CrescentMarauder": {
        name: "Crescent Marauder (Alien)", role: "Alien Raider", sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 7.5, baseThrust: 0.16, baseTurnRate: 0.10,
        baseHull: 100, baseShield: 120, shieldRecharge: 1.8, cargoCapacity: 10,
        armament: ["Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with a crescent, blade-like hull.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.8, y: 0.3 }, { x: 1.0, y: 0.0 }, { x: 0.8, y: -0.3 }, { x: 0.0, y: -1.0 }, { x: -0.8, y: -0.3 }, { x: -1.0, y: 0.0 }, { x: -0.8, y: 0.3 }], fillColor: [180, 255, 255], strokeColor: [0, 180, 180], strokeW: 1.5 },
            { vertexData: [{ x: 0.0, y: 0.7 }, { x: 0.56, y: 0.21 }, { x: 0.7, y: 0.0 }, { x: 0.56, y: -0.21 }, { x: 0.0, y: -0.7 }, { x: -0.56, y: -0.21 }, { x: -0.7, y: 0.0 }, { x: -0.56, y: 0.21 }], fillColor: [0, 255, 255], strokeColor: [0, 120, 120], strokeW: 0.8 }
        ],
        fillColor: [180, 255, 255], strokeColor: [0, 180, 180], strokeW: 1.5,
        typicalCargo: ["Narcotics", "Chemicals"], price: 999999, aiRoles: ["ALIEN"]
    },
    "ObsidianOrb": {
        name: "Obsidian Orb (Alien)", role: "Alien Tank", sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.5, baseThrust: 0.09, baseTurnRate: 0.05,
        baseHull: 400, baseShield: 500, shieldRecharge: 3.0, cargoCapacity: 60,
        armament: ["Force Blaster", "Disruptor"],
        costCategory: "N/A", description: "Massive, spherical alien ship with layered armor.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.7, y: 0.7 }, { x: 1.0, y: 0.0 }, { x: 0.7, y: -0.7 }, { x: 0.0, y: -1.0 }, { x: -0.7, y: -0.7 }, { x: -1.0, y: 0.0 }, { x: -0.7, y: 0.7 }], fillColor: [40, 40, 60], strokeColor: [100, 100, 120], strokeW: 3.0 },
            { vertexData: [{ x: 0.0, y: 0.5 }, { x: 0.35, y: 0.35 }, { x: 0.5, y: 0.0 }, { x: 0.35, y: -0.35 }, { x: 0.0, y: -0.5 }, { x: -0.35, y: -0.35 }, { x: -0.5, y: 0.0 }, { x: -0.35, y: 0.35 }], fillColor: [80, 80, 120], strokeColor: [180, 180, 255], strokeW: 1.5 }
        ],
        fillColor: [40, 40, 60], strokeColor: [100, 100, 120], strokeW: 3.0,
        typicalCargo: ["Metals", "Weapons"], price: 999999, aiRoles: ["ALIEN"]
    },
    "TesseractScout": {
        name: "Tesseract Scout (Alien)", role: "Alien Recon", sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 10.0, baseThrust: 0.25, baseTurnRate: 0.15,
        baseHull: 25, baseShield: 30, shieldRecharge: 1.0, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien scout with a shifting, four-dimensional shape.",
        vertexLayers: [
            { vertexData: [{ x: 1.0, y: 1.0 }, { x: 1.0, y: -1.0 }, { x: -1.0, y: -1.0 }, { x: -1.0, y: 1.0 }], fillColor: [200, 255, 255], strokeColor: [0, 180, 180], strokeW: 1.0 },
            { vertexData: [{ x: 0.0, y: 0.7 }, { x: 0.7, y: 0.0 }, { x: 0.0, y: -0.7 }, { x: -0.7, y: 0.0 }], fillColor: [0, 255, 255], strokeColor: [0, 120, 120], strokeW: 0.7 }
        ],
        fillColor: [200, 255, 255], strokeColor: [0, 180, 180], strokeW: 1.0,
        typicalCargo: [], price: 999999, aiRoles: ["ALIEN"]
    },
    "LotusCarrier": {
        name: "Lotus Carrier (Alien)", role: "Alien Carrier", sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRate: 0.025,
        baseHull: 800, baseShield: 900, shieldRecharge: 4.0, cargoCapacity: 200,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam", "Halo"],
        costCategory: "N/A", description: "Enormous alien carrier with layered, lotus-like petals.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.6, y: 0.8 }, { x: 1.0, y: 0.0 }, { x: 0.6, y: -0.8 }, { x: 0.0, y: -1.0 }, { x: -0.6, y: -0.8 }, { x: -1.0, y: 0.0 }, { x: -0.6, y: 0.8 }], fillColor: [255, 200, 255], strokeColor: [180, 0, 180], strokeW: 3.0 },
            { vertexData: [{ x: 0.0, y: 0.7 }, { x: 0.42, y: 0.56 }, { x: 0.7, y: 0.0 }, { x: 0.42, y: -0.56 }, { x: 0.0, y: -0.7 }, { x: -0.42, y: -0.56 }, { x: -0.7, y: 0.0 }, { x: -0.42, y: 0.56 }], fillColor: [255, 100, 255], strokeColor: [180, 0, 180], strokeW: 2.0 },
            { vertexData: [{ x: 0.0, y: 0.3 }, { x: 0.21, y: 0.21 }, { x: 0.3, y: 0.0 }, { x: 0.21, y: -0.21 }, { x: 0.0, y: -0.3 }, { x: -0.21, y: -0.21 }, { x: -0.3, y: 0.0 }, { x: -0.21, y: 0.21 }], fillColor: [255, 255, 255], strokeColor: [180, 0, 180], strokeW: 1.0 }
        ],
        fillColor: [255, 200, 255], strokeColor: [180, 0, 180], strokeW: 3.0,
        typicalCargo: ["Luxury Goods", "Chemicals", "Metals"], price: 999999, aiRoles: ["ALIEN"]
    }
};

// --- Drawing Helper Functions ---

// Helper to ensure vertices are in Clockwise order (for consistent culling)
function ensureClockwise(vertices) {
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
        let j = (i + 1) % vertices.length;
        area += (vertices[j].x - vertices[i].x) * (vertices[j].y + vertices[i].y);
    }
    // In screen coords (y down), negative area is CW. Positive is CCW.
    // If area > 0, it's CCW, so we reverse.
    if (area > 0) {
        vertices.reverse();
    }
}

// Initialize Cache for Ship Drawing (Optimization)
function initShipCache(def) {
    def._cache = {
        layers: []
    };

    let layers = def.vertexLayers || [{
        vertexData: def.vertexData,
        fillColor: def.fillColor,
        strokeColor: def.strokeColor,
        strokeW: def.strokeW
    }];

    for (let layer of layers) {
        // 1. Ensure Winding Order (CW)
        if (layer.vertexData && layer.vertexData.length > 0) {
            ensureClockwise(layer.vertexData);

            // 2. Pre-calc Bounds (for Gradient & Wedge)
            let minX = Infinity, maxX = -Infinity;
            for (let v of layer.vertexData) {
                if (v.x < minX) minX = v.x;
                if (v.x > maxX) maxX = v.x;
            }
            let xRange = maxX - minX;
            if (xRange < 0.001) xRange = 1;

            // 3. Pre-calc Colors
            let cFill = color(layer.fillColor || def.fillColor || [100, 100, 100]);
            let cStroke = color(layer.strokeColor || def.strokeColor || [200, 200, 200]);

            let fillRGB = { r: red(cFill), g: green(cFill), b: blue(cFill) };
            let strokeRGB = { r: red(cStroke), g: green(cStroke), b: blue(cStroke) };

            // Pre-compute gradient strings
            let highlightStr = color(min(255, fillRGB.r * 1.3), min(255, fillRGB.g * 1.3), min(255, fillRGB.b * 1.3)).toString();
            let mainFillStr = cFill.toString();
            let darkFillStr = color(fillRGB.r * 0.8, fillRGB.g * 0.8, fillRGB.b * 0.8).toString();

            // 4. Pre-calc Edges with face angles
            let edges = [];
            const len = layer.vertexData.length;
            for (let i = 0; i < len; i++) {
                const next = (i + 1) % len;
                const v1 = layer.vertexData[i];
                const v2 = layer.vertexData[next];
                const dx = v2.x - v1.x;
                const dy = v2.y - v1.y;

                let t1 = (maxX - v1.x) / xRange;
                let t2 = (maxX - v2.x) / xRange;

                edges.push({
                    v1: v1,
                    v2: v2,
                    dx: dx,
                    dy: dy,
                    faceAngle: Math.atan2(dx, -dy), // Pre-compute face normal angle
                    t1: t1,
                    t2: t2
                });
            }

            def._cache.layers.push({
                vertexData: layer.vertexData,
                minX, maxX, xRange,
                fillRGB, strokeRGB,
                highlightStr, mainFillStr, darkFillStr,
                strokeW: layer.strokeW || def.strokeW || 1,
                edges: edges
            });
        }
    }
}

// NOTE: drawExtrudedPolyOptimized() and drawExtrudedPolySymmetric() are now in draw3d.js

// Generic Alien Ship Drawing Function (3D symmetric - no wedge, always extrudes down in world space)
// shipRotation: the current rotation angle of the ship - used to counter-rotate extrusion so it stays pointing down
function drawGenericAlienShip(def, s, thrusting, shipRotation = 0, localSunAngle = -0.785) {
    // Lazy Initialization of Cache
    if (!def._cache) {
        initShipCache(def);
    }

    let r = s / 2;
    let depth = s * 0.15;

    // To get world-space down extrusion inside rotate(θ), use angle = θ
    // Math: extrusion = (sin(A), cos(A)) gets rotated by θ; for result (0, 1), need A = θ
    const worldDownAngle = shipRotation;

    // 1) Draw side faces for base layer only (keep secondary layers flat)
    if (def._cache.layers.length > 0) {
        drawExtrudedPolySymmetric(r, def._cache.layers[0], depth, worldDownAngle, localSunAngle, 0, 'sides');
    }
    // 2) Draw top faces after sides to avoid z-fighting / overdraw flicker (bottom -> top)
    for (let i = 0; i < def._cache.layers.length; i++) {
        drawExtrudedPolySymmetric(r, def._cache.layers[i], depth, worldDownAngle, localSunAngle, i, 'top');
    }
}

// Enhanced helper function to draw shape from vertex data or layers
// (Kept for backward compatibility or 2D fallbacks)
function drawShapeFromData(r, vertexDataOrLayers, defaultFillColor, defaultStrokeColor, defaultStrokeW) {
    if (Array.isArray(vertexDataOrLayers) && vertexDataOrLayers.length > 0 &&
        vertexDataOrLayers[0].vertexData) {
        for (let i = 0; i < vertexDataOrLayers.length; i++) {
            const layer = vertexDataOrLayers[i];
            if (layer.vertexData && layer.vertexData.length > 0) {
                fill(layer.fillColor || defaultFillColor);
                // Draw filled shapes only — disable stroke for ships
                noStroke();
                beginShape();
                for (let v of layer.vertexData) {
                    vertex(v.x * r, v.y * r);
                }
                endShape(CLOSE);
            }
        }
    } else {
        if (defaultFillColor) fill(defaultFillColor); else noFill();
        // Draw filled shapes only — disable stroke for ships
        noStroke();
        beginShape();
        for (let v of vertexDataOrLayers) {
            vertex(v.x * r, v.y * r);
        }
        endShape(CLOSE);
    }
}

// Generic Ship Drawing Function (Updated for 3D & Optimization)
function drawGenericShip(def, s, thrusting, angle = 0, localSunAngle = -0.785) {
    // Lazy Initialization of Cache
    if (!def._cache) {
        initShipCache(def);
    }

    let r = s / 2;
    let depth = s * 0.15;

    // 1) Draw side faces for base layer only (keep secondary layers flat)
    if (def._cache.layers.length > 0) {
        drawExtrudedPolyOptimized(r, def._cache.layers[0], depth, angle, localSunAngle, 0, 'sides');
    }
    // 2) Draw top faces after sides to avoid z-fighting / overdraw flicker (bottom -> top)
    for (let i = 0; i < def._cache.layers.length; i++) {
        drawExtrudedPolyOptimized(r, def._cache.layers[i], depth, angle, localSunAngle, i, 'top');
    }
}

// --- Custom Drawing Functions (for ships with special effects) ---

// Helper for Faux-3D depth extrusion (Old simple version - Deprecated/Replaced by drawExtrudedPoly)
// We can remove or leave it. Let's leave it but unused.
function drawExtrudedShape(r, vertexData, fillColor, strokeColor, depth, layers = 5) {
    // ...
}

function drawThargoid(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.Thargoid;
    let pulse = 1.0 + sin(frameCount * 0.1) * 0.05;
    let rotSpeed = frameCount * 0.02;

    // Draw 3D base using generated petal shape
    if (!def._cache) initShipCache(def);
    if (!def._thargoidCache) {
        // Create dynamic star/petal shape for Thargoid
        let petals = 8;
        let verts = [];
        for (let i = 0; i < petals * 2; i++) {
            let a = (i / (petals * 2)) * TWO_PI;
            let rad = (i % 2 === 0) ? 1.0 : 0.4;
            verts.push({ x: cos(a) * rad, y: sin(a) * rad });
        }
        def._thargoidCache = {
            vertexData: verts,
            minX: -1, maxX: 1, xRange: 2,
            fillRGB: { r: 80, g: 160, b: 80 },
            strokeRGB: { r: 100, g: 255, b: 100 },
            highlightStr: 'rgb(120, 200, 120)',
            mainFillStr: 'rgb(80, 160, 80)',
            darkFillStr: 'rgb(60, 120, 60)',
            strokeW: 2,
            edges: []
        };
        // Build edges
        for (let i = 0; i < verts.length; i++) {
            const next = (i + 1) % verts.length;
            def._thargoidCache.edges.push({
                v1: verts[i], v2: verts[next],
                dx: verts[next].x - verts[i].x,
                dy: verts[next].y - verts[i].y,
                t1: 0.5, t2: 0.5 // uniform depth
            });
        }
    }

    let depth = s * 0.18;
    // To get world-space down extrusion, angle = rotSpeed (the rotation amount)
    const worldDownAngle = rotSpeed;

    push();
    rotate(rotSpeed); // Slow rotation
    // Draw 3D shape with counter-rotated extrusion
    drawExtrudedPolySymmetric(r * pulse, def._thargoidCache, depth, worldDownAngle, localSunAngle, 0, 'both');
    pop();

    // Organic pulsing glow overlay
    noStroke();
    fill(100, 255, 100, 30);
    ellipse(0, 0, s * 0.9 * pulse);

    // Central Eye
    fill(255, 255, 255);
    noStroke();
    ellipse(0, 0, r * 0.25);
    fill(200, 50, 50);
    ellipse(0, 0, r * 0.12);
}

function drawBioFrigate(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.BioFrigate;
    let t = frameCount * 0.05;
    let rotAngle = t * 0.1;

    push();
    rotate(rotAngle); // Slow rotation

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // 1. Cilia / Feelers overlay (Background)
    stroke(100, 255, 150, 80);
    strokeWeight(1);
    noFill();
    for (let a = 0; a < TWO_PI; a += 0.4) {
        let startR = r * 0.8;
        let endR = r * 1.2;
        let x1 = cos(a) * startR;
        let y1 = sin(a) * startR;
        let wiggle = sin(t + a * 5) * (r * 0.08);
        let x2 = cos(a) * endR + wiggle;
        let y2 = sin(a) * endR + wiggle;
        line(x1, y1, x2, y2);
    }
    pop();

    // 2. Nucleus glow
    noStroke();
    fill(230, 60, 100, 150);
    let pulse = 1 + sin(t * 3) * 0.1;
    ellipse(0, 0, r * 0.3 * pulse);
}

function drawGeometricDrone(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.GeometricDrone;
    let rotAngle = frameCount * 0.03;

    // Draw 3D hexagon base from definition using symmetric extrusion
    if (!def._cache) initShipCache(def);
    if (!def._hexCache) {
        // Create hexagon shape
        let verts = [];
        for (let i = 0; i < 6; i++) {
            let a = (i / 6) * TWO_PI;
            verts.push({ x: cos(a), y: sin(a) });
        }
        def._hexCache = {
            vertexData: verts,
            minX: -1, maxX: 1, xRange: 2,
            fillRGB: { r: 50, g: 50, b: 60 },
            strokeRGB: { r: 100, g: 200, b: 255 },
            strokeW: 1,
            edges: []
        };
        for (let i = 0; i < verts.length; i++) {
            const next = (i + 1) % verts.length;
            def._hexCache.edges.push({
                v1: verts[i], v2: verts[next],
                dx: verts[next].x - verts[i].x,
                dy: verts[next].y - verts[i].y,
                t1: 0.5, t2: 0.5
            });
        }
    }

    let depth = s * 0.2;
    // To get world-space down extrusion, angle = rotAngle (the rotation amount)
    const worldDownAngle = rotAngle;

    push();
    rotate(rotAngle); // Slow rotation
    drawExtrudedPolySymmetric(r, def._hexCache, depth, worldDownAngle, localSunAngle, 0, 'both');

    // Glowing edge highlight
    noFill();
    stroke(100, 200, 255, 100);
    strokeWeight(1);
    beginShape();
    for (let i = 0; i < 6; i++) {
        let a = (i / 6) * TWO_PI;
        vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
    pop();
}



function drawObeliskSentinel(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.ObeliskSentinel;
    let rotAngle = frameCount * 0.01;

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Glowing Runes overlay
    stroke(255, 255, 255, 150 + sin(frameCount * 0.1) * 100);
    strokeWeight(2);
    noFill();
    line(-r * 0.15, -r * 0.4, r * 0.15, -r * 0.4);
    line(-r * 0.15, 0, r * 0.15, 0);
    line(-r * 0.15, r * 0.4, r * 0.15, r * 0.4);
    pop();
}

function drawSpiralWarden(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.SpiralWarden;
    let rotAngle = frameCount * -0.05;

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Spiral overlay effect
    noFill();
    strokeWeight(1);
    for (let i = 0; i < 3; i++) {
        stroke(0, 255 - i * 50, 200, 80);
        beginShape();
        for (let a = 0; a < TWO_PI; a += 0.2) {
            let rad = map(a, 0, TWO_PI, 0, r * 0.8);
            vertex(cos(a + i * 2) * rad, sin(a + i * 2) * rad);
        }
        endShape();
    }
    pop();

    // Core
    fill(255);
    noStroke();
    ellipse(0, 0, r * 0.25);
}

function drawTriadProbe(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.TriadProbe;
    let rotAngle = frameCount * 0.05;

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Energy orbs overlay
    noStroke();
    fill(200, 255, 180, 150);
    ellipse(0, -r * 0.5, r * 0.3);
    ellipse(r * 0.45, r * 0.25, r * 0.3);
    ellipse(-r * 0.45, r * 0.25, r * 0.3);
    pop();

    // Center pulse
    fill(255, 255, 100, 100);
    ellipse(0, 0, r * 0.25 * (1 + sin(frameCount * 0.2) * 0.2));
}

function drawHexaManta(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.HexaManta;
    let wave = sin(frameCount * 0.1) * 0.05;
    let rotAngle = frameCount * 0.008;

    push();
    rotate(rotAngle);
    scale(1 + wave, 1 - wave); // Subtle squash and stretch

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Energy trails
    stroke(0, 255, 255, 80);
    strokeWeight(2);
    line(-r * 0.9, 0, -r * 1.3, 0);
    line(r * 0.9, 0, r * 1.3, 0);
    pop();
}

function drawFractalRay(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.FractalRay;
    let rotAngle = frameCount * 0.012;

    // Jittery movement
    push();
    rotate(rotAngle);
    translate(random(-1, 1), random(-1, 1));

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Lightning arcs overlay
    if (frameCount % 5 === 0) {
        stroke(255, 255, 0, 150);
        strokeWeight(2);
        let arcAngle = random(TWO_PI);
        line(0, 0, cos(arcAngle) * r * 1.1, sin(arcAngle) * r * 1.1);
    }
    pop();
}

function drawPetalSpinner(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.PetalSpinner;
    let rotAngle = frameCount * 0.15; // Fast spin

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);
    pop();

    // Center glow
    fill(255, 255, 255, 180);
    noStroke();
    ellipse(0, 0, r * 0.3);
}

function drawCrescentMarauder(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.CrescentMarauder;
    let rotAngle = frameCount * 0.02;

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Glow effect overlay
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = "cyan";
    noFill();
    stroke(0, 255, 255, 60);
    strokeWeight(2);
    beginShape();
    for (let v of def.vertexLayers[0].vertexData) {
        vertex(v.x * r, v.y * r);
    }
    endShape(CLOSE);
    drawingContext.shadowBlur = 0;
    pop();
}

function drawObsidianOrb(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.ObsidianOrb;
    let rotAngle = frameCount * 0.005;

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Ring effect
    noFill();
    stroke(100, 100, 255, 100);
    strokeWeight(2);
    ellipse(0, 0, s * 1.05, s * 0.18);
    pop();

    // Sphere highlight overlay
    noStroke();
    fill(255, 255, 255, 30);
    ellipse(-r * 0.2, -r * 0.2, r * 0.3, r * 0.3);
}

function drawTesseractScout(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.TesseractScout;
    let rotAngle = frameCount * 0.03;

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Geometric wireframe overlay
    noFill();
    stroke(0, 255, 255, 80);
    strokeWeight(1);
    let size = r * 0.5;
    rectMode(CENTER);
    rect(0, 0, size, size);
    push();
    rotate(frameCount * -0.04);
    rect(0, 0, size * 0.7, size * 0.7);
    pop();
    pop();
}

function drawLotusCarrier(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.LotusCarrier;
    let rotAngle = frameCount * 0.005;

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Petal glow overlay
    noStroke();
    fill(255, 150, 255, 50);
    for (let i = 0; i < 8; i++) {
        push();
        rotate(i * TWO_PI / 8);
        ellipse(r * 0.55, 0, r * 0.5, r * 0.25);
        pop();
    }
    pop();

    // Core glow
    fill(255, 255, 200, 150);
    ellipse(0, 0, r * 0.3);
}

// Non-Alien Custom Ships - use standard 3D wedge rendering
function drawProspectorMiner(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.ProspectorMiner;

    // Draw 3D base shape using standard wedge extrusion
    drawGenericShip(def, s, thrusting, angle, localSunAngle);

    // Mining equipment overlay
    stroke(100, 100, 110);
    strokeWeight(2);
    fill(150, 150, 160);
    rect(r * 0.5, r * 0.4, r * 0.35, r * 0.15);
    rect(r * 0.5, -r * 0.55, r * 0.35, r * 0.15);
    noStroke();
    fill(200, 200, 180);
    ellipse(r * 0.85, r * 0.47, r * 0.08, r * 0.08);
    ellipse(r * 0.85, -r * 0.47, r * 0.08, r * 0.08);
}

function drawPathfinderSurvey(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.PathfinderSurvey;

    // Draw 3D base shape using standard wedge extrusion
    drawGenericShip(def, s, thrusting, angle, localSunAngle);

    // --- 3D Scanner Dish at Front ---
    // Draw as extruded ring shape for 3D effect
    let dishX = r * 0.75;
    let dishRadius = r * 0.35;
    let dishDepth = r * 0.12;

    // Back of dish (darker)
    noStroke();
    fill(100, 110, 140);
    beginShape();
    for (let a = -HALF_PI; a <= HALF_PI; a += 0.15) {
        let dr = dishRadius * cos(a * 0.7); // Curved dish shape
        vertex(dishX + dishDepth, sin(a) * dishRadius);
    }
    endShape(CLOSE);

    // Dish rim/edge (medium)
    fill(140, 150, 180);
    beginShape();
    for (let a = -HALF_PI; a <= HALF_PI; a += 0.15) {
        vertex(dishX + dishDepth * 0.3, sin(a) * dishRadius);
    }
    for (let a = HALF_PI; a >= -HALF_PI; a -= 0.15) {
        vertex(dishX + dishDepth, sin(a) * dishRadius * 0.85);
    }
    endShape(CLOSE);

    // Dish front face (bright)
    fill(180, 190, 220);
    beginShape();
    for (let a = -HALF_PI; a <= HALF_PI; a += 0.15) {
        vertex(dishX, sin(a) * dishRadius);
    }
    endShape(CLOSE);

    // Dish center receiver (small 3D cylinder)
    fill(60, 70, 100);
    ellipse(dishX + dishDepth * 0.5, 0, r * 0.08, r * 0.12);
    fill(200, 210, 230);
    ellipse(dishX, 0, r * 0.06, r * 0.1);

    // --- 3D Ring Elements (replacing flat green blocks) ---
    // These are sensor rings on the wings
    let ringPositions = [
        { x: -r * 0.2, y: r * 0.55 },
        { x: -r * 0.2, y: -r * 0.55 }
    ];

    for (let pos of ringPositions) {
        // Ring back (extruded)
        let ringRad = r * 0.18;
        let ringDepth = r * 0.08;

        // Ring outer edge (3D)
        fill(20, 55, 35);
        beginShape();
        for (let a = 0; a < TWO_PI; a += 0.3) {
            vertex(pos.x + ringDepth + cos(a) * ringRad, pos.y + sin(a) * ringRad);
        }
        endShape(CLOSE);

        // Ring side (connector)
        fill(35, 85, 55);
        beginShape();
        vertex(pos.x + ringDepth, pos.y - ringRad);
        vertex(pos.x, pos.y - ringRad);
        vertex(pos.x, pos.y + ringRad);
        vertex(pos.x + ringDepth, pos.y + ringRad);
        endShape(CLOSE);

        // Ring front face
        fill(50, 120, 75);
        beginShape();
        for (let a = 0; a < TWO_PI; a += 0.3) {
            vertex(pos.x + cos(a) * ringRad, pos.y + sin(a) * ringRad);
        }
        endShape(CLOSE);

        // Ring center (hollow)
        fill(15, 40, 25);
        ellipse(pos.x, pos.y, ringRad * 0.7, ringRad * 0.7);

        // Ring glow
        fill(100, 255, 150, 50);
        ellipse(pos.x, pos.y, ringRad * 0.5, ringRad * 0.5);
    }
}

// --- Initialization Logic ---

const CUSTOM_DRAW_FUNCTIONS = {
    "Thargoid": drawThargoid,
    "BioFrigate": drawBioFrigate,
    "GeometricDrone": drawGeometricDrone,

    "ObeliskSentinel": drawObeliskSentinel,
    "SpiralWarden": drawSpiralWarden,
    "TriadProbe": drawTriadProbe,
    "HexaManta": drawHexaManta,
    "FractalRay": drawFractalRay,
    "PetalSpinner": drawPetalSpinner,
    "CrescentMarauder": drawCrescentMarauder,
    "ObsidianOrb": drawObsidianOrb,
    "TesseractScout": drawTesseractScout,
    "LotusCarrier": drawLotusCarrier,
    "ProspectorMiner": drawProspectorMiner,
    "PathfinderSurvey": drawPathfinderSurvey
};

// Assign draw functions to definitions
for (const key in SHIP_DEFINITIONS) {
    const def = SHIP_DEFINITIONS[key];
    if (CUSTOM_DRAW_FUNCTIONS[key]) {
        def.drawFunction = CUSTOM_DRAW_FUNCTIONS[key];
    } else {
        // Create a bound function that matches the signature (s, thrusting, angle, localSunAngle)
        // We use a closure to capture 'def'
        def.drawFunction = function (s, thrusting, angle, localSunAngle) {
            drawGenericShip(def, s, thrusting, angle, localSunAngle);
        };
    }
}

console.log(`ships.js (Refactored Version with ${Object.keys(SHIP_DEFINITIONS).length} ships) loaded and SHIP_DEFINITIONS initialized.`);
