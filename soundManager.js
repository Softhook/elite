/**
 * Manages sound effects using the sfxr library.
 * Pre-generates audio objects for efficient playback.
 */
class SoundManager {
    constructor() {
        this.sounds = {}; // To store pre-generated Audio objects
        this.soundDefinitions = {
            // --- Define your sounds here ---
            laserShoot: {
                    "oldParams": true,
                    "wave_type": 1,
                    "p_env_attack": 0,
                    "p_env_sustain": 0.28468205075769065,
                    "p_env_punch": 0,
                    "p_env_decay": 0.26609394242013923,
                    "p_base_freq": 0.6293671975711458,
                    "p_freq_limit": 0.2,
                    "p_freq_ramp": -0.3479194910493025,
                    "p_freq_dramp": 0,
                    "p_vib_strength": 0,
                    "p_vib_speed": 0,
                    "p_arp_mod": 0,
                    "p_arp_speed": 0,
                    "p_duty": 0.19013824168197851,
                    "p_duty_ramp": 0.032307566487975996,
                    "p_repeat_speed": 0,
                    "p_pha_offset": 0,
                    "p_pha_ramp": 0,
                    "p_lpf_freq": 1,
                    "p_lpf_ramp": 0,
                    "p_lpf_resonance": 0,
                    "p_hpf_freq": 0.08288407325579755,
                    "p_hpf_ramp": 0,
                    "sound_vol": 0.25,
                    "sample_rate": 44100,
                    "sample_size": 8,
                    "ctime": 1745308272607,
                    "mtime": 1745308272607,
                    "preset": "laserShoot"
            },
            pickupCoin: { // Example using a preset name
                preset: "pickupCoin",
                sound_vol: 0.2
            },
            explosionSmall: {
                preset: "explosion",
                p_base_freq: 0.4,
                p_env_attack: 0.01,
                p_env_sustain: 0.15,
                p_env_decay: 0.35,
                p_lpf_freq: 0.8,
                sound_vol: 0.25
            },
            explosionLarge: {
                preset: "explosion",
                p_base_freq: 0.2,
                p_env_attack: 0.02,
                p_env_sustain: 0.3,
                p_env_decay: 0.5,
                p_lpf_freq: 0.6,
                sound_vol: 0.35
            }
            // Add more sound definitions here...
            // e.g., hitHurt, jump, powerUp, etc.
        };

        this.initSounds();
    }

    /**
     * Initializes sounds by generating Audio objects from definitions.
     * Should be called after the sfxr library is loaded.
     */
    initSounds() {
        if (typeof sfxr === 'undefined') {
            console.error("SoundManager Error: sfxr library not found. Sounds will not play.");
            return;
        }

        console.log("Initializing SoundManager...");
        for (const name in this.soundDefinitions) {
            try {
                const definition = this.soundDefinitions[name];
                // If definition uses a preset name, generate from that
                if (definition.preset && typeof definition.preset === 'string') {
                     // Generate requires the preset name directly
                     // We'll store the generated data and create an Audio object from it
                     const soundData = sfxr.generate(definition.preset);
                     // Apply volume override if present
                     if (definition.sound_vol !== undefined) {
                         soundData.sound_vol = definition.sound_vol;
                     }
                     this.sounds[name] = sfxr.toAudio(soundData);
                     console.log(`   Generated sound '${name}' from preset '${definition.preset}'`);
                } else {
                    // Otherwise, generate from the full parameter object
                    this.sounds[name] = sfxr.toAudio(definition);
                    console.log(`   Generated sound '${name}' from custom parameters.`);
                }
            } catch (error) {
                console.error(`SoundManager Error: Failed to generate sound '${name}':`, error);
            }
        }
        console.log("SoundManager initialization complete.");
    }

    /**
     * Plays the sound associated with the given name.
     * @param {string} name - The name of the sound effect to play (e.g., 'laserShoot').
     */
    playSound(name) {
        if (typeof sfxr === 'undefined') {
            // console.warn("SoundManager: sfxr not loaded, cannot play sound.");
            return; // Silently fail if sfxr isn't ready
        }

        const audio = this.sounds[name];
        if (audio && typeof audio.play === 'function') {
            // console.log(`Playing sound: ${name}`); // Optional log
            // Ensure the sound is rewound before playing if needed,
            // though sfxr.toAudio usually handles this.
            // audio.currentTime = 0; // Might not be necessary or supported by sfxr's Audio object
            audio.play();
        } else {
            console.warn(`SoundManager: Sound '${name}' not found or invalid.`);
        }
    }

    /**
     * Plays an explosion sound, potentially varying based on size.
     * @param {number} [size=30] - An optional size parameter to influence sound choice.
     */
    playExplosion(size = 30) {
        if (size > 60) {
            this.playSound('explosionLarge');
        } else {
            this.playSound('explosionSmall');
        }
    }

    // Add more specific play methods as needed, e.g., playHit(), playPowerup()
}

// --- Example Usage (in sketch.js) ---

/*
// In sketch.js global scope:
let soundManager;

// In setup():
function setup() {
    // ... other setup ...
    soundManager = new SoundManager(); // Create the manager
    // ... rest of setup ...
}

// In places where sounds are needed:
function mousePressed() {
    if (soundManager) {
        soundManager.playSound('laserShoot');
        // Or soundManager.playSound('pickupCoin');
    }
}

// Example in Explosion class constructor:
class Explosion {
    constructor(x, y, size, baseColor) {
        // ... other constructor logic ...

        // Play sound via the manager
        if (soundManager) { // Check if manager exists
            soundManager.playExplosion(size);
        }
    }
    // ... rest of Explosion class ...
}
*/