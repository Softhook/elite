/**
 * Manages sound effects using the sfxr library.
 * Pre-generates 'Normal' and 'Quiet' audio objects for efficient playback,
 * accommodating potential inconsistencies in sfxr's output.
 */
class SoundManager {
    constructor() {
        console.log("SoundManager constructor called.");
        this.sounds = {}; // Stores { definition, audioNormal, audioQuiet }
        this.soundDefinitions = {
            // --- Sound Definitions ---
            laser: 
            {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.21916643522029763,
                "p_env_punch": 0,
                "p_env_decay": 0.04768704743184844,
                "p_base_freq": 0.7780606629589863,
                "p_freq_limit": 0.011382423514995433,
                "p_freq_ramp": -0.425491330216931,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.15588532580675873,
                "p_duty_ramp": 0.06911956820054713,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.07481981019431778,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
              },
              beam: 
              {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0.086,
                "p_env_sustain": 0.733,
                "p_env_punch": 0.242,
                "p_env_decay": 0.5455253623463282,
                "p_base_freq": 0.13615778746815113,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0.7562054020353133,
                "p_duty": 0.7675096106972876,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 0.2635667186352749,
                "p_lpf_ramp": -0.07252280271716516,
                "p_lpf_resonance": 0.9006325262268724,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
              },

            pickupCoin: { 
                    "oldParams": true,
                    "wave_type": 1,
                    "p_env_attack": 0,
                    "p_env_sustain": 0.04581296049541528,
                    "p_env_punch": 0.49963998023905043,
                    "p_env_decay": 0.36970089169851084,
                    "p_base_freq": 0.6445307341814023,
                    "p_freq_limit": 0,
                    "p_freq_ramp": 0,
                    "p_freq_dramp": 0,
                    "p_vib_strength": 0,
                    "p_vib_speed": 0,
                    "p_arp_mod": 0,
                    "p_arp_speed": 0,
                    "p_duty": 0,
                    "p_duty_ramp": 0,
                    "p_repeat_speed": 0,
                    "p_pha_offset": 0,
                    "p_pha_ramp": 0,
                    "p_lpf_freq": 1,
                    "p_lpf_ramp": 0,
                    "p_lpf_resonance": 0,
                    "p_hpf_freq": 0,
                    "p_hpf_ramp": 0,
                    "sound_vol": 0.25,
                    "sample_rate": 44100,
                    "sample_size": 8
                   },
            hit: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.02341326494757967,
                "p_env_punch": 0,
                "p_env_decay": 0.25156448207068977,
                "p_base_freq": 0.7352993482269201,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.6431802140566438,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.31585725782626867,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.0000741028254999998,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
              },
            explosionSmall: { "oldParams": true, "wave_type": 3, "p_env_attack": 0, "p_env_sustain": 0.2444, "p_env_punch": 0.4165, "p_env_decay": 0.0050, "p_base_freq": 0.1051, "p_freq_limit": 0, "p_freq_ramp": -0.3072, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0.2161, "p_pha_ramp": -0.0017, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0, "p_hpf_ramp": 0, "sound_vol": 0.3, "sample_rate": 44100, "sample_size": 8 },
            explosionLarge: { "oldParams": true, "wave_type": 3, "p_env_attack": 0, "p_env_sustain": 0.3331, "p_env_punch": 0.2926, "p_env_decay": 0.3540, "p_base_freq": 0.1086, "p_freq_limit": 0, "p_freq_ramp": 0, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0.1855, "p_pha_ramp": -0.2955, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0, "p_hpf_ramp": 0, "sound_vol": 0.4, "sample_rate": 44100, "sample_size": 8 },
            error: { "oldParams": true, "wave_type": 1, "p_env_attack": 0, "p_env_sustain": 0.1579, "p_env_punch": 0, "p_env_decay": 0.1758, "p_base_freq": 0.2731, "p_freq_limit": 0, "p_freq_ramp": 0, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0.0093, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0, "p_pha_ramp": 0, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0.1, "p_hpf_ramp": 0, "sound_vol": 0.25, "sample_rate": 44100, "sample_size": 8 },
            click: { 
                    "oldParams": true,
                    "wave_type": 1,
                    "p_env_attack": 0,
                    "p_env_sustain": 0.026111703272301348,
                    "p_env_punch": 0.501716455825922,
                    "p_env_decay": 0.10666222564948519,
                    "p_base_freq": 0.7613432835222875,
                    "p_freq_limit": 0,
                    "p_freq_ramp": 0,
                    "p_freq_dramp": 0,
                    "p_vib_strength": 0,
                    "p_vib_speed": 0,
                    "p_arp_mod": 0,
                    "p_arp_speed": 0,
                    "p_duty": 0,
                    "p_duty_ramp": 0,
                    "p_repeat_speed": 0,
                    "p_pha_offset": 0,
                    "p_pha_ramp": 0,
                    "p_lpf_freq": 1,
                    "p_lpf_ramp": 0,
                    "p_lpf_resonance": 0,
                    "p_hpf_freq": 0,
                    "p_hpf_ramp": 0,
                    "sound_vol": 0.25,
                    "sample_rate": 44100,
                    "sample_size": 8
             },
            click_off: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.026111703272301348,
                "p_env_punch": 0.501716455825922,
                "p_env_decay": 0.10666222564948519,
                "p_base_freq": 0.576,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
            },
            upgrade: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.07715103780477622,
                "p_env_punch": 0,
                "p_env_decay": 0.47119836071341703,
                "p_base_freq": 0.2581767538438034,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.19817947460356228,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 1,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
              },
            force: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": -0.02865192767289779,
                "p_env_sustain": 0.4468485473978126,
                "p_env_punch": 0.6297948328587816,
                "p_env_decay": -0.42457926220301545,
                "p_base_freq": 0.32389056408484707,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.2371245536622993,
                "p_freq_dramp": 0.5765501939121432,
                "p_vib_strength": 0.801786143246104,
                "p_vib_speed": 0.8658170330083548,
                "p_arp_mod": -0.6023642556289532,
                "p_arp_speed": 0.20508040760847868,
                "p_duty": 0.40209257042753177,
                "p_duty_ramp": 0.12794075771519756,
                "p_repeat_speed": 0.20188875253790783,
                "p_pha_offset": 0.16212854919276462,
                "p_pha_ramp": 0.0025449672637287172,
                "p_lpf_freq": 0.3955393679658298,
                "p_lpf_ramp": 0.01604927965908056,
                "p_lpf_resonance": -0.6286100626617219,
                "p_hpf_freq": 0.036258766388356824,
                "p_hpf_ramp": -0.03387882807894696,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
              },
              thargoid: {
                "oldParams": true,
                "wave_type": 2,
                "p_env_attack": -0.17825692502217524,
                "p_env_sustain": 0.8140800845207565,
                "p_env_punch": 0.15004474295109135,
                "p_env_decay": 0.12218577708949585,
                "p_base_freq": 0.905814324636156,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.034847155936952416,
                "p_freq_dramp": -0.7989093915052705,
                "p_vib_strength": -0.00301940754076396,
                "p_vib_speed": -0.5850069794195327,
                "p_arp_mod": -0.555140862443809,
                "p_arp_speed": 0.17503066730815253,
                "p_duty": 0.7420418473521806,
                "p_duty_ramp": 0.09662151369559566,
                "p_repeat_speed": 0.7138135653397979,
                "p_pha_offset": -0.04571525319441293,
                "p_pha_ramp": 0.01387424799837009,
                "p_lpf_freq": 0.45749747637061355,
                "p_lpf_ramp": -0.1064310942280934,
                "p_lpf_resonance": -0.8194227485996151,
                "p_hpf_freq": 0.0788306478270632,
                "p_hpf_ramp": 0.4810852896290552,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8,
                "ctime": 1746456062710,
                "mtime": 1746456062710,
                "preset": "random"
              },
              targetlock: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.28068620626320706,
                "p_env_punch": 0.4725664917623754,
                "p_env_decay": 0.811940987531992,
                "p_base_freq": 0.13615778746815113,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0.8309630450808612,
                "p_duty": 0.10633323053742738,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 0.11981021483155566,
                "p_lpf_ramp": -0.38009365936913375,
                "p_lpf_resonance": 0.7518754118700935,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0.8957764740065794,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
              },
              missileLaunch: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0.131,
                "p_env_sustain": 0.65,
                "p_env_punch": 0.722,
                "p_env_decay": 0.199,
                "p_base_freq": 0.099,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.278,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.141,
                "p_vib_speed": 0,
                "p_arp_mod": -0.726,
                "p_arp_speed": 0.41,
                "p_duty": 1,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0.59,
                "p_pha_offset": 0.82,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
              },
              jump: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": -0.4145750012451005,
                "p_env_sustain": 0.5272456771338139,
                "p_env_punch": 0.2479218929083218,
                "p_env_decay": 0.4804523596576298,
                "p_base_freq": 0.5903495433764034,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.0017681137189092023,
                "p_freq_dramp": 0.0735803989524578,
                "p_vib_strength": 0.8838517521733452,
                "p_vib_speed": -0.6206637957291772,
                "p_arp_mod": -0.2244272034610615,
                "p_arp_speed": 0.6266429015969779,
                "p_duty": 0.2473777402124855,
                "p_duty_ramp": 0.0026576558969564857,
                "p_repeat_speed": 0.2989276090745494,
                "p_pha_offset": -0.12400096166858156,
                "p_pha_ramp": 0.01936116766289701,
                "p_lpf_freq": 0.25720467300452077,
                "p_lpf_ramp": -0.05666605762423825,
                "p_lpf_resonance": 0.40110077102607167,
                "p_hpf_freq": 0.16900019772542213,
                "p_hpf_ramp": -0.6897831495121087,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8,
                "ctime": 1746458443937,
                "mtime": 1746458443938,
                "preset": "random"
              }
        };

        this.initSounds();
    }

    /**
     * Initializes sounds by generating Audio objects from definitions.
     */
    initSounds() {
        if (typeof sfxr === 'undefined' || typeof OFFSCREEN_VOLUME_REDUCTION_FACTOR === 'undefined') {
            console.error("SoundManager Error: sfxr library or OFFSCREEN_VOLUME_REDUCTION_FACTOR not found. Sounds cannot be initialized.");
            return;
        }

        console.log("Initializing SoundManager sounds (Normal & Quiet versions)...");
        let generatedCount = 0;

        for (const name in this.soundDefinitions) {
            try {
                const originalDefinition = this.soundDefinitions[name];
                // Ensure base volume exists, default to 0.25
                originalDefinition.sound_vol = originalDefinition.sound_vol ?? 0.25;

                // Generate Normal Sound
                const audioNormal = this._generateSingleSound(name, originalDefinition, originalDefinition.sound_vol, "Normal");

                // Generate Quiet Sound
                const quietVolume = constrain(originalDefinition.sound_vol * OFFSCREEN_VOLUME_REDUCTION_FACTOR, 0.0, 1.0);
                const audioQuiet = this._generateSingleSound(name, originalDefinition, quietVolume, "Quiet");

                // Store if at least one version was successful
                if (audioNormal || audioQuiet) {
                    this.sounds[name] = {
                        definition: originalDefinition,
                        audioNormal: audioNormal,
                        audioQuiet: audioQuiet
                    };
                    generatedCount++;
                } else {
                    console.error(`   BOTH audio versions failed validation for '${name}'. Sound will be unavailable.`);
                }

            } catch (error) {
                console.error(`SoundManager Error: Catastrophic failure during generation for sound '${name}':`, error);
            }
        }
        console.log(`SoundManager initSounds finished. Generated sound entries: ${generatedCount}/${Object.keys(this.soundDefinitions).length}`);
    }

    /**
     * Internal helper to generate a single audio object (normal or quiet).
     * @param {string} name - Sound name (for logging).
     * @param {object} originalDefinition - The base definition from soundDefinitions.
     * @param {number} targetVolume - The volume to apply to this version.
     * @param {string} versionLabel - "Normal" or "Quiet" (for logging).
     * @returns {object|null} The generated audio object (HTMLAudioElement or custom) or null if failed.
     */
    _generateSingleSound(name, originalDefinition, targetVolume, versionLabel) {
        console.log(`   Generating '${name}' (${versionLabel}, Vol: ${targetVolume.toFixed(2)})...`);
        let generatedAudio = null;

        try {
            if (originalDefinition.preset && typeof originalDefinition.preset === 'string') {
                // Preset-based: generate, then set volume on the data before creating audio object
                const soundData = sfxr.generate(originalDefinition.preset);
                soundData.sound_vol = targetVolume; // Apply target volume
                generatedAudio = sfxr.toAudio(soundData);
            } else {
                // Custom params: create a copy of definition and set volume before creating audio object
                let definitionCopy = { ...originalDefinition };
                definitionCopy.sound_vol = targetVolume; // Apply target volume
                generatedAudio = sfxr.toAudio(definitionCopy);
            }

            // Validate: Must have a .play() method
            if (generatedAudio && typeof generatedAudio.play === 'function') {
                const type = typeof generatedAudio.volume !== 'undefined' ? "Standard HTMLAudioElement" : "Custom sfxr object";
                console.log(`      -> '${name}' (${versionLabel}) seems valid (${type}).`);
                return generatedAudio;
            } else {
                console.error(`   Failed to create a playable ${versionLabel} Audio object for '${name}'. Object received:`, generatedAudio);
                return null;
            }
        } catch (e) {
             console.error(`   Error during ${versionLabel} audio generation for '${name}':`, e);
             return null;
        }
    }

    /**
     * Checks if a world position is off-screen relative to the listener's view.
     * @param {number} sourceX - World X coordinate.
     * @param {number} sourceY - World Y coordinate.
     * @param {p5.Vector} listenerPos - World position of the listener.
     * @returns {boolean} True if off-screen, false otherwise.
     */
    _isOffScreen(sourceX, sourceY, listenerPos) {
        // Assumes listenerPos is valid and p5 globals (width, height) are available
        if (!listenerPos || typeof width === 'undefined' || typeof height === 'undefined') {
            // console.warn("_isOffScreen check failed: Missing listenerPos or p5 globals.");
            return false; // Default to on-screen if check cannot be performed
        }
        const tx = width / 2 - listenerPos.x;
        const ty = height / 2 - listenerPos.y;
        const screenLeft = -tx;
        const screenRight = screenLeft + width;
        const screenTop = -ty;
        const screenBottom = screenTop + height;

        return (sourceX < screenLeft || sourceX > screenRight ||
                sourceY < screenTop  || sourceY > screenBottom);
    }

    /**
     * Plays a sound originating from a specific world location.
     * Selects pre-generated 'Normal' or 'Quiet' version based on visibility.
     * @param {string} name - The name of the sound effect.
     * @param {number} sourceX - World X coordinate of the sound source.
     * @param {number} sourceY - World Y coordinate of the sound source.
     * @param {p5.Vector} listenerPos - The world position of the listener (player).
     */
    playWorldSound(name, sourceX, sourceY, listenerPos) {
        const soundEntry = this.sounds[name];
        if (!soundEntry) {
            // This warning is less likely now, but good to keep
            console.warn(`playWorldSound: Sound entry '${name}' not found (likely failed generation).`);
            return;
        }

        const isOffScreen = this._isOffScreen(sourceX, sourceY, listenerPos);
        const reason = isOffScreen ? "Off-Screen" : "On-Screen";

        // Select Audio Object
        let audioToPlay = null;
        let versionSelected = "None";
        if (isOffScreen) {
            // Prefer quiet, fallback to normal if quiet failed generation
            audioToPlay = soundEntry.audioQuiet || soundEntry.audioNormal;
            versionSelected = soundEntry.audioQuiet ? "Quiet" : "Normal (Fallback)";
        } else {
            audioToPlay = soundEntry.audioNormal;
            versionSelected = "Normal";
        }

        // Check if a playable object was found/generated
        if (!audioToPlay || typeof audioToPlay.play !== 'function') {
             console.warn(`playWorldSound: No valid audio object ('${versionSelected}') available for '${name}' (Status: ${reason}).`);
             return;
        }

        // Log Selection
        const baseVolume = soundEntry.definition.sound_vol; // Already defaulted in init
        const intendedVolume = isOffScreen
            ? constrain(baseVolume * OFFSCREEN_VOLUME_REDUCTION_FACTOR, 0.0, 1.0)
            : baseVolume;
        //console.log(`playWorldSound: '${name}' | Status: ${reason} | Selected: ${versionSelected} | BaseVol: ${baseVolume.toFixed(2)} | IntendedVol: ${intendedVolume.toFixed(2)}`);

        // Play the selected pre-generated sound
        try {
            // Attempt to reset time - may not work on custom sfxr objects, but harmless to try
            if (typeof audioToPlay.currentTime !== 'undefined') {
                audioToPlay.currentTime = 0;
            }
            audioToPlay.play();

            // ***** INTEGRATION CHECK *****
            if (typeof uiManager !== 'undefined' && typeof uiManager.trackCombatSound === 'function') {
                //console.log(`SoundManager: Notifying UIManager for sound '${name}' at ${sourceX.toFixed(0)}, ${sourceY.toFixed(0)}`); // DEBUG
                uiManager.trackCombatSound(sourceX, sourceY, name);
            } else {
                console.warn("SoundManager: uiManager or trackCombatSound not available for battle indicator."); // DEBUG
            }
            // ***** END INTEGRATION *****


        } catch (e) {
            console.error(`SoundManager: Error playing sound "${name}" (${versionSelected}):`, e);
        }
    }

    /**
     * Plays a UI or non-positioned sound, always using the 'Normal' version.
     * @param {string} name - The name of the sound effect.
     * @param {number} [volMultiplier=1.0] - Optional multiplier for the base volume (only works reliably on standard HTMLAudioElements).
     */
    playSound(name, volMultiplier = 1.0) {
        const soundEntry = this.sounds[name];
        if (!soundEntry || !soundEntry.audioNormal || typeof soundEntry.audioNormal.play !== 'function') {
            console.warn(`playSound: Sound '${name}' (Normal) not found or is not playable.`);
            return;
        }

        const audioToPlay = soundEntry.audioNormal;

        try {
            // Apply optional multiplier ONLY if it's a standard HTMLAudioElement
            if (typeof audioToPlay.volume !== 'undefined' && volMultiplier !== 1.0) {
                const baseVol = soundEntry.definition.sound_vol;
                const finalVolume = constrain(baseVol * volMultiplier, 0.0, 1.0);
                audioToPlay.volume = finalVolume;
                // console.log(`playSound: Applied volume multiplier ${volMultiplier} to '${name}'. New vol: ${finalVolume.toFixed(2)}`);
            } else if (volMultiplier !== 1.0) {
                // Log warning if multiplier requested for non-standard object
                console.warn(`playSound: Cannot apply volume multiplier to non-standard audio object for '${name}'. Playing at base volume.`);
            }

            // Attempt reset and play
            if (typeof audioToPlay.currentTime !== 'undefined') {
                audioToPlay.currentTime = 0;
            }
            audioToPlay.play();

        } catch (e) {
            console.error(`SoundManager: Error playing sound "${name}" (Normal):`, e);
        }
    }

    /**
     * Plays an explosion sound, selecting size and adjusting volume based on world position.
     * @param {number} size - Size parameter to influence sound choice (e.g., radius).
     * @param {number} sourceX - World X coordinate of the explosion.
     * @param {number} sourceY - World Y coordinate of the explosion.
     * @param {p5.Vector} listenerPos - The world position of the listener (player).
     */
    playExplosion(size = 30, sourceX, sourceY, listenerPos) {
        if (!listenerPos) {
             console.warn("SoundManager.playExplosion: listenerPos is required.");
             return;
        }
        // Simple size check for sound selection
        const soundName = size > 60 ? 'explosionLarge' : 'explosionSmall';
        this.playWorldSound(soundName, sourceX, sourceY, listenerPos);
    }
}