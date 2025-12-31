// ****** ships.js ******
// Contains ship drawing functions and the global SHIP_DEFINITIONS object.
// MUST be loaded AFTER p5.js but BEFORE player.js, enemy.js, etc.
// MODIFIED FOR EDITOR: Includes vertexData array and updated draw functions.
// REFACTORED: Consolidated drawing logic into generic function.

// --- Global Ship Definitions Object ---
// Stores base stats AND VERTEX DATA for each ship type.
// Note: drawFunction is assigned at the bottom of this file.
const SHIP_DEFINITIONS = {
    // --- POLICE & SECURITY ---
    "ACAB": {
        name: "ACAB", role: "Police", upgrades: [], sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.05236,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 12,
        armament: ["Tangle Projector", "Pulse Laser"],
        costCategory: "Low", description: "Standard Police patrol craft. Despite its modest 60-unit hull, officers swear by its surprising shield strength and nippy handling. The acronym officially stands for 'Advanced Cruiser: Astronomical Baseline' but everyone knows what it really means.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7821, y: 0.0000 }, { x: 0.0321, y: 0.4929 }, { x: -0.7821, y: 0.6286 }, { x: -0.7179, y: 0.0000 }, { x: -0.7821, y: -0.6286 }, { x: 0.0321, y: -0.4929 }],
                fillColor: [100, 150, 200],
            },
            {
                vertexData: [{ x: -0.1800, y: 0.3000 }, { x: -0.3400, y: 0.1800 }, { x: -0.3400, y: -0.1800 }, { x: -0.1800, y: -0.3000 }, { x: -0.0200, y: -0.2200 }, { x: 0.1800, y: -0.1200 }, { x: 0.3000, y: -0.0000 }, { x: 0.1800, y: 0.1200 }, { x: -0.0200, y: 0.2200 }],
                fillColor: [101, 171, 236],
            },
            // Police emergency lights
            {
                vertexData: [{ x: -0.5000, y: 0.5500 }, { x: -0.5800, y: 0.5200 }, { x: -0.5400, y: 0.4800 }],
                fillColor: [255, 0, 0]
            },
            {
                vertexData: [{ x: -0.5000, y: -0.5500 }, { x: -0.5800, y: -0.5200 }, { x: -0.5400, y: -0.4800 }],
                fillColor: [0, 100, 255]
            }
        ],
        typicalCargo: [],
        price: 15900,
        aiRoles: ["POLICE"],
        faction: "POLICE",
        techLevel: 1 // Starter
    },
    "CobraMkPol": {
        name: "Cobra Mk Pol", role: "Police", upgrades: [], sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 6.0, baseThrust: 0.10, baseTurnRate: 0.06109,
        baseHull: 120, baseShield: 100, shieldRecharge: 1, cargoCapacity: 44,
        armament: ["Twin Pulse", "Tangle Projector"], // Versatile loadout with defense
        costCategory: "Medium", description: "Police variant of the legendary Cobra, outfitted for law enforcement duty. Those emergency lights aren't decorative—they're a warning. Fast enough to catch smugglers, tough enough to survive firefights, and roomy enough to haul confiscated cargo back to the station. Criminals see this silhouette and know their day just got worse.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8867, y: 0.0000 }, { x: 0.1867, y: 0.5270 }, { x: -0.6178, y: 0.5634 }, { x: -0.6133, y: 0.2000 }, { x: -0.8867, y: 0.1770 }, { x: -0.8867, y: -0.1770 }, { x: -0.6133, y: -0.2000 }, { x: -0.6178, y: -0.5634 }, { x: 0.1867, y: -0.5270 }],
                fillColor: [100, 150, 200],
            },
            {
                vertexData: [{ x: -0.0793, y: 0.3000 }, { x: -0.2393, y: 0.1800 }, { x: -0.2393, y: -0.1800 }, { x: -0.0793, y: -0.3000 }, { x: 0.0807, y: -0.2200 }, { x: 0.2807, y: -0.1200 }, { x: 0.4007, y: -0.0000 }, { x: 0.2807, y: 0.1200 }, { x: 0.0807, y: 0.2200 }],
                fillColor: [101, 171, 236],
            },
            // Port navigation light (red)
            {
                vertexData: [{ x: -0.5500, y: 0.5400 }, { x: -0.6200, y: 0.5100 }, { x: -0.5700, y: 0.4700 }],
                fillColor: [255, 50, 50]
            },
            // Starboard navigation light (green)
            {
                vertexData: [{ x: -0.5500, y: -0.5400 }, { x: -0.6200, y: -0.5100 }, { x: -0.5700, y: -0.4700 }],
                fillColor: [50, 255, 50]
            },
            // Engine housing stripe
            {
                vertexData: [{ x: -0.7500, y: 0.1200 }, { x: -0.8200, y: 0.1200 }, { x: -0.8200, y: -0.1200 }, { x: -0.7500, y: -0.1200 }],
                fillColor: [80, 80, 100]
            }
        ],
        typicalCargo: ["Food"],
        price: 21600,
        aiRoles: ["POLICE"],
        faction: "POLICE",
        techLevel: 2 // Utility
    },
    "Viper": {
        name: "Viper", role: "Fighter", upgrades: [], sizeCategory: "Small", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRate: 0.07854,
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Twin Pulse", "Guardian Missile", "Basic Mine"],
        costCategory: "Medium", description: "Military-spec fast interceptor. Hits 7.5 speed with shields that recharge faster than most pilots can aim. A versatile combat platform favored by military forces across the galaxy.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: -0.6500, y: 0.5000 }, { x: -1.0500, y: 0.3000 }, { x: -1.0500, y: -0.3000 }, { x: -0.6500, y: -0.5000 }],
                fillColor: [150, 155, 160]
            },
            {
                vertexData: [{ x: -0.1312, y: 0.2187 }, { x: -0.2479, y: 0.1312 }, { x: -0.2479, y: -0.1312 }, { x: -0.1312, y: -0.2187 }, { x: -0.0146, y: -0.1604 }, { x: 0.1312, y: -0.0875 }, { x: 0.2187, y: 0.0000 }, { x: 0.1312, y: 0.0875 }, { x: -0.0146, y: 0.1604 }],
                fillColor: [100, 160, 220]
            },
            // Military chevron
            {
                vertexData: [{ x: 0.5000, y: 0.0000 }, { x: 0.3000, y: 0.1000 }, { x: 0.3800, y: 0.0000 }, { x: 0.3000, y: -0.1000 }],
                fillColor: [218, 165, 32]
            },
            // Hull stripe - port
            {
                vertexData: [{ x: 0.2000, y: 0.1500 }, { x: -0.4000, y: 0.3500 }, { x: -0.4000, y: 0.3000 }, { x: 0.2000, y: 0.1000 }],
                fillColor: [100, 100, 110]
            },
            // Hull stripe - starboard
            {
                vertexData: [{ x: 0.2000, y: -0.1500 }, { x: -0.4000, y: -0.3500 }, { x: -0.4000, y: -0.3000 }, { x: 0.2000, y: -0.1000 }],
                fillColor: [100, 100, 110]
            },
            // Nav light port
            {
                vertexData: [{ x: -0.6000, y: 0.4800 }, { x: -0.6700, y: 0.4500 }, { x: -0.6200, y: 0.4200 }],
                fillColor: [255, 50, 50]
            },
            // Nav light starboard
            {
                vertexData: [{ x: -0.6000, y: -0.4800 }, { x: -0.6700, y: -0.4500 }, { x: -0.6200, y: -0.4200 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Computers", "Weapons"],
        price: 24500,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 3
    },
    "ViperPol": {
        name: "Viper Pol", role: "Police Interceptor", upgrades: [], sizeCategory: "Small", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRate: 0.07854,
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Twin Pulse", "Tangle Projector", "Basic Mine"],
        costCategory: "Medium", description: "Police variant of the Viper. That distinctive blue hull and flashing lights mean one thing: you're about to have a very bad day. Fast enough to catch smugglers, tough enough to survive firefights.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: -0.6500, y: 0.5000 }, { x: -1.0500, y: 0.3000 }, { x: -1.0500, y: -0.3000 }, { x: -0.6500, y: -0.5000 }],
                fillColor: [60, 100, 180]
            },
            {
                vertexData: [{ x: -0.1312, y: 0.2187 }, { x: -0.2479, y: 0.1312 }, { x: -0.2479, y: -0.1312 }, { x: -0.1312, y: -0.2187 }, { x: -0.0146, y: -0.1604 }, { x: 0.1312, y: -0.0875 }, { x: 0.2187, y: 0.0000 }, { x: 0.1312, y: 0.0875 }, { x: -0.0146, y: 0.1604 }],
                fillColor: [129, 176, 238]
            },
            {
                vertexData: [{ x: -0.5500, y: 0.4200 }, { x: -0.6500, y: 0.3800 }, { x: -0.5800, y: 0.3400 }],
                fillColor: [255, 0, 0]
            },
            {
                vertexData: [{ x: -0.5500, y: -0.4200 }, { x: -0.6500, y: -0.3800 }, { x: -0.5800, y: -0.3400 }],
                fillColor: [0, 100, 255]
            },
            {
                vertexData: [{ x: 0.3500, y: 0.0000 }, { x: 0.2800, y: 0.0600 }, { x: 0.2000, y: 0.0400 }, { x: 0.2000, y: -0.0400 }, { x: 0.2800, y: -0.0600 }],
                fillColor: [255, 215, 0]
            },
            {
                vertexData: [{ x: -0.7000, y: 0.4600 }, { x: -0.9000, y: 0.3200 }, { x: -0.8500, y: 0.3000 }, { x: -0.6500, y: 0.4300 }],
                fillColor: [40, 80, 150]
            },
            {
                vertexData: [{ x: -0.7000, y: -0.4600 }, { x: -0.9000, y: -0.3200 }, { x: -0.8500, y: -0.3000 }, { x: -0.6500, y: -0.4300 }],
                fillColor: [40, 80, 150]
            }
        ],
        typicalCargo: [],
        price: 25500,
        aiRoles: ["POLICE"],
        faction: "POLICE",
        techLevel: 3
    },
    "ViperBH": {
        name: "Viper BH", role: "Bounty Hunter", upgrades: [], sizeCategory: "Small", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRate: 0.07854,
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Twin Pulse", "Guardian Missile", "Harpoon Launcher"],
        costCategory: "Medium", description: "Bounty hunter variant painted in aggressive red. When this appears on your scanner, someone's collecting on your head. Harpoon launcher ensures targets don't escape.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: -0.6500, y: 0.5000 }, { x: -1.0500, y: 0.3000 }, { x: -1.0500, y: -0.3000 }, { x: -0.6500, y: -0.5000 }],
                fillColor: [160, 40, 40]
            },
            {
                vertexData: [{ x: -0.1312, y: 0.2187 }, { x: -0.2479, y: 0.1312 }, { x: -0.2479, y: -0.1312 }, { x: -0.1312, y: -0.2187 }, { x: -0.0146, y: -0.1604 }, { x: 0.1312, y: -0.0875 }, { x: 0.2187, y: 0.0000 }, { x: 0.1312, y: 0.0875 }, { x: -0.0146, y: 0.1604 }],
                fillColor: [200, 80, 80]
            },
            // Skull/crosshair emblem
            {
                vertexData: [{ x: 0.4000, y: 0.0000 }, { x: 0.3000, y: 0.0800 }, { x: 0.2000, y: 0.0000 }, { x: 0.3000, y: -0.0800 }],
                fillColor: [30, 30, 30]
            },
            // Black racing stripe - port
            {
                vertexData: [{ x: 0.5000, y: 0.0800 }, { x: -0.5000, y: 0.3500 }, { x: -0.5000, y: 0.3000 }, { x: 0.5000, y: 0.0300 }],
                fillColor: [20, 20, 20]
            },
            // Black racing stripe - starboard
            {
                vertexData: [{ x: 0.5000, y: -0.0800 }, { x: -0.5000, y: -0.3500 }, { x: -0.5000, y: -0.3000 }, { x: 0.5000, y: -0.0300 }],
                fillColor: [20, 20, 20]
            },
            // Kill marks
            {
                vertexData: [{ x: -0.3000, y: 0.2200 }, { x: -0.2600, y: 0.2200 }, { x: -0.2600, y: 0.2600 }, { x: -0.3000, y: 0.2600 }],
                fillColor: [255, 255, 255]
            },
            {
                vertexData: [{ x: -0.3500, y: 0.2300 }, { x: -0.3100, y: 0.2300 }, { x: -0.3100, y: 0.2700 }, { x: -0.3500, y: 0.2700 }],
                fillColor: [255, 255, 255]
            },
            // Orange warning lights
            {
                vertexData: [{ x: -0.6000, y: 0.4800 }, { x: -0.6700, y: 0.4500 }, { x: -0.6200, y: 0.4200 }],
                fillColor: [255, 150, 0]
            },
            {
                vertexData: [{ x: -0.6000, y: -0.4800 }, { x: -0.6700, y: -0.4500 }, { x: -0.6200, y: -0.4200 }],
                fillColor: [255, 150, 0]
            }
        ],
        typicalCargo: ["Weapons", "Narcotics"],
        price: 26500,
        aiRoles: ["BOUNTY_HUNTER"],
        faction: "",
        techLevel: 3
    },
    "ViperGuard": {
        name: "Viper Guard", role: "Escort Fighter", upgrades: [], sizeCategory: "Small", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRate: 0.07854,
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Twin Pulse", "Guardian Missile", "Barrier Field"],
        costCategory: "Medium", description: "Escort variant in gold livery. Hired to protect VIPs and valuable cargo. The barrier field helps keep principals alive while the pilot deals with threats.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: -0.6500, y: 0.5000 }, { x: -1.0500, y: 0.3000 }, { x: -1.0500, y: -0.3000 }, { x: -0.6500, y: -0.5000 }],
                fillColor: [180, 160, 60]
            },
            {
                vertexData: [{ x: -0.1312, y: 0.2187 }, { x: -0.2479, y: 0.1312 }, { x: -0.2479, y: -0.1312 }, { x: -0.1312, y: -0.2187 }, { x: -0.0146, y: -0.1604 }, { x: 0.1312, y: -0.0875 }, { x: 0.2187, y: 0.0000 }, { x: 0.1312, y: 0.0875 }, { x: -0.0146, y: 0.1604 }],
                fillColor: [220, 200, 100]
            },
            // Shield emblem (guard symbol)
            {
                vertexData: [{ x: 0.4000, y: 0.0000 }, { x: 0.3200, y: 0.0800 }, { x: 0.3200, y: -0.0800 }],
                fillColor: [255, 255, 220]
            },
            {
                vertexData: [{ x: 0.3200, y: 0.0800 }, { x: 0.2400, y: 0.0600 }, { x: 0.2400, y: -0.0600 }, { x: 0.3200, y: -0.0800 }],
                fillColor: [140, 120, 40]
            },
            // Brown accent stripe - port
            {
                vertexData: [{ x: 0.3000, y: 0.1200 }, { x: -0.4500, y: 0.3800 }, { x: -0.4500, y: 0.3300 }, { x: 0.3000, y: 0.0700 }],
                fillColor: [120, 90, 40]
            },
            // Brown accent stripe - starboard
            {
                vertexData: [{ x: 0.3000, y: -0.1200 }, { x: -0.4500, y: -0.3800 }, { x: -0.4500, y: -0.3300 }, { x: 0.3000, y: -0.0700 }],
                fillColor: [120, 90, 40]
            },
            // Warm nav lights
            {
                vertexData: [{ x: -0.6000, y: 0.4800 }, { x: -0.6700, y: 0.4500 }, { x: -0.6200, y: 0.4200 }],
                fillColor: [255, 220, 100]
            },
            {
                vertexData: [{ x: -0.6000, y: -0.4800 }, { x: -0.6700, y: -0.4500 }, { x: -0.6200, y: -0.4200 }],
                fillColor: [255, 220, 100]
            }
        ],
        typicalCargo: [],
        price: 27500,
        aiRoles: ["GUARD"],
        faction: "",
        techLevel: 3
    },

    // --- FEDERATION MILITARY ---
    "FederalAssaultShip": {
        name: "Federal Assault Ship", role: "Heavy Fighter", upgrades: [], sizeCategory: "Large", size: 70,
        baseMaxSpeed: 5.0, baseThrust: 0.12, baseTurnRate: 0.04363,
        baseHull: 400, baseShield: 300, shieldRecharge: 0.9, cargoCapacity: 30,
        armament: ["Multi-Cannon", "Railgun Turret", "Avenger Missile", "Harpoon Launcher", "Barrier Field", "Heavy Mine"], // Military arsenal
        costCategory: "High", description: "Federation's answer to the question 'what if we made it angry AND durable?' Boasts 400 hull units that shrug off punishment like a hockey enforcer. Not the fastest (5.0 max) but fast enough to catch most targets and ruin their day thoroughly.",

        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.7500, y: 0.5000 }, { x: -0.1500, y: 0.6000 }, { x: -0.7500, y: 0.8000 }, { x: -0.9500, y: 0.4000 }, { x: -0.9500, y: -0.4000 }, { x: -0.7500, y: -0.8000 }, { x: -0.1500, y: -0.6000 }, { x: 0.7500, y: -0.5000 }],
                fillColor: [110, 120, 130],
            },
            {
                vertexData: [{ x: -0.7067, y: -0.3486 }, { x: 0.8067, y: -0.3486 }, { x: -0.6161, y: -0.5037 }],
                fillColor: [150, 150, 180],
            },
            {
                vertexData: [{ x: -0.6839, y: 0.3453 }, { x: 0.7905, y: 0.3453 }, { x: -0.5867, y: 0.4955 }],
                fillColor: [150, 150, 180],
            },
            // Federation insignia
            {
                vertexData: [{ x: 0.2000, y: 0.1000 }, { x: 0.1400, y: 0.1600 }, { x: 0.0800, y: 0.1000 }, { x: 0.1400, y: 0.0400 }],
                fillColor: [50, 100, 180]
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.5500, y: 0.0000 }, { x: 0.4000, y: 0.0900 }, { x: 0.4600, y: 0.0000 }, { x: 0.4000, y: -0.0900 }],
                fillColor: [218, 165, 32]
            },
            // Nav lights
            {
                vertexData: [{ x: -0.7000, y: 0.7500 }, { x: -0.7700, y: 0.7200 }, { x: -0.7200, y: 0.6800 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: -0.7000, y: -0.7500 }, { x: -0.7700, y: -0.7200 }, { x: -0.7200, y: -0.6800 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Computers", "Computers", "Computers", "Weapons", "Metals", "Adv Components"],
        price: 59300,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 4 // Advanced
    },

    // --- MILITARY (Generic) ---
    "Destroyer": {
        name: "Destroyer", role: "Military", upgrades: [], sizeCategory: "Large", size: 160,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.02094,
        baseHull: 800, baseShield: 400, shieldRecharge: 10.0, cargoCapacity: 100,
        armament: ["Disruptor", "Twin Pulse", "Force Blaster", "Avenger Missile", "Harpoon Launcher", "Barrier Field"],
        costCategory: "Low", description: "Military-grade intimidation on a budget. With 800 hull and shields that regenerate faster than excuses at a pilot review board, this floating weapons platform makes small fighters reconsider their career choices. Turns like a geriatric whale but nobody's noticed yet.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0832, y: 0.0000 }, { x: 1.0832, y: 0.0000 }, { x: -0.9327, y: 1.0053 }, { x: -1.0832, y: 0.0000 }, { x: -0.9327, y: -1.0053 }, { x: 1.0832, y: 0.0000 }],
                fillColor: [143, 143, 148],
            },
            {
                vertexData: [{ x: -0.7335, y: 0.6180 }, { x: 0.5918, y: 0.0000 }, { x: -0.7335, y: -0.6180 }, { x: -0.8380, y: 0.0000 }],
                fillColor: [191, 191, 196],
            },
            {
                vertexData: [{ x: -0.6159, y: 0.1967 }, { x: -0.2833, y: 0.0000 }, { x: -0.6159, y: -0.1967 }],
                fillColor: [84, 84, 84],
            },
            // Military chevron emblem (gold arrow) - large ship gets bigger emblem
            {
                vertexData: [{ x: 0.7000, y: 0.0000 }, { x: 0.4500, y: 0.1500 }, { x: 0.5500, y: 0.0000 }, { x: 0.4500, y: -0.1500 }],
                fillColor: [218, 165, 32]
            },
            // Hash lines along hull
            {
                vertexData: [{ x: -0.2000, y: 0.6000 }, { x: -0.1500, y: 0.6200 }, { x: -0.4000, y: 0.7500 }, { x: -0.4500, y: 0.7300 }],
                fillColor: [120, 120, 130]
            },
            {
                vertexData: [{ x: -0.2000, y: -0.6000 }, { x: -0.1500, y: -0.6200 }, { x: -0.4000, y: -0.7500 }, { x: -0.4500, y: -0.7300 }],
                fillColor: [120, 120, 130]
            },
            // Stern warning light
            {
                vertexData: [{ x: -1.0000, y: 0.0400 }, { x: -1.0600, y: 0.0000 }, { x: -1.0000, y: -0.0400 }],
                fillColor: [255, 255, 200]
            }
        ],
        typicalCargo: [],
        price: 69700,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 4, // Advanced
        canDualEngage: true // Large ships can engage two targets simultaneously
    },
    "GnatInterceptor": { // NEW - Light Fighter 1
        name: "Gnat Interceptor", role: "Light Interceptor", upgrades: [], sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 9.5, baseThrust: 0.22, baseTurnRate: 0.09963,
        baseHull: 30, baseShield: 30, shieldRecharge: 1.2, cargoCapacity: 4,
        armament: ["Twin Pulse"],
        costCategory: "Very Low", description: "Nicknamed 'coffin with an afterburner.' Blazes along at 9.5 speed with shields that couldn't stop harsh language. Only 30 hull means one good hit sends you home in a sandwich bag, but hey, you'll get there really fast!",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1, y: 0 }, { x: -0.8, y: 0.4 }, { x: -1.0, y: 0 }, { x: -0.8, y: -0.4 }],
                fillColor: [200, 60, 60]
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.6000, y: 0.0000 }, { x: 0.4500, y: 0.0600 }, { x: 0.5100, y: 0.0000 }, { x: 0.4500, y: -0.0600 }],
                fillColor: [218, 165, 32]
            },
            // Cockpit canopy
            {
                vertexData: [{ x: 0.3000, y: 0.0000 }, { x: 0.1000, y: 0.0800 }, { x: 0.1000, y: -0.0800 }],
                fillColor: [100, 160, 220]
            },
            // Port nav light
            {
                vertexData: [{ x: -0.7500, y: 0.3700 }, { x: -0.8200, y: 0.3400 }, { x: -0.7700, y: 0.3100 }],
                fillColor: [255, 50, 50]
            },
            // Starboard nav light
            {
                vertexData: [{ x: -0.7500, y: -0.3700 }, { x: -0.8200, y: -0.3400 }, { x: -0.7700, y: -0.3100 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: [],
        price: 10900,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 1 // Starter
    },
    "WaspAssault": {
        name: "Wasp Assault Craft", role: "Assault Fighter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster"], // All-out attack fighter
        costCategory: "Low", description: "Named for the sound rookie pilots make when they realize how fragile it is ('wasp-ow'). Forward-swept wings look great on recruitment posters but don't stop railgun rounds. Fast, aggressive, disposable. Military brass loves these because they're cheap to replace. Pilots less enthusiastic.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: -0.0973, y: 0.3081 }, { x: -0.2646, y: 0.9825 }, { x: -0.4994, y: 0.9822 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.4994, y: -0.9822 }, { x: -0.2646, y: -0.9825 }, { x: -0.0973, y: -0.3081 }],
                fillColor: [210, 190, 80],
            },
            {
                vertexData: [{ x: 0.1500, y: 0.0000 }, { x: 0.0750, y: 0.1299 }, { x: -0.0750, y: 0.1299 }, { x: -0.1500, y: 0.0000 }, { x: -0.0750, y: -0.1299 }, { x: 0.0750, y: -0.1299 }],
                fillColor: [101, 171, 236],
            },
            // Military wing stripe
            {
                vertexData: [{ x: -0.3200, y: 0.9400 }, { x: -0.4200, y: 0.9200 }, { x: -0.4200, y: 0.8600 }, { x: -0.3200, y: 0.8800 }],
                fillColor: [40, 40, 40]
            },
            {
                vertexData: [{ x: -0.3200, y: -0.9400 }, { x: -0.4200, y: -0.9200 }, { x: -0.4200, y: -0.8600 }, { x: -0.3200, y: -0.8800 }],
                fillColor: [40, 40, 40]
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.5000, y: 0.0000 }, { x: 0.3500, y: 0.0700 }, { x: 0.4000, y: 0.0000 }, { x: 0.3500, y: -0.0700 }],
                fillColor: [218, 165, 32]
            }
        ],
        typicalCargo: ["Computers"],
        price: 12500,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 2 // Utility
    },
    "WaspAssaultBH": {
        name: "Wasp BH", role: "Bounty Hunter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster", "Harpoon Launcher"],
        costCategory: "Low", description: "Bounty hunter variant of the Wasp. That blood-red paintjob and skull markings aren't for show - this pilot collects heads for a living. Fast enough to chase down runners, armed to finish them.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: -0.0973, y: 0.3081 }, { x: -0.2646, y: 0.9825 }, { x: -0.4994, y: 0.9822 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.4994, y: -0.9822 }, { x: -0.2646, y: -0.9825 }, { x: -0.0973, y: -0.3081 }],
                fillColor: [160, 40, 40]
            },
            {
                vertexData: [{ x: 0.1500, y: 0.0000 }, { x: 0.0750, y: 0.1299 }, { x: -0.0750, y: 0.1299 }, { x: -0.1500, y: 0.0000 }, { x: -0.0750, y: -0.1299 }, { x: 0.0750, y: -0.1299 }],
                fillColor: [200, 100, 100]
            },
            { vertexData: [{ x: -0.3200, y: 0.9400 }, { x: -0.4200, y: 0.9200 }, { x: -0.4200, y: 0.8600 }, { x: -0.3200, y: 0.8800 }], fillColor: [20, 20, 20] },
            { vertexData: [{ x: -0.3200, y: -0.9400 }, { x: -0.4200, y: -0.9200 }, { x: -0.4200, y: -0.8600 }, { x: -0.3200, y: -0.8800 }], fillColor: [20, 20, 20] },
            { vertexData: [{ x: 0.4000, y: 0.0000 }, { x: 0.3000, y: 0.0600 }, { x: 0.2000, y: 0.0000 }, { x: 0.3000, y: -0.0600 }], fillColor: [30, 30, 30] },
            { vertexData: [{ x: -0.6000, y: 0.9500 }, { x: -0.6700, y: 0.9200 }, { x: -0.6200, y: 0.8900 }], fillColor: [255, 150, 0] },
            { vertexData: [{ x: -0.6000, y: -0.9500 }, { x: -0.6700, y: -0.9200 }, { x: -0.6200, y: -0.8900 }], fillColor: [255, 150, 0] }
        ],
        typicalCargo: ["Weapons"],
        price: 13500,
        aiRoles: ["BOUNTY_HUNTER"],
        faction: "",
        techLevel: 2
    },
    "WaspAssaultGuard": {
        name: "Wasp Guard", role: "Escort Fighter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster", "Barrier Field"],
        costCategory: "Low", description: "Guard variant of the Wasp in professional gold livery. Hired to escort VIPs and valuable convoys. The barrier field protects the principal while this agile defender deals with threats.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: -0.0973, y: 0.3081 }, { x: -0.2646, y: 0.9825 }, { x: -0.4994, y: 0.9822 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.4994, y: -0.9822 }, { x: -0.2646, y: -0.9825 }, { x: -0.0973, y: -0.3081 }],
                fillColor: [180, 160, 60]
            },
            {
                vertexData: [{ x: 0.1500, y: 0.0000 }, { x: 0.0750, y: 0.1299 }, { x: -0.0750, y: 0.1299 }, { x: -0.1500, y: 0.0000 }, { x: -0.0750, y: -0.1299 }, { x: 0.0750, y: -0.1299 }],
                fillColor: [220, 200, 100]
            },
            { vertexData: [{ x: -0.3200, y: 0.9400 }, { x: -0.4200, y: 0.9200 }, { x: -0.4200, y: 0.8600 }, { x: -0.3200, y: 0.8800 }], fillColor: [120, 90, 40] },
            { vertexData: [{ x: -0.3200, y: -0.9400 }, { x: -0.4200, y: -0.9200 }, { x: -0.4200, y: -0.8600 }, { x: -0.3200, y: -0.8800 }], fillColor: [120, 90, 40] },
            { vertexData: [{ x: 0.4000, y: 0.0000 }, { x: 0.3200, y: 0.0700 }, { x: 0.3200, y: -0.0700 }], fillColor: [255, 255, 220] },
            { vertexData: [{ x: -0.6000, y: 0.9500 }, { x: -0.6700, y: 0.9200 }, { x: -0.6200, y: 0.8900 }], fillColor: [255, 220, 100] },
            { vertexData: [{ x: -0.6000, y: -0.9500 }, { x: -0.6700, y: -0.9200 }, { x: -0.6200, y: -0.8900 }], fillColor: [255, 220, 100] }
        ],
        typicalCargo: [],
        price: 13500,
        aiRoles: ["GUARD"],
        faction: "",
        techLevel: 2
    },
    "Bat": {
        name: "Bat Assault", role: "Assault Fighter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster"], // All-out attack fighter
        costCategory: "Low", description: "Looks like someone tried to build a ship from nightmares and geometry. Those massive wings aren't aerodynamic (space doesn't care) but they do intimidate. Quick, mean, and surprisingly maneuverable. Named 'Bat' because it scares the hell out of people when it shows up on scanners.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9752, y: -0.1801 }, { x: 1.1813, y: 0.0000 }, { x: 0.9752, y: 0.1801 }, { x: 0.0000, y: 0.3081 }, { x: 0.4666, y: 1.4438 }, { x: -0.4994, y: 0.9822 }, { x: -0.3861, y: 0.5960 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.3861, y: -0.5960 }, { x: -0.4994, y: -0.9822 }, { x: 0.4666, y: -1.4438 }, { x: 0.0000, y: -0.3081 }],
                fillColor: [118, 150, 244],
            },
            {
                vertexData: [{ x: 0.1500, y: 0.0000 }, { x: 0.0750, y: 0.1299 }, { x: -0.0750, y: 0.1299 }, { x: -0.1500, y: 0.0000 }, { x: -0.0750, y: -0.1299 }, { x: 0.0750, y: -0.1299 }],
                fillColor: [101, 171, 236],
            },
            // Wingtip nav lights
            {
                vertexData: [{ x: 0.4000, y: 1.3800 }, { x: 0.3500, y: 1.3300 }, { x: 0.4300, y: 1.3000 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: 0.4000, y: -1.3800 }, { x: 0.3500, y: -1.3300 }, { x: 0.4300, y: -1.3000 }],
                fillColor: [50, 255, 50]
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.7000, y: 0.0000 }, { x: 0.5500, y: 0.0700 }, { x: 0.6100, y: 0.0000 }, { x: 0.5500, y: -0.0700 }],
                fillColor: [218, 165, 32]
            }
        ],
        typicalCargo: ["Computers"],
        price: 12500,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 2 // Utility
    },
    "BatBH": {
        name: "Bat BH", role: "Bounty Hunter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster", "Harpoon Launcher"],
        costCategory: "Low", description: "Bounty hunter Bat in crimson red. Those nightmare wings cut through space hunting wanted criminals. When this shows up on your scanner, someone put a price on your head.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9752, y: -0.1801 }, { x: 1.1813, y: 0.0000 }, { x: 0.9752, y: 0.1801 }, { x: 0.0000, y: 0.3081 }, { x: 0.4666, y: 1.4438 }, { x: -0.4994, y: 0.9822 }, { x: -0.3861, y: 0.5960 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.3861, y: -0.5960 }, { x: -0.4994, y: -0.9822 }, { x: 0.4666, y: -1.4438 }, { x: 0.0000, y: -0.3081 }],
                fillColor: [160, 40, 40]
            },
            {
                vertexData: [{ x: 0.1500, y: 0.0000 }, { x: 0.0750, y: 0.1299 }, { x: -0.0750, y: 0.1299 }, { x: -0.1500, y: 0.0000 }, { x: -0.0750, y: -0.1299 }, { x: 0.0750, y: -0.1299 }],
                fillColor: [200, 100, 100]
            },
            { vertexData: [{ x: 0.4000, y: 1.3800 }, { x: 0.3500, y: 1.3300 }, { x: 0.4300, y: 1.3000 }], fillColor: [255, 150, 0] },
            { vertexData: [{ x: 0.4000, y: -1.3800 }, { x: 0.3500, y: -1.3300 }, { x: 0.4300, y: -1.3000 }], fillColor: [255, 150, 0] },
            { vertexData: [{ x: 0.6000, y: 0.0000 }, { x: 0.4500, y: 0.0600 }, { x: 0.3500, y: 0.0000 }, { x: 0.4500, y: -0.0600 }], fillColor: [30, 30, 30] }
        ],
        typicalCargo: ["Weapons"],
        price: 13500,
        aiRoles: ["BOUNTY_HUNTER"],
        faction: "",
        techLevel: 2
    },
    "BatGuard": {
        name: "Bat Guard", role: "Escort Fighter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster", "Barrier Field"],
        costCategory: "Low", description: "Guard Bat in golden livery. Those intimidating wings now protect VIP convoys. The barrier field keeps principals safe while these agile fighters deal with threats.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9752, y: -0.1801 }, { x: 1.1813, y: 0.0000 }, { x: 0.9752, y: 0.1801 }, { x: 0.0000, y: 0.3081 }, { x: 0.4666, y: 1.4438 }, { x: -0.4994, y: 0.9822 }, { x: -0.3861, y: 0.5960 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.3861, y: -0.5960 }, { x: -0.4994, y: -0.9822 }, { x: 0.4666, y: -1.4438 }, { x: 0.0000, y: -0.3081 }],
                fillColor: [180, 160, 60]
            },
            {
                vertexData: [{ x: 0.1500, y: 0.0000 }, { x: 0.0750, y: 0.1299 }, { x: -0.0750, y: 0.1299 }, { x: -0.1500, y: 0.0000 }, { x: -0.0750, y: -0.1299 }, { x: 0.0750, y: -0.1299 }],
                fillColor: [220, 200, 100]
            },
            { vertexData: [{ x: 0.4000, y: 1.3800 }, { x: 0.3500, y: 1.3300 }, { x: 0.4300, y: 1.3000 }], fillColor: [255, 220, 100] },
            { vertexData: [{ x: 0.4000, y: -1.3800 }, { x: 0.3500, y: -1.3300 }, { x: 0.4300, y: -1.3000 }], fillColor: [255, 220, 100] },
            { vertexData: [{ x: 0.5500, y: 0.0000 }, { x: 0.4500, y: 0.0700 }, { x: 0.4500, y: -0.0700 }], fillColor: [255, 255, 220] }
        ],
        typicalCargo: [],
        price: 13500,
        aiRoles: ["GUARD"],
        faction: "",
        techLevel: 2
    },
    "HummingBird": {
        name: "Humming Bird", role: "Assault Fighter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster", "Basic Mine"], // All-out attack fighter
        costCategory: "Low", description: "Engineering team looked at the Vulture and said 'what if we made it weirder and more violent?' Those asymmetric wings violate every design aesthetic except 'terrifying.' Flies like an angry hornet on combat stims. Enemies don't know whether to shoot it or run from it. Smart ones run.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7893, y: 0.0000 }, { x: -0.2224, y: 0.3805 }, { x: -0.2224, y: 1.0132 }, { x: -0.7107, y: 1.1822 }, { x: -0.4976, y: 0.3415 }, { x: -0.7893, y: 0.2472 }, { x: -0.7893, y: -0.2472 }, { x: -0.4976, y: -0.3415 }, { x: -0.7107, y: -1.1822 }, { x: -0.2224, y: -1.0132 }, { x: -0.2224, y: -0.3805 }, { x: 0.7893, y: 0.0000 }],
                fillColor: [8, 210, 4],
            },
            {
                vertexData: [{ x: 0.1500, y: 0.0000 }, { x: -0.0750, y: 0.1299 }, { x: -0.0750, y: -0.1299 }],
                fillColor: [50, 255, 100],
            },
            // Racing stripe
            {
                vertexData: [{ x: 0.5000, y: 0.0300 }, { x: 0.2000, y: 0.0600 }, { x: 0.2000, y: 0.0200 }, { x: 0.5000, y: -0.0100 }],
                fillColor: [255, 255, 255]
            },
            {
                vertexData: [{ x: 0.5000, y: -0.0300 }, { x: 0.2000, y: -0.0600 }, { x: 0.2000, y: -0.0200 }, { x: 0.5000, y: 0.0100 }],
                fillColor: [255, 255, 255]
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.6500, y: 0.0000 }, { x: 0.5000, y: 0.0700 }, { x: 0.5600, y: 0.0000 }, { x: 0.5000, y: -0.0700 }],
                fillColor: [218, 165, 32]
            }
        ],
        typicalCargo: ["Computers"],
        price: 17500,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 2
    },
    "HummingBirdBH": {
        name: "Hummingbird BH", role: "Bounty Hunter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster", "Harpoon Launcher"],
        costCategory: "Low", description: "Bounty hunter Hummingbird in blood-red. When this asymmetric nightmare appears on scanner, someone's bounty is about to be collected. Fast, aggressive, and utterly relentless.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7893, y: 0.0000 }, { x: -0.2224, y: 0.3805 }, { x: -0.2224, y: 1.0132 }, { x: -0.7107, y: 1.1822 }, { x: -0.4976, y: 0.3415 }, { x: -0.7893, y: 0.2472 }, { x: -0.7893, y: -0.2472 }, { x: -0.4976, y: -0.3415 }, { x: -0.7107, y: -1.1822 }, { x: -0.2224, y: -1.0132 }, { x: -0.2224, y: -0.3805 }, { x: 0.7893, y: 0.0000 }],
                fillColor: [160, 40, 40]
            },
            { vertexData: [{ x: 0.1500, y: 0.0000 }, { x: -0.0750, y: 0.1299 }, { x: -0.0750, y: -0.1299 }], fillColor: [200, 100, 100] },
            { vertexData: [{ x: 0.5000, y: 0.0300 }, { x: 0.2000, y: 0.0600 }, { x: 0.2000, y: 0.0200 }, { x: 0.5000, y: -0.0100 }], fillColor: [20, 20, 20] },
            { vertexData: [{ x: 0.5000, y: -0.0300 }, { x: 0.2000, y: -0.0600 }, { x: 0.2000, y: -0.0200 }, { x: 0.5000, y: 0.0100 }], fillColor: [20, 20, 20] },
            { vertexData: [{ x: 0.6000, y: 0.0000 }, { x: 0.4500, y: 0.0600 }, { x: 0.3500, y: 0.0000 }, { x: 0.4500, y: -0.0600 }], fillColor: [30, 30, 30] },
            { vertexData: [{ x: -0.6500, y: 1.1200 }, { x: -0.7200, y: 1.0800 }, { x: -0.6700, y: 1.0400 }], fillColor: [255, 150, 0] },
            { vertexData: [{ x: -0.6500, y: -1.1200 }, { x: -0.7200, y: -1.0800 }, { x: -0.6700, y: -1.0400 }], fillColor: [255, 150, 0] }
        ],
        typicalCargo: ["Weapons"],
        price: 18500,
        aiRoles: ["BOUNTY_HUNTER"],
        faction: "",
        techLevel: 2
    },
    "HummingBirdGuard": {
        name: "Hummingbird Guard", role: "Escort Fighter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster", "Barrier Field"],
        costCategory: "Low", description: "Guard Hummingbird in professional gold. Those asymmetric wings now protect VIP convoys. The barrier field keeps principals safe while this agile guardian intercepts threats.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7893, y: 0.0000 }, { x: -0.2224, y: 0.3805 }, { x: -0.2224, y: 1.0132 }, { x: -0.7107, y: 1.1822 }, { x: -0.4976, y: 0.3415 }, { x: -0.7893, y: 0.2472 }, { x: -0.7893, y: -0.2472 }, { x: -0.4976, y: -0.3415 }, { x: -0.7107, y: -1.1822 }, { x: -0.2224, y: -1.0132 }, { x: -0.2224, y: -0.3805 }, { x: 0.7893, y: 0.0000 }],
                fillColor: [180, 160, 60]
            },
            { vertexData: [{ x: 0.1500, y: 0.0000 }, { x: -0.0750, y: 0.1299 }, { x: -0.0750, y: -0.1299 }], fillColor: [220, 200, 100] },
            { vertexData: [{ x: 0.5000, y: 0.0300 }, { x: 0.2000, y: 0.0600 }, { x: 0.2000, y: 0.0200 }, { x: 0.5000, y: -0.0100 }], fillColor: [120, 90, 40] },
            { vertexData: [{ x: 0.5000, y: -0.0300 }, { x: 0.2000, y: -0.0600 }, { x: 0.2000, y: -0.0200 }, { x: 0.5000, y: 0.0100 }], fillColor: [120, 90, 40] },
            { vertexData: [{ x: 0.5500, y: 0.0000 }, { x: 0.4500, y: 0.0600 }, { x: 0.4500, y: -0.0600 }], fillColor: [255, 255, 220] },
            { vertexData: [{ x: -0.6500, y: 1.1200 }, { x: -0.7200, y: 1.0800 }, { x: -0.6700, y: 1.0400 }], fillColor: [255, 220, 100] },
            { vertexData: [{ x: -0.6500, y: -1.1200 }, { x: -0.7200, y: -1.0800 }, { x: -0.6700, y: -1.0400 }], fillColor: [255, 220, 100] }
        ],
        typicalCargo: [],
        price: 18500,
        aiRoles: ["GUARD"],
        faction: "",
        techLevel: 2
    },
    "GladiusFighter": {
        name: "Gladius Fighter", role: "Medium Fighter", upgrades: [], sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRate: 0.06981,
        baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 12,
        armament: ["Burst Blaster", "Twin Pulse", "Kalibr Missile"], // Fast attack loadout
        costCategory: "Medium", description: "Military academies use these as the gold standard for 'how fighters should work.' Nimble 7.0 speed, solid shields, and firepower that makes it clear you're not here to negotiate. The reliable choice when your life expectancy needs extending.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: 0.2500, y: 0.4000 }, { x: -0.2500, y: 0.7000 }, { x: -0.9500, y: 0.5000 }, { x: -1.0500, y: 0.0000 }, { x: -0.9500, y: -0.5000 }, { x: -0.2500, y: -0.7000 }, { x: 0.2500, y: -0.4000 }],
                fillColor: [190, 195, 200],
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.5500, y: 0.0000 }, { x: 0.4000, y: 0.0800 }, { x: 0.4500, y: 0.0000 }, { x: 0.4000, y: -0.0800 }],
                fillColor: [218, 165, 32]
            },
            // Cockpit canopy
            {
                vertexData: [{ x: 0.3000, y: 0.0000 }, { x: 0.1500, y: 0.1200 }, { x: 0.1500, y: -0.1200 }],
                fillColor: [100, 160, 220]
            },
            // Wing hash lines
            {
                vertexData: [{ x: -0.4000, y: 0.6000 }, { x: -0.3500, y: 0.6200 }, { x: -0.5500, y: 0.5800 }, { x: -0.6000, y: 0.5600 }],
                fillColor: [160, 165, 170]
            },
            {
                vertexData: [{ x: -0.4000, y: -0.6000 }, { x: -0.3500, y: -0.6200 }, { x: -0.5500, y: -0.5800 }, { x: -0.6000, y: -0.5600 }],
                fillColor: [160, 165, 170]
            },
            // Nav lights
            {
                vertexData: [{ x: -0.3000, y: 0.6800 }, { x: -0.3700, y: 0.6500 }, { x: -0.3200, y: 0.6200 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: -0.3000, y: -0.6800 }, { x: -0.3700, y: -0.6500 }, { x: -0.3200, y: -0.6200 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Computers"],
        price: 28400,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 3
    },
    "GladiusFighterBH": {
        name: "Gladius BH", role: "Bounty Hunter", upgrades: [], sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRate: 0.06981,
        baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 12,
        armament: ["Burst Blaster", "Twin Pulse", "Harpoon Launcher"],
        costCategory: "Medium", description: "Bounty hunter Gladius in aggressive red. This hunter has the firepower to take down dangerous targets and the harpoon to make sure they don't escape. A professional's choice for high-value bounties.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: 0.2500, y: 0.4000 }, { x: -0.2500, y: 0.7000 }, { x: -0.9500, y: 0.5000 }, { x: -1.0500, y: 0.0000 }, { x: -0.9500, y: -0.5000 }, { x: -0.2500, y: -0.7000 }, { x: 0.2500, y: -0.4000 }],
                fillColor: [160, 40, 40]
            },
            { vertexData: [{ x: 0.5000, y: 0.0000 }, { x: 0.3500, y: 0.0700 }, { x: 0.2500, y: 0.0000 }, { x: 0.3500, y: -0.0700 }], fillColor: [30, 30, 30] },
            { vertexData: [{ x: 0.3000, y: 0.0000 }, { x: 0.1500, y: 0.1200 }, { x: 0.1500, y: -0.1200 }], fillColor: [200, 100, 100] },
            { vertexData: [{ x: -0.4000, y: 0.6000 }, { x: -0.3500, y: 0.6200 }, { x: -0.5500, y: 0.5800 }, { x: -0.6000, y: 0.5600 }], fillColor: [20, 20, 20] },
            { vertexData: [{ x: -0.4000, y: -0.6000 }, { x: -0.3500, y: -0.6200 }, { x: -0.5500, y: -0.5800 }, { x: -0.6000, y: -0.5600 }], fillColor: [20, 20, 20] },
            { vertexData: [{ x: -0.3000, y: 0.6800 }, { x: -0.3700, y: 0.6500 }, { x: -0.3200, y: 0.6200 }], fillColor: [255, 150, 0] },
            { vertexData: [{ x: -0.3000, y: -0.6800 }, { x: -0.3700, y: -0.6500 }, { x: -0.3200, y: -0.6200 }], fillColor: [255, 150, 0] }
        ],
        typicalCargo: ["Weapons"],
        price: 29400,
        aiRoles: ["BOUNTY_HUNTER"],
        faction: "",
        techLevel: 3
    },
    "GladiusFighterGuard": {
        name: "Gladius Guard", role: "Escort Fighter", upgrades: [], sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRate: 0.06981,
        baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 12,
        armament: ["Burst Blaster", "Twin Pulse", "Barrier Field"],
        costCategory: "Medium", description: "Guard Gladius in professional gold livery. The gold standard for escort duties, literally. Barrier field keeps VIPs safe while solid firepower deals with any threats.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: 0.2500, y: 0.4000 }, { x: -0.2500, y: 0.7000 }, { x: -0.9500, y: 0.5000 }, { x: -1.0500, y: 0.0000 }, { x: -0.9500, y: -0.5000 }, { x: -0.2500, y: -0.7000 }, { x: 0.2500, y: -0.4000 }],
                fillColor: [180, 160, 60]
            },
            { vertexData: [{ x: 0.5000, y: 0.0000 }, { x: 0.3800, y: 0.0700 }, { x: 0.3800, y: -0.0700 }], fillColor: [255, 255, 220] },
            { vertexData: [{ x: 0.3000, y: 0.0000 }, { x: 0.1500, y: 0.1200 }, { x: 0.1500, y: -0.1200 }], fillColor: [220, 200, 100] },
            { vertexData: [{ x: -0.4000, y: 0.6000 }, { x: -0.3500, y: 0.6200 }, { x: -0.5500, y: 0.5800 }, { x: -0.6000, y: 0.5600 }], fillColor: [120, 90, 40] },
            { vertexData: [{ x: -0.4000, y: -0.6000 }, { x: -0.3500, y: -0.6200 }, { x: -0.5500, y: -0.5800 }, { x: -0.6000, y: -0.5600 }], fillColor: [120, 90, 40] },
            { vertexData: [{ x: -0.3000, y: 0.6800 }, { x: -0.3700, y: 0.6500 }, { x: -0.3200, y: 0.6200 }], fillColor: [255, 220, 100] },
            { vertexData: [{ x: -0.3000, y: -0.6800 }, { x: -0.3700, y: -0.6500 }, { x: -0.3200, y: -0.6200 }], fillColor: [255, 220, 100] }
        ],
        typicalCargo: [],
        price: 29400,
        aiRoles: ["GUARD"],
        faction: "",
        techLevel: 3
    },
    "Vulture": {
        name: "Vulture", role: "Heavy Fighter", upgrades: [], sizeCategory: "Small", size: 38,
        baseMaxSpeed: 5.5, baseThrust: 0.14, baseTurnRate: 0.09599,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.6, cargoCapacity: 15,
        armament: ["Heavy Cannon", "Burst Blaster", "Loiter Munition", "Basic Mine"], // Aggressive fighter
        costCategory: "Medium-High", description: "All power, minimal brains. Mounts two huge hardpoints that drain so much energy pilots joke about needing a second reactor. Nimble for a heavy fighter (9.6 turn rate!) and shields that shrug off small-arms fire. Power management is a full-time job. Worth it for the boom-boom sounds.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9001, y: 0.0951 }, { x: -0.0202, y: 0.3805 }, { x: -0.1034, y: 1.0132 }, { x: -0.6000, y: 1.1822 }, { x: -0.6457, y: 0.4692 }, { x: -0.9001, y: 0.2000 }, { x: -0.9001, y: -0.2000 }, { x: -0.6457, y: -0.4692 }, { x: -0.6000, y: -1.1822 }, { x: -0.1034, y: -1.0132 }, { x: -0.0202, y: -0.3805 }, { x: 0.9001, y: -0.0951 }],
                fillColor: [210, 4, 4],
            },
            {
                vertexData: [{ x: 0.2000, y: 0.0000 }, { x: 0.1000, y: 0.1732 }, { x: -0.1000, y: 0.1732 }, { x: -0.2000, y: 0.0000 }, { x: -0.1000, y: -0.1732 }, { x: 0.1000, y: -0.1732 }],
                fillColor: [50, 150, 255],
            },
            // Wing tip lights
            {
                vertexData: [{ x: -0.4500, y: 1.1000 }, { x: -0.5200, y: 1.0600 }, { x: -0.4700, y: 1.0200 }],
                fillColor: [255, 255, 0]
            },
            {
                vertexData: [{ x: -0.4500, y: -1.1000 }, { x: -0.5200, y: -1.0600 }, { x: -0.4700, y: -1.0200 }],
                fillColor: [255, 255, 0]
            },
            // Kill marking
            {
                vertexData: [{ x: 0.5000, y: 0.0300 }, { x: 0.5500, y: 0.0300 }, { x: 0.5500, y: -0.0300 }, { x: 0.5000, y: -0.0300 }],
                fillColor: [255, 255, 255]
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.6500, y: 0.0000 }, { x: 0.5000, y: 0.0700 }, { x: 0.5600, y: 0.0000 }, { x: 0.5000, y: -0.0700 }],
                fillColor: [218, 165, 32]
            }
        ],
        typicalCargo: ["Computers", "Computers", "Weapons", "Narcotics", "Slaves"],
        price: 31300,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 3
    },
    "VultureBH": {
        name: "Vulture BH", role: "Bounty Hunter", upgrades: [], sizeCategory: "Small", size: 38,
        baseMaxSpeed: 5.5, baseThrust: 0.14, baseTurnRate: 0.09599,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.6, cargoCapacity: 15,
        armament: ["Heavy Cannon", "Burst Blaster", "Harpoon Launcher"],
        costCategory: "Medium-High", description: "Bounty hunter Vulture in blood-crimson. When this heavy fighter shows up, someone's about to have a very bad day. The harpoon ensures targets don't escape while the heavy cannon delivers justice.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9001, y: 0.0951 }, { x: -0.0202, y: 0.3805 }, { x: -0.1034, y: 1.0132 }, { x: -0.6000, y: 1.1822 }, { x: -0.6457, y: 0.4692 }, { x: -0.9001, y: 0.2000 }, { x: -0.9001, y: -0.2000 }, { x: -0.6457, y: -0.4692 }, { x: -0.6000, y: -1.1822 }, { x: -0.1034, y: -1.0132 }, { x: -0.0202, y: -0.3805 }, { x: 0.9001, y: -0.0951 }],
                fillColor: [140, 20, 20]
            },
            { vertexData: [{ x: 0.2000, y: 0.0000 }, { x: 0.1000, y: 0.1732 }, { x: -0.1000, y: 0.1732 }, { x: -0.2000, y: 0.0000 }, { x: -0.1000, y: -0.1732 }, { x: 0.1000, y: -0.1732 }], fillColor: [200, 100, 100] },
            { vertexData: [{ x: -0.4500, y: 1.1000 }, { x: -0.5200, y: 1.0600 }, { x: -0.4700, y: 1.0200 }], fillColor: [255, 150, 0] },
            { vertexData: [{ x: -0.4500, y: -1.1000 }, { x: -0.5200, y: -1.0600 }, { x: -0.4700, y: -1.0200 }], fillColor: [255, 150, 0] },
            { vertexData: [{ x: 0.5000, y: 0.0300 }, { x: 0.5500, y: 0.0300 }, { x: 0.5500, y: -0.0300 }, { x: 0.5000, y: -0.0300 }], fillColor: [255, 255, 255] },
            { vertexData: [{ x: 0.4400, y: 0.0300 }, { x: 0.4900, y: 0.0300 }, { x: 0.4900, y: -0.0300 }, { x: 0.4400, y: -0.0300 }], fillColor: [255, 255, 255] },
            { vertexData: [{ x: 0.6500, y: 0.0000 }, { x: 0.5000, y: 0.0700 }, { x: 0.4000, y: 0.0000 }, { x: 0.5000, y: -0.0700 }], fillColor: [30, 30, 30] }
        ],
        typicalCargo: ["Weapons", "Narcotics"],
        price: 32300,
        aiRoles: ["BOUNTY_HUNTER"],
        faction: "",
        techLevel: 3
    },
    "VultureGuard": {
        name: "Vulture Guard", role: "Escort Fighter", upgrades: [], sizeCategory: "Small", size: 38,
        baseMaxSpeed: 5.5, baseThrust: 0.14, baseTurnRate: 0.09599,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.6, cargoCapacity: 15,
        armament: ["Heavy Cannon", "Burst Blaster", "Barrier Field"],
        costCategory: "Medium-High", description: "Guard Vulture in golden livery. Heavy shields and heavy firepower make this the premium escort choice. The barrier field protects VIPs while those two huge hardpoints discourage any attacker.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9001, y: 0.0951 }, { x: -0.0202, y: 0.3805 }, { x: -0.1034, y: 1.0132 }, { x: -0.6000, y: 1.1822 }, { x: -0.6457, y: 0.4692 }, { x: -0.9001, y: 0.2000 }, { x: -0.9001, y: -0.2000 }, { x: -0.6457, y: -0.4692 }, { x: -0.6000, y: -1.1822 }, { x: -0.1034, y: -1.0132 }, { x: -0.0202, y: -0.3805 }, { x: 0.9001, y: -0.0951 }],
                fillColor: [180, 160, 60]
            },
            { vertexData: [{ x: 0.2000, y: 0.0000 }, { x: 0.1000, y: 0.1732 }, { x: -0.1000, y: 0.1732 }, { x: -0.2000, y: 0.0000 }, { x: -0.1000, y: -0.1732 }, { x: 0.1000, y: -0.1732 }], fillColor: [220, 200, 100] },
            { vertexData: [{ x: -0.4500, y: 1.1000 }, { x: -0.5200, y: 1.0600 }, { x: -0.4700, y: 1.0200 }], fillColor: [255, 220, 100] },
            { vertexData: [{ x: -0.4500, y: -1.1000 }, { x: -0.5200, y: -1.0600 }, { x: -0.4700, y: -1.0200 }], fillColor: [255, 220, 100] },
            { vertexData: [{ x: 0.6000, y: 0.0000 }, { x: 0.4800, y: 0.0700 }, { x: 0.4800, y: -0.0700 }], fillColor: [255, 255, 220] },
            { vertexData: [{ x: 0.4800, y: 0.0700 }, { x: 0.3800, y: 0.0500 }, { x: 0.3800, y: -0.0500 }, { x: 0.4800, y: -0.0700 }], fillColor: [140, 120, 40] }
        ],
        typicalCargo: [],
        price: 32300,
        aiRoles: ["GUARD"],
        faction: "",
        techLevel: 3
    },
    "CenturionGunship": {
        name: "Centurion Gunship", role: "Heavy Fighter", upgrades: [], sizeCategory: "Large", size: 72,
        baseMaxSpeed: 4.8, baseThrust: 0.13, baseTurnRate: 0.04538,
        baseHull: 320, baseShield: 220, shieldRecharge: 1.0, cargoCapacity: 20,
        armament: ["Quad Pulse", "Beam Laser", "Avenger Missile", "Harpoon Launcher", "Barrier Field", "Heavy Mine"], // Balanced heavy firepower
        costCategory: "High", description: "A brick with delusions of grandeur and enough guns to make up for its personality. Maxes out at a glacial 4.8 speed but compensates with 320 hull and firepower that could tickle a small moon. Perfect for pilots who believe subtlety is for the weak.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9421, y: 0.0000 }, { x: 0.7579, y: 0.4000 }, { x: 0.0865, y: 0.5048 }, { x: 0.4546, y: 0.6548 }, { x: 0.2506, y: 0.8786 }, { x: -0.5596, y: 0.8810 }, { x: -0.9421, y: 0.6000 }, { x: -0.7690, y: 0.0000 }, { x: -0.9421, y: -0.6000 }, { x: -0.5596, y: -0.8810 }, { x: 0.2506, y: -0.8786 }, { x: 0.4546, y: -0.6548 }, { x: 0.0865, y: -0.5048 }, { x: 0.7579, y: -0.4000 }],
                fillColor: [100, 105, 115]
            },
            {
                vertexData: [{ x: 0.4097, y: -0.6664 }, { x: 0.2373, y: -0.8540 }, { x: -0.5400, y: -0.8512 }, { x: -0.9068, y: -0.5828 }, { x: -0.3851, y: -0.3522 }],
                fillColor: [129, 129, 136]
            },
            {
                vertexData: [{ x: -0.0905, y: -0.5240 }, { x: 0.3429, y: -0.6907 }, { x: 0.2096, y: -0.8287 }],
                fillColor: [182, 182, 185]
            },
            {
                vertexData: [{ x: 0.4097, y: 0.6664 }, { x: 0.2373, y: 0.8540 }, { x: -0.5400, y: 0.8512 }, { x: -0.9068, y: 0.5828 }, { x: -0.3851, y: 0.3522 }],
                fillColor: [129, 129, 136]
            },
            {
                vertexData: [{ x: -0.0905, y: 0.5240 }, { x: 0.3429, y: 0.6907 }, { x: 0.2096, y: 0.8287 }],
                fillColor: [182, 182, 185]
            },
            // Military chevron emblem (gold arrow)
            {
                vertexData: [{ x: 0.4500, y: 0.0000 }, { x: 0.3000, y: 0.1000 }, { x: 0.3500, y: 0.0000 }, { x: 0.3000, y: -0.1000 }],
                fillColor: [218, 165, 32]
            },
            // Hull hash lines (deliberate pattern)
            {
                vertexData: [{ x: 0.0000, y: 0.4500 }, { x: 0.0400, y: 0.4700 }, { x: -0.1200, y: 0.4900 }, { x: -0.1600, y: 0.4700 }],
                fillColor: [80, 85, 95]
            },
            {
                vertexData: [{ x: 0.0000, y: -0.4500 }, { x: 0.0400, y: -0.4700 }, { x: -0.1200, y: -0.4900 }, { x: -0.1600, y: -0.4700 }],
                fillColor: [80, 85, 95]
            },
            // Nav lights
            {
                vertexData: [{ x: 0.2000, y: 0.8500 }, { x: 0.1400, y: 0.8200 }, { x: 0.1800, y: 0.7800 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: 0.2000, y: -0.8500 }, { x: 0.1400, y: -0.8200 }, { x: 0.1800, y: -0.7800 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Weapons", "Metals", "Machinery"],
        price: 55600,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 3 // Mid-tier
    },
    "HammerheadCorvette": { // NEW - Unique 2
        name: "Hammerhead Corvette", role: "Corvette/Patrol", upgrades: [], sizeCategory: "Large", size: 80,
        baseMaxSpeed: 4.0, baseThrust: 0.09, baseTurnRate: 0.04014,
        baseHull: 350, baseShield: 280, shieldRecharge: 1.0, cargoCapacity: 60,
        armament: ["Heavy Cannon", "Railgun Turret", "Wide Scatter", "Kalibr Missile", "Harpoon Launcher", "Barrier Field", "Advanced Mine"], // Military loadout
        costCategory: "High", description: "That bizarre hammerhead design isn't a fashion statement—it's packed with military-grade sensors worth more than most starter ships. Combines 350 hull with the firepower to back up threats. Enemies mock the look right up until they're vaporized.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8795, y: 0.3500 }, { x: 0.5844, y: 0.4670 }, { x: 0.4207, y: 0.7285 }, { x: 0.1427, y: 0.8587 }, { x: -0.1705, y: 0.5488 }, { x: -0.9254, y: 0.4670 }, { x: -0.9252, y: 0.3625 }, { x: -0.5529, y: 0.1330 }, { x: -0.5529, y: -0.1330 }, { x: -0.9252, y: -0.3625 }, { x: -0.9295, y: -0.4650 }, { x: -0.1705, y: -0.5488 }, { x: 0.1427, y: -0.8587 }, { x: 0.4207, y: -0.7285 }, { x: 0.5885, y: -0.4650 }, { x: 0.8795, y: -0.3500 }, { x: 0.9295, y: 0.0000 }],
                fillColor: [70, 100, 130],
            },
            {
                vertexData: [{ x: 0.1421, y: -0.7686 }, { x: 0.3536, y: -0.6314 }, { x: -0.0093, y: -0.4986 }, { x: -0.0093, y: -0.4986 }],
                fillColor: [180, 180, 80],
            },
            {
                vertexData: [{ x: -0.0093, y: 0.4871 }, { x: -0.0093, y: 0.4871 }, { x: 0.3864, y: 0.6086 }, { x: 0.1621, y: 0.7857 }],
                fillColor: [180, 180, 80],
            },
            {
                vertexData: [{ x: 0.3297, y: 0.2149 }, { x: 0.5680, y: 0.2548 }, { x: 0.7417, y: 0.0000 }, { x: 0.5680, y: -0.2548 }, { x: 0.3297, y: -0.2149 }],
                fillColor: [180, 180, 80],
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.8500, y: 0.0000 }, { x: 0.7000, y: 0.1000 }, { x: 0.7600, y: 0.0000 }, { x: 0.7000, y: -0.1000 }],
                fillColor: [218, 165, 32]
            }
        ],
        typicalCargo: ["Machinery", "Metals", "Food", "Metals", "Weapons"],
        price: 63700,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 4 // Advanced
    },
    "FerDeLance": {
        name: "Fer-de-Lance", role: "Heavy Combat", upgrades: [], sizeCategory: "Large", size: 65,
        baseMaxSpeed: 6.5, baseThrust: 0.11, baseTurnRate: 0.05236,
        baseHull: 180, baseShield: 350, shieldRecharge: 1.8, cargoCapacity: 24,
        armament: ["Sniper Rail", "Force Blaster", "Triple Pulse", "Kalibr Missile", "Harpoon Launcher", "Barrier Field", "Heavy Mine"],
        costCategory: "Very High", description: "The sports car of death—sleek, expensive, and completely impractical for groceries with only 24 cargo units. Hits 6.5 speed while recharging shields at 1.8x normal rate. Pilots either become legends or make very expensive craters. There is no middle ground.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.1000, y: 0.5000 }, { x: -0.7000, y: 0.6000 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.7000, y: -0.6000 }, { x: 0.1000, y: -0.5000 }],
                fillColor: [60, 65, 70],
            },
            {
                vertexData: [{ x: -0.9998, y: -0.2009 }, { x: -0.1000, y: -0.2431 }, { x: -0.7013, y: -0.5970 }],
                fillColor: [150, 150, 180],
            },
            {
                vertexData: [{ x: -0.9995, y: 0.2035 }, { x: -0.7020, y: 0.5957 }, { x: -0.1000, y: 0.3052 }],
                fillColor: [150, 150, 180],
            },
            {
                vertexData: [{ x: 0.4349, y: 0.0000 }, { x: 0.1360, y: 0.1505 }, { x: 0.1360, y: -0.1505 }],
                fillColor: [150, 150, 180],
            },
            // Racing stripe
            {
                vertexData: [{ x: 0.6000, y: 0.0500 }, { x: 0.0000, y: 0.2000 }, { x: 0.0000, y: 0.1500 }, { x: 0.6000, y: 0.0000 }],
                fillColor: [255, 200, 0]
            },
            {
                vertexData: [{ x: 0.6000, y: -0.0500 }, { x: 0.0000, y: -0.2000 }, { x: 0.0000, y: -0.1500 }, { x: 0.6000, y: 0.0000 }],
                fillColor: [255, 200, 0]
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.7000, y: 0.0000 }, { x: 0.5500, y: 0.0800 }, { x: 0.6100, y: 0.0000 }, { x: 0.5500, y: -0.0800 }],
                fillColor: [218, 165, 32]
            },
            // Nav lights
            {
                vertexData: [{ x: -0.6500, y: 0.5500 }, { x: -0.7200, y: 0.5200 }, { x: -0.6700, y: 0.4800 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: -0.6500, y: -0.5500 }, { x: -0.7200, y: -0.5200 }, { x: -0.6700, y: -0.4800 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Computers", "Computers", "Computers", "Computers", "Luxury Goods", "Weapons", "Narcotics"],
        price: 64200,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 4 // Advanced
    },
    "FerDeLanceBH": {
        name: "Fer-de-Lance BH", role: "Bounty Hunter", upgrades: [], sizeCategory: "Large", size: 65,
        baseMaxSpeed: 6.5, baseThrust: 0.11, baseTurnRate: 0.05236,
        baseHull: 180, baseShield: 350, shieldRecharge: 1.8, cargoCapacity: 24,
        armament: ["Sniper Rail", "Force Blaster", "Triple Pulse", "Harpoon Launcher", "Barrier Field"],
        costCategory: "Very High", description: "The bounty hunter's ultimate status symbol. That blood-red hull with kill marks says 'your bounty will be collected.' When this shows on scanner, smart criminals surrender. Others become another mark on the fuselage.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.1000, y: 0.5000 }, { x: -0.7000, y: 0.6000 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.7000, y: -0.6000 }, { x: 0.1000, y: -0.5000 }],
                fillColor: [140, 30, 30]
            },
            {
                vertexData: [{ x: -0.9998, y: -0.2009 }, { x: -0.1000, y: -0.2431 }, { x: -0.7013, y: -0.5970 }],
                fillColor: [180, 80, 80]
            },
            {
                vertexData: [{ x: -0.9995, y: 0.2035 }, { x: -0.7020, y: 0.5957 }, { x: -0.1000, y: 0.3052 }],
                fillColor: [180, 80, 80]
            },
            {
                vertexData: [{ x: 0.4349, y: 0.0000 }, { x: 0.1360, y: 0.1505 }, { x: 0.1360, y: -0.1505 }],
                fillColor: [200, 100, 100]
            },
            // Black racing stripes
            {
                vertexData: [{ x: 0.6000, y: 0.0500 }, { x: 0.0000, y: 0.2000 }, { x: 0.0000, y: 0.1500 }, { x: 0.6000, y: 0.0000 }],
                fillColor: [20, 20, 20]
            },
            {
                vertexData: [{ x: 0.6000, y: -0.0500 }, { x: 0.0000, y: -0.2000 }, { x: 0.0000, y: -0.1500 }, { x: 0.6000, y: 0.0000 }],
                fillColor: [20, 20, 20]
            },
            // Skull/crosshair emblem
            {
                vertexData: [{ x: 0.7000, y: 0.0000 }, { x: 0.5500, y: 0.0800 }, { x: 0.4500, y: 0.0000 }, { x: 0.5500, y: -0.0800 }],
                fillColor: [30, 30, 30]
            },
            // Kill marks
            { vertexData: [{ x: -0.3000, y: 0.3500 }, { x: -0.2600, y: 0.3500 }, { x: -0.2600, y: 0.3900 }, { x: -0.3000, y: 0.3900 }], fillColor: [255, 255, 255] },
            { vertexData: [{ x: -0.3500, y: 0.3600 }, { x: -0.3100, y: 0.3600 }, { x: -0.3100, y: 0.4000 }, { x: -0.3500, y: 0.4000 }], fillColor: [255, 255, 255] },
            { vertexData: [{ x: -0.4000, y: 0.3700 }, { x: -0.3600, y: 0.3700 }, { x: -0.3600, y: 0.4100 }, { x: -0.4000, y: 0.4100 }], fillColor: [255, 255, 255] },
            // Orange warning lights
            {
                vertexData: [{ x: -0.6500, y: 0.5500 }, { x: -0.7200, y: 0.5200 }, { x: -0.6700, y: 0.4800 }],
                fillColor: [255, 150, 0]
            },
            {
                vertexData: [{ x: -0.6500, y: -0.5500 }, { x: -0.7200, y: -0.5200 }, { x: -0.6700, y: -0.4800 }],
                fillColor: [255, 150, 0]
            }
        ],
        typicalCargo: ["Weapons", "Narcotics", "Slaves"],
        price: 68200,
        aiRoles: ["BOUNTY_HUNTER"],
        faction: "",
        techLevel: 4
    },
    "JackalMultirole": { // NEW - Multi-role
        name: "Jackal Multirole", role: "Multi-Role", upgrades: [], sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.8, baseThrust: 0.1, baseTurnRate: 0.06283,
        baseHull: 140, baseShield: 160, shieldRecharge: 1.2, cargoCapacity: 60,
        armament: ["Multi-Cannon", "Railgun Turret"], // Versatile
        costCategory: "Medium", description: "The Swiss Army knife of space, if Swiss Army knives were angular and grumpy-looking. Hits the sweet spot between fighter and hauler with 60 cargo tons and enough weapons to discourage pirates. Not amazing at anything, competent at everything—exactly what you want when the galaxy hates you.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.4000, y: 0.5000 }, { x: -0.3000, y: 0.8000 }, { x: -0.9000, y: 0.6000 }, { x: -0.5103, y: 0.1697 }, { x: -0.5103, y: -0.1697 }, { x: -0.9000, y: -0.6000 }, { x: -0.3000, y: -0.8000 }, { x: 0.4000, y: -0.5000 }],
                fillColor: [170, 160, 150]
            },
            {
                vertexData: [{ x: 0.6400, y: 0.0000 }, { x: 0.5400, y: 0.2132 }, { x: 0.3400, y: 0.2132 }, { x: 0.2400, y: 0.0000 }, { x: 0.3400, y: -0.2132 }, { x: 0.5400, y: -0.2132 }],
                fillColor: [101, 171, 236]
            },
            // Military chevron emblem
            {
                vertexData: [{ x: 0.7500, y: 0.0000 }, { x: 0.6000, y: 0.0800 }, { x: 0.6600, y: 0.0000 }, { x: 0.6000, y: -0.0800 }],
                fillColor: [218, 165, 32]
            }
        ],
        typicalCargo: ["Machinery", "Metals", "Food"],
        price: 23100,
        aiRoles: ["HAULER", "COMBAT"],
        faction: "MILITARY",
        techLevel: 2 // Utility
    },
    "Anaconda": {
        name: "Anaconda", role: "Heavy Combat/Multi", upgrades: [], sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRate: 0.02094,
        baseHull: 400, baseShield: 350, shieldRecharge: 1, cargoCapacity: 150,
        armament: ["Force Blaster", "Guardian Missile", "Barrier Field", "Advanced Mine"],
        costCategory: "Very High", description: "A mobile fortress that laughs at missile strikes with its 400-unit hull. Sure, it turns like a space station having a bad day, but when you're hauling 150 tons of cargo and enough firepower to level a moon, who needs agility? Peak engineering meets peak intimidation.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1500, y: 0.0000 }, { x: 0.8500, y: 0.3000 }, { x: -0.9500, y: 0.4000 }, { x: -1.1500, y: 0.2000 }, { x: -1.1500, y: -0.2000 }, { x: -0.9500, y: -0.4000 }, { x: 0.8500, y: -0.3000 }],
                fillColor: [80, 90, 100]
            },
            {
                vertexData: [{ x: 0.6900, y: -0.1980 }, { x: 0.8340, y: -0.0900 }, { x: 0.8340, y: 0.0900 }, { x: 0.6900, y: 0.1980 }, { x: 0.6700, y: 0.0000 }],
                fillColor: [150, 150, 180]
            },
            // Military chevron emblem (gold arrow) - large ship
            {
                vertexData: [{ x: 0.5000, y: 0.0000 }, { x: 0.3000, y: 0.1200 }, { x: 0.3800, y: 0.0000 }, { x: 0.3000, y: -0.1200 }],
                fillColor: [218, 165, 32]
            },
            // Hull identification stripe
            {
                vertexData: [{ x: 0.2000, y: 0.2600 }, { x: -0.6000, y: 0.3200 }, { x: -0.6000, y: 0.2800 }, { x: 0.2000, y: 0.2200 }],
                fillColor: [60, 70, 80]
            },
            {
                vertexData: [{ x: 0.2000, y: -0.2600 }, { x: -0.6000, y: -0.3200 }, { x: -0.6000, y: -0.2800 }, { x: 0.2000, y: -0.2200 }],
                fillColor: [60, 70, 80]
            },
            // Port navigation light
            {
                vertexData: [{ x: -0.9000, y: 0.3800 }, { x: -0.9700, y: 0.3500 }, { x: -0.9200, y: 0.3200 }],
                fillColor: [255, 50, 50]
            },
            // Starboard navigation light
            {
                vertexData: [{ x: -0.9000, y: -0.3800 }, { x: -0.9700, y: -0.3500 }, { x: -0.9200, y: -0.3200 }],
                fillColor: [50, 255, 50]
            },
            // Stern light
            {
                vertexData: [{ x: -1.0500, y: 0.0500 }, { x: -1.1200, y: 0.0000 }, { x: -1.0500, y: -0.0500 }],
                fillColor: [255, 255, 200]
            }
        ],
        typicalCargo: ["Luxury Goods", "Adv Components", "Metals", "Machinery", "Minerals"],
        price: 53800,
        aiRoles: ["COMBAT", "HAULER"],
        faction: "MILITARY",
        techLevel: 3, // Mid-tier
        canDualEngage: true // Large ships can engage two targets simultaneously
    },
    "VanguardCruiser": {
        name: "Vanguard Cruiser", role: "Fast Attack Cruiser", upgrades: [], sizeCategory: "Large", size: 95,
        baseMaxSpeed: 6.5, baseThrust: 0.12, baseTurnRate: 0.018,
        baseHull: 380, baseShield: 320, shieldRecharge: 1.3, cargoCapacity: 60,
        armament: ["Sniper Rail", "Railgun Turret", "Force Blaster", "Kalibr Missile", "Harpoon Launcher", "Barrier Field"],
        costCategory: "Very High", description: "Fast-attack cruiser that breaks every expectation by hitting 6.5 speed despite its size. Military R&D dumped unlimited funds into making something big move like a fighter. Succeeded brilliantly. Handles like a drunk shopping cart but enemies rarely live long enough to notice. Engineering triumph meets elegant overkill.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1000, y: 0.0000 }, { x: 0.8000, y: 0.2500 }, { x: 0.3000, y: 0.4000 }, { x: -0.6000, y: 0.5000 }, { x: -1.0000, y: 0.3000 }, { x: -1.1000, y: 0.0000 }, { x: -1.0000, y: -0.3000 }, { x: -0.6000, y: -0.5000 }, { x: 0.3000, y: -0.4000 }, { x: 0.8000, y: -0.2500 }],
                fillColor: [70, 80, 100]
            },
            {
                vertexData: [{ x: 0.7919, y: -0.0075 }, { x: 0.4919, y: 0.1425 }, { x: 0.0919, y: 0.1425 }, { x: 0.0919, y: -0.1575 }, { x: 0.4919, y: -0.1575 }],
                fillColor: [120, 180, 220]
            },
            {
                vertexData: [{ x: -0.5315, y: 0.2138 }, { x: -0.6915, y: 0.2938 }, { x: -0.8515, y: 0.1738 }, { x: -0.8515, y: -0.1862 }, { x: -0.6915, y: -0.3062 }, { x: -0.5315, y: -0.2262 }, { x: -0.3889, y: -0.1549 }, { x: -0.2869, y: -0.2138 }, { x: -0.0964, y: -0.1038 }, { x: -0.0964, y: 0.1162 }, { x: -0.2869, y: 0.2262 }, { x: -0.4120, y: 0.1540 }],
                fillColor: [55, 52, 60]
            },
            // Military chevron emblem (large cruiser)
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.7500, y: 0.1200 }, { x: 0.8300, y: 0.0000 }, { x: 0.7500, y: -0.1200 }],
                fillColor: [218, 165, 32]
            },
            // Port nav light
            {
                vertexData: [{ x: -0.5500, y: 0.4800 }, { x: -0.6200, y: 0.4500 }, { x: -0.5700, y: 0.4200 }],
                fillColor: [255, 50, 50]
            },
            // Starboard nav light
            {
                vertexData: [{ x: -0.5500, y: -0.4800 }, { x: -0.6200, y: -0.4500 }, { x: -0.5700, y: -0.4200 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Weapons", "Adv Components", "Computers"],
        price: 89500,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 4,
        canDualEngage: true
    },
    "ShardInterceptor": {
        name: "Shard Interceptor", role: "Fighter", upgrades: [], sizeCategory: "Small", size: 30,
        baseMaxSpeed: 8.5, baseThrust: 0.18, baseTurnRate: 0.08727,
        baseHull: 50, baseShield: 100, shieldRecharge: 1.8, cargoCapacity: 4, // Crystalline structure?
        armament: ["Disruptor", "Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Fast alien fighter that looks like someone tried to build a ship out of broken glass and bad dreams. Incorporates crystalline technology nobody fully understands. Hits 8.5 speed while disrupting sensors. Military techs drool over captured specimens—until they realize reverse-engineering might take decades.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1741, y: 0.0000 }, { x: 0.5245, y: 0.2433 }, { x: -0.1035, y: 0.1331 }, { x: -0.7045, y: 0.8065 }, { x: -1.1741, y: 0.4935 }, { x: -0.6173, y: 0.0000 }, { x: -1.1741, y: -0.4935 }, { x: -0.7045, y: -0.8065 }, { x: -0.1035, y: -0.1331 }, { x: 0.5245, y: -0.2433 }],
                fillColor: [180, 180, 240],
            }
        ],
        typicalCargo: [],
        price: 30400,
        aiRoles: ["COMBAT"],
        faction: "MILITARY",
        techLevel: 5
    },

    // --- IMPERIAL ---
    "ImperialCharger": {
        name: "Imperial Charger", role: "Light Skirmisher", upgrades: [], sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 7.5, baseThrust: 0.17, baseTurnRate: 0.085,
        baseHull: 35, baseShield: 45, shieldRecharge: 1.1, cargoCapacity: 4,
        armament: ["Pulse Laser"],
        costCategory: "Low", description: "The Imperial Navy's standardized training vessel—cheap to produce, easy to fly, and expendable enough that admirals don't weep when cadets crash them. That pristine white hull with gold star teaches pilots to look the part before they can fly it. Entry-level speed (7.5) and respectable handling make it perfect for learning. Veterans call it 'the milk carton' but everyone started here.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: -0.7000, y: 0.5000 }, { x: -0.9000, y: 0.0000 }, { x: -0.7000, y: -0.5000 }],
                fillColor: [230, 235, 245],
            },
            {
                vertexData: [{ x: -0.2000, y: 0.0000 }, { x: -0.3591, y: 0.0588 }, { x: -0.3658, y: 0.2283 }, { x: -0.4709, y: 0.0951 }, { x: -0.6342, y: 0.1411 }, { x: -0.5400, y: 0.0000 }, { x: -0.6342, y: -0.1411 }, { x: -0.4709, y: -0.0951 }, { x: -0.3658, y: -0.2283 }, { x: -0.3591, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: [], price: 20000, techLevel: 2,
        aiRoles: ["COMBAT"],
        faction: "IMPERIAL"
    },
    "ImperialCourier": {
        name: "Imperial Courier", role: "Light Fighter/Multi", upgrades: [], sizeCategory: "Small", size: 32,
        baseMaxSpeed: 7.8, baseThrust: 0.16, baseTurnRate: 0.07505,
        baseHull: 70, baseShield: 150, shieldRecharge: 1.7, cargoCapacity: 12,
        armament: ["Twin Pulse", "Beam Laser"], // Elegant, refined
        costCategory: "Medium", description: "Imperial's answer to 'what if we made the courier fast AND pretentious?' Hits 7.8 speed while looking down its nose at peasant ships. Shields regenerate at 1.7x because average is for commoners. Only 12 cargo tons because luxury goods don't need much space. Style over substance, but what style!",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.4000, y: 0.3000 }, { x: -0.5000, y: 0.5000 }, { x: -0.9000, y: 0.4000 }, { x: -1.0000, y: 0.0000 }, { x: -0.9000, y: -0.4000 }, { x: -0.5000, y: -0.5000 }, { x: 0.4000, y: -0.3000 }],
                fillColor: [210, 215, 220],
            },
            {
                vertexData: [{ x: 0.2400, y: 0.0000 }, { x: 0.0809, y: 0.0588 }, { x: 0.0742, y: 0.2283 }, { x: -0.0309, y: 0.0951 }, { x: -0.1942, y: 0.1411 }, { x: -0.1000, y: 0.0000 }, { x: -0.1942, y: -0.1411 }, { x: -0.0309, y: -0.0951 }, { x: 0.0742, y: -0.2283 }, { x: 0.0809, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: ["Luxury Goods", "Medicine"],
        price: 20100,
        aiRoles: ["COMBAT", "HAULER"],
        faction: "IMPERIAL",
        techLevel: 2 // Utility
    },
    "ImperialEagleMkII": {
        name: "Imperial Eagle MkII", role: "Superiority Fighter", upgrades: [], sizeCategory: "Small", size: 30,
        baseMaxSpeed: 7.8, baseThrust: 0.18, baseTurnRate: 0.092,
        baseHull: 60, baseShield: 140, shieldRecharge: 1.7, cargoCapacity: 6,
        armament: ["Twin Pulse", "Beam Laser"],
        costCategory: "Medium", description: "Imperial version of the classic Eagle—same idea, more arrogant execution. Faster (7.8), better shielded (140), and painted in colors that scream 'elite pilot aboard.' Only 6 cargo tons because carrying freight is for the help. Exclusively assigned to pilots with more swagger than sense. Both metrics measured high.",

        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.6000, y: 0.4000 }, { x: -0.9000, y: 0.2000 }, { x: -0.9000, y: -0.2000 }, { x: -0.6000, y: -0.4000 }],
                fillColor: [230, 230, 245],
            },
            {
                vertexData: [{ x: -0.3680, y: 0.0000 }, { x: -0.5271, y: 0.0588 }, { x: -0.5338, y: 0.2283 }, { x: -0.6389, y: 0.0951 }, { x: -0.8022, y: 0.1411 }, { x: -0.7080, y: 0.0000 }, { x: -0.8022, y: -0.1411 }, { x: -0.6389, y: -0.0951 }, { x: -0.5338, y: -0.2283 }, { x: -0.5271, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: [],
        price: 58000,
        aiRoles: ["COMBAT"],
        faction: "IMPERIAL",
        techLevel: 3
    },
    "ImperialLancer": {
        name: "Imperial Lancer", role: "Fast Attack Interceptor", upgrades: [], sizeCategory: "Small", size: 34,
        baseMaxSpeed: 8.2, baseThrust: 0.19, baseTurnRate: 0.085,
        baseHull: 70, baseShield: 130, shieldRecharge: 1.6, cargoCapacity: 8,
        armament: ["Twin Pulse", "Sniper Rail"],
        costCategory: "Medium", description: "Built specifically to catch things that run. Insane 8.2 speed means 'escape' isn't in the target's vocabulary. Mounts precision weapons because Imperials believe overkill is gauche. Used for surgical strikes, high-value assassinations, and reminding everyone why the Empire is still in charge. Terrifyingly effective.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.5000, y: 0.3000 }, { x: -1.0000, y: 0.1000 }, { x: -1.0000, y: -0.1000 }, { x: -0.5000, y: -0.3000 }],
                fillColor: [200, 210, 230],
            },
            {
                vertexData: [{ x: -0.3304, y: 0.0000 }, { x: -0.4895, y: 0.0588 }, { x: -0.4962, y: 0.2283 }, { x: -0.6013, y: 0.0951 }, { x: -0.7645, y: 0.1411 }, { x: -0.6704, y: 0.0000 }, { x: -0.7645, y: -0.1411 }, { x: -0.6013, y: -0.0951 }, { x: -0.4962, y: -0.2283 }, { x: -0.4895, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: [],
        price: 62000,
        techLevel: 4,
        aiRoles: ["COMBAT"],
        faction: "IMPERIAL"
    },
    "ImperialGuardian": {
        name: "Imperial Guardian", role: "System Patrol Cutter", upgrades: [], sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.8, baseThrust: 0.1, baseTurnRate: 0.05,
        baseHull: 160, baseShield: 200, shieldRecharge: 1.5, cargoCapacity: 25,
        armament: ["Beam Laser", "Twin Pulse", "Mini-Turret"],
        costCategory: "Medium-High", description: "Imperial system patrol—faster than police cruisers, prettier than military warships, and more condescending than both combined. That 200-shield capacity and 5.8 speed combo makes pirates rethink carreer choices. Gold trim is non-optional. Serves as both intimidation and target practice for rebels.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.5000, y: 0.4000 }, { x: -0.5000, y: 0.7000 }, { x: -1.0000, y: 0.3000 }, { x: -1.0000, y: -0.3000 }, { x: -0.5000, y: -0.7000 }, { x: 0.5000, y: -0.4000 }],
                fillColor: [220, 220, 240],
            },
            {
                vertexData: [{ x: -0.4091, y: 0.0000 }, { x: -0.5682, y: 0.0588 }, { x: -0.5750, y: 0.2283 }, { x: -0.6800, y: 0.0951 }, { x: -0.8433, y: 0.1411 }, { x: -0.7491, y: 0.0000 }, { x: -0.8433, y: -0.1411 }, { x: -0.6800, y: -0.0951 }, { x: -0.5750, y: -0.2283 }, { x: -0.5682, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: ["Weapons", "Slaves"],
        price: 85000,
        aiRoles: ["COMBAT"],
        faction: "IMPERIAL",
        techLevel: 4
    },
    "ImperialJusticar": {
        name: "Imperial Justicar", role: "Heavy Gunboat", upgrades: [], sizeCategory: "Medium", size: 62,
        baseMaxSpeed: 5.0, baseThrust: 0.11, baseTurnRate: 0.042,
        baseHull: 280, baseShield: 320, shieldRecharge: 1.4, cargoCapacity: 40,
        armament: ["Quad Pulse", "Railgun Turret", "Beam Laser", "Heavy Tangle", "Barrier Field"],
        costCategory: "High", description: "The Imperial hammer for when diplomacy has conclusively failed. Square, brutal, and packing 280 hull plus 320 shields. That geometric design isn't artistic—it's optimal for mounting weapons on every surface. Enforces blockades by existing near them. Rebels call these 'nope ships' and avoid accordingly.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.5000 }, { x: 0.5000, y: 0.9000 }, { x: -0.5000, y: 0.9000 }, { x: -0.9000, y: 0.5000 }, { x: -0.9000, y: -0.5000 }, { x: -0.5000, y: -0.9000 }, { x: 0.5000, y: -0.9000 }, { x: 0.9000, y: -0.5000 }],
                fillColor: [180, 190, 210],
            },
            {
                vertexData: [{ x: -0.7571, y: -0.4875 }, { x: 0.0000, y: -0.3393 }, { x: 0.7571, y: -0.4875 }, { x: -0.3319, y: -0.7334 }],
                fillColor: [255, 255, 255],
            },
            {
                vertexData: [{ x: -0.3956, y: 0.7037 }, { x: 0.7252, y: 0.4089 }, { x: 0.0000, y: 0.2726 }, { x: -0.7252, y: 0.4089 }],
                fillColor: [255, 255, 255],
            },
            {
                vertexData: [{ x: -0.3938, y: 0.0000 }, { x: -0.5529, y: 0.0588 }, { x: -0.5596, y: 0.2283 }, { x: -0.6647, y: 0.0951 }, { x: -0.8279, y: 0.1411 }, { x: -0.7338, y: 0.0000 }, { x: -0.8279, y: -0.1411 }, { x: -0.6647, y: -0.0951 }, { x: -0.5596, y: -0.2283 }, { x: -0.5529, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: ["Weapons", "Slaves"], price: 125000,
        aiRoles: ["COMBAT"],
        faction: "IMPERIAL",
        techLevel: 4
    },
    "ImperialPaladin": {
        name: "Imperial Paladin", role: "Heavy Assault Frigate", upgrades: [], sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.5, baseThrust: 0.09, baseTurnRate: 0.038,
        baseHull: 350, baseShield: 400, shieldRecharge: 1.7, cargoCapacity: 70,
        armament: ["Heavy Cannon", "Mini-Turret", "Force Blaster", "Heavy Tangle", "Halo"],
        costCategory: "High", description: "Imperial heavy hitter designed for 'peacekeeping' (read: subjugation). That pristine white hull with 350 hull and 400 shields broadcasts 'mess around and find out' in six languages. Slow to turn but broadside firepower compensates by erasing problems. Rebels hate it. Imperials love everything about it.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8444, y: 0.0813 }, { x: 0.3896, y: 0.3191 }, { x: -0.3614, y: 0.3732 }, { x: -0.5719, y: 0.6322 }, { x: -0.8444, y: 0.5000 }, { x: -0.8444, y: -0.5000 }, { x: -0.5719, y: -0.6322 }, { x: -0.3614, y: -0.3732 }, { x: 0.3896, y: -0.3191 }, { x: 0.8444, y: -0.0813 }],
                fillColor: [240, 240, 250],
            },
            {
                vertexData: [{ x: -0.3352, y: 0.0041 }, { x: -0.4943, y: 0.0629 }, { x: -0.5010, y: 0.2323 }, { x: -0.6061, y: 0.0992 }, { x: -0.7693, y: 0.1452 }, { x: -0.6752, y: 0.0041 }, { x: -0.7693, y: -0.1370 }, { x: -0.6061, y: -0.0910 }, { x: -0.5010, y: -0.2242 }, { x: -0.4943, y: -0.0547 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: ["Weapons", "Luxury Goods"],
        price: 170000,
        aiRoles: ["COMBAT"],
        faction: "IMPERIAL",
        techLevel: 4,
        canDualEngage: true // Large ships can engage two targets simultaneously
    },
    "ImperialEnvoy": {
        name: "Imperial Envoy", role: "Diplomatic Transport", upgrades: [], sizeCategory: "Large", size: 70,
        baseMaxSpeed: 6.0, baseThrust: 0.08, baseTurnRate: 0.03,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.8, cargoCapacity: 50,
        armament: ["Mini-Turret", "Pulse Laser"],
        costCategory: "High", description: "Diplomatic transport that's more armed than some destroyers. Shields at 250 because ambassadors refuse to die looking undignified. Speed of 6.0 means it arrives fashionably not-late. The white-and-gold paint scheme costs more than small ships. Attacking one is declaring war while insulting interior design taste.",

        vertexLayers: [
            {
                vertexData: [{ x: 1.1000, y: 0.0000 }, { x: 0.8000, y: 0.3000 }, { x: -0.8000, y: 0.4000 }, { x: -1.1000, y: 0.0000 }, { x: -0.8000, y: -0.4000 }, { x: 0.8000, y: -0.3000 }],
                fillColor: [250, 250, 255],
            },
            {
                vertexData: [{ x: -0.4994, y: 0.0000 }, { x: -0.6585, y: 0.0588 }, { x: -0.6652, y: 0.2283 }, { x: -0.7703, y: 0.0951 }, { x: -0.9336, y: 0.1411 }, { x: -0.8394, y: 0.0000 }, { x: -0.9336, y: -0.1411 }, { x: -0.7703, y: -0.0951 }, { x: -0.6652, y: -0.2283 }, { x: -0.6585, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: ["Luxury Goods"],
        price: 105000,
        aiRoles: ["HAULER"],
        faction: "IMPERIAL",
        techLevel: 4
    },
    "ImperialSentinel": {
        name: "Imperial Sentinel", role: "Border Patrol Corvette", upgrades: [], sizeCategory: "Large", size: 78,
        baseMaxSpeed: 5.2, baseThrust: 0.095, baseTurnRate: 0.04,
        baseHull: 300, baseShield: 350, shieldRecharge: 1.6, cargoCapacity: 60,
        armament: ["Mini-Turret", "Multi-Cannon", "Twin Pulse"],
        costCategory: "High", description: "Long-duration patrol corvette designed for border regions where backup is measured in weeks. That 300 hull and 350 shields keeps it alive until reinforcements maybe arrive. Crews serve six-month deployments wondering if headquarters remembers they exist. Spoiler: headquarters does not remember.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.3000 }, { x: 0.4000, y: 0.6000 }, { x: -0.4000, y: 0.8000 }, { x: -1.0000, y: 0.6000 }, { x: -1.0000, y: -0.6000 }, { x: -0.4000, y: -0.8000 }, { x: 0.4000, y: -0.6000 }, { x: 1.0000, y: -0.3000 }],
                fillColor: [210, 215, 225],
            },
            {
                vertexData: [{ x: -0.3762, y: 0.0000 }, { x: -0.5353, y: 0.0588 }, { x: -0.5420, y: 0.2283 }, { x: -0.6471, y: 0.0951 }, { x: -0.8103, y: 0.1411 }, { x: -0.7162, y: 0.0000 }, { x: -0.8103, y: -0.1411 }, { x: -0.6471, y: -0.0951 }, { x: -0.5420, y: -0.2283 }, { x: -0.5353, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: ["Adv Components", "Slaves"],
        price: 145000,
        aiRoles: ["COMBAT"],
        faction: "IMPERIAL",
        techLevel: 5
    },
    "ImperialClipper": {
        name: "Imperial Clipper", role: "Multi-Role/Trader", upgrades: [], sizeCategory: "Large", size: 95,
        baseMaxSpeed: 7.0, baseThrust: 0.10, baseTurnRate: 0.02618,
        baseHull: 180, baseShield: 180, shieldRecharge: 1.4, cargoCapacity: 180,
        armament: ["V Punch", "Mini-Turret", "Beam Laser", "Heavy Tangle"], // Elegant, balanced
        costCategory: "High", description: "Imperial elegance meets cargo logistics. Gleaming white hull that screams 'I'm better than you' while hauling 180 tons faster (7.0 speed) than ships half its size. Shields recharge at 1.4x because imperials believe vulnerabilities are for peasants. Docking fees are double just because it exists.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0500, y: 0.0000 }, { x: 0.6500, y: 0.2000 }, { x: 0.0500, y: 0.9000 }, { x: -0.8500, y: 0.8000 }, { x: -1.0500, y: 0.4000 }, { x: -1.0500, y: -0.4000 }, { x: -0.8500, y: -0.8000 }, { x: 0.0500, y: -0.9000 }, { x: 0.6500, y: -0.2000 }],
                fillColor: [220, 225, 230],
            },
            {
                vertexData: [{ x: 0.4246, y: 0.0632 }, { x: 0.6612, y: 0.0067 }, { x: 0.4246, y: -0.0499 }],
                fillColor: [150, 150, 180],
            },
            {
                vertexData: [{ x: -0.4673, y: 0.0000 }, { x: -0.6264, y: 0.0588 }, { x: -0.6332, y: 0.2283 }, { x: -0.7382, y: 0.0951 }, { x: -0.9015, y: 0.1411 }, { x: -0.8073, y: 0.0000 }, { x: -0.9015, y: -0.1411 }, { x: -0.7382, y: -0.0951 }, { x: -0.6332, y: -0.2283 }, { x: -0.6264, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: ["Luxury Goods", "Medicine", "Textiles", "Textiles", "Textiles"],
        price: 42900,
        aiRoles: ["HAULER"],
        faction: "IMPERIAL",
        techLevel: 4
    },
    "ImperialCutterLite": {
        name: "Imperial Cutter Lite", role: "Fast Armed Trader", upgrades: [], sizeCategory: "Large", size: 80,
        baseMaxSpeed: 6.5, baseThrust: 0.09, baseTurnRate: 0.028,
        baseHull: 200, baseShield: 280, shieldRecharge: 1.6, cargoCapacity: 150,
        armament: ["Beam Laser", "Twin Pulse", "Mini-Turret"],
        costCategory: "High", description: "A smaller, more agile version of the Cutter, still capable of significant cargo and defense.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1000, y: 0.0000 }, { x: 0.7000, y: 0.2500 }, { x: 0.0000, y: 0.7000 }, { x: -0.9000, y: 0.6000 }, { x: -1.1000, y: 0.3000 }, { x: -1.1000, y: -0.3000 }, { x: -0.9000, y: -0.6000 }, { x: 0.0000, y: -0.7000 }, { x: 0.7000, y: -0.2500 }],
                fillColor: [225, 230, 240],
            },
            {
                vertexData: [{ x: -0.4765, y: 0.0000 }, { x: -0.6356, y: 0.0588 }, { x: -0.6423, y: 0.2283 }, { x: -0.7474, y: 0.0951 }, { x: -0.9107, y: 0.1411 }, { x: -0.8165, y: 0.0000 }, { x: -0.9107, y: -0.1411 }, { x: -0.7474, y: -0.0951 }, { x: -0.6423, y: -0.2283 }, { x: -0.6356, y: -0.0588 }],
                fillColor: [160, 80, 200],
            }
        ],
        typicalCargo: ["Luxury Goods", "Adv Components", "Computers"],
        price: 130000,
        aiRoles: ["COMBAT", "HAULER"],
        faction: "IMPERIAL",
        techLevel: 5
    },

    // --- SEPARATIST ---
    "SeparatistPartisan": {
        name: "Separatist Partisan", role: "Light Skirmisher", upgrades: [], sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 7.5, baseThrust: 0.17, baseTurnRate: 0.085,
        baseHull: 35, baseShield: 45, shieldRecharge: 1.1, cargoCapacity: 4,
        armament: ["Pulse Laser"],
        costCategory: "Low", description: "The Separatist militia's sacrificial lamb. Tiny (20), fast (7.5), and piloted by people with more conviction than sense. Massively outgunned in every fight but they keep coming anyway. Military analysts call them 'target practice.' Separatists call them 'heroes.' Both are correct.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: -0.7000, y: 0.5000 }, { x: -0.9000, y: 0.0000 }, { x: -0.7000, y: -0.5000 }],
                fillColor: [80, 80, 60],
            },
            {
                vertexData: [{ x: -0.2265, y: 0.0000 }, { x: -0.3365, y: 0.1905 }, { x: -0.5565, y: 0.1905 }, { x: -0.6665, y: 0.0000 }, { x: -0.5565, y: -0.1905 }, { x: -0.3365, y: -0.1905 }],
                fillColor: [182, 17, 17],
            }
        ],
        typicalCargo: [], price: 28000,
        aiRoles: ["COMBAT"],
        faction: "SEPARATIST",
        techLevel: 2,
    },
    "SeparatistLiberator": {
        name: "Separatist Liberator", role: "Assault Fighter", upgrades: [], sizeCategory: "Small", size: 36,
        baseMaxSpeed: 6.5, baseThrust: 0.14, baseTurnRate: 0.07,
        baseHull: 90, baseShield: 110, shieldRecharge: 1.2, cargoCapacity: 12,
        armament: ["Multi-Cannon", "Burst Blaster"],
        costCategory: "Medium", description: "Separatist standard issue fighter—rugged, reliable, and painted in revolutionary red. Not flashy but effective, like the pilots who fly them. That 90 hull means it survives battles that would atomize cheaper ships. Preferred by the kind of people who use words like 'liberation' and 'regime change' unironically.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.6000, y: 0.6000 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.6000, y: -0.6000 }],
                fillColor: [100, 40, 40],
            },
            {
                vertexData: [{ x: 0.2200, y: 0.0000 }, { x: 0.1100, y: 0.1905 }, { x: -0.1100, y: 0.1905 }, { x: -0.2200, y: 0.0000 }, { x: -0.1100, y: -0.1905 }, { x: 0.1100, y: -0.1905 }],
                fillColor: [150, 150, 180],
            },
            // Revolutionary star emblem
            {
                vertexData: [{ x: 0.5000, y: 0.0000 }, { x: 0.4200, y: 0.0600 }, { x: 0.4200, y: -0.0600 }],
                fillColor: [255, 215, 0]
            },
            // Wing stripe
            {
                vertexData: [{ x: -0.5000, y: 0.5000 }, { x: -0.7000, y: 0.4000 }, { x: -0.7000, y: 0.3500 }, { x: -0.5000, y: 0.4500 }],
                fillColor: [180, 60, 60]
            },
            {
                vertexData: [{ x: -0.5000, y: -0.5000 }, { x: -0.7000, y: -0.4000 }, { x: -0.7000, y: -0.3500 }, { x: -0.5000, y: -0.4500 }],
                fillColor: [180, 60, 60]
            }
        ],
        typicalCargo: ["Weapons", "Food"],
        price: 52000,
        aiRoles: ["COMBAT"],
        faction: "SEPARATIST",
        techLevel: 3
    },
    "SeparatistShadow": {
        name: "Separatist Shadow", role: "Stealth Infiltrator", upgrades: [], sizeCategory: "Small", size: 28,
        baseMaxSpeed: 6.0, baseThrust: 0.11, baseTurnRate: 0.06,
        baseHull: 50, baseShield: 70, shieldRecharge: 1.2, cargoCapacity: 10,
        armament: ["Pulse Laser", "Disruptor"],
        costCategory: "Medium-High", description: "Painted matte black because Separatist stealth operatives watched too many spy holos. Actually does have basic sensor-dampening tech, but it's temperamental. Fast enough (6.0) to slip past patrols when the stealth works. When it doesn't, that 50 hull won't save you. High risk, high reward.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.3000, y: 0.4000 }, { x: -0.8000, y: 0.1000 }, { x: -0.8000, y: -0.1000 }, { x: -0.3000, y: -0.4000 }],
                fillColor: [30, 30, 30]
            },
            {
                vertexData: [{ x: -0.1743, y: 0.0000 }, { x: -0.2843, y: 0.1905 }, { x: -0.5043, y: 0.1905 }, { x: -0.6143, y: 0.0000 }, { x: -0.5043, y: -0.1905 }, { x: -0.2843, y: -0.1905 }],
                fillColor: [114, 3, 3]
            }
        ],
        typicalCargo: ["Adv Components", "Computers"],
        price: 65000,
        aiRoles: ["COMBAT"],
        faction: "SEPARATIST",
        techLevel: 4
    },
    "SeparatistOutlander": {
        name: "Separatist Outlander", role: "Long-Range Scout/Raider", upgrades: [], sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.5, baseThrust: 0.09, baseTurnRate: 0.05,
        baseHull: 120, baseShield: 150, shieldRecharge: 1.3, cargoCapacity: 40, // For supplies or loot
        armament: ["Beam Laser", "Mini-Turret"],
        costCategory: "Medium", description: "For when your revolution needs supplies from sketchy contacts six jumps away. Balanced stats (120 hull, 150 shields, 40 cargo) make it good at everything, great at nothing—exactly what you want when every system might be hostile. The ship equivalent of a good poker face.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.3000, y: 0.3000 }, { x: -0.2000, y: 0.7000 }, { x: -1.0000, y: 0.3000 }, { x: -1.0000, y: -0.3000 }, { x: -0.2000, y: -0.7000 }, { x: 0.3000, y: -0.3000 }],
                fillColor: [60, 80, 60],
            },
            {
                vertexData: [{ x: -0.3532, y: 0.0000 }, { x: -0.4632, y: 0.1905 }, { x: -0.6832, y: 0.1905 }, { x: -0.7932, y: 0.0000 }, { x: -0.6832, y: -0.1905 }, { x: -0.4632, y: -0.1905 }],
                fillColor: [212, 22, 22],
            }
        ],
        typicalCargo: ["Computers", "Adv Components", "Food"],
        price: 70000,
        aiRoles: ["COMBAT", "HAULER"],
        faction: "SEPARATIST",
        techLevel: 4,
    },
    "SeparatistDefiant": {
        name: "Separatist Defiant", role: "Gunship", upgrades: [], sizeCategory: "Medium", size: 58,
        baseMaxSpeed: 4.8, baseThrust: 0.1, baseTurnRate: 0.04,
        baseHull: 250, baseShield: 180, shieldRecharge: 0.9, cargoCapacity: 30,
        armament: ["Heavy Cannon", "Railgun Turret", "Twin Pulse", "Guardian Missile"],
        costCategory: "Medium-High", description: "Built specifically to break military blockades and ruin admirals' days. That 250 hull isn't for show—it's for absorbing fire while returning tenfold hurt. Separatist engineers crammed every available space with guns and armor. Subtlety died so this gunship could live. Nobody mourns subtlety.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.4000 }, { x: 0.4000, y: 0.8000 }, { x: -0.7765, y: 0.8000 }, { x: -0.9000, y: 0.4000 }, { x: -0.9000, y: -0.4000 }, { x: -0.7765, y: -0.8000 }, { x: 0.4000, y: -0.8000 }, { x: 0.9000, y: -0.4000 }],
                fillColor: [70, 70, 70]
            },
            {
                vertexData: [{ x: -0.3192, y: 0.0000 }, { x: -0.4292, y: 0.1905 }, { x: -0.6492, y: 0.1905 }, { x: -0.7592, y: 0.0000 }, { x: -0.6492, y: -0.1905 }, { x: -0.4292, y: -0.1905 }],
                fillColor: [170, 3, 3]
            },
            {
                vertexData: [{ x: -0.6115, y: -0.6230 }, { x: -0.5095, y: -0.5024 }, { x: 0.2554, y: -0.7038 }],
                fillColor: [113, 14, 39]
            },
            {
                vertexData: [{ x: -0.6115, y: 0.6230 }, { x: -0.5095, y: 0.5024 }, { x: 0.2554, y: 0.7038 }],
                fillColor: [113, 14, 39]
            }
        ],
        typicalCargo: ["Weapons", "Chemicals"],
        price: 90000,
        aiRoles: ["COMBAT"],
        faction: "SEPARATIST",
        techLevel: 4,
    },
    "SeparatistVanguard": {
        name: "Separatist Vanguard", role: "Heavy Assault Cruiser", upgrades: [], sizeCategory: "Large", size: 85,
        baseMaxSpeed: 4.2, baseThrust: 0.08, baseTurnRate: 0.035,
        baseHull: 400, baseShield: 300, shieldRecharge: 1.0, cargoCapacity: 80,
        armament: ["Force Blaster", "Railgun Turret", "Quad Pulse", "Guardian Missile"],
        costCategory: "High", description: "The Separatist movement's pride and propaganda centerpiece. Bristles with 400 hull and enough weaponry to make empires nervous. When one of these shows up, it's not a raid—it's a statement. Usually reads: 'your government is illegitimate and we brought receipts (in missile form).'",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.2000 }, { x: 0.6000, y: 0.7000 }, { x: -0.6000, y: 0.9000 }, { x: -1.0000, y: 0.5000 }, { x: -1.0000, y: -0.5000 }, { x: -0.6000, y: -0.9000 }, { x: 0.6000, y: -0.7000 }, { x: 1.0000, y: -0.2000 }],
                fillColor: [52, 65, 64]
            },
            {
                vertexData: [{ x: -0.3477, y: 0.0000 }, { x: -0.4577, y: 0.1905 }, { x: -0.6777, y: 0.1905 }, { x: -0.7877, y: 0.0000 }, { x: -0.6777, y: -0.1905 }, { x: -0.4577, y: -0.1905 }],
                fillColor: [212, 12, 42]
            }
        ],
        typicalCargo: ["Weapons", "Machinery"],
        price: 160000,
        aiRoles: ["COMBAT"],
        faction: "SEPARATIST",
        techLevel: 5,
    },
    "SeparatistBulwark": {
        name: "Separatist Bulwark", role: "Mobile Defense Platform", upgrades: [], sizeCategory: "Very Large", size: 130,
        baseMaxSpeed: 2.5, baseThrust: 0.04, baseTurnRate: 0.015,
        baseHull: 700, baseShield: 500, shieldRecharge: 0.8, cargoCapacity: 150,
        armament: ["Railgun Turret", "Mini-Turret", "Wide Scatter", "Avenger Missile", "Barrier Field"],
        costCategory: "Very High", description: "A flying fortress that moves at the speed of continental drift (2.5 max) but Laughs at conventional weapons with 700 hull and 500 shields. Separatists park these over contested systems and dare anyone to do something about it. Usually, nobody does. Smart. Attacking this is choosing career-end ing violence.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.7000 }, { x: 0.7000, y: 1.0000 }, { x: -0.7000, y: 1.0000 }, { x: -1.0000, y: 0.7000 }, { x: -1.0000, y: -0.7000 }, { x: -0.7000, y: -1.0000 }, { x: 0.7000, y: -1.0000 }, { x: 1.0000, y: -0.7000 }],
                fillColor: [52, 65, 64]
            },
            {
                vertexData: [{ x: -0.2512, y: -0.1969 }, { x: -0.3612, y: -0.0064 }, { x: -0.5812, y: -0.0064 }, { x: -0.6912, y: -0.1969 }, { x: -0.5812, y: -0.3874 }, { x: -0.3612, y: -0.3874 }],
                fillColor: [212, 12, 42]
            },
            {
                vertexData: [{ x: -0.2512, y: 0.1969 }, { x: -0.3612, y: 0.0064 }, { x: -0.5812, y: 0.0064 }, { x: -0.6912, y: 0.1969 }, { x: -0.5812, y: 0.3874 }, { x: -0.3612, y: 0.3874 }],
                fillColor: [212, 12, 42]
            },
            {
                vertexData: [{ x: -0.3497, y: 0.0004 }, { x: -0.2397, y: 0.1910 }, { x: -0.0197, y: 0.1910 }, { x: 0.0903, y: 0.0004 }, { x: -0.0197, y: -0.1901 }, { x: -0.2397, y: -0.1901 }],
                fillColor: [212, 12, 42]
            }
        ],
        typicalCargo: ["Metals", "Machinery"],
        price: 250000,
        aiRoles: ["COMBAT"],
        faction: "SEPARATIST",
        techLevel: 5,
        canDualEngage: true // Large ships can engage two targets simultaneously
    },
    "SeparatistSupplyRunner": {
        name: "Separatist Supply Runner", role: "Armored Transport", upgrades: [], sizeCategory: "Medium", size: 52,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.035,
        baseHull: 180, baseShield: 120, shieldRecharge: 0.8, cargoCapacity: 100,
        armament: ["Twin Pulse", "Mini-Turret"],
        costCategory: "Medium", description: "Armored supply runner built like a tank with cargo doors. Hauls 100 tons of revolution-sustaining goods through military zones while absorbing fire with 180 hull. Not fast, not pretty, but essential. Loses one of these and your rebellion starves. Pilots get commendations posthumously or drinks at the cantina. No middle ground.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.6000 }, { x: 0.7000, y: 0.8000 }, { x: -0.7000, y: 0.8000 }, { x: -0.9000, y: 0.6000 }, { x: -0.9000, y: -0.6000 }, { x: -0.7000, y: -0.8000 }, { x: 0.7000, y: -0.8000 }, { x: 0.9000, y: -0.6000 }],
                fillColor: [90, 70, 50]
            },
            {
                vertexData: [{ x: -0.3708, y: 0.2585 }, { x: -0.4808, y: 0.4490 }, { x: -0.7008, y: 0.4490 }, { x: -0.8108, y: 0.2585 }, { x: -0.7008, y: 0.0679 }, { x: -0.4808, y: 0.0679 }],
                fillColor: [133, 0, 57]
            },
            {
                vertexData: [{ x: -0.3708, y: -0.2585 }, { x: -0.4808, y: -0.4490 }, { x: -0.7008, y: -0.4490 }, { x: -0.8108, y: -0.2585 }, { x: -0.7008, y: -0.0679 }, { x: -0.4808, y: -0.0679 }],
                fillColor: [133, 0, 57]
            }
        ],
        typicalCargo: ["Food", "Medicine", "Weapons", "Chemicals"],
        price: 48000,
        aiRoles: ["HAULER"],
        faction: "SEPARATIST",
        techLevel: 3,
    },

    // --- PIRATE ---
    "Sidewinder": {
        name: "Sidewinder", role: "Starter", upgrades: ["Faulcon DeLacy Composite"], sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRate: 0.06981,
        baseHull: 50, baseShield: 50, shieldRecharge: 1.0, cargoCapacity: 10,
        armament: ["Pulse Laser"], // Starter weapon
        costCategory: "N/A", description: "The bargain bin starter ship that new pilots either treasure forever or sell within hours. Balanced 50/50 hull/shields and just enough cargo (10 tons) to learn the hauling trade. Cheap, agile, expendable. Sort of like a puppy, if puppies exploded when shot.",
        vertexData: [{ x: 0.9, y: 0 }, { x: -0.7, y: 0.8 }, { x: -0.9, y: 0 }, { x: -0.7, y: -0.8 }],
        fillColor: [180, 100, 20],
        typicalCargo: ["Food"],
        price: 9800,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 1 // Starter
    },
    "KraitMKI": {
        name: "Krait MKI", role: "Fighter", upgrades: [], sizeCategory: "Small", size: 30,
        baseMaxSpeed: 6.2, baseThrust: 0.15, baseTurnRate: 0.06632,
        baseHull: 60, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 15,
        armament: ["Pulse Laser"],
        costCategory: "High", description: "Pirate darling with shields that regenerate like a sitcom villain. Small (30), fast (6.2), and with enough shield capacity to laugh off police shots while you line up your next heist. Insurance companies charge triple if they see this in your garage.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.5772, y: -0.0058 }, { x: 0.2343, y: 0.4129 }, { x: -0.5772, y: 0.4129 }, { x: -0.5772, y: -0.4129 }, { x: 0.2343, y: -0.4129 }],
                fillColor: [100, 120, 100]
            },
            {
                vertexData: [{ x: -0.4100, y: -0.3500 }, { x: -0.3600, y: -0.3000 }, { x: 0.0400, y: 0.3000 }, { x: 0.0900, y: 0.3500 }, { x: 0.1200, y: 0.3000 }, { x: -0.4400, y: -0.3000 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.4100, y: 0.3500 }, { x: -0.3600, y: 0.3000 }, { x: 0.0400, y: -0.3000 }, { x: 0.0900, y: -0.3500 }, { x: 0.1200, y: -0.3000 }, { x: -0.4400, y: 0.3000 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: 0.0900, y: -0.2000 }, { x: 0.0900, y: 0.2000 }, { x: -0.1100, y: 0.2500 }, { x: -0.2600, y: 0.2000 }, { x: -0.3100, y: 0.1000 }, { x: -0.3100, y: -0.1000 }, { x: -0.2600, y: -0.2000 }, { x: -0.1100, y: -0.2500 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.3800, y: 0.1500 }, { x: -0.3300, y: 0.1200 }, { x: -0.3500, y: 0.0800 }, { x: -0.3300, y: 0.0400 }, { x: -0.3500, y: -0.0000 }, { x: -0.3300, y: -0.0400 }, { x: -0.3500, y: -0.0800 }, { x: -0.3300, y: -0.1200 }, { x: -0.3800, y: -0.1500 }, { x: -0.4100, y: -0.0800 }, { x: -0.4100, y: 0.0800 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.0600, y: -0.1400 }, { x: -0.0600, y: -0.0800 }, { x: -0.1600, y: -0.1100 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.0600, y: 0.0800 }, { x: -0.0600, y: 0.1400 }, { x: -0.1600, y: 0.1100 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.2000, y: -0.0400 }, { x: -0.2000, y: 0.0400 }, { x: -0.2600, y: -0.0000 }],
                fillColor: [0, 0, 0]
            }
        ],
        typicalCargo: [],
        price: 14600,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 2 // Utility
    },
    "KraitMKII": {
        name: "Krait MKII", role: "Multi-Role/Fighter", upgrades: [], sizeCategory: "Medium", size: 60,
        baseMaxSpeed: 5.2, baseThrust: 0.11, baseTurnRate: 0.04014,
        baseHull: 100, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 82,
        armament: ["Mini-Turret"], // Combat focused Pirate
        costCategory: "High", description: "The bigger, meaner sibling of the Mk I. With 82 cargo tons and questionable moral fiber built into the hull plating, it's become the ride of choice for pirates who've graduated from petty theft to organized crime. That cockpit design isn't stylish—it's menacing.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.5500, y: 0.5000 }, { x: -0.4500, y: 0.6000 }, { x: -0.9500, y: 0.4000 }, { x: -0.9500, y: -0.4000 }, { x: -0.4500, y: -0.6000 }, { x: 0.5500, y: -0.5000 }],
                fillColor: [100, 120, 100]
            },
            {
                vertexData: [{ x: -0.6087, y: -0.4235 }, { x: -0.5482, y: -0.3630 }, { x: -0.0642, y: 0.3630 }, { x: -0.0037, y: 0.4235 }, { x: 0.0326, y: 0.3630 }, { x: -0.6450, y: -0.3630 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.6087, y: 0.4235 }, { x: -0.5482, y: 0.3630 }, { x: -0.0642, y: -0.3630 }, { x: -0.0037, y: -0.4235 }, { x: 0.0326, y: -0.3630 }, { x: -0.6450, y: 0.3630 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.0037, y: -0.2420 }, { x: -0.0037, y: 0.2420 }, { x: -0.2457, y: 0.3025 }, { x: -0.4272, y: 0.2420 }, { x: -0.4877, y: 0.1210 }, { x: -0.4877, y: -0.1210 }, { x: -0.4272, y: -0.2420 }, { x: -0.2457, y: -0.3025 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.5724, y: 0.1815 }, { x: -0.5119, y: 0.1452 }, { x: -0.5361, y: 0.0968 }, { x: -0.5119, y: 0.0484 }, { x: -0.5361, y: -0.0000 }, { x: -0.5119, y: -0.0484 }, { x: -0.5361, y: -0.0968 }, { x: -0.5119, y: -0.1452 }, { x: -0.5724, y: -0.1815 }, { x: -0.6087, y: -0.0968 }, { x: -0.6087, y: 0.0968 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.1852, y: -0.1694 }, { x: -0.1852, y: -0.0968 }, { x: -0.3062, y: -0.1331 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.1852, y: 0.0968 }, { x: -0.1852, y: 0.1694 }, { x: -0.3062, y: 0.1331 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.3546, y: -0.0484 }, { x: -0.3546, y: 0.0484 }, { x: -0.4272, y: -0.0000 }],
                fillColor: [0, 0, 0]
            }
        ],
        typicalCargo: ["Food", "Minerals"],
        price: 17200,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 2 // Utility
    },
    "Geister": {
        name: "Geister", role: "Medium Fighter", upgrades: [], sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRate: 0.06981,
        baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 12,
        armament: ["Burst Blaster", "Beam Laser", "Harpoon Launcher"], // Fast attack loadout
        costCategory: "Medium", description: "Fast stealth ship favored by operatives with trust issues. That purple hull isn't for show—it's coated in sensor-scattering compounds that cost more than some stations. Quick as a rumor and twice as hard to verify. Perfect for jobs nobody admits ordering.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7205, y: 0.0000 }, { x: 0.5929, y: 0.4300 }, { x: -0.6050, y: 0.6968 }, { x: -0.3295, y: 0.4865 }, { x: -0.5929, y: 0.4300 }, { x: -0.3295, y: 0.1830 }, { x: -0.7205, y: 0.0000 }, { x: -0.3295, y: -0.1830 }, { x: -0.5929, y: -0.4300 }, { x: -0.3295, y: -0.4865 }, { x: -0.6050, y: -0.6968 }, { x: 0.5929, y: -0.4300 }],
                fillColor: [65, 48, 197],
            },
            {
                vertexData: [{ x: 0.6165, y: 0.0000 }, { x: 0.3009, y: 0.1809 }, { x: 0.3009, y: -0.1809 }],
                fillColor: [250, 100, 0],
            },
            {
                vertexData: [{ x: 0.0000, y: 0.1777 }, { x: 0.2510, y: 0.0000 }, { x: 0.0000, y: -0.1777 }],
                fillColor: [250, 100, 0],
            }
        ],
        typicalCargo: ["Computers"],
        price: 18400,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 3 // Mid-tier
    },
    "PirateBrigand": {
        name: "Pirate Brigand", role: "Fast Cargo Thief", upgrades: [], sizeCategory: "Small", size: 30,
        baseMaxSpeed: 6.8, baseThrust: 0.13, baseTurnRate: 0.065,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.1, cargoCapacity: 30,
        armament: ["Pulse Laser", "Mini-Turret"],
        costCategory: "Medium", description: "The 'hit and run' special—fast enough (6.8) to catch laden haulers, spacious enough (30 cargo) to make the chase worthwhile. Painted in rust-brown camouflage that fools absolutely nobody. Police hate these because by the time they arrive, the Brigand is three systems away spending your credits.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8000, y: 0.0000 }, { x: 0.2000, y: 0.4000 }, { x: -0.8000, y: 0.4000 }, { x: -0.8000, y: -0.4000 }, { x: 0.2000, y: -0.4000 }],
                fillColor: [100, 60, 20]
            },
            {
                vertexData: [{ x: -0.5100, y: -0.3500 }, { x: -0.4600, y: -0.3000 }, { x: -0.0600, y: 0.3000 }, { x: -0.0100, y: 0.3500 }, { x: 0.0200, y: 0.3000 }, { x: -0.5400, y: -0.3000 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.5100, y: 0.3500 }, { x: -0.4600, y: 0.3000 }, { x: -0.0600, y: -0.3000 }, { x: -0.0100, y: -0.3500 }, { x: 0.0200, y: -0.3000 }, { x: -0.5400, y: 0.3000 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.0100, y: -0.2000 }, { x: -0.0100, y: 0.2000 }, { x: -0.2100, y: 0.2500 }, { x: -0.3600, y: 0.2000 }, { x: -0.4100, y: 0.1000 }, { x: -0.4100, y: -0.1000 }, { x: -0.3600, y: -0.2000 }, { x: -0.2100, y: -0.2500 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.4800, y: 0.1500 }, { x: -0.4300, y: 0.1200 }, { x: -0.4500, y: 0.0800 }, { x: -0.4300, y: 0.0400 }, { x: -0.4500, y: -0.0000 }, { x: -0.4300, y: -0.0400 }, { x: -0.4500, y: -0.0800 }, { x: -0.4300, y: -0.1200 }, { x: -0.4800, y: -0.1500 }, { x: -0.5100, y: -0.0800 }, { x: -0.5100, y: 0.0800 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.1600, y: -0.1400 }, { x: -0.1600, y: -0.0800 }, { x: -0.2600, y: -0.1100 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.1600, y: 0.0800 }, { x: -0.1600, y: 0.1400 }, { x: -0.2600, y: 0.1100 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.3000, y: -0.0400 }, { x: -0.3000, y: 0.0400 }, { x: -0.3600, y: -0.0000 }],
                fillColor: [0, 0, 0]
            }
        ],
        typicalCargo: ["Food", "Textiles", "Minerals"],
        price: 38000,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 2,
    },
    "PirateCutlass": {
        name: "Pirate Cutlass", role: "Fast Attack Fighter", upgrades: [], sizeCategory: "Small", size: 32,
        baseMaxSpeed: 7.2, baseThrust: 0.16, baseTurnRate: 0.08,
        baseHull: 70, baseShield: 90, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Multi-Cannon", "Pulse Laser", "Guardian Missile"],
        costCategory: "Medium", description: "Pirates looked at budget fighters and said 'how do we make this scary?' Answer: paint it blood-red, add illegal weapons, remove the safety limiters. Hits 7.2 speed and sports enough firepower to make merchants cry. Common, cheap, effective—the AK-47 of pirate craft.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.4000, y: 0.5000 }, { x: -0.8000, y: 0.3000 }, { x: -0.8000, y: -0.3000 }, { x: -0.4000, y: -0.5000 }],
                fillColor: [80, 20, 20]
            },
            {
                vertexData: [{ x: -0.5840, y: -0.2296 }, { x: -0.5512, y: -0.1968 }, { x: -0.2888, y: 0.1968 }, { x: -0.2560, y: 0.2296 }, { x: -0.2363, y: 0.1968 }, { x: -0.6037, y: -0.1968 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.5840, y: 0.2296 }, { x: -0.5512, y: 0.1968 }, { x: -0.2888, y: -0.1968 }, { x: -0.2560, y: -0.2296 }, { x: -0.2363, y: -0.1968 }, { x: -0.6037, y: 0.1968 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.2560, y: -0.1312 }, { x: -0.2560, y: 0.1312 }, { x: -0.3872, y: 0.1640 }, { x: -0.4856, y: 0.1312 }, { x: -0.5184, y: 0.0656 }, { x: -0.5184, y: -0.0656 }, { x: -0.4856, y: -0.1312 }, { x: -0.3872, y: -0.1640 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.5184, y: -0.0984 }, { x: -0.5512, y: -0.0787 }, { x: -0.5381, y: -0.0525 }, { x: -0.5512, y: -0.0262 }, { x: -0.5381, y: -0.0000 }, { x: -0.5512, y: 0.0262 }, { x: -0.5381, y: 0.0525 }, { x: -0.5512, y: 0.0787 }, { x: -0.5184, y: 0.0984 }, { x: -0.4987, y: 0.0525 }, { x: -0.4987, y: -0.0525 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.3544, y: -0.0919 }, { x: -0.3544, y: -0.0525 }, { x: -0.4200, y: -0.0722 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.3544, y: 0.0525 }, { x: -0.3544, y: 0.0919 }, { x: -0.4200, y: 0.0722 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.4462, y: -0.0262 }, { x: -0.4462, y: 0.0262 }, { x: -0.4856, y: -0.0000 }],
                fillColor: [0, 0, 0]
            },
            // Skull emblem (white circle)
            {
                vertexData: [{ x: 0.3000, y: 0.1200 }, { x: 0.2400, y: 0.1800 }, { x: 0.1800, y: 0.1200 }, { x: 0.2400, y: 0.0600 }],
                fillColor: [255, 255, 255]
            },
            // Crossbones
            {
                vertexData: [{ x: 0.3200, y: 0.0200 }, { x: 0.1600, y: 0.0200 }, { x: 0.1600, y: -0.0200 }, { x: 0.3200, y: -0.0200 }],
                fillColor: [255, 255, 255]
            }
        ],
        typicalCargo: ["Adv Components", "Narcotics"],
        price: 45000,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 3,
    },
    "PirateInterceptorMKII": {
        name: "Pirate Interceptor MkII", role: "Heavy Interceptor", upgrades: [], sizeCategory: "Medium", size: 42,
        baseMaxSpeed: 7.0, baseThrust: 0.15, baseTurnRate: 0.075,
        baseHull: 100, baseShield: 150, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Beam Laser", "Multi-Cannon", "Disruptor"],
        costCategory: "Medium-High", description: "The MkI's angrier, better-armed cousin with extra stolen tech bolted to every hardpoint. That suspicious purple paint job screams 'I have warrants in 47 systems.' Shield recharge of 1.5 and 7.0 speed makes it frustratingly hard to catch. Bounty hunters mark these as 'high-value, low-fun' targets.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: -0.3000, y: 0.5000 }, { x: -1.0000, y: 0.5000 }, { x: -0.8000, y: 0.0000 }, { x: -1.0000, y: -0.5000 }, { x: -0.3000, y: -0.5000 }],
                fillColor: [60, 20, 60]
            },
            {
                vertexData: [{ x: -0.6900, y: -0.3700 }, { x: -0.6400, y: -0.3200 }, { x: -0.2400, y: 0.2800 }, { x: -0.1900, y: 0.3300 }, { x: -0.1600, y: 0.2800 }, { x: -0.7200, y: -0.3200 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.6900, y: 0.3300 }, { x: -0.6400, y: 0.2800 }, { x: -0.2400, y: -0.3200 }, { x: -0.1900, y: -0.3700 }, { x: -0.1600, y: -0.3200 }, { x: -0.7200, y: 0.2800 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.1900, y: -0.2200 }, { x: -0.1900, y: 0.1800 }, { x: -0.3900, y: 0.2300 }, { x: -0.5400, y: 0.1800 }, { x: -0.5900, y: 0.0800 }, { x: -0.5900, y: -0.1200 }, { x: -0.5400, y: -0.2200 }, { x: -0.3900, y: -0.2700 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.6600, y: 0.1300 }, { x: -0.6100, y: 0.1000 }, { x: -0.6300, y: 0.0600 }, { x: -0.6100, y: 0.0200 }, { x: -0.6300, y: -0.0200 }, { x: -0.6100, y: -0.0600 }, { x: -0.6300, y: -0.1000 }, { x: -0.6100, y: -0.1400 }, { x: -0.6600, y: -0.1700 }, { x: -0.6900, y: -0.1000 }, { x: -0.6900, y: 0.0600 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.3400, y: -0.1600 }, { x: -0.3400, y: -0.1000 }, { x: -0.4400, y: -0.1300 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.3400, y: 0.0600 }, { x: -0.3400, y: 0.1200 }, { x: -0.4400, y: 0.0900 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.4800, y: -0.0600 }, { x: -0.4800, y: 0.0200 }, { x: -0.5400, y: -0.0200 }],
                fillColor: [0, 0, 0]
            }
        ],
        typicalCargo: ["Narcotics", "Weapons"],
        price: 68000,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 4,
    },
    "PirateMarauder": {
        name: "Pirate Marauder", role: "Raider/Boarding Craft", upgrades: [], sizeCategory: "Medium", size: 48,
        baseMaxSpeed: 5.0, baseThrust: 0.09, baseTurnRate: 0.045,
        baseHull: 150, baseShield: 100, shieldRecharge: 0.8, cargoCapacity: 50,
        armament: ["Heavy Cannon", "Twin Pulse", "Mini-Turret", "Guardian Missile"],
        costCategory: "Medium-High", description: "Purpose-built pirate boarding craft with hull thick enough (150) to ram targets if negotiations fail. Cargo hold sized specifically to haul stolen goods (50 tons). Those harpoon launchers aren't decorative—they're for grabbing fleeing merchants. Flying one near a station gets you shot first, questions never.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.3000 }, { x: 0.2000, y: 0.7000 }, { x: -0.9000, y: 0.7000 }, { x: -0.9000, y: -0.7000 }, { x: 0.2000, y: -0.7000 }, { x: 0.9000, y: -0.3000 }],
                fillColor: [50, 50, 50]
            },
            {
                vertexData: [{ x: -0.6772, y: -0.5073 }, { x: -0.6047, y: -0.4348 }, { x: -0.0249, y: 0.4348 }, { x: 0.0475, y: 0.5073 }, { x: 0.0910, y: 0.4348 }, { x: -0.7207, y: -0.4348 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.6772, y: 0.5073 }, { x: -0.6047, y: 0.4348 }, { x: -0.0249, y: -0.4348 }, { x: 0.0475, y: -0.5073 }, { x: 0.0910, y: -0.4348 }, { x: -0.7207, y: 0.4348 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: 0.0475, y: -0.2899 }, { x: 0.0475, y: 0.2899 }, { x: -0.2424, y: 0.3624 }, { x: -0.4598, y: 0.2899 }, { x: -0.5323, y: 0.1449 }, { x: -0.5323, y: -0.1449 }, { x: -0.4598, y: -0.2899 }, { x: -0.2424, y: -0.3624 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.6337, y: 0.2174 }, { x: -0.5612, y: 0.1739 }, { x: -0.5902, y: 0.1160 }, { x: -0.5612, y: 0.0580 }, { x: -0.5902, y: 0.0000 }, { x: -0.5612, y: -0.0580 }, { x: -0.5902, y: -0.1160 }, { x: -0.5612, y: -0.1739 }, { x: -0.6337, y: -0.2174 }, { x: -0.6772, y: -0.1160 }, { x: -0.6772, y: 0.1160 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.1699, y: -0.2029 }, { x: -0.1699, y: -0.1160 }, { x: -0.3148, y: -0.1594 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.1699, y: 0.1160 }, { x: -0.1699, y: 0.2029 }, { x: -0.3148, y: 0.1594 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.3728, y: -0.0580 }, { x: -0.3728, y: 0.0580 }, { x: -0.4598, y: 0.0000 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: 0.6400, y: -0.2200 }, { x: 0.7400, y: -0.1600 }, { x: 0.7400, y: 0.1600 }, { x: 0.6400, y: 0.2200 }],
                fillColor: [153, 153, 229]
            },
            // Pirate warning stripes
            {
                vertexData: [{ x: -0.7500, y: 0.6000 }, { x: -0.8500, y: 0.6000 }, { x: -0.8500, y: 0.5000 }, { x: -0.7500, y: 0.5000 }],
                fillColor: [255, 200, 0]
            },
            {
                vertexData: [{ x: -0.7500, y: -0.6000 }, { x: -0.8500, y: -0.6000 }, { x: -0.8500, y: -0.5000 }, { x: -0.7500, y: -0.5000 }],
                fillColor: [255, 200, 0]
            },
            // Skull emblem
            {
                vertexData: [{ x: 0.4000, y: 0.0800 }, { x: 0.3400, y: 0.1400 }, { x: 0.2800, y: 0.0800 }, { x: 0.3400, y: 0.0200 }],
                fillColor: [255, 255, 255]
            }
        ],
        typicalCargo: ["Slaves", "Weapons", "Adv Components"],
        price: 75000,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 4,
    },
    "PirateReaver": {
        name: "Pirate Reaver", role: "Heavy Pirate Cruiser", upgrades: [], sizeCategory: "Large", size: 75,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.03,
        baseHull: 300, baseShield: 200, shieldRecharge: 0.9, cargoCapacity: 100,
        armament: ["Multi-Cannon", "Force Blaster", "Mini-Turret", "Railgun Turret", "Guardian Missile"],
        costCategory: "High", description: "The pirate flagship—300 hull of intimidation and poor life choices. Usually a captured military vessel with enough welded-on weapons to make it unrecognizable. Slow (4.0) but terrifying. When sensors flag one of these, merchant convoys scatter like startled fish. Smart move.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.1000 }, { x: 0.5000, y: 0.6000 }, { x: -0.5000, y: 0.8000 }, { x: -1.0000, y: 0.4000 }, { x: -1.0000, y: -0.4000 }, { x: -0.5000, y: -0.8000 }, { x: 0.5000, y: -0.6000 }, { x: 1.0000, y: -0.1000 }],
                fillColor: [40, 60, 40]
            },
            {
                vertexData: [{ x: -0.6655, y: -0.4235 }, { x: -0.6050, y: -0.3630 }, { x: -0.1210, y: 0.3630 }, { x: -0.0605, y: 0.4235 }, { x: -0.0242, y: 0.3630 }, { x: -0.7018, y: -0.3630 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.6655, y: 0.4235 }, { x: -0.6050, y: 0.3630 }, { x: -0.1210, y: -0.3630 }, { x: -0.0605, y: -0.4235 }, { x: -0.0242, y: -0.3630 }, { x: -0.7018, y: 0.3630 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.0605, y: -0.2420 }, { x: -0.0605, y: 0.2420 }, { x: -0.3025, y: 0.3025 }, { x: -0.4840, y: 0.2420 }, { x: -0.5445, y: 0.1210 }, { x: -0.5445, y: -0.1210 }, { x: -0.4840, y: -0.2420 }, { x: -0.3025, y: -0.3025 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.6292, y: 0.1815 }, { x: -0.5687, y: 0.1452 }, { x: -0.5929, y: 0.0968 }, { x: -0.5687, y: 0.0484 }, { x: -0.5929, y: 0.0000 }, { x: -0.5687, y: -0.0484 }, { x: -0.5929, y: -0.0968 }, { x: -0.5687, y: -0.1452 }, { x: -0.6292, y: -0.1815 }, { x: -0.6655, y: -0.0968 }, { x: -0.6655, y: 0.0968 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.2420, y: -0.1694 }, { x: -0.2420, y: -0.0968 }, { x: -0.3630, y: -0.1331 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.2420, y: 0.0968 }, { x: -0.2420, y: 0.1694 }, { x: -0.3630, y: 0.1331 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.4114, y: -0.0484 }, { x: -0.4114, y: 0.0484 }, { x: -0.4840, y: 0.0000 }],
                fillColor: [0, 0, 0]
            }
        ],
        typicalCargo: ["Narcotics", "Slaves", "Weapons"],
        price: 140000,
        aiRoles: ["PIRATE"],
        faction: "",
        techLevel: 5,
    },

    // --- HARLEQUIN ---
    "HarlequinJester": {
        name: "Harlequin Jester", role: "Light Fighter", upgrades: [], sizeCategory: "Tiny", size: 22,
        baseMaxSpeed: 8.0, baseThrust: 0.18, baseTurnRate: 0.09,
        baseHull: 40, baseShield: 60, shieldRecharge: 1.4, cargoCapacity: 5,
        armament: ["Pulse Laser", "Twin Pulse"],
        costCategory: "Low-Medium", description: "A nimble and brightly colored Harlequin skirmisher.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.7500, y: 0.0000 }, { x: -0.7500, y: 0.6000 }, { x: -0.4500, y: 0.0000 }, { x: -0.7500, y: -0.6000 }],
                fillColor: [255, 0, 0]
            },
            {
                vertexData: [{ x: -0.4325, y: -0.2835 }, { x: -0.3920, y: -0.2430 }, { x: -0.0680, y: 0.2430 }, { x: -0.0275, y: 0.2835 }, { x: -0.0032, y: 0.2430 }, { x: -0.4568, y: -0.2430 }],
                fillColor: [17, 255, 0]
            },
            {
                vertexData: [{ x: -0.4325, y: 0.2835 }, { x: -0.3920, y: 0.2430 }, { x: -0.0680, y: -0.2430 }, { x: -0.0275, y: -0.2835 }, { x: -0.0032, y: -0.2430 }, { x: -0.4568, y: 0.2430 }],
                fillColor: [17, 255, 0]
            },
            {
                vertexData: [{ x: -0.0275, y: -0.1620 }, { x: -0.0275, y: 0.1620 }, { x: -0.1895, y: 0.2025 }, { x: -0.3110, y: 0.1620 }, { x: -0.3515, y: 0.0810 }, { x: -0.3515, y: -0.0810 }, { x: -0.3110, y: -0.1620 }, { x: -0.1895, y: -0.2025 }],
                fillColor: [17, 255, 0]
            },
            {
                vertexData: [{ x: -0.4082, y: 0.1215 }, { x: -0.3677, y: 0.0972 }, { x: -0.3839, y: 0.0648 }, { x: -0.3677, y: 0.0324 }, { x: -0.3839, y: -0.0000 }, { x: -0.3677, y: -0.0324 }, { x: -0.3839, y: -0.0648 }, { x: -0.3677, y: -0.0972 }, { x: -0.4082, y: -0.1215 }, { x: -0.4325, y: -0.0648 }, { x: -0.4325, y: 0.0648 }],
                fillColor: [17, 255, 0]
            },
            {
                vertexData: [{ x: -0.1490, y: -0.1134 }, { x: -0.1490, y: -0.0648 }, { x: -0.2300, y: -0.0891 }],
                fillColor: [255, 0, 0]
            },
            {
                vertexData: [{ x: -0.1490, y: 0.0648 }, { x: -0.1490, y: 0.1134 }, { x: -0.2300, y: 0.0891 }],
                fillColor: [255, 0, 0]
            },
            {
                vertexData: [{ x: -0.2624, y: -0.0324 }, { x: -0.2624, y: 0.0324 }, { x: -0.3110, y: -0.0000 }],
                fillColor: [255, 0, 0]
            }
        ],
        typicalCargo: [],
        price: 32000,
        aiRoles: ["PIRATE"],
        faction: "HARLEQUIN",
        techLevel: 2,
    },
    "HarlequinMotley": {
        name: "Harlequin Motley", role: "Fast Interceptor", upgrades: [], sizeCategory: "Small", size: 28,
        baseMaxSpeed: 8.2, baseThrust: 0.19, baseTurnRate: 0.085,
        baseHull: 45, baseShield: 55, shieldRecharge: 1.7, cargoCapacity: 8,
        armament: ["Burst Blaster", "Pulse Laser"],
        costCategory: "Medium", description: "Speed incarnate wrapped in eye-searing orange and electric blue. The Motley zips through conflict zones like a caffeinated hummingbird with attitude problems. 8.2 speed makes it nearly uncatchable; 45 hull means one mistake and you're confetti. Harlequin pilots call it 'the fool's choice'—but fools who survive learn fast.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1000, y: 0.0000 }, { x: 0.3000, y: 0.3500 }, { x: -0.4000, y: 0.3000 }, { x: -0.9000, y: 0.5000 }, { x: -0.7000, y: 0.0000 }, { x: -0.9000, y: -0.5000 }, { x: -0.4000, y: -0.3000 }, { x: 0.3000, y: -0.3500 }],
                fillColor: [255, 120, 0]
            },
            {
                vertexData: [{ x: 0.8000, y: -0.0800 }, { x: 0.8000, y: 0.0800 }, { x: -0.3000, y: 0.1500 }, { x: -0.3000, y: -0.1500 }],
                fillColor: [0, 180, 255]
            },
            {
                vertexData: [{ x: -0.5500, y: 0.3600 }, { x: -0.4000, y: 0.2000 }, { x: -0.7500, y: 0.2000 }],
                fillColor: [0, 180, 255]
            },
            {
                vertexData: [{ x: -0.5500, y: -0.3600 }, { x: -0.4000, y: -0.2000 }, { x: -0.7500, y: -0.2000 }],
                fillColor: [0, 180, 255]
            },
            {
                vertexData: [{ x: 0.0500, y: 0.0000 }, { x: -0.0500, y: 0.0866 }, { x: -0.1500, y: 0.0866 }, { x: -0.2500, y: 0.0000 }, { x: -0.1500, y: -0.0866 }, { x: -0.0500, y: -0.0866 }],
                fillColor: [255, 255, 255]
            },
            {
                vertexData: [{ x: -0.6635, y: -0.1674 }, { x: -0.6395, y: -0.1435 }, { x: -0.4482, y: 0.1435 }, { x: -0.4243, y: 0.1674 }, { x: -0.4100, y: 0.1435 }, { x: -0.6778, y: -0.1435 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.6635, y: 0.1674 }, { x: -0.6395, y: 0.1435 }, { x: -0.4482, y: -0.1435 }, { x: -0.4243, y: -0.1674 }, { x: -0.4100, y: -0.1435 }, { x: -0.6778, y: 0.1435 }],
                fillColor: [180, 180, 180]
            },
            {
                vertexData: [{ x: -0.4243, y: -0.0957 }, { x: -0.4243, y: 0.0957 }, { x: -0.5200, y: 0.1196 }, { x: -0.5917, y: 0.0957 }, { x: -0.6156, y: 0.0478 }, { x: -0.6156, y: -0.0478 }, { x: -0.5917, y: -0.0957 }, { x: -0.5200, y: -0.1196 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.6491, y: 0.0717 }, { x: -0.6252, y: 0.0574 }, { x: -0.6348, y: 0.0383 }, { x: -0.6252, y: 0.0191 }, { x: -0.6348, y: -0.0000 }, { x: -0.6252, y: -0.0191 }, { x: -0.6348, y: -0.0383 }, { x: -0.6252, y: -0.0574 }, { x: -0.6491, y: -0.0717 }, { x: -0.6635, y: -0.0383 }, { x: -0.6635, y: 0.0383 }],
                fillColor: [230, 230, 230]
            },
            {
                vertexData: [{ x: -0.4961, y: -0.0670 }, { x: -0.4961, y: -0.0383 }, { x: -0.5439, y: -0.0526 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.4961, y: 0.0383 }, { x: -0.4961, y: 0.0670 }, { x: -0.5439, y: 0.0526 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.5630, y: -0.0191 }, { x: -0.5630, y: 0.0191 }, { x: -0.5917, y: -0.0000 }],
                fillColor: [0, 0, 0]
            }
        ],
        typicalCargo: ["Narcotics", "Computers"],
        price: 42000,
        aiRoles: ["PIRATE"],
        faction: "HARLEQUIN",
        techLevel: 3,
    },
    "HarlequinColumbine": {
        name: "Harlequin Columbine", role: "Explorer/Scout", upgrades: [], sizeCategory: "Small", size: 28,
        baseMaxSpeed: 6.5, baseThrust: 0.12, baseTurnRate: 0.07,
        baseHull: 60, baseShield: 90, shieldRecharge: 1.6, cargoCapacity: 20,
        armament: ["Beam Laser"],
        costCategory: "Medium", description: "Purple diamond-shaped scout that moves like it's late for something important. Harlequins use these to slip past customs, military blockades, and good taste. Shield recharge of 1.6 means it can take a beating while escaping. Perfect for 'definitely legal' reconnaissance missions nobody talks about later.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.0000, y: 0.7000 }, { x: -0.9000, y: 0.0000 }, { x: 0.0000, y: -0.7000 }],
                fillColor: [128, 0, 128]
            },
            {
                vertexData: [{ x: 0.2743, y: -0.1886 }, { x: 0.2743, y: 0.2114 }, { x: 0.6743, y: 0.0114 }],
                fillColor: [251, 255, 0]
            }
        ],
        typicalCargo: ["Luxury Goods", "Computers"],
        price: 48000,
        aiRoles: ["PIRATE"],
        faction: "HARLEQUIN",
        techLevel: 3,
    },
    "HarlequinZanni": {
        name: "Harlequin Zanni", role: "Heavy Striker", upgrades: [], sizeCategory: "Medium", size: 52,
        baseMaxSpeed: 5.8, baseThrust: 0.13, baseTurnRate: 0.055,
        baseHull: 180, baseShield: 160, shieldRecharge: 1.1, cargoCapacity: 35,
        armament: ["Heavy Cannon", "Multi-Cannon", "Beam Laser", "Guardian Missile"],
        costCategory: "High", description: "Hot pink and toxic lime—the ship equivalent of a poison dart frog screaming 'I am dangerous and have no shame.' That 180 hull absorbs punishment while quad hardpoints dish it back. Harlequin commanders deploy Zannis when they want targets to know embarrassment before annihilation. Kills aren't just combat victories, they're fashion statements.",

        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.2000 }, { x: 0.5000, y: 0.6000 }, { x: -0.3000, y: 0.7000 }, { x: -0.8000, y: 0.5000 }, { x: -0.9000, y: 0.0000 }, { x: -0.8000, y: -0.5000 }, { x: -0.3000, y: -0.7000 }, { x: 0.5000, y: -0.6000 }, { x: 0.9000, y: -0.2000 }],
                fillColor: [255, 20, 147]
            },
            {
                vertexData: [{ x: 0.7000, y: 0.0000 }, { x: 0.3500, y: 0.4500 }, { x: -0.2000, y: 0.5000 }, { x: -0.6000, y: 0.3000 }, { x: -0.6000, y: -0.3000 }, { x: -0.2000, y: -0.5000 }, { x: 0.3500, y: -0.4500 }],
                fillColor: [180, 255, 0]
            },
            {
                vertexData: [{ x: -0.3000, y: -0.2000 }, { x: -0.3000, y: 0.2000 }, { x: -0.5000, y: 0.2500 }, { x: -0.6500, y: 0.2000 }, { x: -0.7000, y: 0.1000 }, { x: -0.7000, y: -0.1000 }, { x: -0.6500, y: -0.2000 }, { x: -0.5000, y: -0.2500 }],
                fillColor: [255, 20, 147]
            },
            {
                vertexData: [{ x: 0.2000, y: -0.3000 }, { x: 0.4000, y: -0.2000 }, { x: 0.4000, y: 0.2000 }, { x: 0.2000, y: 0.3000 }],
                fillColor: [255, 255, 255]
            },
            {
                vertexData: [{ x: -0.7309, y: -0.1860 }, { x: -0.7043, y: -0.1594 }, { x: -0.4917, y: 0.1594 }, { x: -0.4651, y: 0.1860 }, { x: -0.4492, y: 0.1594 }, { x: -0.7468, y: -0.1594 }],
                fillColor: [180, 255, 0]
            },
            {
                vertexData: [{ x: -0.7309, y: 0.1860 }, { x: -0.7043, y: 0.1594 }, { x: -0.4917, y: -0.1594 }, { x: -0.4651, y: -0.1860 }, { x: -0.4492, y: -0.1594 }, { x: -0.7468, y: 0.1594 }],
                fillColor: [180, 255, 0]
            },
            {
                vertexData: [{ x: -0.4651, y: -0.1063 }, { x: -0.4651, y: 0.1063 }, { x: -0.5714, y: 0.1329 }, { x: -0.6511, y: 0.1063 }, { x: -0.6777, y: 0.0531 }, { x: -0.6777, y: -0.0531 }, { x: -0.6511, y: -0.1063 }, { x: -0.5714, y: -0.1329 }],
                fillColor: [180, 255, 0]
            },
            {
                vertexData: [{ x: -0.7149, y: 0.0797 }, { x: -0.6883, y: 0.0638 }, { x: -0.6990, y: 0.0425 }, { x: -0.6883, y: 0.0213 }, { x: -0.6990, y: -0.0000 }, { x: -0.6883, y: -0.0213 }, { x: -0.6990, y: -0.0425 }, { x: -0.6883, y: -0.0638 }, { x: -0.7149, y: -0.0797 }, { x: -0.7309, y: -0.0425 }, { x: -0.7309, y: 0.0425 }],
                fillColor: [180, 255, 0]
            },
            {
                vertexData: [{ x: -0.5449, y: -0.0744 }, { x: -0.5449, y: -0.0425 }, { x: -0.5980, y: -0.0585 }],
                fillColor: [255, 20, 147]
            },
            {
                vertexData: [{ x: -0.5449, y: 0.0425 }, { x: -0.5449, y: 0.0744 }, { x: -0.5980, y: 0.0585 }],
                fillColor: [255, 20, 147]
            },
            {
                vertexData: [{ x: -0.6193, y: -0.0213 }, { x: -0.6193, y: 0.0213 }, { x: -0.6511, y: -0.0000 }],
                fillColor: [255, 20, 147]
            }
        ],
        typicalCargo: ["Weapons", "Slaves", "Luxury Goods"],
        price: 98000,
        aiRoles: ["PIRATE"],
        faction: "HARLEQUIN",
        techLevel: 4,
    },
    "HarlequinScaramouche": {
        name: "Harlequin Scaramouche", role: "Multi-Role Combat", upgrades: [], sizeCategory: "Medium", size: 55,
        baseMaxSpeed: 5.5, baseThrust: 0.11, baseTurnRate: 0.055,
        baseHull: 150, baseShield: 180, shieldRecharge: 1.3, cargoCapacity: 40,
        armament: ["Multi-Cannon", "Beam Laser", "Railgun Turret", "Loiter Munition", "Barrier Field"],
        costCategory: "High", description: "The Harlequins' war trumpet—versatile, deadly, and painted in colors that hurt to look at directly. Those absurd wing configurations actually serve a tactical purpose: disorienting enemies before the 150-hull brick deletes them. Pilots who fly these either have excellent taste or absolutely none. No middle ground exists.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.5499, y: 1.0647 }, { x: 0.0000, y: 0.4255 }, { x: -0.3751, y: 0.6831 }, { x: -0.9000, y: 0.6000 }, { x: -0.9000, y: -0.6000 }, { x: -0.3751, y: -0.6831 }, { x: 0.0000, y: -0.4255 }, { x: 0.5499, y: -1.0647 }],
                fillColor: [150, 219, 0]
            },
            {
                vertexData: [{ x: -0.7773, y: -0.4235 }, { x: -0.7168, y: -0.3630 }, { x: -0.2328, y: 0.3630 }, { x: -0.1723, y: 0.4235 }, { x: -0.1360, y: 0.3630 }, { x: -0.8136, y: -0.3630 }],
                fillColor: [255, 0, 255]
            },
            {
                vertexData: [{ x: -0.7773, y: 0.4235 }, { x: -0.7168, y: 0.3630 }, { x: -0.2328, y: -0.3630 }, { x: -0.1723, y: -0.4235 }, { x: -0.1360, y: -0.3630 }, { x: -0.8136, y: 0.3630 }],
                fillColor: [255, 0, 255]
            },
            {
                vertexData: [{ x: -0.1723, y: -0.2420 }, { x: -0.1723, y: 0.2420 }, { x: -0.4143, y: 0.3025 }, { x: -0.5958, y: 0.2420 }, { x: -0.6563, y: 0.1210 }, { x: -0.6563, y: -0.1210 }, { x: -0.5958, y: -0.2420 }, { x: -0.4143, y: -0.3025 }],
                fillColor: [255, 0, 255]
            },
            {
                vertexData: [{ x: -0.7410, y: 0.1815 }, { x: -0.6805, y: 0.1452 }, { x: -0.7047, y: 0.0968 }, { x: -0.6805, y: 0.0484 }, { x: -0.7047, y: 0.0000 }, { x: -0.6805, y: -0.0484 }, { x: -0.7047, y: -0.0968 }, { x: -0.6805, y: -0.1452 }, { x: -0.7410, y: -0.1815 }, { x: -0.7773, y: -0.0968 }, { x: -0.7773, y: 0.0968 }],
                fillColor: [255, 0, 255]
            },
            {
                vertexData: [{ x: -0.3538, y: -0.1694 }, { x: -0.3538, y: -0.0968 }, { x: -0.4748, y: -0.1331 }],
                fillColor: [150, 219, 0]
            },
            {
                vertexData: [{ x: -0.3538, y: 0.0968 }, { x: -0.3538, y: 0.1694 }, { x: -0.4748, y: 0.1331 }],
                fillColor: [150, 219, 0]
            },
            {
                vertexData: [{ x: -0.5232, y: -0.0484 }, { x: -0.5232, y: 0.0484 }, { x: -0.5958, y: 0.0000 }],
                fillColor: [150, 219, 0]
            },
            {
                vertexData: [{ x: 0.5600, y: -0.3711 }, { x: 0.7511, y: 0.0000 }, { x: 0.5600, y: 0.3711 }],
                fillColor: [0, 157, 255]
            }
        ],
        typicalCargo: ["Weapons", "Adv Components"],
        price: 115000,
        aiRoles: ["PIRATE"],
        faction: "HARLEQUIN",
        techLevel: 4,
    },
    "HarlequinPierrot": {
        name: "Harlequin Pierrot", role: "Multi-Purpose", upgrades: [], sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.04,
        baseHull: 100, baseShield: 80, shieldRecharge: 0.9, cargoCapacity: 80,
        armament: ["Mini-Turret"],
        costCategory: "Medium", description: "The Harlequins' multi-purpose ship, painted like a circus tent and twice as loud. That garish yellow-and-pink striped hull is visible from three systems away. Somehow hauls 80 tons while maintaining the dignity of a drunk clown. Merchants hate it but can't deny it gets the job done profitably.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8000, y: 0.5000 }, { x: -0.8000, y: 0.5000 }, { x: -0.8000, y: -0.5000 }, { x: 0.8000, y: -0.5000 }],
                fillColor: [255, 255, 0]
            },
            {
                vertexData: [{ x: -0.6600, y: -0.5000 }, { x: -0.6200, y: -0.5000 }, { x: -0.6200, y: 0.5000 }, { x: -0.6600, y: 0.5000 }],
                fillColor: [255, 0, 221]
            },
            {
                vertexData: [{ x: 0.5400, y: -0.5000 }, { x: 0.5000, y: -0.5000 }, { x: 0.5000, y: 0.5000 }, { x: 0.5400, y: 0.5000 }],
                fillColor: [255, 0, 221]
            },
            {
                vertexData: [{ x: -0.4200, y: -0.5000 }, { x: -0.3800, y: -0.5000 }, { x: -0.3800, y: 0.5000 }, { x: -0.4200, y: 0.5000 }],
                fillColor: [255, 0, 221]
            },
            {
                vertexData: [{ x: 0.6600, y: -0.5000 }, { x: 0.6200, y: -0.5000 }, { x: 0.6200, y: 0.5000 }, { x: 0.6600, y: 0.5000 }],
                fillColor: [255, 0, 221]
            },
            {
                vertexData: [{ x: -0.5400, y: -0.5000 }, { x: -0.5000, y: -0.5000 }, { x: -0.5000, y: 0.5000 }, { x: -0.5400, y: 0.5000 }],
                fillColor: [255, 0, 221]
            },
            {
                vertexData: [{ x: 0.4200, y: -0.5000 }, { x: 0.3800, y: -0.5000 }, { x: 0.3800, y: 0.5000 }, { x: 0.4200, y: 0.5000 }],
                fillColor: [255, 0, 221]
            },
            {
                vertexData: [{ x: -0.2500, y: -0.3500 }, { x: -0.2000, y: -0.3000 }, { x: 0.2000, y: 0.3000 }, { x: 0.2500, y: 0.3500 }, { x: 0.2800, y: 0.3000 }, { x: -0.2800, y: -0.3000 }],
                fillColor: [255, 0, 221]
            },
            {
                vertexData: [{ x: -0.2500, y: 0.3500 }, { x: -0.2000, y: 0.3000 }, { x: 0.2000, y: -0.3000 }, { x: 0.2500, y: -0.3500 }, { x: 0.2800, y: -0.3000 }, { x: -0.2800, y: 0.3000 }],
                fillColor: [255, 0, 221]
            },
            {
                vertexData: [{ x: 0.2500, y: -0.2000 }, { x: 0.2500, y: 0.2000 }, { x: 0.0500, y: 0.2500 }, { x: -0.1000, y: 0.2000 }, { x: -0.1500, y: 0.1000 }, { x: -0.1500, y: -0.1000 }, { x: -0.1000, y: -0.2000 }, { x: 0.0500, y: -0.2500 }],
                fillColor: [140, 140, 140]
            },
            {
                vertexData: [{ x: -0.2200, y: 0.1500 }, { x: -0.1700, y: 0.1200 }, { x: -0.1900, y: 0.0800 }, { x: -0.1700, y: 0.0400 }, { x: -0.1900, y: 0.0000 }, { x: -0.1700, y: -0.0400 }, { x: -0.1900, y: -0.0800 }, { x: -0.1700, y: -0.1200 }, { x: -0.2200, y: -0.1500 }, { x: -0.2500, y: -0.0800 }, { x: -0.2500, y: 0.0800 }],
                fillColor: [140, 140, 140]
            },
            {
                vertexData: [{ x: 0.1000, y: -0.1400 }, { x: 0.1000, y: -0.0800 }, { x: -0.0000, y: -0.1100 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: 0.1000, y: 0.0800 }, { x: 0.1000, y: 0.1400 }, { x: 0.0000, y: 0.1100 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.0400, y: -0.0400 }, { x: -0.0400, y: 0.0400 }, { x: -0.1000, y: 0.0000 }],
                fillColor: [0, 0, 0]
            }
        ],
        typicalCargo: ["Luxury Goods", "Narcotics", "Slaves"],
        price: 55000,
        aiRoles: ["PIRATE"],
        faction: "HARLEQUIN",
        techLevel: 3,
    },
    "HarlequinPulcinella": {
        name: "Harlequin Pulcinella", role: "Support/Logistics", upgrades: [], sizeCategory: "Medium", size: 48,
        baseMaxSpeed: 4.5, baseThrust: 0.08, baseTurnRate: 0.05,
        baseHull: 140, baseShield: 120, shieldRecharge: 1.0, cargoCapacity: 90,
        armament: ["Mini-Turret", "Twin Pulse"],
        costCategory: "Medium-High", description: "Coral and turquoise should never work together—yet here we are, staring at cargo ship couture. The Pulcinella ferries 90 tons of questionable goods while looking like a tropical sunset had a midlife crisis. Harlequin logistics crews love it; everyone else questions their life choices when it arrives at the loading bay.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8000, y: 0.4000 }, { x: 0.4000, y: 0.7000 }, { x: -0.6000, y: 0.7000 }, { x: -0.8000, y: 0.4000 }, { x: -0.8000, y: -0.4000 }, { x: -0.6000, y: -0.7000 }, { x: 0.4000, y: -0.7000 }, { x: 0.8000, y: -0.4000 }],
                fillColor: [255, 127, 80]
            },
            {
                vertexData: [{ x: 0.6000, y: 0.0000 }, { x: 0.2000, y: 0.5000 }, { x: -0.4000, y: 0.5000 }, { x: -0.6000, y: 0.0000 }, { x: -0.4000, y: -0.5000 }, { x: 0.2000, y: -0.5000 }],
                fillColor: [64, 224, 208]
            },
            {
                vertexData: [{ x: -0.1000, y: 0.5500 }, { x: 0.1000, y: 0.5500 }, { x: 0.1000, y: 0.6800 }, { x: -0.1000, y: 0.6800 }],
                fillColor: [255, 255, 0]
            },
            {
                vertexData: [{ x: -0.1000, y: -0.5500 }, { x: 0.1000, y: -0.5500 }, { x: 0.1000, y: -0.6800 }, { x: -0.1000, y: -0.6800 }],
                fillColor: [255, 255, 0]
            },
            {
                vertexData: [{ x: -0.2500, y: -0.1500 }, { x: -0.2500, y: 0.1500 }, { x: -0.4000, y: 0.2000 }, { x: -0.5000, y: 0.1500 }, { x: -0.5500, y: 0.0000 }, { x: -0.5000, y: -0.1500 }, { x: -0.4000, y: -0.2000 }],
                fillColor: [255, 127, 80]
            },
            {
                vertexData: [{ x: 0.5000, y: -0.2500 }, { x: 0.6500, y: 0.0000 }, { x: 0.5000, y: 0.2500 }],
                fillColor: [200, 200, 220]
            }
        ],
        typicalCargo: ["Narcotics", "Luxury Goods", "Slaves", "Textiles"],
        price: 72000,
        aiRoles: ["PIRATE"],
        faction: "HARLEQUIN",
        techLevel: 3,
    },
    "HarlequinPantaloon": {
        name: "Harlequin Pantaloon", role: "Heavy Freighter", upgrades: [], sizeCategory: "Large", size: 70,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRate: 0.025,
        baseHull: 250, baseShield: 150, shieldRecharge: 0.7, cargoCapacity: 250,
        armament: ["Twin Pulse", "Mini-Turret"],
        costCategory: "Medium-High", description: "When your cargo ship needs to haul 250 tons AND make every station traffic controller question their life choices. That cyan and yellow paintjob violates at least three interstellar design treaties. Slow as bureaucracy (3.0 max speed) but absurdly profitable if you can handle the embarrassment of flying it.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9979, y: 0.4000 }, { x: 0.4979, y: 0.8000 }, { x: -0.2390, y: 0.9045 }, { x: -1.0021, y: 0.8000 }, { x: -0.9237, y: 0.0000 }, { x: -1.0021, y: -0.8000 }, { x: -0.2390, y: -0.9045 }, { x: 0.4979, y: -0.8000 }, { x: 0.9979, y: -0.4000 }],
                fillColor: [0, 200, 200]
            },
            {
                vertexData: [{ x: -0.6749, y: -0.4659 }, { x: -0.6083, y: -0.3993 }, { x: -0.0759, y: 0.3993 }, { x: -0.0094, y: 0.4659 }, { x: 0.0306, y: 0.3993 }, { x: -0.7148, y: -0.3993 }],
                fillColor: [212, 255, 0]
            },
            {
                vertexData: [{ x: -0.6749, y: 0.4658 }, { x: -0.6083, y: 0.3993 }, { x: -0.0759, y: -0.3993 }, { x: -0.0093, y: -0.4658 }, { x: 0.0306, y: -0.3993 }, { x: -0.7148, y: 0.3993 }],
                fillColor: [212, 255, 0]
            },
            {
                vertexData: [{ x: -0.0093, y: -0.2662 }, { x: -0.0094, y: 0.2662 }, { x: -0.2756, y: 0.3328 }, { x: -0.4752, y: 0.2662 }, { x: -0.5418, y: 0.1331 }, { x: -0.5418, y: -0.1331 }, { x: -0.4752, y: -0.2662 }, { x: -0.2755, y: -0.3328 }],
                fillColor: [255, 0, 255]
            },
            {
                vertexData: [{ x: -0.6349, y: 0.1996 }, { x: -0.5684, y: 0.1597 }, { x: -0.5950, y: 0.1065 }, { x: -0.5684, y: 0.0532 }, { x: -0.5950, y: 0.0000 }, { x: -0.5684, y: -0.0532 }, { x: -0.5950, y: -0.1065 }, { x: -0.5684, y: -0.1597 }, { x: -0.6349, y: -0.1997 }, { x: -0.6749, y: -0.1065 }, { x: -0.6749, y: 0.1065 }],
                fillColor: [255, 0, 255]
            },
            {
                vertexData: [{ x: -0.2090, y: -0.1863 }, { x: -0.2090, y: -0.1065 }, { x: -0.3421, y: -0.1464 }],
                fillColor: [212, 255, 0]
            },
            {
                vertexData: [{ x: -0.2090, y: 0.1065 }, { x: -0.2090, y: 0.1863 }, { x: -0.3421, y: 0.1464 }],
                fillColor: [212, 255, 0]
            },
            {
                vertexData: [{ x: -0.3953, y: -0.0532 }, { x: -0.3953, y: 0.0532 }, { x: -0.4752, y: 0.0000 }],
                fillColor: [212, 255, 0]
            },
            {
                vertexData: [{ x: 0.9976, y: -0.0579 }, { x: 0.9975, y: 0.1054 }, { x: 0.2701, y: 0.8317 }, { x: 0.1840, y: 0.8476 }],
                fillColor: [212, 255, 0]
            },
            {
                vertexData: [{ x: 0.9976, y: 0.0579 }, { x: 0.9975, y: -0.1054 }, { x: 0.2701, y: -0.8317 }, { x: 0.1840, y: -0.8476 }],
                fillColor: [212, 255, 0]
            }
        ],
        typicalCargo: ["Slaves", "Narcotics", "Weapons"],
        price: 95000,
        aiRoles: ["PIRATE", "HAULER"],
        faction: "HARLEQUIN",
        techLevel: 4,
    },

    // --- CIVILIAN - TRADERS & HAULERS ---
    "Adder": {
        name: "Adder", role: "Trader/Explorer", upgrades: [], sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.05236,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 30,
        armament: ["Pulse Laser"],
        costCategory: "Low", description: "Affordable entry-level freighter beloved by broke cargo runners. Sure, it's slower than a hangover and handles like a drunk elephant, but that 30-ton hold pays bills. First-time pilots either love it or crash it within a week.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8500, y: 0.0500 }, { x: 0.2500, y: 0.8500 }, { x: -0.8500, y: 0.7500 }, { x: -0.6500, y: 0.0500 }, { x: -0.8500, y: -0.8500 }, { x: 0.1500, y: -0.6500 }],
                fillColor: [160, 160, 140],
            },
            {
                vertexData: [{ x: 0.3000, y: 0.0000 }, { x: -0.1500, y: 0.2598 }, { x: -0.1500, y: -0.2598 }],
                fillColor: [101, 171, 236],
            },
            // Cargo bay marking
            {
                vertexData: [{ x: -0.3000, y: 0.3500 }, { x: -0.5000, y: 0.4000 }, { x: -0.5000, y: 0.2500 }, { x: -0.3000, y: 0.3000 }],
                fillColor: [200, 180, 100]
            },
            // Navigation light port
            {
                vertexData: [{ x: 0.1500, y: 0.7800 }, { x: 0.0800, y: 0.7500 }, { x: 0.1200, y: 0.7000 }],
                fillColor: [255, 50, 50]
            }
        ],
        typicalCargo: ["Food", "Textiles", "Minerals"],
        price: 11000,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 1 // Starter
    },
    "Type6Transporter": {
        name: "Type-6 Transporter", role: "Trader", upgrades: [], sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 4.2, baseThrust: 0.06, baseTurnRate: 0.03491,
        baseHull: 150, baseShield: 60, shieldRecharge: 0.8, cargoCapacity: 100,
        armament: ["Twin Pulse", "Mini-Turret"], // Basic trader defense
        costCategory: "Low-Medium", description: "Lakon Spaceways' answer to 'how square can we make it?' Ugly as sin but hauls 100 tons reliably. Paper-thin shields (60) mean pirates see you as a pinata full of credits. The pilot seat has indentations from decades of stressed-out traders gripping it during attacks.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8500, y: 0.3000 }, { x: 0.8500, y: 0.7000 }, { x: -0.6500, y: 0.8000 }, { x: -0.8500, y: 0.6000 }, { x: -0.8500, y: -0.6000 }, { x: -0.6500, y: -0.8000 }, { x: 0.8500, y: -0.7000 }, { x: 0.8500, y: -0.3000 }],
                fillColor: [210, 160, 70]
            },
            {
                vertexData: [{ x: 0.5600, y: -0.4200 }, { x: 0.6800, y: -0.4200 }, { x: 0.6800, y: 0.4200 }, { x: 0.5600, y: 0.4200 }],
                fillColor: [150, 150, 180]
            },
            // Cargo hazard stripe
            {
                vertexData: [{ x: -0.5000, y: 0.7200 }, { x: -0.6000, y: 0.7000 }, { x: -0.6000, y: 0.6000 }, { x: -0.5000, y: 0.6200 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: -0.5000, y: -0.7200 }, { x: -0.6000, y: -0.7000 }, { x: -0.6000, y: -0.6000 }, { x: -0.5000, y: -0.6200 }],
                fillColor: [0, 0, 0]
            },
            // Nav lights
            {
                vertexData: [{ x: -0.7000, y: 0.7500 }, { x: -0.7700, y: 0.7200 }, { x: -0.7200, y: 0.6800 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: -0.7000, y: -0.7500 }, { x: -0.7700, y: -0.7200 }, { x: -0.7200, y: -0.6800 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Food", "Textiles", "Minerals", "Metals", "Machinery"],
        price: 20100,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 2 // Utility
    },
    "Keelback": {
        name: "Keelback", role: "Combat Trader", upgrades: [], sizeCategory: "Medium", size: 42,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.04363,
        baseHull: 180, baseShield: 90, shieldRecharge: 0.9, cargoCapacity: 50,
        armament: ["Twin Pulse", "Railgun Turret"], // Combat trader
        costCategory: "Medium", description: "Someone looked at the peaceful Type-6 and said 'needs more violence.' The result is this frankenstein trader with guns welded onto every available hardpoint. Still hauls 50 tons but now bites back. Perfect for haulers tired of being everyone's favorite target.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8168, y: 0.0000 }, { x: 0.6865, y: 0.5114 }, { x: -0.0134, y: 0.6114 }, { x: -0.6135, y: 0.8114 }, { x: -0.8168, y: 0.5917 }, { x: -0.3705, y: 0.2745 }, { x: -0.6039, y: 0.1373 }, { x: -0.5974, y: -0.1373 }, { x: -0.3705, y: -0.2745 }, { x: -0.8168, y: -0.5917 }, { x: -0.6135, y: -0.8114 }, { x: -0.0134, y: -0.6114 }, { x: 0.6865, y: -0.5114 }],
                fillColor: [180, 150, 80]
            },
            {
                vertexData: [{ x: 0.6600, y: 0.0000 }, { x: 0.5600, y: 0.1732 }, { x: 0.4800, y: 0.1732 }, { x: 0.4800, y: -0.1732 }, { x: 0.5600, y: -0.1732 }],
                fillColor: [101, 171, 236]
            }
        ],
        typicalCargo: ["Minerals", "Metals", "Machinery"],
        price: 20600,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 2 // Utility
    },
    "Type9Heavy": {
        name: "Type-9 Heavy", role: "Heavy Trader", upgrades: [], sizeCategory: "Very Large", size: 110,
        baseMaxSpeed: 2.5, baseThrust: 0.04, baseTurnRate: 0.01396,
        baseHull: 550, baseShield: 250, shieldRecharge: 0.6, cargoCapacity: 500,
        armament: ["Mini-Turret", "Force Blaster"], // Defensive cargo hauler
        costCategory: "High", description: "The final boss of Lakon's trading fleet. Moves like continental drift (2.5 speed, 0.01396 turn rate) but packs 500 tons of pure profit potential. Turning this thing requires filing a flight plan three weeks in advance. Pirates either avoid it because it's too slow to be worth it, or it's too tough (550 hull).",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9104, y: 0.2000 }, { x: 0.7896, y: 0.8000 }, { x: -0.7104, y: 0.9000 }, { x: -0.9104, y: 0.8000 }, { x: -0.9104, y: -0.8000 }, { x: -0.7104, y: -0.9000 }, { x: 0.7896, y: -0.8000 }, { x: 0.9104, y: -0.2000 }],
                fillColor: [190, 140, 60]
            },
            {
                vertexData: [{ x: 0.5200, y: -0.2200 }, { x: 0.6600, y: -0.2200 }, { x: 0.6600, y: 0.2200 }, { x: 0.5200, y: 0.2200 }],
                fillColor: [64, 63, 63]
            },
            // Container markings (hash pattern)
            {
                vertexData: [{ x: -0.2000, y: 0.7500 }, { x: -0.1500, y: 0.7700 }, { x: -0.4000, y: 0.8200 }, { x: -0.4500, y: 0.8000 }],
                fillColor: [150, 110, 40]
            },
            {
                vertexData: [{ x: -0.2000, y: -0.7500 }, { x: -0.1500, y: -0.7700 }, { x: -0.4000, y: -0.8200 }, { x: -0.4500, y: -0.8000 }],
                fillColor: [150, 110, 40]
            },
            // Cargo bay indicators
            {
                vertexData: [{ x: 0.0000, y: 0.8500 }, { x: 0.1000, y: 0.8500 }, { x: 0.1000, y: 0.7500 }, { x: 0.0000, y: 0.7500 }],
                fillColor: [0, 0, 0]
            },
            {
                vertexData: [{ x: 0.0000, y: -0.8500 }, { x: 0.1000, y: -0.8500 }, { x: 0.1000, y: -0.7500 }, { x: 0.0000, y: -0.7500 }],
                fillColor: [0, 0, 0]
            },
            // Nav lights
            {
                vertexData: [{ x: -0.7500, y: 0.8700 }, { x: -0.8200, y: 0.8400 }, { x: -0.7700, y: 0.8000 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: -0.7500, y: -0.8700 }, { x: -0.8200, y: -0.8400 }, { x: -0.7700, y: -0.8000 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Food", "Textiles", "Minerals", "Metals", "Machinery", "Chemicals", "Computers"],
        price: 43100,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 3, // Mid-tier
        canDualEngage: true
    },
    "MantaHauler": { // NEW - Unique 1
        name: "Manta Hauler", role: "Wide Cargo Hauler", upgrades: [], sizeCategory: "Large", size: 85,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRate: 0.02793,
        baseHull: 250, baseShield: 150, shieldRecharge: 0.7, cargoCapacity: 300,
        armament: ["Mini-Turret", "Force Blaster", "Barrier Field"], // Defensive
        costCategory: "Medium-High", description: "This absolute unit waddles through space hauling 300 tons like it's no big deal. Shaped like a manta ray that ate another manta ray. Slow as molasses (3.5 max) but with cargo capacity that makes hauler crews genuflect. Docking this beast requires prayer and skill in equal measure.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.3000, y: 0.3000 }, { x: -0.5000, y: 0.9000 }, { x: -0.8000, y: 0.7000 }, { x: -0.9000, y: 0.0000 }, { x: -0.8000, y: -0.7000 }, { x: -0.5000, y: -0.9000 }, { x: 0.3000, y: -0.3000 }],
                fillColor: [60, 80, 90],
            },
            {
                vertexData: [{ x: 0.0560, y: 0.1290 }, { x: 0.3195, y: 0.0000 }, { x: 0.0560, y: -0.1290 }],
                fillColor: [250, 250, 255],
            }
        ],
        typicalCargo: ["Minerals", "Metals", "Machinery", "Food", "Textiles"],
        price: 34600,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 3 // Mid-tier
    },
    "Python": {
        name: "Python", role: "Heavy Multi/Trader", upgrades: [], sizeCategory: "Large", size: 75,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.03840,
        baseHull: 280, baseShield: 250, shieldRecharge: 0.9, cargoCapacity: 220,
        armament: ["Heavy Cannon", "V Punch", "Mini-Turret", "Kalibr Missile", "Heavy Tangle", "Barrier Field"], // Versatile heavy combat
        costCategory: "High", description: "The Python is what happens when designers can't decide between cargo ship and gunboat, so they build both. Hauls 220 tons while mounting enough weapons to qualify as a small war. Expensive but worth every credit. The ultimate 'I refuse to choose' spaceship.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9000, y: 0.0000 }, { x: 0.7000, y: 0.7000 }, { x: -0.5000, y: 0.9000 }, { x: -0.9000, y: 0.6000 }, { x: -0.9000, y: -0.6000 }, { x: -0.5000, y: -0.9000 }, { x: 0.7000, y: -0.7000 }],
                fillColor: [140, 140, 150]
            },
            {
                vertexData: [{ x: 0.5400, y: -0.3800 }, { x: 0.6800, y: -0.2200 }, { x: 0.6800, y: 0.2200 }, { x: 0.5400, y: 0.3800 }],
                fillColor: [182, 182, 185]
            }
        ],
        typicalCargo: ["Luxury Goods", "Medicine", "Metals", "Chemicals", "Medicine", "Metals", "Chemicals"],
        price: 57300,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 4 // Advanced
    },
    "StarlinerCruiser": {
        name: "Starliner Cruiser", role: "Passenger Transport", upgrades: [], sizeCategory: "Large", size: 105,
        baseMaxSpeed: 5.5, baseThrust: 0.07, baseTurnRate: 0.02443,
        baseHull: 200, baseShield: 250, shieldRecharge: 1.1, cargoCapacity: 100, // Less cargo, more cabins assumed
        armament: ["Mini-Turret", "Force Blaster", "Halo"], // Defensive passenger ship
        costCategory: "High", description: "Sleek luxury cruise liner that ferries pampered passengers between systems while they complain about the amenities. Shields that could stop a war, speed that puts many fighters to shame (5.5), and defensive weapons for pirates dumb enough to threaten the rich. Tickets cost more than most ships.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1500, y: 0.0000 }, { x: 0.9500, y: 0.2000 }, { x: -0.9500, y: 0.3000 }, { x: -1.1500, y: 0.1000 }, { x: -1.1500, y: -0.1000 }, { x: -0.9500, y: -0.3000 }, { x: 0.9500, y: -0.2000 }],
                fillColor: [230, 230, 235],
            },
            // Luxury stripe
            {
                vertexData: [{ x: 0.6000, y: 0.1600 }, { x: -0.6000, y: 0.2200 }, { x: -0.6000, y: 0.1800 }, { x: 0.6000, y: 0.1200 }],
                fillColor: [200, 170, 100]
            },
            {
                vertexData: [{ x: 0.6000, y: -0.1600 }, { x: -0.6000, y: -0.2200 }, { x: -0.6000, y: -0.1800 }, { x: 0.6000, y: -0.1200 }],
                fillColor: [200, 170, 100]
            },
            // Stern light
            {
                vertexData: [{ x: -1.0800, y: 0.0400 }, { x: -1.1300, y: 0.0000 }, { x: -1.0800, y: -0.0400 }],
                fillColor: [255, 255, 200]
            }
        ],
        typicalCargo: ["Luxury Goods", "Food", "Medicine", "Food", "Medicine"],
        price: 36000,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 4 // Advanced
    },
    "CobraMkIII": {
        name: "Cobra Mk III", role: "Multi-Role", upgrades: [], sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 6.0, baseThrust: 0.10, baseTurnRate: 0.06109,
        baseHull: 120, baseShield: 100, shieldRecharge: 1, cargoCapacity: 44,
        armament: ["Twin Pulse", "Guardian Missile"], // Versatile loadout
        costCategory: "Medium", description: "The legendary jack-of-all-trades, master of staying employed. With 44 tons of cargo space and weapons for every occasion, it's been hauling goods and kicking ass for three centuries. If ships had résumés, the Cobra's would be 20 pages long.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.8867, y: 0.0000 }, { x: 0.1867, y: 0.5270 }, { x: -0.6178, y: 0.5634 }, { x: -0.6133, y: 0.2000 }, { x: -0.8867, y: 0.1770 }, { x: -0.8867, y: -0.1770 }, { x: -0.6133, y: -0.2000 }, { x: -0.6178, y: -0.5634 }, { x: 0.1867, y: -0.5270 }],
                fillColor: [113, 109, 10]
            },
            {
                vertexData: [{ x: -0.0793, y: 0.3000 }, { x: -0.2393, y: 0.1800 }, { x: -0.2393, y: -0.1800 }, { x: -0.0793, y: -0.3000 }, { x: 0.0807, y: -0.2200 }, { x: 0.2807, y: -0.1200 }, { x: 0.4007, y: 0.0000 }, { x: 0.2807, y: 0.1200 }, { x: 0.0807, y: 0.2200 }],
                fillColor: [188, 89, 36]
            },
            {
                vertexData: [{ x: -0.5500, y: 0.5400 }, { x: -0.6200, y: 0.5100 }, { x: -0.5700, y: 0.4700 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: -0.5500, y: -0.5400 }, { x: -0.6200, y: -0.5100 }, { x: -0.5700, y: -0.4700 }],
                fillColor: [50, 255, 50]
            },
            {
                vertexData: [{ x: -0.7500, y: 0.1200 }, { x: -0.8200, y: 0.1200 }, { x: -0.8200, y: -0.1200 }, { x: -0.7500, y: -0.1200 }],
                fillColor: [80, 80, 100]
            }
        ],
        typicalCargo: ["Food"],
        price: 21600,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 2 // Utility
    },

    // --- CIVILIAN - EXPLORERS ---
    "AspExplorer": {
        name: "Asp Explorer", role: "Explorer/Multi-Role", upgrades: [], sizeCategory: "Medium", size: 55,
        baseMaxSpeed: 5.5, baseThrust: 0.09, baseTurnRate: 0.05585,
        baseHull: 150, baseShield: 180, shieldRecharge: 1.3, cargoCapacity: 80,
        armament: ["Beam Laser", "Twin Pulse"],
        costCategory: "Medium-High", description: "The poster child of deep-space exploration. That cockpit visibility isn't just for show—it's saved countless pilots from asteroid faceplants. Respectable cargo hold, decent guns, and shield recharge that'll make combat pilots jealous. Basically a camper van that shoots back.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.3627, y: 0.5133 }, { x: -0.4750, y: 0.8750 }, { x: -0.9500, y: 0.3000 }, { x: -0.9500, y: -0.3000 }, { x: -0.4750, y: -0.8750 }, { x: 0.3627, y: -0.5133 }],
                fillColor: [200, 180, 80]
            },
            {
                vertexData: [{ x: 0.2400, y: 0.2911 }, { x: 0.2400, y: -0.2911 }, { x: 0.5511, y: 0.0000 }],
                fillColor: [181, 151, 177]
            }
        ],
        typicalCargo: ["Minerals", "Minerals", "Minerals", "Minerals", "Medicine", "Computers"],
        price: 23600,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 2 // Mid-tier
    },
    "DiamondbackExplorer": {
        name: "Diamondback Explorer", role: "Explorer/Light Combat", upgrades: [], sizeCategory: "Medium", size: 45,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRate: 0.05236,
        baseHull: 130, baseShield: 100, shieldRecharge: 1.1, cargoCapacity: 40,
        armament: ["Beam Laser", "V Spread"], // Explorer with some punch
        costCategory: "Medium", description: "The workaholic's explorer—all business, zero flash. Runs cooler than a politician's heart and efficient enough to make accountants weep with joy. Not sexy, but it gets you there and back without spontaneously combusting, which is honestly underrated.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9500, y: 0.0000 }, { x: 0.1500, y: 0.4000 }, { x: -0.5500, y: 0.9000 }, { x: -0.9500, y: 0.5000 }, { x: -0.8500, y: 0.0000 }, { x: -0.9500, y: -0.5000 }, { x: -0.5500, y: -0.9000 }, { x: 0.1500, y: -0.4000 }],
                fillColor: [100, 110, 90]
            },
            {
                vertexData: [{ x: 0.1400, y: -0.2000 }, { x: 0.3998, y: -0.0500 }, { x: 0.3998, y: 0.0300 }, { x: 0.1400, y: 0.1800 }, { x: -0.1198, y: 0.0300 }, { x: -0.1198, y: -0.0500 }],
                fillColor: [101, 171, 236]
            },
            // Sensor dish (exploration equipment)
            {
                vertexData: [{ x: -0.6000, y: 0.8200 }, { x: -0.7000, y: 0.7500 }, { x: -0.6500, y: 0.7000 }],
                fillColor: [200, 200, 210]
            },
            // Scanner array hash marks
            {
                vertexData: [{ x: -0.3000, y: 0.6500 }, { x: -0.2500, y: 0.6700 }, { x: -0.4000, y: 0.7500 }, { x: -0.4500, y: 0.7300 }],
                fillColor: [80, 90, 70]
            },
            {
                vertexData: [{ x: -0.3000, y: -0.6500 }, { x: -0.2500, y: -0.6700 }, { x: -0.4000, y: -0.7500 }, { x: -0.4500, y: -0.7300 }],
                fillColor: [80, 90, 70]
            },
            // Nav lights
            {
                vertexData: [{ x: -0.5000, y: 0.8700 }, { x: -0.5700, y: 0.8400 }, { x: -0.5200, y: 0.8000 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: -0.5000, y: -0.8700 }, { x: -0.5700, y: -0.8400 }, { x: -0.5200, y: -0.8000 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Minerals", "Metals", "Adv Components"],
        price: 20800,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 3 // Mid-tier
    },
    "NomadVoyager": {
        name: "Nomad Voyager", role: "Deep Space Explorer", upgrades: [], sizeCategory: "Medium", size: 58,
        baseMaxSpeed: 5.2, baseThrust: 0.07, baseTurnRate: 0.05061,
        baseHull: 180, baseShield: 220, shieldRecharge: 1.5, cargoCapacity: 70,
        armament: ["Beam Laser", "Mini-Turret"], // Long range exploration
        costCategory: "High", description: "Built for pilots who think 'civilization is overrated.' Stuffed with life support redundancies and shield generators (220 capacity plus 1.5 recharge). Can survive the void for months on end. Popular with hermits, researchers, and people with outstanding warrants in multiple systems.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0000, y: 0.0000 }, { x: 0.8000, y: 0.5000 }, { x: 0.2000, y: 0.8000 }, { x: -0.7000, y: 0.7000 }, { x: -1.0000, y: 0.0000 }, { x: -0.7000, y: -0.7000 }, { x: 0.2000, y: -0.8000 }, { x: 0.8000, y: -0.5000 }],
                fillColor: [200, 200, 190],
            },
            // Scanner array (exploration equipment)
            {
                vertexData: [{ x: 0.0000, y: 0.7500 }, { x: -0.0800, y: 0.7200 }, { x: 0.0000, y: 0.6500 }, { x: 0.0800, y: 0.7200 }],
                fillColor: [150, 150, 160]
            },
            {
                vertexData: [{ x: 0.0000, y: -0.7500 }, { x: -0.0800, y: -0.7200 }, { x: 0.0000, y: -0.6500 }, { x: 0.0800, y: -0.7200 }],
                fillColor: [150, 150, 160]
            },
            // Deliberate hull hash lines
            {
                vertexData: [{ x: -0.4000, y: 0.6000 }, { x: -0.3500, y: 0.6200 }, { x: -0.5500, y: 0.5500 }, { x: -0.6000, y: 0.5300 }],
                fillColor: [180, 180, 170]
            },
            {
                vertexData: [{ x: -0.4000, y: -0.6000 }, { x: -0.3500, y: -0.6200 }, { x: -0.5500, y: -0.5500 }, { x: -0.6000, y: -0.5300 }],
                fillColor: [180, 180, 170]
            },
            // Cockpit canopy
            {
                vertexData: [{ x: 0.5000, y: 0.0000 }, { x: 0.3000, y: 0.1500 }, { x: 0.3000, y: -0.1500 }],
                fillColor: [100, 160, 220]
            },
            // Nav lights
            {
                vertexData: [{ x: 0.1500, y: 0.7700 }, { x: 0.0800, y: 0.7400 }, { x: 0.1200, y: 0.7000 }],
                fillColor: [255, 50, 50]
            },
            {
                vertexData: [{ x: 0.1500, y: -0.7700 }, { x: 0.0800, y: -0.7400 }, { x: 0.1200, y: -0.7000 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Minerals", "Food", "Medicine"],
        price: 24600,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 4 // Advanced
    },
    "PathfinderSurvey": {
        name: "Pathfinder Survey", role: "Long Range Scanner", upgrades: [], sizeCategory: "Medium", size: 62,
        baseMaxSpeed: 5.0, baseThrust: 0.06, baseTurnRate: 0.04363,
        baseHull: 120, baseShield: 150, shieldRecharge: 1.2, cargoCapacity: 50,
        armament: [],
        costCategory: "Medium", description: "For the pilot who wants to know what every rock in the galaxy is made of. Bristling with scanners worth more than the ship itself. Completely unarmed because apparently scientists think 'please don't shoot me' is an effective defense strategy. Spoiler: it's not.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.1000, y: 0.0000 }, { x: 0.7000, y: 0.2000 }, { x: -0.6000, y: 0.5000 }, { x: -1.1000, y: 0.3000 }, { x: -1.1000, y: -0.3000 }, { x: -0.6000, y: -0.5000 }, { x: 0.7000, y: -0.2000 }],
                fillColor: [130, 160, 170],
            },
            {
                vertexData: [{ x: -0.2751, y: -0.5092 }, { x: -0.2751, y: 0.5092 }, { x: -0.1000, y: 0.7714 }, { x: -0.1000, y: -0.7714 }],
                fillColor: [30, 77, 46],
            }
        ],
        typicalCargo: ["Food", "Food", "Minerals", "Minerals", "Metals"],
        price: 10200,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 3 // Mid-tier
    },
    "ProspectorMiner": { // NEW - Miner
        name: "Prospector Miner", role: "Mining Vessel", upgrades: [], sizeCategory: "Medium", size: 48,
        baseMaxSpeed: 2.5, baseThrust: 0.08, baseTurnRate: 0.03840,
        baseHull: 200, baseShield: 80, shieldRecharge: 0.9, cargoCapacity: 40, // Includes refinery space
        armament: ["Beam Laser"], // Mining lasers for asteroid destruction
        costCategory: "Medium", description: "The space excavator nobody respects until they're filthy rich. Top speed of 2.5 means 'chase' isn't in its vocabulary, but that 40-ton hold fills up fast when you're atomizing asteroids. Runs on dreams of profit and the optimistic belief that those rocks contain something valuable.",
        vertexData: [{ x: 0.6, y: 0 }, { x: 0.4, y: 0.8 }, { x: -0.4, y: 0.9 }, { x: -0.9, y: 0.6 }, { x: -1.0, y: -0.3 }, { x: -0.9, y: -0.6 }, { x: -0.4, y: -0.9 }, { x: 0.4, y: -0.8 }], // Bulky, functional
        fillColor: [180, 170, 160], // Industrial grey/brown
        typicalCargo: ["Minerals", "Metals"],
        price: 8700,
        aiRoles: ["MINER"],
        faction: "",
        techLevel: 2 // Utility
    },

    // --- TRANSPORTS ---
    "LocalHopper": {
        name: "Local Hopper", role: "Light Transport", upgrades: [], sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 3.5, baseThrust: 0.04, baseTurnRate: 0.05,
        baseHull: 40, baseShield: 0, shieldRecharge: 0.5, cargoCapacity: 15,
        armament: [],
        costCategory: "Very Low", description: "A cube that aspires to fly but mostly just falls with style. Zero shields, 40 hull, and dreams too big for its 15-ton cargo bay. Used for ultra-short hops nobody else wants to do. Think of it as a space taxi driven by someone who failed pilot school. Twice.",
        vertexLayers: [
            // Main boxy hull
            {
                vertexData: [{ x: 0.6, y: 0.6 }, { x: -0.6, y: 0.6 }, { x: -0.6, y: -0.6 }, { x: 0.6, y: -0.6 }],
                fillColor: [150, 150, 150]
            },
            // Thin rectangular cockpit window (characteristic transporter style)
            {
                vertexData: [{ x: 0.5500, y: 0.1000 }, { x: 0.3500, y: 0.1200 }, { x: 0.3500, y: -0.1200 }, { x: 0.5500, y: -0.1000 }],
                fillColor: [70, 130, 190]
            },
            // Cockpit frame top
            {
                vertexData: [{ x: 0.5700, y: 0.1200 }, { x: 0.3300, y: 0.1400 }, { x: 0.3300, y: 0.1000 }, { x: 0.5700, y: 0.0800 }],
                fillColor: [80, 80, 80]
            },
            // Cockpit frame bottom
            {
                vertexData: [{ x: 0.5700, y: -0.1200 }, { x: 0.3300, y: -0.1400 }, { x: 0.3300, y: -0.1000 }, { x: 0.5700, y: -0.0800 }],
                fillColor: [80, 80, 80]
            },
            // Hull panel divider (horizontal)
            {
                vertexData: [{ x: 0.2000, y: 0.0200 }, { x: -0.5500, y: 0.0200 }, { x: -0.5500, y: -0.0200 }, { x: 0.2000, y: -0.0200 }],
                fillColor: [120, 120, 120]
            },
            // Hull panel divider (vertical)
            {
                vertexData: [{ x: -0.1800, y: 0.5500 }, { x: -0.2200, y: 0.5500 }, { x: -0.2200, y: -0.5500 }, { x: -0.1800, y: -0.5500 }],
                fillColor: [120, 120, 120]
            },
            // Antenna/sensor mast
            {
                vertexData: [{ x: -0.4000, y: 0.5500 }, { x: -0.4200, y: 0.5500 }, { x: -0.4200, y: 0.7500 }, { x: -0.4000, y: 0.7500 }],
                fillColor: [100, 100, 110]
            },
            // Antenna tip light
            {
                vertexData: [{ x: -0.4100, y: 0.7500 }, { x: -0.4400, y: 0.7800 }, { x: -0.3800, y: 0.7800 }],
                fillColor: [255, 100, 100]
            },
            // Docking light (front)
            {
                vertexData: [{ x: 0.5800, y: 0.0000 }, { x: 0.6200, y: 0.0300 }, { x: 0.6200, y: -0.0300 }],
                fillColor: [255, 255, 200]
            },
            // Port nav light (red)
            {
                vertexData: [{ x: -0.5500, y: 0.5500 }, { x: -0.6000, y: 0.5200 }, { x: -0.5600, y: 0.4800 }],
                fillColor: [255, 50, 50]
            },
            // Starboard nav light (green)
            {
                vertexData: [{ x: -0.5500, y: -0.5500 }, { x: -0.6000, y: -0.5200 }, { x: -0.5600, y: -0.4800 }],
                fillColor: [50, 255, 50]
            }
        ],
        typicalCargo: ["Food", "Textiles"],
        price: 1800,
        aiRoles: ["TRANSPORT"],
        faction: "",
        techLevel: 1,
    },
    "MuleFreighter": { // NEW - Small Transporter
        name: "Mule Freighter", role: "Local Transport", upgrades: [], sizeCategory: "Small", size: 25,
        baseMaxSpeed: 3.8, baseThrust: 0.05, baseTurnRate: 0.04887,
        baseHull: 70, baseShield: 0, shieldRecharge: 0.8, cargoCapacity: 20,
        armament: [],
        costCategory: "Very Low", description: "The space equivalent of a rusty pickup truck held together with duct tape and optimism. At 4200 credits it's cheaper than some bar tabs, and about as fast (3.8). Zero shields, 70 hull, and the aerodynamics of a filing cabinet. But it floats, mostly.",
        vertexLayers: [
            // Main hull - boxy transporter shape
            {
                vertexData: [{ x: 0.8000, y: 0.7500 }, { x: -0.6000, y: 0.8500 }, { x: -0.8000, y: 0.4500 }, { x: -0.8000, y: -0.4500 }, { x: -0.5000, y: -0.8500 }, { x: 0.8000, y: -0.7500 }],
                fillColor: [140, 130, 120],
            },
            // Thin rectangular cockpit window (characteristic transporter style)
            {
                vertexData: [{ x: 0.7000, y: 0.1200 }, { x: 0.5000, y: 0.1400 }, { x: 0.5000, y: -0.1400 }, { x: 0.7000, y: -0.1200 }],
                fillColor: [80, 140, 200],
            },
            // Cockpit frame
            {
                vertexData: [{ x: 0.7200, y: 0.1400 }, { x: 0.4800, y: 0.1600 }, { x: 0.4800, y: 0.1200 }, { x: 0.7200, y: 0.1000 }],
                fillColor: [60, 55, 50],
            },
            {
                vertexData: [{ x: 0.7200, y: -0.1400 }, { x: 0.4800, y: -0.1600 }, { x: 0.4800, y: -0.1200 }, { x: 0.7200, y: -0.1000 }],
                fillColor: [60, 55, 50],
            },
            // Cargo bay door lines (welded panels)
            {
                vertexData: [{ x: 0.2000, y: 0.6500 }, { x: 0.2200, y: 0.6800 }, { x: -0.4000, y: 0.7500 }, { x: -0.4200, y: 0.7200 }],
                fillColor: [100, 90, 80],
            },
            {
                vertexData: [{ x: 0.2000, y: -0.6500 }, { x: 0.2200, y: -0.6800 }, { x: -0.3500, y: -0.7500 }, { x: -0.3700, y: -0.7200 }],
                fillColor: [100, 90, 80],
            },
            // Rust/weathering patches
            {
                vertexData: [{ x: -0.3000, y: 0.5000 }, { x: -0.4500, y: 0.5500 }, { x: -0.4800, y: 0.4500 }, { x: -0.3500, y: 0.4200 }],
                fillColor: [160, 100, 70],
            },
            {
                vertexData: [{ x: 0.4000, y: -0.4500 }, { x: 0.3000, y: -0.5000 }, { x: 0.3500, y: -0.5800 }, { x: 0.4500, y: -0.5200 }],
                fillColor: [155, 95, 65],
            },
            // Engine housing warning stripes
            {
                vertexData: [{ x: -0.6500, y: 0.3500 }, { x: -0.7500, y: 0.3800 }, { x: -0.7500, y: 0.3200 }, { x: -0.6500, y: 0.2900 }],
                fillColor: [200, 180, 50],
            },
            {
                vertexData: [{ x: -0.6500, y: -0.3500 }, { x: -0.7500, y: -0.3800 }, { x: -0.7500, y: -0.3200 }, { x: -0.6500, y: -0.2900 }],
                fillColor: [200, 180, 50],
            },
            // Port navigation light (red)
            {
                vertexData: [{ x: -0.5500, y: 0.8200 }, { x: -0.6200, y: 0.7800 }, { x: -0.5600, y: 0.7400 }],
                fillColor: [255, 50, 50]
            },
            // Starboard navigation light (green)
            {
                vertexData: [{ x: -0.4500, y: -0.8200 }, { x: -0.5200, y: -0.7800 }, { x: -0.4600, y: -0.7400 }],
                fillColor: [50, 255, 50]
            },
            // Stern running light
            {
                vertexData: [{ x: -0.7700, y: 0.0400 }, { x: -0.7900, y: 0.0000 }, { x: -0.7700, y: -0.0400 }],
                fillColor: [255, 255, 200]
            }
        ],
        typicalCargo: ["Food", "Machinery", "Metals"],
        price: 4200,
        aiRoles: ["TRANSPORT"],
        faction: "",
        techLevel: 1 // Starter
    },
    "ErrandRunner": {
        name: "Errand Runner", role: "Light Transport", upgrades: [], sizeCategory: "Small", size: 24,
        baseMaxSpeed: 4.0, baseThrust: 0.05, baseTurnRate: 0.045,
        baseHull: 50, baseShield: 10, shieldRecharge: 0.6, cargoCapacity: 25,
        armament: [],
        costCategory: "Low", description: "Slightly less terrible than the Hopper, which isn't saying much. Has shields (barely—10 capacity) and can actually accelerate without wheezing. Perfect for station-to-station milk runs. The 25-ton hold makes it just profitable enough that you won't starve. Probably.",
        vertexLayers: [
            // Main hull - pentagonal shape
            {
                vertexData: [{ x: 0.7, y: 0.4 }, { x: -0.7, y: 0.4 }, { x: -0.9, y: 0 }, { x: -0.7, y: -0.4 }, { x: 0.7, y: -0.4 }],
                fillColor: [130, 140, 150]
            },
            // Thin rectangular cockpit window
            {
                vertexData: [{ x: 0.6500, y: 0.0800 }, { x: 0.4000, y: 0.1000 }, { x: 0.4000, y: -0.1000 }, { x: 0.6500, y: -0.0800 }],
                fillColor: [75, 135, 195]
            },
            // Cockpit frame top
            {
                vertexData: [{ x: 0.6700, y: 0.1000 }, { x: 0.3800, y: 0.1200 }, { x: 0.3800, y: 0.0800 }, { x: 0.6700, y: 0.0600 }],
                fillColor: [70, 75, 80]
            },
            // Cockpit frame bottom
            {
                vertexData: [{ x: 0.6700, y: -0.1000 }, { x: 0.3800, y: -0.1200 }, { x: 0.3800, y: -0.0800 }, { x: 0.6700, y: -0.0600 }],
                fillColor: [70, 75, 80]
            },
            // Cargo bay hatch outline
            {
                vertexData: [{ x: 0.1000, y: 0.2800 }, { x: -0.4000, y: 0.3200 }, { x: -0.4000, y: -0.3200 }, { x: 0.1000, y: -0.2800 }],
                fillColor: [110, 120, 130]
            },
            // Cargo hatch inner
            {
                vertexData: [{ x: 0.0500, y: 0.2200 }, { x: -0.3500, y: 0.2600 }, { x: -0.3500, y: -0.2600 }, { x: 0.0500, y: -0.2200 }],
                fillColor: [140, 150, 160]
            },
            // Hull identification stripe
            {
                vertexData: [{ x: 0.2000, y: 0.3600 }, { x: -0.5000, y: 0.3800 }, { x: -0.5000, y: 0.3400 }, { x: 0.2000, y: 0.3200 }],
                fillColor: [180, 160, 80]
            },
            // Engine glow housing
            {
                vertexData: [{ x: -0.7500, y: 0.2500 }, { x: -0.8500, y: 0.1500 }, { x: -0.8500, y: -0.1500 }, { x: -0.7500, y: -0.2500 }],
                fillColor: [90, 100, 110]
            },
            // Port nav light (red)
            {
                vertexData: [{ x: -0.6500, y: 0.3700 }, { x: -0.7200, y: 0.3400 }, { x: -0.6700, y: 0.3100 }],
                fillColor: [255, 50, 50]
            },
            // Starboard nav light (green)
            {
                vertexData: [{ x: -0.6500, y: -0.3700 }, { x: -0.7200, y: -0.3400 }, { x: -0.6700, y: -0.3100 }],
                fillColor: [50, 255, 50]
            },
            // Docking light
            {
                vertexData: [{ x: 0.6800, y: 0.0000 }, { x: 0.7200, y: 0.0250 }, { x: 0.7200, y: -0.0250 }],
                fillColor: [255, 255, 180]
            }
        ],
        typicalCargo: ["Machinery", "Medicine"],
        price: 4500,
        aiRoles: ["HAULER"],
        faction: "",
        techLevel: 1,
    },
    "SystemShuttle": {
        name: "System Shuttle", role: "Medium Transport", upgrades: [], sizeCategory: "Small", size: 30,
        baseMaxSpeed: 3.8, baseThrust: 0.06, baseTurnRate: 0.04,
        baseHull: 80, baseShield: 20, shieldRecharge: 0.7, cargoCapacity: 40,
        armament: [],
        costCategory: "Low", description: "The workhorse everyone depends on but nobody respects. Hauls 40 tons at a glacial 3.8 speed with shields that might stop a determined sneeze (20). Operators joke that its best feature is 'it exists and it's cheap.' Station mechanics charge extra for working on these out of pity.",
        vertexLayers: [
            // Main hull - blocky shuttle shape
            {
                vertexData: [{ x: 0.8, y: 0.5 }, { x: 0.6, y: 0.7 }, { x: -0.8, y: 0.7 }, { x: -0.8, y: -0.7 }, { x: 0.6, y: -0.7 }, { x: 0.8, y: -0.5 }],
                fillColor: [160, 150, 140]
            },
            // Thin rectangular cockpit window
            {
                vertexData: [{ x: 0.7500, y: 0.1200 }, { x: 0.5000, y: 0.1500 }, { x: 0.5000, y: -0.1500 }, { x: 0.7500, y: -0.1200 }],
                fillColor: [70, 130, 200]
            },
            // Cockpit frame top
            {
                vertexData: [{ x: 0.7700, y: 0.1400 }, { x: 0.4800, y: 0.1700 }, { x: 0.4800, y: 0.1200 }, { x: 0.7700, y: 0.0900 }],
                fillColor: [90, 85, 80]
            },
            // Cockpit frame bottom
            {
                vertexData: [{ x: 0.7700, y: -0.1400 }, { x: 0.4800, y: -0.1700 }, { x: 0.4800, y: -0.1200 }, { x: 0.7700, y: -0.0900 }],
                fillColor: [90, 85, 80]
            },
            // Passenger/cargo window row (port side)
            {
                vertexData: [{ x: 0.3000, y: 0.6200 }, { x: 0.2000, y: 0.6400 }, { x: 0.2000, y: 0.5400 }, { x: 0.3000, y: 0.5200 }],
                fillColor: [80, 140, 180]
            },
            {
                vertexData: [{ x: 0.0500, y: 0.6600 }, { x: -0.0500, y: 0.6800 }, { x: -0.0500, y: 0.5800 }, { x: 0.0500, y: 0.5600 }],
                fillColor: [80, 140, 180]
            },
            {
                vertexData: [{ x: -0.2000, y: 0.6800 }, { x: -0.3000, y: 0.7000 }, { x: -0.3000, y: 0.6000 }, { x: -0.2000, y: 0.5800 }],
                fillColor: [80, 140, 180]
            },
            // Passenger/cargo window row (starboard side)
            {
                vertexData: [{ x: 0.3000, y: -0.6200 }, { x: 0.2000, y: -0.6400 }, { x: 0.2000, y: -0.5400 }, { x: 0.3000, y: -0.5200 }],
                fillColor: [80, 140, 180]
            },
            {
                vertexData: [{ x: 0.0500, y: -0.6600 }, { x: -0.0500, y: -0.6800 }, { x: -0.0500, y: -0.5800 }, { x: 0.0500, y: -0.5600 }],
                fillColor: [80, 140, 180]
            },
            {
                vertexData: [{ x: -0.2000, y: -0.6800 }, { x: -0.3000, y: -0.7000 }, { x: -0.3000, y: -0.6000 }, { x: -0.2000, y: -0.5800 }],
                fillColor: [80, 140, 180]
            },
            // Hull stripe (company livery)
            {
                vertexData: [{ x: 0.5500, y: 0.3500 }, { x: -0.6000, y: 0.4000 }, { x: -0.6000, y: 0.3500 }, { x: 0.5500, y: 0.3000 }],
                fillColor: [200, 80, 60]
            },
            {
                vertexData: [{ x: 0.5500, y: -0.3500 }, { x: -0.6000, y: -0.4000 }, { x: -0.6000, y: -0.3500 }, { x: 0.5500, y: -0.3000 }],
                fillColor: [200, 80, 60]
            },
            // Engine warning stripes
            {
                vertexData: [{ x: -0.7000, y: 0.5000 }, { x: -0.7800, y: 0.5200 }, { x: -0.7800, y: 0.4600 }, { x: -0.7000, y: 0.4400 }],
                fillColor: [220, 200, 50]
            },
            {
                vertexData: [{ x: -0.7000, y: -0.5000 }, { x: -0.7800, y: -0.5200 }, { x: -0.7800, y: -0.4600 }, { x: -0.7000, y: -0.4400 }],
                fillColor: [220, 200, 50]
            },
            // Port nav light (red)
            {
                vertexData: [{ x: 0.5500, y: 0.6800 }, { x: 0.4900, y: 0.6500 }, { x: 0.5300, y: 0.6100 }],
                fillColor: [255, 50, 50]
            },
            // Starboard nav light (green)
            {
                vertexData: [{ x: 0.5500, y: -0.6800 }, { x: 0.4900, y: -0.6500 }, { x: 0.5300, y: -0.6100 }],
                fillColor: [50, 255, 50]
            },
            // Stern running light
            {
                vertexData: [{ x: -0.7800, y: 0.0400 }, { x: -0.8200, y: 0.0000 }, { x: -0.7800, y: -0.0400 }],
                fillColor: [255, 255, 200]
            }
        ],
        typicalCargo: ["Minerals", "Food", "Machinery"],
        price: 12000,
        aiRoles: ["TRANSPORT"],
        faction: "",
        techLevel: 2,
    },
    "CargoWagon": {
        name: "Cargo Wagon", role: "Heavy Local Transport", upgrades: [], sizeCategory: "Medium", size: 45,
        baseMaxSpeed: 3.0, baseThrust: 0.045, baseTurnRate: 0.03,
        baseHull: 120, baseShield: 30, shieldRecharge: 0.5, cargoCapacity: 120,
        armament: [],
        costCategory: "Low-Medium", description: "An engine, a cockpit, and 120 tons of cargo containers held together by hope and prayers to whatever gods tolerate shoddy engineering. Maxes out at 3.0 speed, which is generous considering it's basically a cargo mountain with thrusters. Pilots either love its capacity or hate everything else about it.",
        vertexLayers: [
            // Main hull - massive cargo container
            {
                vertexData: [{ x: 1.0000, y: 0.6000 }, { x: 0.8000, y: 0.8000 }, { x: -0.8000, y: 0.8000 }, { x: -1.0000, y: 0.6000 }, { x: -1.0000, y: -0.6000 }, { x: -0.8000, y: -0.8000 }, { x: 0.8000, y: -0.8000 }, { x: 1.0000, y: -0.6000 }],
                fillColor: [100, 90, 80]
            },
            // Thin rectangular cockpit window (small relative to cargo)
            {
                vertexData: [{ x: 0.9500, y: 0.1500 }, { x: 0.7500, y: 0.1800 }, { x: 0.7500, y: -0.1800 }, { x: 0.9500, y: -0.1500 }],
                fillColor: [65, 125, 185]
            },
            // Cockpit frame top
            {
                vertexData: [{ x: 0.9700, y: 0.1700 }, { x: 0.7300, y: 0.2000 }, { x: 0.7300, y: 0.1500 }, { x: 0.9700, y: 0.1200 }],
                fillColor: [60, 50, 45]
            },
            // Cockpit frame bottom
            {
                vertexData: [{ x: 0.9700, y: -0.1700 }, { x: 0.7300, y: -0.2000 }, { x: 0.7300, y: -0.1500 }, { x: 0.9700, y: -0.1200 }],
                fillColor: [60, 50, 45]
            },
            // Cargo container division lines (port side)
            {
                vertexData: [{ x: 0.4000, y: 0.7800 }, { x: 0.3600, y: 0.7800 }, { x: 0.3600, y: 0.6200 }, { x: 0.4000, y: 0.6200 }],
                fillColor: [70, 60, 50]
            },
            {
                vertexData: [{ x: 0.0000, y: 0.8000 }, { x: -0.0400, y: 0.8000 }, { x: -0.0400, y: 0.6200 }, { x: 0.0000, y: 0.6200 }],
                fillColor: [70, 60, 50]
            },
            {
                vertexData: [{ x: -0.4000, y: 0.8000 }, { x: -0.4400, y: 0.8000 }, { x: -0.4400, y: 0.6200 }, { x: -0.4000, y: 0.6200 }],
                fillColor: [70, 60, 50]
            },
            // Cargo container division lines (starboard side)
            {
                vertexData: [{ x: 0.4000, y: -0.7800 }, { x: 0.3600, y: -0.7800 }, { x: 0.3600, y: -0.6200 }, { x: 0.4000, y: -0.6200 }],
                fillColor: [70, 60, 50]
            },
            {
                vertexData: [{ x: 0.0000, y: -0.8000 }, { x: -0.0400, y: -0.8000 }, { x: -0.0400, y: -0.6200 }, { x: 0.0000, y: -0.6200 }],
                fillColor: [70, 60, 50]
            },
            {
                vertexData: [{ x: -0.4000, y: -0.8000 }, { x: -0.4400, y: -0.8000 }, { x: -0.4400, y: -0.6200 }, { x: -0.4000, y: -0.6200 }],
                fillColor: [70, 60, 50]
            },
            // Container locking mechanism accents
            {
                vertexData: [{ x: 0.6000, y: 0.5000 }, { x: 0.5500, y: 0.5200 }, { x: 0.5500, y: 0.4200 }, { x: 0.6000, y: 0.4000 }],
                fillColor: [180, 80, 60]
            },
            {
                vertexData: [{ x: 0.6000, y: -0.5000 }, { x: 0.5500, y: -0.5200 }, { x: 0.5500, y: -0.4200 }, { x: 0.6000, y: -0.4000 }],
                fillColor: [180, 80, 60]
            },
            // Hazard warning stripes (rear)
            {
                vertexData: [{ x: -0.8500, y: 0.7500 }, { x: -0.9500, y: 0.6500 }, { x: -0.9500, y: 0.5500 }, { x: -0.8500, y: 0.6500 }],
                fillColor: [220, 200, 50]
            },
            {
                vertexData: [{ x: -0.8500, y: -0.7500 }, { x: -0.9500, y: -0.6500 }, { x: -0.9500, y: -0.5500 }, { x: -0.8500, y: -0.6500 }],
                fillColor: [220, 200, 50]
            },
            // Engine exhaust housing
            {
                vertexData: [{ x: -0.9000, y: 0.3000 }, { x: -0.9800, y: 0.2500 }, { x: -0.9800, y: -0.2500 }, { x: -0.9000, y: -0.3000 }],
                fillColor: [50, 45, 40]
            },
            // Port nav light (red)
            {
                vertexData: [{ x: 0.7500, y: 0.7700 }, { x: 0.6900, y: 0.7400 }, { x: 0.7300, y: 0.7000 }],
                fillColor: [255, 50, 50]
            },
            // Starboard nav light (green)
            {
                vertexData: [{ x: 0.7500, y: -0.7700 }, { x: 0.6900, y: -0.7400 }, { x: 0.7300, y: -0.7000 }],
                fillColor: [50, 255, 50]
            },
            // Stern running light
            {
                vertexData: [{ x: -0.9800, y: 0.0400 }, { x: -1.0200, y: 0.0000 }, { x: -0.9800, y: -0.0400 }],
                fillColor: [255, 255, 200]
            },
            // Wide-load warning lights (top corners)
            {
                vertexData: [{ x: 0.8500, y: 0.7700 }, { x: 0.8200, y: 0.7900 }, { x: 0.7900, y: 0.7700 }],
                fillColor: [255, 200, 50]
            },
            {
                vertexData: [{ x: 0.8500, y: -0.7700 }, { x: 0.8200, y: -0.7900 }, { x: 0.7900, y: -0.7700 }],
                fillColor: [255, 200, 50]
            }
        ],
        typicalCargo: ["Machinery", "Metals", "Chemicals"],
        price: 22000,
        aiRoles: ["TRANSPORT"],
        faction: "",
        techLevel: 2,
    },

    // --- SUPPORT & REPAIR ---
    "FieldRepairTender": {
        name: "Field Repair Tender", role: "Support/Repair", upgrades: [], sizeCategory: "Medium", size: 90,
        baseMaxSpeed: 2, baseThrust: 0.04, baseTurnRate: 0.03491,
        baseHull: 420, baseShield: 180, shieldRecharge: 1.2, cargoCapacity: 80,
        armament: ["Barrier Field"],
        costCategory: "Medium", description: "Lumbering repair tender with 420 hull because when you're fixing battle-damaged stations, you need to survive the crossfire. Moves at 2.0 speed, slower than some asteroids. Crews joke it's so slow enemies just ignore it. Equipped with industrial tools that double as improvised weapons. Has used them. Apologetically.",
        vertexLayers: [
            {
                vertexData: [{ x: 1.0349, y: 0.0340 }, { x: 0.8349, y: 0.5340 }, { x: 0.2349, y: 0.8340 }, { x: -0.6651, y: 0.7340 }, { x: -1.0349, y: 0.1572 }, { x: -0.9032, y: -0.2882 }, { x: -0.1422, y: 0.0072 }, { x: -0.0464, y: -0.1491 }, { x: -0.3288, y: -0.5737 }, { x: -0.2188, y: -0.7642 }, { x: 0.5021, y: -0.8340 }, { x: 0.6700, y: -0.5581 }, { x: 0.3358, y: -0.4722 }, { x: 0.4977, y: -0.1766 }, { x: 0.8438, y: -0.2974 }],
                fillColor: [200, 200, 190]
            },
            {
                vertexData: [{ x: 0.4795, y: 0.0499 }, { x: 0.9427, y: 0.0499 }, { x: 0.7901, y: -0.2000 }],
                fillColor: [159, 159, 208]
            }
        ],
        typicalCargo: ["Metals"],
        price: 38500,
        aiRoles: ["REPAIR"],
        faction: "",
        techLevel: 3
    },

    // --- ALIEN ---
    "GeometricDrone": {
        name: "Geometric Drone (Alien)", role: "Alien Scout?", upgrades: [], sizeCategory: "Tiny", size: 15,
        baseMaxSpeed: 9.0, baseThrust: 0.2, baseTurnRate: 0.13963,
        baseHull: 20, baseShield: 40, shieldRecharge: 1.5, cargoCapacity: 0,
        armament: ["Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Small, fast, rotating alien drone. Unknown purpose.",
        vertexData: [{ x: 1, y: 0 }, { x: 0.5, y: 0.87 }, { x: -0.5, y: 0.87 }, { x: -1, y: 0 }, { x: -0.5, y: -0.87 }, { x: 0.5, y: -0.87 }], // Regular Hexagon
        fillColor: [50, 50, 60], // Dark metallic, light stroke
        typicalCargo: [],
        price: 999999,
        aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge
    },
    "TriadProbe": {
        name: "Triad Probe (Alien)",
        role: "Alien Scout", upgrades: [],
        sizeCategory: "Tiny",
        size: 16,
        baseMaxSpeed: 9.0, baseThrust: 0.25, baseTurnRate: 0.15,
        baseHull: 25, baseShield: 30, shieldRecharge: 1.0, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Three-lobed alien probe, fast and evasive.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.5, y: 0.5 }, { x: 1.0, y: 0.0 }, { x: 0.5, y: -0.5 }, { x: 0.0, y: -1.0 }, { x: -0.5, y: -0.5 }, { x: -1.0, y: 0.0 }, { x: -0.5, y: 0.5 }], fillColor: [200, 255, 180] },
            { vertexData: [{ x: 0.0, y: 0.3 }, { x: 0.2, y: 0.0 }, { x: 0.0, y: -0.3 }, { x: -0.2, y: 0.0 }], fillColor: [255, 255, 100] }
        ],
        typicalCargo: [],
        price: 999999,
        aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge
    },
    "TesseractScout": {
        name: "Tesseract Scout (Alien)", role: "Alien Recon", upgrades: [], sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 10.0, baseThrust: 0.25, baseTurnRate: 0.15,
        baseHull: 25, baseShield: 30, shieldRecharge: 1.0, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien scout with a shifting, four-dimensional shape.",
        vertexLayers: [
            { vertexData: [{ x: 1.0, y: 1.0 }, { x: 1.0, y: -1.0 }, { x: -1.0, y: -1.0 }, { x: -1.0, y: 1.0 }], fillColor: [200, 255, 255] },
            { vertexData: [{ x: 0.0, y: 0.7 }, { x: 0.7, y: 0.0 }, { x: 0.0, y: -0.7 }, { x: -0.7, y: 0.0 }], fillColor: [0, 255, 255] }
        ],
        typicalCargo: [],
        price: 999999,
        aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge
    },
    "PetalSpinner": {
        name: "Petal Spinner (Alien)", role: "Alien Fighter", upgrades: [], sizeCategory: "Small", size: 26,
        baseMaxSpeed: 8.2, baseThrust: 0.21, baseTurnRate: 0.12,
        baseHull: 55, baseShield: 70, shieldRecharge: 1.5, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with spinning, flower-like petals.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.5, y: 0.5 }, { x: 1.0, y: 0.0 }, { x: 0.5, y: -0.5 }, { x: 0.0, y: -1.0 }, { x: -0.5, y: -0.5 }, { x: -1.0, y: 0.0 }, { x: -0.5, y: 0.5 }], fillColor: [255, 180, 255] },
            { vertexData: [{ x: 0.0, y: 0.2 }, { x: 0.1, y: 0.0 }, { x: 0.0, y: -0.2 }, { x: -0.1, y: 0.0 }], fillColor: [255, 100, 255] }
        ],
        typicalCargo: [],
        price: 999999,
        aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge
    },
    "SpiralWarden": {
        name: "Spiral Warden (Alien)", role: "Alien Interceptor", upgrades: [], sizeCategory: "Small", size: 28,
        baseMaxSpeed: 8.0, baseThrust: 0.19, baseTurnRate: 0.11,
        baseHull: 60, baseShield: 90, shieldRecharge: 1.7, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with spiral, shell-like armor.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.7, y: 0.7 }, { x: 1.0, y: 0.0 }, { x: 0.7, y: -0.7 }, { x: 0.0, y: -1.0 }, { x: -0.7, y: -0.7 }, { x: -1.0, y: 0.0 }, { x: -0.7, y: 0.7 }], fillColor: [180, 255, 220] },
            { vertexData: [{ x: 0.0, y: 0.5 }, { x: 0.35, y: 0.35 }, { x: 0.5, y: 0.0 }, { x: 0.35, y: -0.35 }, { x: 0.0, y: -0.5 }, { x: -0.35, y: -0.35 }, { x: -0.5, y: 0.0 }, { x: -0.35, y: 0.35 }], fillColor: [100, 255, 200] }
        ],
        typicalCargo: ["Chemicals"], price: 999999, aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge
    },
    "CrescentMarauder": {
        name: "Crescent Marauder (Alien)", role: "Alien Raider", upgrades: [], sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 7.5, baseThrust: 0.16, baseTurnRate: 0.10,
        baseHull: 100, baseShield: 120, shieldRecharge: 1.8, cargoCapacity: 10,
        armament: ["Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with a crescent, blade-like hull.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.8, y: 0.3 }, { x: 1.0, y: 0.0 }, { x: 0.8, y: -0.3 }, { x: 0.0, y: -1.0 }, { x: -0.8, y: -0.3 }, { x: -1.0, y: 0.0 }, { x: -0.8, y: 0.3 }], fillColor: [180, 255, 255] },
            { vertexData: [{ x: 0.0, y: 0.7 }, { x: 0.56, y: 0.21 }, { x: 0.7, y: 0.0 }, { x: 0.56, y: -0.21 }, { x: 0.0, y: -0.7 }, { x: -0.56, y: -0.21 }, { x: -0.7, y: 0.0 }, { x: -0.56, y: 0.21 }], fillColor: [0, 255, 255] }
        ],
        typicalCargo: ["Narcotics", "Chemicals"], price: 999999, aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge
    },
    "ObeliskSentinel": {
        name: "Obelisk Sentinel (Alien)", role: "Alien Guardian", upgrades: [], sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 6.2, baseThrust: 0.13, baseTurnRate: 0.075,
        baseHull: 120, baseShield: 180, shieldRecharge: 2.0, cargoCapacity: 0,
        armament: ["Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Tall, monolithic alien ship with layered crystal armor.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.0000, y: 1.1037 }, { x: 0.4791, y: 0.7567 }, { x: 0.4276, y: 0.0000 }, { x: 0.4791, y: -0.7567 }, { x: 0.0000, y: -1.1037 }, { x: -0.4937, y: -0.7636 }, { x: -0.4276, y: 0.0000 }, { x: -0.4937, y: 0.7636 }],
                fillColor: [60, 255, 180],
            },
            {
                vertexData: [{ x: 0.9369, y: 0.0000 }, { x: 0.6113, y: -0.1659 }, { x: -0.9369, y: 0.0000 }, { x: 0.6113, y: 0.1659 }],
                fillColor: [0, 255, 120],
            }
        ],
        typicalCargo: ["Chemicals", "Metals"], price: 999999, aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge
    },
    "HexaManta": {
        name: "Hexa-Manta (Alien)", role: "Alien Cruiser", upgrades: [], sizeCategory: "Large", size: 70,
        baseMaxSpeed: 6.0, baseThrust: 0.12, baseTurnRate: 0.07,
        baseHull: 220, baseShield: 320, shieldRecharge: 2.2, cargoCapacity: 30,
        armament: ["Disruptor", "Force Blaster"],
        costCategory: "N/A", description: "Wide, six-winged alien ship with layered fins.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.8, y: 0.6 }, { x: 1.0, y: 0.0 }, { x: 0.8, y: -0.6 }, { x: 0.0, y: -1.0 }, { x: -0.8, y: -0.6 }, { x: -1.0, y: 0.0 }, { x: -0.8, y: 0.6 }], fillColor: [0, 255, 180] },
            { vertexData: [{ x: 0.0, y: 0.7 }, { x: 0.42, y: 0.56 }, { x: 0.7, y: 0.0 }, { x: 0.42, y: -0.56 }, { x: 0.0, y: -0.7 }, { x: -0.42, y: -0.56 }, { x: -0.7, y: 0.0 }, { x: -0.42, y: 0.56 }], fillColor: [255, 100, 255] },
            { vertexData: [{ x: 0.0, y: 0.3 }, { x: 0.21, y: 0.21 }, { x: 0.3, y: 0.0 }, { x: 0.21, y: -0.21 }, { x: 0.0, y: -0.3 }, { x: -0.21, y: -0.21 }, { x: -0.3, y: 0.0 }, { x: -0.21, y: 0.21 }], fillColor: [255, 255, 255] }
        ],
        typicalCargo: ["Metals", "Chemicals"], price: 999999, aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge    
    },
    "FractalRay": {
        name: "Fractal Ray (Alien)", role: "Alien Destroyer", upgrades: [], sizeCategory: "Large", size: 85,
        baseMaxSpeed: 7.0, baseThrust: 0.15, baseTurnRate: 0.09,
        baseHull: 260, baseShield: 350, shieldRecharge: 2.5, cargoCapacity: 40,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with fractal, lightning-like arms.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.5, y: 0.5 }, { x: 1.0, y: 0.0 }, { x: 0.5, y: -0.5 }, { x: 0.0, y: -1.0 }, { x: -0.5, y: -0.5 }, { x: -1.0, y: 0.0 }, { x: -0.5, y: 0.5 }], fillColor: [255, 255, 180] },
            { vertexData: [{ x: 0.0, y: 0.3 }, { x: 0.2, y: 0.0 }, { x: 0.0, y: -0.3 }, { x: -0.2, y: 0.0 }], fillColor: [255, 255, 100] }
        ],
        typicalCargo: ["Weapons", "Chemicals"], price: 999999, aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge        
    },
    "ObsidianOrb": {
        name: "Obsidian Orb (Alien)", role: "Alien Tank", upgrades: [], sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.5, baseThrust: 0.09, baseTurnRate: 0.05,
        baseHull: 400, baseShield: 500, shieldRecharge: 3.0, cargoCapacity: 60,
        armament: ["Force Blaster", "Disruptor"],
        costCategory: "N/A", description: "Massive, spherical alien ship with layered crystalline armor.",
        vertexLayers: [
            // Outer shell - large dark obsidian octagon
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.7, y: 0.7 }, { x: 1.0, y: 0.0 }, { x: 0.7, y: -0.7 }, { x: 0.0, y: -1.0 }, { x: -0.7, y: -0.7 }, { x: -1.0, y: 0.0 }, { x: -0.7, y: 0.7 }], fillColor: [25, 20, 35] },
            // Crystal facets - diamond shapes at cardinal points
            { vertexData: [{ x: 0.0, y: 0.85 }, { x: 0.12, y: 0.70 }, { x: 0.0, y: 0.55 }, { x: -0.12, y: 0.70 }], fillColor: [60, 45, 80] },
            { vertexData: [{ x: 0.85, y: 0.0 }, { x: 0.70, y: 0.12 }, { x: 0.55, y: 0.0 }, { x: 0.70, y: -0.12 }], fillColor: [60, 45, 80] },
            { vertexData: [{ x: 0.0, y: -0.85 }, { x: 0.12, y: -0.70 }, { x: 0.0, y: -0.55 }, { x: -0.12, y: -0.70 }], fillColor: [60, 45, 80] },
            { vertexData: [{ x: -0.85, y: 0.0 }, { x: -0.70, y: 0.12 }, { x: -0.55, y: 0.0 }, { x: -0.70, y: -0.12 }], fillColor: [60, 45, 80] },
            // Mid layer - smaller octagon with purple tint
            { vertexData: [{ x: 0.0, y: 0.65 }, { x: 0.46, y: 0.46 }, { x: 0.65, y: 0.0 }, { x: 0.46, y: -0.46 }, { x: 0.0, y: -0.65 }, { x: -0.46, y: -0.46 }, { x: -0.65, y: 0.0 }, { x: -0.46, y: 0.46 }], fillColor: [45, 35, 65] },
            // Inner ring - violet accents
            { vertexData: [{ x: 0.0, y: 0.42 }, { x: 0.30, y: 0.30 }, { x: 0.42, y: 0.0 }, { x: 0.30, y: -0.30 }, { x: 0.0, y: -0.42 }, { x: -0.30, y: -0.30 }, { x: -0.42, y: 0.0 }, { x: -0.30, y: 0.30 }], fillColor: [80, 50, 120] },
            // Core segments - bright crystalline center (12-sided)
            {
                vertexData: [
                    { x: 0.0, y: 0.25 }, { x: 0.13, y: 0.22 }, { x: 0.22, y: 0.13 }, { x: 0.25, y: 0.0 },
                    { x: 0.22, y: -0.13 }, { x: 0.13, y: -0.22 }, { x: 0.0, y: -0.25 }, { x: -0.13, y: -0.22 },
                    { x: -0.22, y: -0.13 }, { x: -0.25, y: 0.0 }, { x: -0.22, y: 0.13 }, { x: -0.13, y: 0.22 }
                ], fillColor: [120, 80, 180]
            }
        ],
        typicalCargo: ["Metals", "Weapons"], price: 999999, aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Cutting-edge    
    },
    "BioFrigate": {
        name: "Bio-Frigate (Alien)", role: "Alien Cruiser", upgrades: [], sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.0, baseThrust: 0.1, baseTurnRate: 0.03491,
        baseHull: 500, baseShield: 250, shieldRecharge: 2.5,
        armament: ["Force Blaster", "Disruptor", "Barrier Field"],
        costCategory: "N/A", description: "Large, organic alien vessel. Slow but durable.",
        vertexLayers: [
            {
                vertexData: [{ x: 0.9619, y: 0.0000 }, { x: 0.5195, y: 0.6500 }, { x: 0.1625, y: 0.7625 }, { x: -0.1625, y: 0.7625 }, { x: -0.5195, y: 0.6500 }, { x: -0.7517, y: 0.4402 }, { x: -0.9000, y: 0.2000 }, { x: -0.9619, y: 0.0000 }, { x: -0.9000, y: -0.2000 }, { x: -0.7517, y: -0.4402 }, { x: -0.5386, y: -0.6424 }, { x: -0.1701, y: -0.7854 }, { x: 0.1701, y: -0.7854 }, { x: 0.5386, y: -0.6424 }],
                fillColor: [80, 140, 100],
            },
            {
                vertexData: [{ x: 0.0000, y: -0.5162 }, { x: 0.3110, y: -0.1819 }, { x: 0.9574, y: 0.0000 }, { x: 0.3110, y: 0.1819 }, { x: 0.0000, y: 0.5162 }, { x: -0.3857, y: 0.0000 }],
                fillColor: [230, 61, 120],
            }
        ],
        typicalCargo: ["Metals", "Chemicals", "Adv Components"],
        price: 999999,
        aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Alien
    },
    "Thargoid": {
        name: "Thargoid Interceptor", role: "Alien Combat", upgrades: [], sizeCategory: "Large", size: 60,
        baseMaxSpeed: 8.0, baseThrust: 0.20, baseTurnRate: 0.10472,
        baseHull: 200, baseShield: 300, shieldRecharge: 2.0, cargoCapacity: 0,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam"], // Alien arsenal
        costCategory: "N/A", description: "Hostile alien murder-flower from the void that considers humanity a fascinating pest problem. Hits 8.0 speed while regenerating shields faster than you can damage them. Conventional weapons bounce off its incomprehensible hull. Intelligence suggests talking doesn't work. Intelligence is correct. Run or die. Preferably run then die anyway.",
        vertexData: [], // Not editable via vertex data in this setup
        typicalCargo: ["Chemicals", "Weapons", "Narcotics"],
        price: 999999,
        aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Alien
    },
    "LotusCarrier": {
        name: "Lotus Carrier (Alien)", role: "Alien Carrier", upgrades: [], sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRate: 0.025,
        baseHull: 800, baseShield: 900, shieldRecharge: 4.0, cargoCapacity: 200,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam", "Halo"],
        costCategory: "N/A", description: "Enormous alien carrier with layered, lotus-like petals.",
        vertexLayers: [
            { vertexData: [{ x: 0.0, y: 1.0 }, { x: 0.6, y: 0.8 }, { x: 1.0, y: 0.0 }, { x: 0.6, y: -0.8 }, { x: 0.0, y: -1.0 }, { x: -0.6, y: -0.8 }, { x: -1.0, y: 0.0 }, { x: -0.6, y: 0.8 }], fillColor: [255, 200, 255] },
            { vertexData: [{ x: 0.0, y: 0.7 }, { x: 0.42, y: 0.56 }, { x: 0.7, y: 0.0 }, { x: 0.42, y: -0.56 }, { x: 0.0, y: -0.7 }, { x: -0.42, y: -0.56 }, { x: -0.7, y: 0.0 }, { x: -0.42, y: 0.56 }], fillColor: [255, 100, 255] },
            { vertexData: [{ x: 0.0, y: 0.3 }, { x: 0.21, y: 0.21 }, { x: 0.3, y: 0.0 }, { x: 0.21, y: -0.21 }, { x: 0.0, y: -0.3 }, { x: -0.21, y: -0.21 }, { x: -0.3, y: 0.0 }, { x: -0.21, y: 0.21 }], fillColor: [255, 255, 255] }
        ],
        fillColor: [255, 200, 255],
        typicalCargo: ["Luxury Goods", "Chemicals", "Metals"],
        price: 999999,
        aiRoles: ["ALIEN"],
        faction: "ALIEN",
        techLevel: 5 // Alien
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
        layers: [],
        collisionHull: null  // Pre-computed collision polygon for accurate collision detection
    };

    let layers = def.vertexLayers || [{
        vertexData: def.vertexData,
        fillColor: def.fillColor,
    }];

    // Cache first layer vertices as collision hull (main ship outline)
    // IMPORTANT: Deep copy vertices to avoid corruption if original vertexData is modified
    if (layers.length > 0 && layers[0].vertexData && layers[0].vertexData.length >= 3) {
        def._cache.collisionHull = layers[0].vertexData.map(v => ({ x: v.x, y: v.y }));
    }

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
            let fillRGB = { r: red(cFill), g: green(cFill), b: blue(cFill) };

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
                fillRGB,
                highlightStr, mainFillStr, darkFillStr,
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
    const now = millis();
    let pulse = 1.0 + sin(now * 0.006) * 0.05;
    let rotSpeed = now * 0.0012;

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
            highlightStr: 'rgb(120, 200, 120)',
            mainFillStr: 'rgb(80, 160, 80)',
            darkFillStr: 'rgb(60, 120, 60)',
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
    let t = millis() * 0.003;
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
    let rotAngle = millis() * 0.0018;

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
    let rotAngle = millis() * 0.0006;

    push();
    rotate(rotAngle);

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Glowing Runes overlay
    stroke(255, 255, 255, 150 + sin(millis() * 0.006) * 100);
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
    let rotAngle = millis() * -0.003;

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
    let rotAngle = millis() * 0.003;

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
    ellipse(0, 0, r * 0.25 * (1 + sin(millis() * 0.012) * 0.2));
}

function drawHexaManta(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.HexaManta;
    let wave = sin(millis() * 0.006) * 0.05;
    let rotAngle = millis() * 0.00048;

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
    let rotAngle = millis() * 0.00072;

    // Jittery movement
    push();
    rotate(rotAngle);
    translate(random(-1, 1), random(-1, 1));

    // Draw 3D base shape with counter-rotated extrusion
    drawGenericAlienShip(def, s, thrusting, rotAngle, localSunAngle);

    // Lightning arcs overlay (probability-based, ~12 per second)
    if (random() < 0.2) {
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
    let rotAngle = millis() * 0.009; // Fast spin

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
    let rotAngle = millis() * 0.0012;

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
    const now = millis();
    let t = now * 0.003;

    // Slow counter-rotating layers
    let outerRotAngle = now * 0.0003;
    let innerRotAngle = now * -0.00048;

    // Pulsing effects
    let corePulse = 1.0 + sin(t * 0.8) * 0.15;
    let ringPulse = sin(t * 1.2) * 0.5 + 0.5;

    // 1. Draw 3D Armor Base (from vertex definition)
    push();
    rotate(outerRotAngle);
    // Draw base deeper to sit under the orb
    drawGenericAlienShip(def, s, thrusting, outerRotAngle, localSunAngle);
    pop();

    // 2. 3D Energy Rings (Orbiting the orb)
    // Outer ring - violet glow
    let ringCol1 = color(120, 80, 200, 160 + ringPulse * 90);
    Draw3D.drawRing3D(0, 0, r * 1.2, r * 1.1, 32, s * 0.05, ringCol1, angle, localSunAngle, innerRotAngle);

    // Mid ring - purple
    let ringCol2 = color(100, 60, 180, 140 + ringPulse * 80);
    // Tilted ring effect by using different radii or rotation? 
    // drawRing3D supports 'shapeRotation'. To tilt, we'd need a different primitive or just offset.
    // For now, concentric flat rings at different depths looks good in this style.
    Draw3D.drawRing3D(0, 0, r * 0.9, r * 0.8, 24, s * 0.1, ringCol2, angle, localSunAngle, outerRotAngle);

    // 3. Central Obsidian Dome (The Orb)
    // Draw a dark, shiny globe
    let orbColor = color(40, 30, 60); // Dark obsidian base
    // Pulse size slightly
    let orbSize = r * 0.7 * corePulse;

    // Draw Dome
    // Use 'angle' for extrusion direction to match ship orientation
    Draw3D.drawDome(0, 0, orbSize, 16, orbColor, angle, localSunAngle);

    // 4. Inner Crystalline Glow (smaller dome on top or just visual bloom)
    let glowColor = color(180, 120, 255, 100);
    Draw3D.drawDome(0, 0, orbSize * 0.6, 12, glowColor, angle, localSunAngle);

    // 5. Rotating energy field (wireframe sphere effect using rings?)
    push();
    rotate(innerRotAngle);
    strokeWeight(1);
    noFill();
    for (let i = 0; i < 3; i++) {
        let offset = i * TWO_PI / 3;
        let radius = r * 0.8; // Larger than orb
        stroke(150, 100, 255, 60);
        // Draw simple 2D ellipses as "orbiting electron" style paths around the 3D orb
        let orbX = cos(offset) * radius * 0.3;
        let orbY = sin(offset) * radius * 0.3;
        ellipse(orbX, orbY, r * 0.5, r * 0.2);
    }
    pop();
}

function drawTesseractScout(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.TesseractScout;
    let rotAngle = millis() * 0.0018;

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
    rotate(millis() * -0.0024);
    rect(0, 0, size * 0.7, size * 0.7);
    pop();
    pop();
}

function drawLotusCarrier(s, thrusting = false, angle = 0, localSunAngle = -0.785) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.LotusCarrier;
    const now = millis();
    let pulse = 1.0 + sin(now * 0.0048) * 0.05; // Large slow pulse
    let rotSpeed = now * 0.0006;

    // Draw 3D base using generated petal shape
    if (!def._cache) initShipCache(def);
    if (!def._lotusCache) {
        // Create dynamic star/petal shape (Pink Thargoid)
        let petals = 8;
        let verts = [];
        for (let i = 0; i < petals * 2; i++) {
            let a = (i / (petals * 2)) * TWO_PI;
            let rad = (i % 2 === 0) ? 1.0 : 0.4;
            verts.push({ x: cos(a) * rad, y: sin(a) * rad });
        }
        def._lotusCache = {
            vertexData: verts,
            minX: -1, maxX: 1, xRange: 2,
            fillRGB: { r: 255, g: 100, b: 180 }, // Hot Pink
            highlightStr: 'rgb(255, 160, 220)',
            mainFillStr: 'rgb(255, 100, 180)',
            darkFillStr: 'rgb(180, 60, 120)',
            edges: []
        };
        // Build edges
        for (let i = 0; i < verts.length; i++) {
            const next = (i + 1) % verts.length;
            def._lotusCache.edges.push({
                v1: verts[i], v2: verts[next],
                dx: verts[next].x - verts[i].x,
                dy: verts[next].y - verts[i].y,
                t1: 0.5, t2: 0.5 // uniform depth
            });
        }
    }

    let depth = s * 0.22; // Quite thick
    const worldDownAngle = rotSpeed;

    push();
    rotate(rotSpeed);
    // Draw 3D shape with counter-rotated extrusion
    drawExtrudedPolySymmetric(r * pulse, def._lotusCache, depth, worldDownAngle, localSunAngle, 0, 'both');
    pop();

    // Central Eye (Bright)
    fill(255, 255, 255);
    noStroke();
    ellipse(0, 0, r * 0.25);
    fill(255, 200, 50); // Gold center
    ellipse(0, 0, r * 0.12);
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

    // 3D depth angle - pass ship's angle so extrusion goes world-space down
    let depthAngle = angle;

    // --- Large Scanner Dome at widest part of ship ---
    let dishCol = color(150, 165, 200);
    Draw3D.drawDome(-r * 0.5, 0, r * 0.35, 12, dishCol, depthAngle, localSunAngle, true);
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
