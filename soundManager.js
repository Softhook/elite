/**
 * Manages sound effects using the sfxr library.
 * Pre-generates audio objects for efficient playback.
 */
class SoundManager {
    constructor() {
        console.log("SoundManager constructor called.");
        this.sounds = {}; // To store pre-generated Audio objects
        this.soundDefinitions = {
            // --- Define your sounds here ---
            laser: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.18250660789357057,
                "p_env_punch": 0.2932019190496591,
                "p_env_decay": 0.3986028717732939,
                "p_base_freq": 0.8628102960070837,
                "p_freq_limit": 0.2,
                "p_freq_ramp": -0.2850801894176162,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.4379486065352251,
                "p_duty_ramp": -0.3895004729693512,
                "p_repeat_speed": 0,
                "p_pha_offset": 0.19416251714244942,
                "p_pha_ramp": -0.16390798268012602,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.06714956984328685,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
              },
            pickupCoin: {
                preset: "pickupCoin",
                sound_vol: 0.2
            },
            explosionSmall: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0,
                "p_env_sustain": 0.2443806802517754,
                "p_env_punch": 0.41648357955722415,
                "p_env_decay": 0.005025854596367063,
                "p_base_freq": 0.10509649288694092,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.3072428394133748,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0.21613190751642558,
                "p_pha_ramp": -0.0017432590244132128,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.3,
                "sample_rate": 44100,
                "sample_size": 8
              },
            explosionLarge: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0,
                "p_env_sustain": 0.33309818542473,
                "p_env_punch": 0.2926081885643061,
                "p_env_decay": 0.3540035771583934,
                "p_base_freq": 0.10864615070830633,
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
                "p_pha_offset": 0.18548141385249534,
                "p_pha_ramp": -0.2954808340709498,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.4,
                "sample_rate": 44100,
                "sample_size": 8
              },
            error: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.15791999965319514,
                "p_env_punch": 0,
                "p_env_decay": 0.17578042395915197,
                "p_base_freq": 0.2731300471997886,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.009252407422993603,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.1,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
              },
            click: {
                preset: "hitHurt",
                sound_vol: 0.15
            },
            click_off: {
                preset: "hitHurt",
                p_base_freq: 0.4,
                sound_vol: 0.1
            },
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

        console.log("SoundManager initSounds starting. Audio Context State:", getAudioContext().state);
        console.log("Initializing SoundManager sounds (Normal & Quiet versions)...");
        for (const name in this.soundDefinitions) {
            try {
                const originalDefinition = this.soundDefinitions[name];
                // Ensure base volume exists in the original definition
                if (originalDefinition.sound_vol === undefined) {
                    originalDefinition.sound_vol = 0.25; // Default if not specified
                }

                this.sounds[name] = {
                    definition: originalDefinition, // Store original for reference
                    audioNormal: null,
                    audioQuiet: null
                };

                let generatedAudioNormal = null;
                let generatedAudioQuiet = null;

                // --- Generate Normal Volume Sound ---
                console.log(`   Generating '${name}' (Normal)...`);
                if (originalDefinition.preset && typeof originalDefinition.preset === 'string') {
                    // Use a temporary object for generation to avoid modifying originalDefinition
                    let tempParamsNormal = { ...originalDefinition };
                    const soundDataNormal = sfxr.generate(tempParamsNormal.preset);
                    soundDataNormal.sound_vol = tempParamsNormal.sound_vol; // Apply defined volume
                    generatedAudioNormal = sfxr.toAudio(soundDataNormal);
                } else {
                    // Custom params - sfxr.toAudio uses the definition directly
                    generatedAudioNormal = sfxr.toAudio(originalDefinition);
                }

                // Validate Normal Audio
                // --- ADJUSTED VALIDATION: Accept any object with a .play() method ---
                if (generatedAudioNormal && typeof generatedAudioNormal.play === 'function') {
                    this.sounds[name].audioNormal = generatedAudioNormal;
                    // Log whether it looks like a standard element or not
                    if (typeof generatedAudioNormal.volume !== 'undefined') {
                        console.log(`      -> Normal Audio object for '${name}' seems valid (Standard HTMLAudioElement).`);
                    } else {
                        console.log(`      -> Normal Audio object for '${name}' seems valid (Custom sfxr object with play method).`);
                    }
                } else {
                    console.error(`   Failed to create a playable Normal Audio object for '${name}'. Object received:`, generatedAudioNormal);
                }

                // --- Generate Quiet Volume Sound ---
                console.log(`   Generating '${name}' (Quiet)...`);
                // Create a deep copy for modification if it's custom params
                // For presets, we modify the generated soundData volume
                let quietVolume = constrain(originalDefinition.sound_vol * OFFSCREEN_VOLUME_REDUCTION_FACTOR, 0.0, 1.0);

                if (originalDefinition.preset && typeof originalDefinition.preset === 'string') {
                    // Re-generate using the preset but override volume
                    let tempParamsQuiet = { ...originalDefinition }; // Use copy
                    const soundDataQuiet = sfxr.generate(tempParamsQuiet.preset);
                    soundDataQuiet.sound_vol = quietVolume; // Apply REDUCED volume
                    generatedAudioQuiet = sfxr.toAudio(soundDataQuiet);
                } else {
                    // Custom params: Create a copy and modify its volume
                    let quietDefinition = { ...originalDefinition }; // Shallow copy is enough here
                    quietDefinition.sound_vol = quietVolume; // Apply REDUCED volume
                    generatedAudioQuiet = sfxr.toAudio(quietDefinition);
                }

                // Validate Quiet Audio
                // --- ADJUSTED VALIDATION: Accept any object with a .play() method ---
                if (generatedAudioQuiet && typeof generatedAudioQuiet.play === 'function') {
                    this.sounds[name].audioQuiet = generatedAudioQuiet;
                    // Log whether it looks like a standard element or not
                    let quietVolumeLog = constrain(originalDefinition.sound_vol * OFFSCREEN_VOLUME_REDUCTION_FACTOR, 0.0, 1.0);
                    if (typeof generatedAudioQuiet.volume !== 'undefined') {
                         console.log(`      -> Quiet Audio object for '${name}' seems valid (Standard HTMLAudioElement, Vol: ${quietVolumeLog.toFixed(2)}).`);
                    } else {
                         console.log(`      -> Quiet Audio object for '${name}' seems valid (Custom sfxr object with play method, Target Vol: ${quietVolumeLog.toFixed(2)}).`);
                    }
                } else {
                    console.error(`   Failed to create a playable Quiet Audio object for '${name}'. Object received:`, generatedAudioQuiet);
                }

            } catch (error) {
                console.error(`SoundManager Error: Failed during generation for sound '${name}':`, error);
                // If a catastrophic error occurs, we might still want to delete,
                // but let's keep the entry even then for now to avoid the 'not found' warning.
            }
        }
        console.log("SoundManager initSounds finished. Generated sounds entries:", Object.keys(this.sounds).length);
        // console.log("Generated sound objects:", this.sounds); // This might be too verbose now
    }

    /**
     * Plays a sound originating from a specific world location.
     * Volume is reduced if the source is off-screen relative to the listener.
     * @param {string} name - The name of the sound effect.
     * @param {number} sourceX - World X coordinate of the sound source.
     * @param {number} sourceY - World Y coordinate of the sound source.
     * @param {p5.Vector} listenerPos - The world position of the listener (player).
     */
    playWorldSound(name, sourceX, sourceY, listenerPos) {
        if (typeof sfxr === 'undefined') return;

        const soundEntry = this.sounds[name];
        // Check if the entry exists at all
        if (!soundEntry) {
            console.warn(`playWorldSound: Sound entry '${name}' not found.`);
            return;
        }

        // --- Visibility Check ---
        let isVisible = true;
        let reason = "Default (On-Screen/No Check)";
        if (listenerPos && typeof width !== 'undefined' && typeof height !== 'undefined') {
            let tx = width / 2 - listenerPos.x; let ty = height / 2 - listenerPos.y;
            const screenLeft = -tx; const screenRight = -tx + width;
            const screenTop = -ty; const screenBottom = -ty + height;
            isVisible = (sourceX >= screenLeft && sourceX <= screenRight &&
                         sourceY >= screenTop  && sourceY <= screenBottom);
            reason = isVisible ? "On-Screen" : "Off-Screen";
        } else { reason = "Check Failed"; }
        // --- End Visibility Check ---

        // --- Select Audio Object ---
        let audioToPlay = null;
        let versionSelected = "None";
        if (isVisible) {
            audioToPlay = soundEntry.audioNormal;
            versionSelected = "Normal";
        } else {
            // Prefer quiet version, but fall back to normal if quiet failed to generate
            audioToPlay = soundEntry.audioQuiet || soundEntry.audioNormal;
            versionSelected = soundEntry.audioQuiet ? "Quiet" : "Normal (Fallback)";
        }
        // --- End Select Audio Object ---

        // Check if a valid audio object was selected/generated
        // --- Keep this check ---
        if (!audioToPlay || typeof audioToPlay.play !== 'function') {
             console.warn(`playWorldSound: No valid audio object ('${versionSelected}') found for '${name}' (Visible: ${isVisible}).`);
             return;
        }

        // --- Log Selection ---
        // Get base volume from original definition for logging comparison
        const baseVolume = soundEntry.definition.sound_vol || 0.25;
        // Determine the INTENDED volume based on visibility for logging purposes
        const intendedVolume = isVisible ? baseVolume : constrain(baseVolume * OFFSCREEN_VOLUME_REDUCTION_FACTOR, 0.0, 1.0);
        console.log(`playWorldSound: '${name}' | Status: ${reason} | Selected: ${versionSelected} | BaseVol: ${baseVolume.toFixed(2)} | IntendedVol: ${intendedVolume.toFixed(2)}`);
        // --- End Log Selection ---

        try {
            // --- Play the selected pre-generated sound ---
            // Volume was set during generation (either via .sound_vol or .setVolume implicitly by sfxr)
            audioToPlay.currentTime = 0; // Attempt to reset time (might not work on custom object)
            audioToPlay.play();
        } catch (e) {
            console.error(`SoundManager: Error playing sound "${name}" (${versionSelected}):`, e);
        }
    }

    /**
     * Plays a UI or non-positioned sound at its base volume.
     * @param {string} name - The name of the sound effect.
     * @param {number} [volMultiplier=1.0] - Optional multiplier for the base volume.
     */
    playSound(name, volMultiplier = 1.0) {
        // This plays UI sounds etc. Always use the 'Normal' version.
        if (typeof sfxr === 'undefined') return;

        const soundEntry = this.sounds[name];
        // Check if entry and the 'Normal' audio exist and are playable
        if (!soundEntry || !soundEntry.audioNormal || typeof soundEntry.audioNormal.play !== 'function') {
            console.warn(`playSound: Sound '${name}' (Normal) not found or is not playable.`);
            return;
        }

        const audioToPlay = soundEntry.audioNormal; // Always use normal for non-world sounds

        try {
            // Apply optional multiplier if needed
            // This might only work reliably if it's a standard HTMLAudioElement
            if (typeof audioToPlay.volume !== 'undefined' && volMultiplier !== 1.0) {
                const baseVol = soundEntry.definition.sound_vol || 0.25; // Use definition vol as base
                const finalVolume = constrain(baseVol * volMultiplier, 0.0, 1.0);
                audioToPlay.volume = finalVolume;
                console.log(`playSound: Applied volume multiplier ${volMultiplier} to '${name}'. New vol: ${finalVolume.toFixed(2)}`);
            } else if (volMultiplier !== 1.0) {
                console.warn(`playSound: Cannot apply volume multiplier to non-standard audio object for '${name}'.`);
                // If it's the custom object, we might try its setVolume if needed, but let's skip for now.
            }

            audioToPlay.currentTime = 0; // Attempt reset
            audioToPlay.play();

            // Optional: Reset volume if it's a standard object and multiplier was used
            // if (typeof audioToPlay.volume !== 'undefined' && volMultiplier !== 1.0) {
            //     audioToPlay.volume = soundEntry.definition.sound_vol || 0.25;
            // }

        } catch (e) {
            console.error(`SoundManager: Error playing sound "${name}" (Normal):`, e);
        }
    }

    /**
     * Plays an explosion sound, adjusting volume based on world position.
     * @param {number} size - Size parameter to influence sound choice.
     * @param {number} sourceX - World X coordinate of the explosion.
     * @param {number} sourceY - World Y coordinate of the explosion.
     * @param {p5.Vector} listenerPos - The world position of the listener (player).
     */
    playExplosion(size = 30, sourceX, sourceY, listenerPos) {
        if (!listenerPos) {
             console.warn("SoundManager.playExplosion: listenerPos is required.");
             return;
        }
        if (size > 60) {
            this.playWorldSound('explosionLarge', sourceX, sourceY, listenerPos);
        } else {
            this.playWorldSound('explosionSmall', sourceX, sourceY, listenerPos);
        }
    }
}