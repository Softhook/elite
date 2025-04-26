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
            laser: { "oldParams": true, "wave_type": 1, "p_env_attack": 0, "p_env_sustain": 0.1825, "p_env_punch": 0.2932, "p_env_decay": 0.3986, "p_base_freq": 0.8628, "p_freq_limit": 0.2, "p_freq_ramp": -0.2851, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0.4379, "p_duty_ramp": -0.3895, "p_repeat_speed": 0, "p_pha_offset": 0.1942, "p_pha_ramp": -0.1639, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0.0671, "p_hpf_ramp": 0, "sound_vol": 0.25, "sample_rate": 44100, "sample_size": 16 },
            pickupCoin: { preset: "pickupCoin", sound_vol: 0.2 },
            explosionSmall: { "oldParams": true, "wave_type": 3, "p_env_attack": 0, "p_env_sustain": 0.2444, "p_env_punch": 0.4165, "p_env_decay": 0.0050, "p_base_freq": 0.1051, "p_freq_limit": 0, "p_freq_ramp": -0.3072, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0.2161, "p_pha_ramp": -0.0017, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0, "p_hpf_ramp": 0, "sound_vol": 0.3, "sample_rate": 44100, "sample_size": 8 },
            explosionLarge: { "oldParams": true, "wave_type": 3, "p_env_attack": 0, "p_env_sustain": 0.3331, "p_env_punch": 0.2926, "p_env_decay": 0.3540, "p_base_freq": 0.1086, "p_freq_limit": 0, "p_freq_ramp": 0, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0.1855, "p_pha_ramp": -0.2955, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0, "p_hpf_ramp": 0, "sound_vol": 0.4, "sample_rate": 44100, "sample_size": 8 },
            error: { "oldParams": true, "wave_type": 1, "p_env_attack": 0, "p_env_sustain": 0.1579, "p_env_punch": 0, "p_env_decay": 0.1758, "p_base_freq": 0.2731, "p_freq_limit": 0, "p_freq_ramp": 0, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0.0093, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0, "p_pha_ramp": 0, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0.1, "p_hpf_ramp": 0, "sound_vol": 0.25, "sample_rate": 44100, "sample_size": 8 },
            click: { preset: "hitHurt", sound_vol: 0.15 },
            click_off: { preset: "hitHurt", p_base_freq: 0.4, sound_vol: 0.1 },
            // Add more definitions here...
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