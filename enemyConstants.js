// ****** enemyConstants.js ******
// Enemy AI Constants and Enums
// Extracted from enemy.js for better organization

// -------------------------
// --- Time & Frame Constants ---
// -------------------------

const DEFAULT_DELTA_SECONDS = 0.016;       // ~60fps fallback (1000ms / 60frames)
const FRAME_TIME_BASELINE_MS = 16.67;      // 60fps frame time baseline for time scaling

// -------------------------
// --- Rotation Constants ---
// -------------------------

const ROTATION_THRESHOLD_RAD = 0.02;       // Angle threshold below which rotation is skipped

// -------------------------
// --- Thrust Multipliers ---
// -------------------------

const STRAFE_THRUST_MULTIPLIER = 0.6;      // Default strafe thrust (weaker than forward)
const REVERSE_THRUST_MULTIPLIER = 0.6;     // Default reverse thrust (weaker than forward) - matches player
const STRAFE_PARTICLE_SIZE_MULT = 0.8;     // Particle size multiplier for strafe
const REVERSE_PARTICLE_SIZE_MULT = 0.7;    // Particle size multiplier for reverse
const RETRO_THRUST_ANGLE_OFFSET = 0.25;    // PI * 0.25 for front thruster spread

// -------------------------
// --- System Navigation Constants ---
// -------------------------

const DESPAWN_DISTANCE_MULTIPLIER = 1.5;   // Multiplier of despawnRadius for fallback leaving target

// -------------------------
// --- Prediction & Thrust Constants ---
// -------------------------

const PREDICTION_FPS_BASELINE = 60;        // FPS baseline for prediction calculations
const MIN_THRUST_THRESHOLD = 0.01;         // Skip negligible thrust below this multiplier

// -------------------------
// --- Jump Fade Effect Constants ---
// -------------------------

const JUMP_FADE_OUT_DURATION = 0.35;       // Fade-to-white duration in seconds
const JUMP_FADE_IN_DURATION = 1.2;         // Fade-back duration in seconds

// -------------------------
// --- Drag/Tangle Effect Constants ---
// -------------------------

const DRAG_EFFECT_DEFAULT_DURATION = 5.0;  // Default tangle/drag duration in seconds
const DRAG_EFFECT_DEFAULT_MULTIPLIER = 10.0; // Default drag multiplier
const DRAG_CONSECUTIVE_HIT_MULT = 0.5;     // Duration extension for consecutive hits

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
    GUARD: 'Guard',
    COMBAT: 'Combat',  // Military, imperial, and separatist combat ships
    MINER: 'Miner',  // Mining ships that target asteroids
    REPAIR: 'Repair'  // Field repair tenders that maintain space objects
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
const TARGET_SCORE_DISTANCE_PENALTY_MULT = 0.15; // Multiplier for distance penalty - strong penalty to prevent long-distance convergence
const TARGET_SCORE_DISTANCE_PENALTY_CAP = 150;   // Max distance penalty - prevents ships from traveling far to already-engaged enemies
const TARGET_SCORE_ALLY_ENGAGED_PENALTY = 25;    // Penalty per ally already targeting same enemy
const TARGET_SCORE_ALLY_ENGAGED_CAP = 75;        // Max penalty from ally engagement
const TARGET_SCORE_PROXIMITY_BONUS_MAX = 30;     // Bonus for very close targets
const TARGET_SCORE_PROXIMITY_THRESHOLD = 300;    // Distance threshold for proximity bonus
const TARGET_SCORE_HULL_DAMAGE_MAX_BONUS = 20;   // Max bonus score for damaged hull
const TARGET_SCORE_HULL_DAMAGE_MULT = 20;        // Multiplier for hull damage bonus calculation

// -------------------------
// --- Combat Role Targeting Scores ---
// -------------------------

// Used by `AI_ROLE.COMBAT` in targeting to prioritize threats/factions
const TARGET_SCORE_COMBAT_VS_ALIEN_BONUS = 500; // Military vs Aliens (High priority)
const TARGET_SCORE_COMBAT_RIVALRY_BONUS = 500;   // Imperial vs Separatist rivalry (High priority)
const TARGET_SCORE_COMBAT_STANDARD_ENGAGE = 100;  // Pirates (Medium priority)
const TARGET_SCORE_COMBAT_LOW_PRIORITY = 0;     // Other ships (generic)

// Faction-based targeting modifier
const TARGET_SCORE_SAME_FACTION_PENALTY = 200;  // Large penalty for targeting same faction (prevents friendly fire)
const TARGET_SCORE_BOUNTY_CONTRACT = 1000;      // Score for bounty hunter's assigned target

// -------------------------
// --- Faction and Role Hostility Maps ---
// -------------------------

// Defines which factions are enemies of each other (Symmetric rivalry)
const FACTION_ENEMY_MAP = {
    'IMPERIAL': ['SEPARATIST'],
    'SEPARATIST': ['IMPERIAL'],
    'MILITARY': ['ALIEN'], // Military hates aliens (Note: Alien is a role, but often treated as a faction context)
    'ALIEN': ['MILITARY', 'IMPERIAL', 'SEPARATIST', 'INDEPENDENT', 'CIVILIAN'] // Aliens maintain hostilities with all
};

// Defines which roles are hostile to other roles/factions
// Note: Actual targeting logic is implemented in evaluateTargetScore() - this map is for reference
// and used by off-screen targeting optimization
const ROLE_ENEMY_MAP = {
    [AI_ROLE.ALIEN]: ['MILITARY'], // Aliens specifically target military first, but hostile to all non-aliens
    [AI_ROLE.PIRATE]: [AI_ROLE.HAULER, AI_ROLE.TRANSPORT, AI_ROLE.MINER], // Pirates prey on commerce
    [AI_ROLE.POLICE]: [AI_ROLE.PIRATE, AI_ROLE.ALIEN], // Police hunt criminals and aliens
    [AI_ROLE.COMBAT]: [AI_ROLE.PIRATE, AI_ROLE.ALIEN],  // Combat ships hunt threats (+ faction rivalries)
    [AI_ROLE.BOUNTY_HUNTER]: ['BOUNTY_TARGET'], // Special: targets assigned bountyTarget (player, pirate, combat ship, etc.)
    [AI_ROLE.GUARD]: ['PRINCIPAL_ATTACKER'], // Special: only retaliates against principal's attacker or self-defense
    [AI_ROLE.HAULER]: [], // Defensive only - retaliates when attacked
    [AI_ROLE.TRANSPORT]: [], // Defensive only - retaliates when attacked
    [AI_ROLE.MINER]: [], // Defensive only - focuses on mining asteroids
    [AI_ROLE.REPAIR]: [] // Non-combatant - focuses on repair duties
};

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
const APPROACH_CLOSE_THRUST_REDUCTION = 0.25; // Thrust multiplier when very close in APPROACH state
const APPROACH_PURSUIT_ABANDON_THRESHOLD = 0.25; // Abandon pursuit if health drops 25% while approaching (kiting defense)

// -------------------------
// --- Sniping Tuning Constants ---
// -------------------------

const SNIPING_IDEAL_RANGE_FACTOR = 0.9;         // Try to stay at 90% of visualFiringRange

// Hysteresis: Entry thresholds (from APPROACHING)
const SNIPING_ENTRY_MIN_FACTOR = 0.5;          // Enter SNIPING when target is at least 50% of visualFiringRange
const SNIPING_ENTRY_MAX_FACTOR = 1.05;         // Enter SNIPING when target is within 105% of visualFiringRange

// Hysteresis: Exit thresholds (wider than entry to prevent thrashing)
const SNIPING_EXIT_MIN_FACTOR = 0.35;          // Exit SNIPING only when target is closer than 35% (tighter than entry 50%)
const SNIPING_EXIT_MAX_FACTOR = 1.25;          // Exit SNIPING only when target is further than 125% (wider than entry 105%)

const SNIPING_BRAKE_FACTOR = 0.85;            // How quickly to slow down when trying to stay still
const SNIPING_POSITION_ADJUST_THRUST = 0.2;   // Gentle thrust for minor position adjustments
const SNIPING_STANDOFF_TOLERANCE_FACTOR = 0.1; // Allow 10% deviation from ideal range before adjusting
const SNIPING_HULL_DROP_EXIT_PERCENT = 0.15;  // Exit sniping if hull drops by 15% of maxHull since entering state

// -------------------------
// --- State Transition Thresholds ---
// -------------------------

const IDLE_FLEE_HULL_THRESHOLD = 0.4;         // Flee from IDLE if hull below 40%
const SNIPING_FLEE_HULL_THRESHOLD = 0.3;      // Flee from SNIPING if hull below 30%
const SNIPING_REPOSITION_CHANCE = 0.4;        // 40% chance to reposition vs attack pass when changing tactics
const SNIPING_TACTIC_CHANGE_CHANCE = 0.15;    // 15% chance to change tactics every decision cycle

// -------------------------
// --- Guard Behavior Constants ---
// -------------------------

const GUARD_PRINCIPAL_ATTACK_WINDOW_MS = 5000; // React to attacks on principal within 5 seconds
const GUARD_ENGAGEMENT_LOCK_DURATION = 3.0;    // Lock engagement with target for 3 seconds
const GUARD_REACTION_COOLDOWN = 5.0;           // Cooldown between guard reactions

// -------------------------
// --- Tactical Decision Constants ---
// -------------------------

const SNIPE_VS_ATTACK_CHANCE = 0.6;            // 60% chance to choose sniping over attack pass when approaching
const REPOSITION_SNIPE_CHANCE = 0.5;           // 50% chance to snipe after repositioning
const REPOSITION_DISTANCE_THRESHOLD = 50;     // Distance threshold for reaching reposition target

// -------------------------
// --- Grudge Behavior Thresholds ---
// -------------------------

// Grudge level thresholds for behavior changes (hitCount from attackerHistory)
// Ships accumulate grudge when hit repeatedly by the same attacker (max 10)
const GRUDGE_LEVEL_2 = 2;   // Minor grudge - slight behavior change
const GRUDGE_LEVEL_3 = 3;   // Moderate grudge
const GRUDGE_LEVEL_4 = 4;   // Significant grudge
const GRUDGE_LEVEL_5 = 5;   // Maximum grudge effect (values above 5 don't increase aggression further)

// Grudge-based reposition chances for SNIPING
// Lower chance = more aggressive (fewer repositions, more attack runs)
const SNIPING_REPOSITION_AT_GRUDGE_5 = 0.15;   // Very aggressive - 15% reposition
const SNIPING_REPOSITION_AT_GRUDGE_4 = 0.20;   // 20% reposition
const SNIPING_REPOSITION_AT_GRUDGE_3 = 0.25;   // 25% reposition  
const SNIPING_REPOSITION_AT_GRUDGE_2 = 0.30;   // Slightly aggressive - 30% reposition
// Default (no grudge): uses SNIPING_REPOSITION_CHANCE = 0.4

// Grudge-based reposition chances for ATTACK_PASS (slightly higher than SNIPING)
const ATTACK_PASS_REPOSITION_AT_GRUDGE_5 = 0.20;   // Very aggressive
const ATTACK_PASS_REPOSITION_AT_GRUDGE_4 = 0.25;   // 25% reposition
const ATTACK_PASS_REPOSITION_AT_GRUDGE_3 = 0.30;   // 30% reposition
const ATTACK_PASS_REPOSITION_AT_GRUDGE_2 = 0.40;   // Slightly aggressive
const ATTACK_PASS_REPOSITION_AT_NO_GRUDGE = 0.5;   // Default 50%

// Grudge-based tactic change chances (higher = more restless, switches tactics more)
const TACTIC_CHANGE_AT_GRUDGE_5 = 0.55;   // Very restless - 55% switch
const TACTIC_CHANGE_AT_GRUDGE_4 = 0.45;   // 45% switch
const TACTIC_CHANGE_AT_GRUDGE_3 = 0.40;   // 40% switch
const TACTIC_CHANGE_AT_GRUDGE_2 = 0.30;   // Slightly restless - 30% switch
// Default (no grudge): uses SNIPING_TACTIC_CHANGE_CHANCE = 0.15

// Grudge-based decision timer modifiers (faster checks = more restless)
const GRUDGE_DECISION_TIMER_MIN_BASE = 2.0;
const GRUDGE_DECISION_TIMER_MAX_BASE = 4.0;
const GRUDGE_TIMER_MIN_REDUCTION_PER_LEVEL = 0.3;   // Min timer: 2.0 - grudge * 0.3
const GRUDGE_TIMER_MAX_REDUCTION_PER_LEVEL = 0.5;   // Max timer: 4.0 - grudge * 0.5

// Grudge-based attack pass duration multiplier (higher grudge = longer attacks)
const GRUDGE_PASS_DURATION_MULT_PER_LEVEL = 0.06;
const GRUDGE_PASS_DURATION_MULT_CAP = 0.30;  // Max 30% longer at high grudge

// Debug flags/helpers moved to debug.js (loaded early).
// If needed, you can still check or toggle via the global Debug API:
//   Debug.get(), Debug.set({ DEBUG_AI: true }), Debug.enable('DEBUG_TARGETING')

// -------------------------
// --- Damage System Constants ---
// -------------------------

const GRUDGE_MEMORY_MS = 30000;             // How long attackers are remembered (30 seconds)
const MAX_GRUDGE_HIT_COUNT = 10;            // Cap on hit count to prevent unbounded grudge
const LAST_ATTACKER_SWITCH_COOLDOWN_MS = 5000; // Cooldown before switching lastAttacker focus

const DAMAGE_CARGO_DROP_HULL_THRESHOLD = 0.5; // Hull % threshold for random cargo jettison
const DAMAGE_CARGO_DROP_CHANCE = 0.05;        // 5% chance to drop cargo when hit below threshold

// Faction bounty amounts
const BOUNTY_POLICE_ALIEN_PIRATE = 1000;      // Police bounty for killing aliens/pirates
const BOUNTY_FACTION_RIVALRY = 2000;          // Separatist vs Imperial bounty
const BOUNTY_MILITARY_ALIEN = 4000;           // Military bounty for killing aliens
const BOUNTY_MILITARY_PIRATE = 1000;          // Military bounty for killing pirates

// -------------------------
// --- Combat Role Bonuses ---
// -------------------------

// Applied in EnemyAIBehaviors: military vs alien bonus
const COMBAT_MILITARY_TURN_RATE_MULT = 1.3;         // baseTurnRate multiplier
const COMBAT_MILITARY_ROTATION_SPEED_MULT = 1.3;    // rotationSpeed multiplier
const COMBAT_MILITARY_ANGLE_TOLERANCE_RAD = 0.15;   // tighter aim tolerance (~8.6°)

// Applied in EnemyAIBehaviors: imperial vs separatist rivalry bonus
const COMBAT_RIVALRY_MAX_SPEED_MULT = 1.2;
const COMBAT_RIVALRY_ENGAGE_DISTANCE_MULT = 1.3;
const COMBAT_RIVALRY_FIRING_RANGE_MULT = 1.2;

// -------------------------
// --- Pirate Gang Names ---
// -------------------------

// Single source of truth for pirate faction/gang names used across the game
const PIRATE_GANG_NAMES = [
    "Void Reavers", "Cygnus Marauders", "Nebula Nomads",
    "Quantum Corsairs", "Kygan Syndicate", "Synapse Ghosts", "Solar Scourge",
    "Black Arc", "Dust Jackals", "Red Shift", "Voidborn", "Broken Comet",
    "Stokey Krew", "Tottenham Turks", "Hackney Bombers", "Bombacilars",
    "Wraith Union", "Shard Syndicate", "Grav Cutters", "Nebula Wolves",
    "Crimson Vector", "Adkins Family"
];

// -------------------------
// --- NPC Name Generation ---
// -------------------------

// Gender-specific first name pools for voice selection
const NPC_FIRST_NAMES_MALE = [
    'Alex', 'Blake', 'Casey', 'Ellis', 'Gray', 'Jordan', 'Parker', 'Quinn',
    'River', 'Cade', 'Kai', 'Orion', 'Phoenix', 'Ash', 'Blaze',
    'Ahmed', 'Carlos', 'Gustavo', 'Ibrahim', 'Javier', 'Luis', 'Omar', 'Rafael',
    'Tariq', 'Viktor', 'Xavier', 'Bjorn', 'Diego', 'Felix', 'Hans',
    'Johan', 'Lars', 'Christian', 'Nils', 'Pedro', 'Quincy', 'Sven', 'Ulf',
    'Wolfgang', 'Yuri', 'Akira', 'Bao', 'Dmitri', 'Fahad', 'Hiroshi', 'Jiro',
    'Kamal', 'Mateo', 'Oscar', 'Pavel', 'Santiago', 'Tao', 'Vladimir', 'Wei',
    'Xin', 'Zheng', 'Bruno', 'Dario', 'Fabio', 'Hugo', 'Klaus', 'Miguel',
    'Otto', 'Ruben', 'Sebastian', 'Theo', 'Victor', 'Amir', 'Cesar',
    'Eduardo', 'Giuseppe', 'Ivan', 'Kofi', 'Marco', 'Oleg', 'Quentin', 'Sergio',
    'Ulrich', 'Walter', 'Yosef', 'Marcus', 'Rashid', 'Chen', 'Aleksei', 'Jorge',
    'Nikolai', 'Dante'
];

const NPC_FIRST_NAMES_FEMALE = [
    'Dana', 'Finley', 'Harper', 'Kelly', 'Lane', 'Morgan', 'Nova', 'Sage',
    'Taylor', 'Val', 'Aria', 'Echo', 'Luna', 'Raven', 'Storm', 'Frost',
    'Amina', 'Elena', 'Fatima', 'Hana', 'Katarina', 'Maria', 'Nadia', 'Priya',
    'Sofia', 'Ursula', 'Wafa', 'Yasmin', 'Zara', 'Clara', 'Eva', 'Gabriela',
    'Isabella', 'Kira', 'Maya', 'Olivia', 'Rosa', 'Tina', 'Vera', 'Xena',
    'Zoe', 'Chun', 'Emiko', 'Gina', 'Ines', 'Ling', 'Nina', 'Qamar', 'Rina',
    'Uma', 'Yuki', 'Anika', 'Poppy', 'Carmen', 'Elsa', 'Greta', 'Ivy',
    'Jasmine', 'Lila', 'Nora', 'Paola', 'Sara', 'Ulla', 'Wanda', 'Ximena',
    'Yara', 'Bianca', 'Diana', 'Fiona', 'Helena', 'Julia', 'Lena', 'Paula',
    'Rita', 'Talia', 'Vanessa', 'Xia', 'Ingrid', 'Astrid', 'Mei', 'Zephyr'
];

// Combined list for backwards compatibility
const NPC_FIRST_NAMES = [...NPC_FIRST_NAMES_MALE, ...NPC_FIRST_NAMES_FEMALE];

// Single source of truth for human NPC last names
const NPC_LAST_NAMES = [
    'Chen', 'Garcia', 'Ivanov', 'Kim', 'Li', 'Martinez', 'Nguyen', 'Okafor',
    'Patel', 'Rodriguez', 'Santos', 'Smith', 'Takahashi', 'Volkov', 'Wang',
    'Yamamoto', 'Zhou', 'Anderson', 'Brown', 'Davis', 'Jensen', 'Singh',
    'Torres', 'Wilson', 'Cooper', 'Morgan', 'Reed', 'Stone', 'Vale', 'West',
    'Abdullah', 'Bianchi', 'Cruz', 'Diaz', 'Esposito', 'Fernandez', 'Gomez',
    'Hernandez', 'Ito', 'Jimenez', 'Khan', 'Lopez', 'Morales', 'Nakamura',
    'Ortega', 'Perez', 'Qasim', 'Ramirez', 'Silva', 'Tanaka', 'Uchida',
    'Vargas', 'Wu', 'Xu', 'Yoshida', 'Zhang', 'Almeida', 'Barbosa', 'Castro',
    'Dominguez', 'Esteban', 'Flores', 'Gonzalez', 'Herrera', 'Iniguez', 'Juarez',
    'Kovacs', 'Lima', 'Mendoza', 'Nunez', 'Oliveira', 'Pinto', 'Quintana', 'Reyes',
    'Sanchez', 'Uribe', 'Vega', 'Wong', 'Xie', 'Yanez', 'Zavala',
    'Andersson', 'Berg', 'Carlsson', 'Eriksson', 'Gustafsson', 'Hansen', 'Iversen',
    'Jakobsen', 'Kristensen', 'Larsen', 'Madsen', 'Nielsen', 'Olsen', 'Petersen',
    'Rasmussen', 'Sorensen', 'Thomsen', 'Vestergaard', 'Winther', 'Zimmermann',
    'Abe', 'Fujimoto', 'Goto', 'Hasegawa', 'Ishikawa', 'Kato', 'Kobayashi', 'Matsumoto',
    'Nakagawa', 'Ogawa', 'Saito', 'Sakamoto', 'Suzuki', 'Takagi', 'Taniguchi', 'Ueda',
    'Watanabe', 'Yamaguchi', 'Yoshimoto', 'Aoki', 'Endo', 'Fukuda', 'Harada', 'Ikeda',
    'Kojima', 'Maeda', 'Murakami', 'Nishimura', 'Ono', 'Sasaki', 'Shimizu', 'Tamura',
    'Ueno', 'Yamada', 'Arai', 'Chiba', 'Eguchi', 'Fujioka', 'Hara',
    'Imai', 'Kikuchi', 'Kinoshita', 'Kondo', 'Mori', 'Nagai', 'Ozawa', 'Sato',
    'Sugiyama', 'Takeda', 'Uchiyama', 'Wada', 'Yokoyama', 'Vance', 'Okonkwo',
    'Petrov', 'Lindqvist', 'Aziz', 'Dubois', 'Kowalski', 'Rahman', 'Johansson', 'Andersen'
];

// Titles for named NPCs (used in news reports, missions, etc.)
const NPC_TITLES = [
    "Commander", "Captain", "Lord", "Admiral", "Director", "Chief", "Agent",
    "Warden", "Marshal", "Baron", "Minister", "President", "Commissar", "Overseer", "Prefect"
];

/**
 * Get a random element from an array
 * @param {Array} list - Array to pick from
 * @returns {string} Random element or empty string if invalid
 */
function getRandomNamePart(list) {
    if (!Array.isArray(list) || list.length === 0) { return ''; }
    const index = Math.floor(Math.random() * list.length);
    return list[index];
}

/**
 * Generate a random human NPC name with gender information
 * @returns {{ name: string, gender: 'male'|'female' }} Object with name and gender
 */
function generateGenderedNPCName() {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const firstNames = gender === 'male' ? NPC_FIRST_NAMES_MALE : NPC_FIRST_NAMES_FEMALE;
    const first = getRandomNamePart(firstNames);
    const last = getRandomNamePart(NPC_LAST_NAMES);
    const name = (first && last) ? `${first} ${last}` : (first || last || '');
    return { name, gender };
}

/**
 * Generate a random human NPC name (first + last)
 * @returns {string} Full name like "Elena Volkov"
 */
function generateNPCName() {
    return generateGenderedNPCName().name;
}

/**
 * Generate a titled NPC name (title + first + last)
 * @returns {string} Full titled name like "Commander Elena Volkov"
 */
function generateTitledNPCName() {
    const title = getRandomNamePart(NPC_TITLES);
    return `${title} ${generateNPCName()}`;
}
