// ****** shipUpgrades.js ******
// Definitions for ship upgrades (Armor, Engine, Cargo, Hardpoints, Shield, Cloak).
// These upgrades are ship-specific and reset when changing ships.

const SHIP_UPGRADES = [
    // -----------------------------
    // Armor Upgrades (Hull)
    // -----------------------------
    {
        type: "armor",
        level: 1,
        name: "Faulcon DeLacy Composite",
        price: 2500,
        hullBonus: 40,
        desc: "Reinforced composite plating used in standard Faulcon DeLacy security vessels. Reliable protection for everyday hazards."
    },
    {
        type: "armor",
        level: 2,
        name: "Core Dynamics Reactive Plates",
        price: 8500,
        hullBonus: 100,
        desc: "Advanced reactive armor that partially dissipates kinetic impact. Standard issue for Core Dynamics gunships."
    },
    {
        type: "armor",
        level: 3,
        name: "Vodel Military Grade",
        price: 22000,
        hullBonus: 200,
        desc: "Heavily classified military plating utilizing dense bonded alloys. Turns your ship into a flying tank."
    },

    // -----------------------------
    // Engine Upgrades (Speed/Thrust)
    // -----------------------------
    {
        type: "engine",
        level: 1,
        name: "Sirius Efficiency Drive",
        price: 3200,
        speedMultiplier: 1.15, // +15%
        thrustMultiplier: 1.10, // +10%
        desc: "Tuned drive systems from Sirius Corp, optimizing fuel flow for better cruising speeds."
    },
    {
        type: "engine",
        level: 2,
        name: "Gutamaya Performance Thrusters",
        price: 12000,
        speedMultiplier: 1.30, // +30%
        thrustMultiplier: 1.25, // +25%
        desc: "High-performance thrusters designed for Imperial couriers. Exceptional straight-line speed."
    },
    {
        type: "engine",
        level: 3,
        name: "Achilles Overdrive Injectors",
        price: 35000,
        speedMultiplier: 1.50, // +50%
        thrustMultiplier: 1.40, // +40%
        desc: "Experimental injection system pushing drive mechanics to their absolute limit. Screaming fast."
    },

    // -----------------------------
    // Cargo Upgrades (Capacity)
    // -----------------------------
    {
        type: "cargo",
        level: 1,
        name: "Lakon High-Capacity Rack",
        price: 1500,
        cargoBonus: 10,
        desc: "Standard modular racking system efficiently utilizing internal space. A staple for independent traders."
    },
    {
        type: "cargo",
        level: 2,
        name: "Kruger Compression Hold",
        price: 6000,
        cargoBonus: 25,
        desc: "Pressurized cargo containment allowing for higher density storage. Saud Kruger luxury engineering applied to logistics."
    },
    {
        type: "cargo",
        level: 3,
        name: "Zorgon Peterson Cargo Optimization",
        price: 18000,
        cargoBonus: 50,
        desc: "Complete internal refit stripping non-essential bulkheads to maximize payload volume. Maximum profit per trip."
    },

    // -----------------------------
    // Hardpoint Upgrades (Weapon Slots)
    // -----------------------------
    {
        type: "hardpoints",
        level: 1,
        name: "Manticore Auxiliary Mount",
        price: 15000,
        bonusSlots: 1,
        desc: "External weapon mounting point grafted onto the hull. Allows for one additional light weapon system."
    },
    {
        type: "hardpoints",
        level: 2,
        name: "Remlock Sponson Extender",
        price: 45000,
        bonusSlots: 2,
        desc: "Extended weapon sponsons providing mounting points for two additional weapon arrays."
    },
    {
        type: "hardpoints",
        level: 3,
        name: "Mastopolos Weapon Array",
        price: 120000,
        bonusSlots: 3,
        desc: "Total offensive overhaul integrating three additional hardpoints. Turns any ship into a heavy gunboat."
    },
    // -----------------------------
    // Shield Upgrades (Max Shield)
    // -----------------------------
    {
        type: "shield",
        level: 1,
        name: "Supratech Shield Booster",
        price: 5000,
        shieldBonus: 50,
        desc: "Entry-level shield generator booster. Increases maximum shield capacity by 50 units."
    },
    {
        type: "shield",
        level: 2,
        name: "Aegis Systems Deflector",
        price: 15000,
        shieldBonus: 100,
        desc: "Advanced deflector screen technology. Increases maximum shield capacity by 100 units."
    },
    {
        type: "shield",
        level: 3,
        name: "Prismatic Shield Generator",
        price: 40000,
        shieldBonus: 200,
        desc: "Top-tier prismatic shield technology. Increases maximum shield capacity by 200 units."
    },

    // -----------------------------
    // Cloaking Device Upgrades
    // -----------------------------
    {
        type: "cloak",
        level: 1,
        name: "Stealth Field Mark I",
        price: 8000,
        cloakDuration: 8,      // seconds
        cloakCooldown: 45,     // seconds
        desc: "Basic cloaking technology that bends light around your ship. Short duration but effective for evasive maneuvers."
    },
    {
        type: "cloak",
        level: 2,
        name: "Shadow Matrix",
        price: 22000,
        cloakDuration: 15,     // seconds
        cloakCooldown: 35,     // seconds
        desc: "Advanced cloaking system with improved duration. Used by elite reconnaissance units."
    },
    {
        type: "cloak",
        level: 3,
        name: "Phantom Drive",
        price: 55000,
        cloakDuration: 25,     // seconds
        cloakCooldown: 25,     // seconds
        desc: "Military-grade phase shift technology. Complete invisibility with extended duration and rapid recharge."
    }
];
