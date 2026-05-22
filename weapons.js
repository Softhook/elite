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
        price: 1044,
        desc: "Standard-issue energy weapon found across the galaxy. Faulcon DeLacy's best-selling model for three centuries running."
    },
    {

        name: "Sniper Rail",
        type: "projectile",
        damage: 29,
        color: [200, 200, 255], // Pale blue
        fireRate: 0.75,
        price: 3594,
        desc: "Electromagnetic accelerator that trades fire rate for devastating penetration power. Preferred by bounty hunters who value the one-shot kill."
    },
    {
        name: "Heavy Cannon",
        type: "projectile",
        damage: 45,
        color: [180, 80, 80], // Brownish
        fireRate: 1.1,
        price: 4313,
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
        fireRate: 0.137,
        maxHeat: 1.0,
        heatPerShot: 0.12,
        heatDissipation: 0.35,
        heatRecoveryFactor: 0.3,
        price: 1193,
        desc: "Sustained coherent light projection derived from alien technology. Watch the heat gauge—overheating can be catastrophic."
    },
    {
        name: "Mining Laser",
        type: "beam",
        damage: 4,
        color: [255, 165, 0], // Orange
        fireRate: 0.14,
        maxHeat: 1.0,
        heatPerShot: 0.08, // More efficient than combat beam
        heatDissipation: 0.35,
        heatRecoveryFactor: 0.3,
        price: 1564,
        desc: "High-intensity industrial beam tuned for mineral extraction. Exceptionally effective against asteroids."
    },
    {
        name: "Scatter Beam",
        type: "beam",
        damage: 3,
        color: [255, 255, 180], // Pale yellow
        fireRate: 0.074,
        maxHeat: 1.0,
        heatPerShot: 0.08,
        heatDissipation: 0.42,
        heatRecoveryFactor: 0.28,
        price: 2199,
        desc: "High-frequency micro-pulse beam reverse-engineered from Thargoid weapons. Optimized for sustained fire with minimal heat."
    },
    {
        name: "Disruptor",
        type: "beam",
        damage: 6,
        color: [255, 0, 80], // Hot pink
        fireRate: 0.228,
        maxHeat: 1.1,
        heatPerShot: 0.18,
        heatDissipation: 0.32,
        heatRecoveryFactor: 0.35,
        price: 963,
        desc: "Specialized beam tuned to destabilize shield harmonics. Based on xeno-tech recovered from frontier conflicts."
    },

    // -----------------------------
    // Multi-Shot Parallel (Straight)
    // -----------------------------
    {
        name: "Twin Pulse",
        type: "straight2",
        damage: 5,
        color: [0, 180, 255], // Blue
        fireRate: 0.333,
        price: 510,
        desc: "Dual-barrel configuration providing improved hit probability. A Lakon Spaceways classic found on traders and fighters alike."
    },
    {
        name: "Triple Pulse",
        type: "straight3",
        damage: 7,
        color: [255, 0, 255], // Purple
        fireRate: 0.4,
        price: 825,
        desc: "Triple parallel emitters delivering concentrated firepower in a tight formation. Popular with escort pilots."
    },
    {
        name: "Quad Pulse",
        type: "straight4",
        damage: 8,
        color: [0, 255, 180], // Aqua
        fireRate: 0.5,
        price: 975,
        desc: "Four-barrel array creating a wall of plasma. Saud Kruger originally designed it for asteroid clearing."
    },

    // -----------------------------
    // Spread Weapons (2-way)
    // -----------------------------
    {
        name: "V Spread",
        type: "spread2",
        damage: 11,
        color: [255, 255, 0], // Yellow
        fireRate: 0.4,
        price: 2125,
        desc: "Diverging twin shots ideal for close-quarters engagements. Federation Navy standard issue for boarding defense."
    },
    {
        name: "V Punch",
        type: "spread2",
        damage: 17,
        color: [120, 120, 255], // Violet
        fireRate: 0.7,
        price: 1690,
        desc: "Heavy-hitting spread variant sacrificing fire rate for substantial damage per volley. Manticore Arms' signature design."
    },

    // -----------------------------
    // Spread Weapons (3-way)
    // -----------------------------
    {
        name: "Multi-Cannon",
        type: "spread3",
        damage: 7,
        color: [200, 200, 100], // Yellow
        fireRate: 0.284,
        price: 3450,
        desc: "Kinetic projectile weapon that bypasses shields effectively. Remlock manufactures these under exclusive military contract."
    },
    {
        name: "Burst Blaster",
        type: "spread3",
        damage: 5,
        color: [255, 100, 100], // Pinkish
        fireRate: 0.213,
        price: 2875,
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
        price: 1715,
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
        fireRate: 0.322,
        price: 2300,
        desc: "Five-way cone pattern maximizing hit probability. Devastatingly effective at close range."
    },

    // -----------------------------
    // Turret Weapons (Auto-aiming)
    // -----------------------------
    {
        name: "Mini-Turret",
        type: "turret",
        damage: 19,
        color: [80, 255, 80], // Light green
        fireRate: 0.7,
        price: 1844,
        desc: "Automated targeting system that tracks and engages hostiles independently. Whatt and Pritney's entry-level turret."
    },
    {
        name: "Railgun Turret",
        type: "turret",
        damage: 40,
        color: [255, 80, 255], // Magenta
        fireRate: 1.109,
        price: 6469,
        desc: "Heavy auto-tracking railgun mounting. Expensive, but Vodel's precision engineering justifies every credit."
    },

    // -----------------------------
    // Special Weapons
    // -----------------------------
    {
        name: "Force Blaster",
        type: "force",
        damage: 63,
        color: [255, 0, 0], // Red
        fireRate: 2,
        price: 26823,
        maxRadius: 300,
        desc: "Generates an expanding kinetic shockwave affecting all nearby vessels. Reverse-engineered from recovered alien artifacts."
    },
    {
        name: "Jedi Force",
        type: "force",
        damage: 81,
        color: [255, 255, 0], // Purple
        fireRate: 2.3,
        price: 58363,
        maxRadius: 750,
        desc: "Advanced force projection technology with extended range and devastating power. Derived from Thargoid weapon systems."
    },
    // -----------------------------
    // Missile Weapons
    // -----------------------------
    {
        name: "Loiter Munition",
        type: "missile",
        damage: 111,
        color: [0, 255, 255],
        projectileSize: 7,
        fireRate: 5.0,         // Long reload
        price: 1800,
        speed: 2,              // Missile projectile speed
        turnRate: 0.3,        // How sharply it can turn (radians per update step, adjust based on deltaTime scaling)
        lifespan: 400,         // Longer life to find target (frames or time units)
        missileHull: 30,       // Hull for destructible missiles
        desc: "Slow-moving guided munition with exceptional tracking capabilities. Nicknamed 'the patient hunter' by pilots."
    },
    {
        name: "Kalibr Missile",
        type: "missile",
        damage: 111,
        color: [255, 255, 255], // White
        projectileSize: 5,
        fireRate: 5.0,         // Long reload
        price: 1800,
        speed: 10,              // Missile projectile speed
        turnRate: 0.2,        // How sharply it can turn (radians per update step, adjust based on deltaTime scaling)
        lifespan: 400,         // Longer life to find target (frames or time units)
        missileHull: 30,       // Hull for destructible missiles
        desc: "High-velocity cruise missile offering minimal flight time to target. Based on old Earth naval designs."
    },
    {
        name: "Guardian Missile",
        type: "missile",
        damage: 73,
        color: [255, 150, 50], // Orange-ish
        projectileSize: 5,
        fireRate: 3.741,         // Long reload
        price: 1148,
        speed: 5,              // Missile projectile speed
        turnRate: 0.08,        // How sharply it can turn (radians per update step, adjust based on deltaTime scaling)
        lifespan: 240,         // Longer life to find target (frames or time units)
        missileHull: 10,       // Hull for destructible missiles
        desc: "Standard guided missile platform with balanced performance. Reliable Ramsay Industries engineering."
    },
    {
        name: "Avenger Missile",
        type: "missile",
        damage: 208,
        color: [255, 100, 100], // Reddish
        projectileSize: 5,
        fireRate: 7.0,          // Very long reload
        price: 2905,
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
        damage: 7,           // low direct damage
        color: [20, 200, 100], // Green
        fireRate: 0.451,       // Good firing rate (slightly faster)
        price: 1403,
        tangleDuration: 8.0, // Seconds target is affected by tangle
        dragMultiplier: 2.0, // Strong drag effect
        rotationBlockMultiplier: 0.1, // Severely reduces rotation speed
        projectileSize: 5,   // Medium projectile
        desc: "Projects energy tethers that restrict target movement and rotation. Used by police and military."
    },
    {
        name: "Harpoon Launcher",
        type: "harpoon",
        damage: 11,
        color: [180, 220, 255], // pale cyan
        fireRate: 1.338,
        price: 2678,
        projectileSize: 6,
        speed: 30,
        desc: "Magnetic grapple that creates a physical tether between ships. Derived from deep-space salvage equipment."
    },
    {
        name: "Heavy Tangle",
        type: "tangle",
        damage: 13,           //Direct damage
        color: [30, 240, 120], // Brighter green
        fireRate: 0.933,       // Slower firing rate
        price: 1403,
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
        damage: 144,
        blastRadius: 180,
        triggerRadius: 90,
        mineHealth: 40,
        color: [255, 50, 0], // Red-orange
        fireRate: 4.0,
        price: 3200,
        desc: "Enhanced mine variant with increased blast radius and improved damage output. Popular in pirate ambushes."
    },
    {
        name: "Heavy Mine",
        type: "mine",
        damage: 218,
        blastRadius: 250,
        triggerRadius: 150,
        mineHealth: 60,
        color: [200, 0, 0], // Dark red
        fireRate: 5.75,
        price: 6469,
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

// Matches exact multi-shot weapon type strings like "spread3" or "straight4" only.
// Group 1 is the pattern family, group 2 is projectile count.
const WEAPON_MULTI_SHOT_TYPE_REGEX = /^(straight|spread)(\d+)$/;
const DEFAULT_SIM_AIM_QUALITY = 0.78;
const BASE_TARGET_RADIUS = 18;
const RANGE_PENALTY_DIVISOR = 1200;
const MAX_RANGE_PENALTY = 0.75;
const SPEED_PENALTY_DIVISOR = 18;
const MAX_SPEED_PENALTY = 0.7;
const MAX_SIZE_BONUS = 0.35;
const MIN_SIZE_BONUS = -0.25;
const SIZE_BONUS_DIVISOR = 100;
const MIN_HIT_CHANCE = 0.05;
const MAX_HIT_CHANCE = 0.99;
const MAX_SPREAD_PELLET_BONUS = 0.7;
const SPREAD_PELLET_BONUS_SCALE = 0.18;
const MAX_SPREAD_MOVEMENT_BONUS = 0.45;
const SPREAD_MOVEMENT_BONUS_SCALE = 0.045;
const MAX_STRAIGHT_COVERAGE_BONUS = 0.3;
const STRAIGHT_COVERAGE_BONUS_SCALE = 0.08;
const DPS_RANK_WEIGHT = 0.75;
const VALUE_RANK_WEIGHT = 0.25;
const MIN_PRICE_SHIFT = -0.25;
const MAX_PRICE_SHIFT = 0.25;
const MIN_PRICE_RECOMMENDATION = 100;
const MIN_DAMAGE_MULTIPLIER = 0.8;
const MAX_DAMAGE_MULTIPLIER = 1.2;
const MAX_DAMAGE_ADJUSTMENT = 0.2;
const DAMAGE_ADJUSTMENT_SCALE = 0.3;
const VALUE_SCORE_SCALE = 1000;
const MIN_BALANCE_TOLERANCE = 0.05;
const DEFAULT_BALANCE_TOLERANCE = 0.22;
const BASE_FIRE_RATE_RECOMMENDATION = 0.5;
const MIN_FIRE_RATE_SHIFT = -0.18;
const MAX_FIRE_RATE_SHIFT = 0.25;
const MIN_RECOMMENDED_FIRE_RATE = 0.05;

function _clampNumber(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function _getWeaponBaseType(weaponType) {
    if (typeof weaponType !== 'string') return '';
    if (weaponType.startsWith('spread') || weaponType.startsWith('straight')) return 'projectile';
    return weaponType;
}

function getWeaponProjectileCount(weaponType) {
    const defaultProjectileCount = 1;
    if (typeof weaponType !== 'string') return defaultProjectileCount;
    const match = WEAPON_MULTI_SHOT_TYPE_REGEX.exec(weaponType);
    if (!match) return defaultProjectileCount;

    const parsedCount = parseInt(match[2], 10);
    return !Number.isNaN(parsedCount) && parsedCount > 0 ? parsedCount : defaultProjectileCount;
}

function _getSpreadCoverageMultiplier(weaponType, projectileCount, targetSpeed) {
    if (projectileCount <= 1) return 1;

    const clampedSpeed = Math.max(0, Number.isFinite(targetSpeed) ? targetSpeed : 0);
    if (weaponType.startsWith('spread')) {
        const pelletCoverageBonus = 1 + Math.min(MAX_SPREAD_PELLET_BONUS, (projectileCount - 1) * SPREAD_PELLET_BONUS_SCALE);
        const movementCoverageBonus = 1 + Math.min(MAX_SPREAD_MOVEMENT_BONUS, clampedSpeed * SPREAD_MOVEMENT_BONUS_SCALE);
        return pelletCoverageBonus * movementCoverageBonus;
    }

    if (weaponType.startsWith('straight')) {
        return 1 + Math.min(MAX_STRAIGHT_COVERAGE_BONUS, (projectileCount - 1) * STRAIGHT_COVERAGE_BONUS_SCALE);
    }

    return 1;
}

function _getBeamSustainMultiplier(weapon, baseShotsPerSecond) {
    if (_getWeaponBaseType(weapon?.type) !== 'beam') return 1;

    const maxHeat = Number.isFinite(weapon.maxHeat) && weapon.maxHeat > 0 ? weapon.maxHeat : 1;
    const heatPerShot = Number.isFinite(weapon.heatPerShot) && weapon.heatPerShot > 0 ? weapon.heatPerShot : 0;
    const heatDissipation = Number.isFinite(weapon.heatDissipation) && weapon.heatDissipation > 0 ? weapon.heatDissipation : 0;
    const heatRecoveryFactor = Number.isFinite(weapon.heatRecoveryFactor) ? weapon.heatRecoveryFactor : 0.3;
    if (heatPerShot <= 0 || baseShotsPerSecond <= 0) return 1;

    const heatAddedPerSecond = heatPerShot * baseShotsPerSecond;
    if (heatAddedPerSecond <= heatDissipation) return 1;

    const sustainableShotsPerSecond = heatDissipation / heatPerShot;
    const sustainRatio = _clampNumber(sustainableShotsPerSecond / baseShotsPerSecond, 0.1, 1);
    const recoveryModifier = _clampNumber(0.85 + heatRecoveryFactor * 0.3, 0.8, 1.15);
    const heatCapacityModifier = _clampNumber(0.8 + maxHeat * 0.25, 0.8, 1.2);
    return _clampNumber(sustainRatio * recoveryModifier * heatCapacityModifier, 0.1, 1);
}

function _getTypeUtilityMultiplier(weapon, options = {}) {
    const weaponType = _getWeaponBaseType(weapon?.type || '');

    if (weaponType === 'turret') {
        return 1.18;
    }

    if (weaponType === 'force') {
        const radiusNorm = _clampNumber((Number(weapon?.maxRadius) || 300) / 350, 0.6, 2);
        return _clampNumber(0.9 + radiusNorm * 0.25, 0.85, 1.4);
    }

    if (weaponType === 'missile') {
        const targetSpeed = _clampNumber(Number(options.targetSpeed) || 4, 0, 20);
        const turnRateNorm = _clampNumber((Number(weapon?.turnRate) || DEFAULT_WEAPON_CONFIG.MISSILE_TURN_RATE) / 0.15, 0.45, 2.2);
        const lifespanNorm = _clampNumber((Number(weapon?.lifespan) || DEFAULT_WEAPON_CONFIG.MISSILE_LIFESPAN) / 240, 0.6, 2.2);
        const hullNorm = _clampNumber((Number(weapon?.missileHull) || 20) / 20, 0.6, 2.5);
        const speed = Number(weapon?.speed) || DEFAULT_WEAPON_CONFIG.MISSILE_SPEED;
        const speedPenalty = _clampNumber(Math.max(0, targetSpeed - speed) * 0.05, 0, 0.35);
        return _clampNumber((0.72 + turnRateNorm * 0.2 + lifespanNorm * 0.08 + hullNorm * 0.05) * (1 - speedPenalty), 0.55, 1.45);
    }

    if (weaponType === 'mine') {
        const blastNorm = _clampNumber((Number(weapon?.blastRadius) || 140) / 160, 0.5, 2.2);
        const triggerNorm = _clampNumber((Number(weapon?.triggerRadius) || 70) / 90, 0.5, 2.2);
        const healthNorm = _clampNumber((Number(weapon?.mineHealth) || 25) / 35, 0.5, 2.2);
        return _clampNumber(0.72 + blastNorm * 0.15 + triggerNorm * 0.13 + healthNorm * 0.12, 0.6, 1.5);
    }

    if (weaponType === 'tangle') {
        const durationNorm = _clampNumber((Number(weapon?.tangleDuration) || 8) / 10, 0.4, 2.5);
        const dragNorm = _clampNumber((Number(weapon?.dragMultiplier) || 2) / 2, 0.5, 3.2);
        const rotationLockNorm = _clampNumber(0.1 / Math.max(0.01, Number(weapon?.rotationBlockMultiplier) || 0.1), 0.5, 3.2);
        return _clampNumber(0.5 + durationNorm * 0.16 + dragNorm * 0.12 + rotationLockNorm * 0.1, 0.55, 1.8);
    }

    if (weaponType === 'harpoon') {
        const speedNorm = _clampNumber((Number(weapon?.speed) || DEFAULT_WEAPON_CONFIG.HARPOON_SPEED) / 24, 0.6, 2);
        return _clampNumber(0.85 + speedNorm * 0.18, 0.75, 1.25);
    }

    return 1;
}

/**
 * Deterministic weapon simulation helper for balancing/ranking.
 * Models cooldown (fireRate), projectile count, spread utility against moving targets, and cost.
 */
function simulateWeaponPerformance(weapon, options = {}) {
    if (!weapon || typeof weapon !== 'object') {
        return {
            expectedDps: 0,
            expectedHitsPerShot: 0,
            projectileCount: 1,
            valueScore: 0,
            hitChance: 0
        };
    }

    const damage = Number.isFinite(weapon.damage) ? weapon.damage : 0;
    const fireRate = Number.isFinite(weapon.fireRate) && weapon.fireRate > 0 ? weapon.fireRate : Infinity;
    const price = Number.isFinite(weapon.price) && weapon.price > 0 ? weapon.price : 1;
    const targetSpeed = Number.isFinite(options.targetSpeed) ? options.targetSpeed : 4;
    const targetRadius = Number.isFinite(options.targetRadius) ? options.targetRadius : BASE_TARGET_RADIUS;
    const engagementRange = Number.isFinite(options.engagementRange) ? options.engagementRange : 320;
    const aimQuality = Number.isFinite(options.aimQuality) ? Math.min(1, Math.max(MIN_HIT_CHANCE, options.aimQuality)) : DEFAULT_SIM_AIM_QUALITY;

    const projectileCount = getWeaponProjectileCount(weapon.type);
    const rangePenalty = Math.min(MAX_RANGE_PENALTY, Math.max(0, engagementRange) / RANGE_PENALTY_DIVISOR);
    const speedPenalty = Math.min(MAX_SPEED_PENALTY, Math.max(0, targetSpeed) / SPEED_PENALTY_DIVISOR);
    const sizeBonus = Math.min(MAX_SIZE_BONUS, Math.max(MIN_SIZE_BONUS, (targetRadius - BASE_TARGET_RADIUS) / SIZE_BONUS_DIVISOR));
    const hitChance = Math.min(MAX_HIT_CHANCE, Math.max(MIN_HIT_CHANCE, (aimQuality + sizeBonus) * (1 - rangePenalty) * (1 - speedPenalty)));

    const spreadCoverage = _getSpreadCoverageMultiplier(weapon.type || '', projectileCount, targetSpeed);
    const expectedHitsPerShot = Math.min(projectileCount, Math.max(MIN_HIT_CHANCE, hitChance * spreadCoverage));
    const baseShotsPerSecond = Number.isFinite(fireRate) ? (1 / fireRate) : 0;
    const beamSustainMultiplier = _getBeamSustainMultiplier(weapon, baseShotsPerSecond);
    const shotsPerSecond = baseShotsPerSecond * beamSustainMultiplier;
    const typeUtilityMultiplier = _getTypeUtilityMultiplier(weapon, options);
    const expectedDps = damage * shotsPerSecond * expectedHitsPerShot * typeUtilityMultiplier;
    const valueScore = expectedDps / price * VALUE_SCORE_SCALE;

    return {
        expectedDps,
        expectedHitsPerShot,
        projectileCount,
        valueScore,
        hitChance,
        shotsPerSecond,
        typeUtilityMultiplier,
        beamSustainMultiplier
    };
}

function rankWeaponsBySimulation(weapons, options = {}) {
    const list = Array.isArray(weapons) ? weapons : [];

    return list
        .map((weapon) => {
            const simulation = simulateWeaponPerformance(weapon, options);
            const score = simulation.expectedDps * DPS_RANK_WEIGHT + simulation.valueScore * VALUE_RANK_WEIGHT;
            return { weapon, simulation, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function suggestWeaponBalanceChanges(weapons, options = {}) {
    const ranked = rankWeaponsBySimulation(weapons, options);
    if (ranked.length === 0) return [];

    const averageScore = ranked.reduce((sum, entry) => sum + entry.score, 0) / ranked.length;
    const tolerance = Number.isFinite(options.tolerance) ? Math.max(MIN_BALANCE_TOLERANCE, options.tolerance) : DEFAULT_BALANCE_TOLERANCE;

    return ranked
        .map((entry) => {
            if (!entry.weapon || !Number.isFinite(entry.weapon.price) || entry.weapon.price <= 0) return null;

            const scoreDeltaRatio = averageScore > 0 ? ((entry.score - averageScore) / averageScore) : 0;
            if (Math.abs(scoreDeltaRatio) <= tolerance) return null;

            const priceShift = Math.max(MIN_PRICE_SHIFT, Math.min(MAX_PRICE_SHIFT, scoreDeltaRatio));
            const recommendedPrice = Math.max(MIN_PRICE_RECOMMENDATION, Math.round(entry.weapon.price * (1 + priceShift)));
            const damageAdjustment = scoreDeltaRatio > 0
                ? Math.max(MIN_DAMAGE_MULTIPLIER, 1 - Math.min(MAX_DAMAGE_ADJUSTMENT, scoreDeltaRatio * DAMAGE_ADJUSTMENT_SCALE))
                : Math.min(MAX_DAMAGE_MULTIPLIER, 1 + Math.min(MAX_DAMAGE_ADJUSTMENT, Math.abs(scoreDeltaRatio) * DAMAGE_ADJUSTMENT_SCALE));
            const fireRateShift = scoreDeltaRatio > 0
                ? Math.min(MAX_FIRE_RATE_SHIFT, scoreDeltaRatio * 0.35)
                : -Math.min(Math.abs(MIN_FIRE_RATE_SHIFT), Math.abs(scoreDeltaRatio) * 0.25);
            const hasFireRate = Number.isFinite(entry.weapon.fireRate) && entry.weapon.fireRate > 0;
            const currentFireRate = hasFireRate ? entry.weapon.fireRate : BASE_FIRE_RATE_RECOMMENDATION;
            const suggestedFireRateMultiplier = hasFireRate
                ? _clampNumber(1 + fireRateShift, 1 + MIN_FIRE_RATE_SHIFT, 1 + MAX_FIRE_RATE_SHIFT)
                : 1;
            const recommendedFireRate = hasFireRate
                ? Math.max(MIN_RECOMMENDED_FIRE_RATE, Number((currentFireRate * suggestedFireRateMultiplier).toFixed(3)))
                : null;

            return {
                name: entry.weapon.name,
                rank: entry.rank,
                scoreDeltaRatio,
                recommendedPrice,
                suggestedDamageMultiplier: damageAdjustment,
                suggestedFireRateMultiplier,
                recommendedFireRate
            };
        })
        .filter(Boolean);
}

// Export for module systems and browsers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WEAPON_UPGRADES,
        DEFAULT_WEAPON_CONFIG,
        getWeaponProjectileCount,
        simulateWeaponPerformance,
        rankWeaponsBySimulation,
        suggestWeaponBalanceChanges
    };
    global.WEAPON_UPGRADES = WEAPON_UPGRADES;
    global.DEFAULT_WEAPON_CONFIG = DEFAULT_WEAPON_CONFIG;
    global.getWeaponProjectileCount = getWeaponProjectileCount;
    global.simulateWeaponPerformance = simulateWeaponPerformance;
    global.rankWeaponsBySimulation = rankWeaponsBySimulation;
    global.suggestWeaponBalanceChanges = suggestWeaponBalanceChanges;
} else if (typeof window !== 'undefined') {
    window.WEAPON_UPGRADES = WEAPON_UPGRADES;
    window.DEFAULT_WEAPON_CONFIG = DEFAULT_WEAPON_CONFIG;
    window.getWeaponProjectileCount = getWeaponProjectileCount;
    window.simulateWeaponPerformance = simulateWeaponPerformance;
    window.rankWeaponsBySimulation = rankWeaponsBySimulation;
    window.suggestWeaponBalanceChanges = suggestWeaponBalanceChanges;
}
