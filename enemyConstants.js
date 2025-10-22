// ****** enemyConstants.js ******
// Enemy AI Constants and Enums
// Extracted from enemy.js for better organization

// -------------------------
// --- AI Roles ---
// -------------------------

// Define AI Roles using a constant object for readability and maintainability
const AI_ROLE = {
    PIRATE: 'Pirate',
    POLICE: 'Police',
    HAULER: 'Hauler',
    TRANSPORT: 'Transport',  // local shuttles
    ALIEN: 'Alien',
    BOUNTY_HUNTER: 'BOUNTY_HUNTER',
    GUARD: 'Guard'
};

// -------------------------
// --- AI States ---
// -------------------------

// Define AI States (Shared across roles, but used differently)
const AI_STATE = {
    IDLE: 0,          // Doing nothing specific, often for Pirates or Police off-duty
    APPROACHING: 1,   // Detected player, moving towards an intercept point (Pirate/Police when hostile)
    ATTACK_PASS: 2,   // Flying past player while firing (Pirate/Police when hostile)
    REPOSITIONING: 3, // Moving away after pass (Pirate/Police when hostile)
    PATROLLING: 4,    // Moving towards a point (e.g., station or patrol route) - Police/Hauler
    NEAR_STATION: 5,  // Paused near station - Hauler only
    LEAVING_SYSTEM: 6,// Moving towards exit point - Hauler only
    TRANSPORTING: 7,  // New state for transport behaviour
    COLLECTING_CARGO: 8,   // New state for cargo collection behavior
    FLEEING: 9,        // New state for damaged ships trying to escape
    GUARDING: 10,
    SNIPING: 11
};

// Reverse lookup for AI_STATE values to names
const AI_STATE_NAME = {};
for (const [k, v] of Object.entries(AI_STATE)) {
    AI_STATE_NAME[v] = k;
}

// -------------------------
// --- Weapon & Range Constants ---
// -------------------------

const TIGHT_ANGLE_RAD = 0.17;  // ~10 degrees for weapon selection
const WIDE_ANGLE_RAD = 0.52;   // ~30 degrees for weapon selection
const CLOSE_RANGE_MULT = 0.4; // Multiplier of visualFiringRange
const MEDIUM_RANGE_MULT = 0.7; // Multiplier of visualFiringRange

// -------------------------
// --- Targeting Score Constants ---
// -------------------------

const POLICE_WANTED_BASE_SCORE = 100;
const PIRATE_CARGO_BASE_SCORE = 30;
const PIRATE_CARGO_MULT = 1.5;
const RETALIATION_SCORE_BONUS = 60;

const TARGET_SCORE_INVALID = -Infinity; // Score for invalid/ignored targets
const TARGET_SCORE_BASE_WANTED = 100;   // Base score for police targeting wanted
const TARGET_SCORE_WANTED_PIRATE_BONUS = 20;
const TARGET_SCORE_PIRATE_CARGO_BASE = 30;
const TARGET_SCORE_PIRATE_CARGO_MULT = 1.5;
const TARGET_SCORE_PIRATE_PREY_HAULER = 40; // Score for targeting haulers/transports
const TARGET_SCORE_RETALIATION_PIRATE = 60; // Bonus for pirate retaliation
const TARGET_SCORE_RETALIATION_HAULER = 40; // Score for hauler/transport retaliation
const TARGET_SCORE_DISTANCE_PENALTY_MULT = 0.05; // Multiplier for distance penalty
const TARGET_SCORE_HULL_DAMAGE_MAX_BONUS = 30; // Max bonus score for damaged hull
const TARGET_SCORE_HULL_DAMAGE_MULT = 40; // Multiplier for hull damage bonus calculation

// -------------------------
// --- Movement & Combat Constants ---
// -------------------------

const FLEE_THRUST_MULT_TRANSPORT = 1.4;
const FLEE_THRUST_MULT_DEFAULT = 1.2;
const FLEE_MIN_DURATION_MS = 2000;
const FLEE_ESCAPE_DIST_MULT = 2.5; // Base multiplier for detectionRange

// -------------------------
// --- Attack Pass Tuning Constants ---
// -------------------------

const ATTACK_PASS_STRAFE_OFFSET_MULT = 3; // Multiplier of enemy size for sideways offset
const ATTACK_PASS_AHEAD_DIST_MULT = 8;    // Multiplier of enemy size for how far ahead/past the side-strafe point to aim
const ATTACK_PASS_STRAFE_PREDICTION_FACTOR = 0.5; // How much of standard predictionTime to use for strafe point
const ATTACK_PASS_SPEED_BOOST_MULT = 1.1;         // Speed multiplier during attack pass
const ATTACK_PASS_COLLISION_AVOID_RANGE_FACTOR = 0.8; // Factor of combined sizes for emergency collision check
const ATTACK_PASS_COLLISION_AVOID_THRUST_REDUCTION = 0.3; // Thrust multiplier during emergency avoidance
const APPROACH_BRAKING_DISTANCE_FACTOR = 1.2; // Multiplier of combined (enemy+target) sizes to start braking in APPROACH
const APPROACH_CLOSE_THRUST_REDUCTION = 0.05; // Thrust multiplier when very close in APPROACH state (almost zero)

// -------------------------
// --- Sniping Tuning Constants ---
// -------------------------

const SNIPING_IDEAL_RANGE_FACTOR = 0.9;         // Try to stay at 90% of visualFiringRange
const SNIPING_MIN_RANGE_EXIT_FACTOR = 0.4;    // If target closer than 50% of visualFiringRange, exit SNIPING
const SNIPING_MAX_RANGE_EXIT_FACTOR = 1.2;    // If target further than 110% of visualFiringRange, exit SNIPING
const SNIPING_BRAKE_FACTOR = 0.85;            // How quickly to slow down when trying to stay still
const SNIPING_POSITION_ADJUST_THRUST = 0.2;   // Gentle thrust for minor position adjustments
const SNIPING_STANDOFF_TOLERANCE_FACTOR = 0.1; // Allow 10% deviation from ideal range before adjusting
const SNIPING_HULL_DROP_EXIT_PERCENT = 0.15;  // Exit sniping if hull drops by 15% of maxHull since entering state
