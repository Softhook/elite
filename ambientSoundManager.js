/**
 * AmbientSoundManager - Manages continuous ambient sounds for static solar system objects
 * Uses Web Audio API oscillators to create complex, layered hums and vibrations
 * Handles distance-based volume scaling and proper cleanup to prevent memory leaks
 */
class AmbientSoundManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.activeSources = new Map(); // Maps source ID to sound configuration
        this.enabled = true;
        this.globalVolume = 0.3; // Master volume for all ambient sounds
        this.maxDistance = 3000; // Maximum distance for sound audibility
        this.minVolume = 0.01; // Minimum volume threshold
        this.isDocked = false; // Track docked state
        this.dockedVolumeScale = 0.01; // Centralized docked attenuation

        this.initAudioContext();
    }

    /**
     * Initialize the shared audio context
     */
    initAudioContext() {
        if (typeof window !== 'undefined') {
            // Reuse the same AudioContext from SoundManager
            if (!window._eliteAudioContext) {
                window._eliteAudioContext = window.AudioContext ?
                    new window.AudioContext() : new window.webkitAudioContext();
            }
            this.audioContext = window._eliteAudioContext;

            // Create master gain node for all ambient sounds
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.globalVolume;
            this.masterGain.connect(this.audioContext.destination);

            // Create a simple convolution reverb (uses generated IR)
            try {
                this.reverbConvolver = this.audioContext.createConvolver();
                this.reverbGain = this.audioContext.createGain();
                this.reverbGain.gain.value = 0.6; // wet level for the convolver bus
                this.reverbConvolver.buffer = this._createImpulseResponse(1.5, 2.0);
                this.reverbConvolver.connect(this.reverbGain);
                this.reverbGain.connect(this.masterGain);
            } catch (e) {
                this.reverbConvolver = null;
            }

            // Create a tempo-friendly delay / ping-pong bus
            try {
                this.delayNode = this.audioContext.createDelay(5.0);
                this.delayNode.delayTime.value = 0.35; // default delay time
                this.delayFeedback = this.audioContext.createGain();
                this.delayFeedback.gain.value = 0.38;
                this.delayWet = this.audioContext.createGain();
                this.delayWet.gain.value = 0.45;

                // feedback loop: delay -> feedback -> delay
                this.delayNode.connect(this.delayFeedback);
                this.delayFeedback.connect(this.delayNode);
                this.delayNode.connect(this.delayWet);
                this.delayWet.connect(this.masterGain);
            } catch (e) {
                this.delayNode = null;
            }
        }
    }

    /**
     * Generate a simple impulse response buffer for a synthetic reverb
     * @param {number} duration Seconds
     * @param {number} decay Decay rate
     * @returns {AudioBuffer}
     */
    _createImpulseResponse(duration = 2, decay = 2) {
        if (!this.audioContext || !this.audioContext.createBuffer) return null;
        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const channel = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                // exponential decay noise
                channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }
        return impulse;
    }

    /**
     * Create a complex ambient sound using multiple oscillators
     * @param {string} sourceId - Unique identifier for this sound source
     * @param {object} profile - Sound profile configuration
     * @returns {object} Sound source configuration with oscillators and gain
     */
    createAmbientSound(sourceId, profile) {
        if (!this.audioContext || !this.enabled) return null;

        // Handle AudioContext state
        if (this.audioContext.state === 'suspended') {
            try {
                // Attempt resume but avoid verbose logging
                this.audioContext.resume().catch(e => console.warn('AmbientSoundManager: resume() rejected', e));
            } catch (e) {
                console.warn('AmbientSoundManager: resume() rejected', e);
            }
        } else if (this.audioContext.state === 'closed') {
            console.warn('AudioContext is closed, cannot create ambient sound');
            return null;
        }

        // Remove existing sound if it exists
        if (this.activeSources.has(sourceId)) {
            this.removeAmbientSound(sourceId);
        }

        const soundConfig = {
            id: sourceId,
            profile: profile,
            oscillators: [],
            gains: [],
            mainGain: this.audioContext.createGain(),
            position: null, // Will be set externally
            baseVolume: profile.baseVolume || 0.5,
            lastVolume: 0,
            cachedUndockedVolume: profile.baseVolume || 0.5,
            // Optional texture modulation (LFO)
            lfoOsc: null,
            modulationGains: []
        };

        // Create oscillator layers based on profile
        for (let layer of profile.layers) {
            const osc = this.audioContext.createOscillator();
            const layerGain = this.audioContext.createGain();

            osc.type = layer.type || 'sine';
            osc.frequency.value = layer.frequency;

            // Add detune if specified
            if (layer.detune) {
                osc.detune.value = layer.detune;
            }

            layerGain.gain.value = layer.volume || 0.3;

            // Connect: oscillator -> layer gain -> main gain -> master gain
            osc.connect(layerGain);
            layerGain.connect(soundConfig.mainGain);

            soundConfig.oscillators.push(osc);
            soundConfig.gains.push(layerGain);

            // Start the oscillator
            osc.start();
        }

        // If profile requests texture, add a low-frequency oscillator (LFO)
        // to subtly modulate each layer's gain and create beat-like textures.
        if (profile && profile.texture) {
            try {
                const lfo = this.audioContext.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = profile.lfoFreq || 0.6; // Hz

                // Create a small gain node per layer to scale the LFO signal
                for (let i = 0; i < soundConfig.gains.length; i++) {
                    const layerGainNode = soundConfig.gains[i];
                    const layerDef = profile.layers[i] || {};
                    const baseVol = layerDef.volume || 0.3;
                    const modDepthFactor = profile.lfoDepthFactor ?? 0.08;

                    const modGain = this.audioContext.createGain();
                    // modulation amplitude (kept small so overall gain stays positive)
                    modGain.gain.value = baseVol * modDepthFactor;

                    lfo.connect(modGain);
                    // connect modulation signal into the AudioParam of the layer gain
                    modGain.connect(layerGainNode.gain);
                    soundConfig.modulationGains.push(modGain);
                }

                lfo.start();
                soundConfig.lfoOsc = lfo;
            } catch (e) {
                // If the environment doesn't support some nodes, ignore gracefully
                console.warn('AmbientSoundManager: failed to create LFO texture', e);
            }
        }

        // Connect main gain to master
        soundConfig.mainGain.gain.value = 0; // Start muted, will be updated by distance
        // Routing: main -> panner -> master (dry)
        try {
            const panner = this.audioContext.createStereoPanner();
            soundConfig.panner = panner;
            soundConfig.mainGain.connect(panner);
            panner.connect(this.masterGain);
        } catch (e) {
            // fallback: direct to master
            soundConfig.mainGain.connect(this.masterGain);
            soundConfig.panner = null;
        }

        // Create per-source effect send gains and hook to global buses when available
        try {
            const reverbSend = this.audioContext.createGain();
            reverbSend.gain.value = (profile.reverbSend != null) ? profile.reverbSend : 0.06;
            soundConfig.reverbSend = reverbSend;
            soundConfig.mainGain.connect(reverbSend);
            if (this.reverbConvolver) reverbSend.connect(this.reverbConvolver);
        } catch (e) {
            soundConfig.reverbSend = null;
        }

        try {
            const delaySend = this.audioContext.createGain();
            delaySend.gain.value = (profile.delaySend != null) ? profile.delaySend : 0.05;
            soundConfig.delaySend = delaySend;
            soundConfig.mainGain.connect(delaySend);
            if (this.delayNode) delaySend.connect(this.delayNode);
        } catch (e) {
            soundConfig.delaySend = null;
        }

        this.activeSources.set(sourceId, soundConfig);
        return soundConfig;
    }

    /**
     * Remove an ambient sound and clean up resources
     * @param {string} sourceId - ID of the sound to remove
     */
    removeAmbientSound(sourceId) {
        const soundConfig = this.activeSources.get(sourceId);
        if (!soundConfig) return;

        try {
            // Stop and disconnect all oscillators
            for (let osc of soundConfig.oscillators) {
                try {
                    osc.stop();
                    osc.disconnect();
                } catch (e) {
                    // Oscillator may already be stopped
                }
            }

            // Disconnect all gain nodes
            for (let gain of soundConfig.gains) {
                try {
                    gain.disconnect();
                } catch (e) {
                    // Already disconnected
                }
            }

            // Disconnect main gain
            try {
                soundConfig.mainGain.disconnect();
            } catch (e) {
                // Already disconnected
            }
            // Disconnect and null panner
            try {
                if (soundConfig.panner) {
                    soundConfig.panner.disconnect();
                }
            } catch (e) { }

            // Disconnect effect sends
            try {
                if (soundConfig.reverbSend) soundConfig.reverbSend.disconnect();
            } catch (e) { }
            try {
                if (soundConfig.delaySend) soundConfig.delaySend.disconnect();
            } catch (e) { }
            // Stop and disconnect any LFO texture nodes
            try {
                if (soundConfig.lfoOsc) {
                    try {
                        soundConfig.lfoOsc.stop();
                    } catch (e) { }
                    try {
                        soundConfig.lfoOsc.disconnect();
                    } catch (e) { }
                }
            } catch (e) {
                // ignore
            }

            for (let mg of soundConfig.modulationGains || []) {
                try {
                    mg.disconnect();
                } catch (e) { }
            }
        } catch (e) {
            console.warn(`Error cleaning up ambient sound ${sourceId}:`, e);
        }

        this.activeSources.delete(sourceId);
    }

    /**
     * Update all ambient sound volumes based on player position
     * @param {p5.Vector} playerPos - Player's current position
     */
    updateSoundVolumes(playerPos) {
        if (!this.audioContext || !playerPos || !this.enabled) return;

        for (let [sourceId, soundConfig] of this.activeSources) {
            if (!soundConfig.position) continue;

            const distance = p5.Vector.dist(playerPos, soundConfig.position);

            // Calculate volume based on distance with falloff
            let volume = 0;
            if (distance < this.maxDistance) {
                // Inverse square falloff with minimum threshold
                const falloff = 1 - (distance / this.maxDistance);
                volume = soundConfig.baseVolume * Math.pow(falloff, 2);

                // Apply minimum threshold
                if (volume < this.minVolume) {
                    volume = 0;
                }
            }

            const adjustedVolume = this._applyDockedAttenuation(volume);

            soundConfig.lastVolume = adjustedVolume;
            if (!this.isDocked) {
                soundConfig.cachedUndockedVolume = adjustedVolume;
            }

            // Smooth volume changes to avoid clicking
            this._rampGain(soundConfig.mainGain.gain, adjustedVolume, 0.1);

            // Update stereo panning based on relative X position
            try {
                if (soundConfig.panner && soundConfig.position && playerPos) {
                    const dx = soundConfig.position.x - playerPos.x;
                    // Normalize pan by maxDistance (clamped to -1..1)
                    let pan = 0;
                    if (Math.abs(dx) > 0.0001) pan = Math.max(-1, Math.min(1, (dx / this.maxDistance) * 2));
                    const panParam = soundConfig.panner.pan;
                    const t = this.audioContext.currentTime;
                    try {
                        panParam.cancelScheduledValues(t);
                        panParam.setValueAtTime(panParam.value || 0, t);
                        panParam.linearRampToValueAtTime(pan, t + 0.12);
                    } catch (e) {
                        try { panParam.value = pan; } catch (_) { }
                    }
                }
            } catch (e) {
                // ignore panning errors
            }
        }
    }

    /**
     * Apply docked attenuation from a single, centralized factor.
     * @param {number} volume - Base volume before docked scaling
     * @returns {number} Attenuated volume
     */
    _applyDockedAttenuation(volume) {
        if (!this.isDocked) return volume;
        return Math.max(0, volume * this.dockedVolumeScale);
    }

    /**
     * Smoothly ramp an AudioParam toward the desired value.
     * @param {AudioParam} audioParam
     * @param {number} targetValue
     * @param {number} duration
     */
    _rampGain(audioParam, targetValue, duration = 0.15) {
        if (!this.audioContext || !audioParam) return;
        try {
            const currentTime = this.audioContext.currentTime;
            audioParam.cancelScheduledValues(currentTime);
            audioParam.setValueAtTime(audioParam.value, currentTime);
            audioParam.linearRampToValueAtTime(targetValue, currentTime + duration);
        } catch (e) {
            try {
                audioParam.value = targetValue;
            } catch (_) {
                // Ignore if AudioParam is not writable (should not happen in Web Audio)
            }
        }
    }

    /**
     * Set the docked state (mutes external sounds when docked)
     * @param {boolean} docked - Whether the player is docked
     */
    setDockedState(docked) {
        this.isDocked = docked;
        if (!this.audioContext) return;

        for (const soundConfig of this.activeSources.values()) {
            if (!soundConfig?.mainGain) continue;
            const gainParam = soundConfig.mainGain.gain;

            // Keep an undocked reference so we can restore when leaving dock.
            if (docked) {
                const resumeVolume = soundConfig.lastVolume ?? soundConfig.baseVolume;
                soundConfig.cachedUndockedVolume = resumeVolume;
            }

            const baseVolume = soundConfig.cachedUndockedVolume ?? soundConfig.lastVolume ?? soundConfig.baseVolume;
            const targetVolume = this._applyDockedAttenuation(baseVolume);
            const rampDuration = docked ? 0.12 : 0.2;
            this._rampGain(gainParam, targetVolume, rampDuration);
        }
    }

    /**
     * Clean up all ambient sounds
     */
    cleanup() {
        const sourceIds = Array.from(this.activeSources.keys());
        for (let sourceId of sourceIds) {
            this.removeAmbientSound(sourceId);
        }
        this.activeSources.clear();
    }

    /**
     * Enable or disable ambient sounds
     * @param {boolean} enabled - Whether ambient sounds should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.cleanup();
        }
    }

    /**
     * Get predefined sound profile for a solar system object
     * @param {string} objectType - Type of object (sun, station, planet, jumpgate)
     * @param {object} params - Additional parameters for customization
     * @returns {object} Sound profile configuration
     */
    static getSoundProfile(objectType, params = {}) {
        switch (objectType) {
            case 'nebula': {
                const t = (params.type || 'ion').toLowerCase();
                if (t === 'ion') {
                    return {
                        baseVolume: 0.28,
                        layers: [
                            { type: 'sine', frequency: 65, volume: 0.35 },
                            { type: 'triangle', frequency: 130, volume: 0.22, detune: 4 },
                            { type: 'sine', frequency: 18, volume: 0.18 } // low rumble
                        ]
                    };
                } else if (t === 'radiation') {
                    return {
                        baseVolume: 0.32,
                        layers: [
                            { type: 'sine', frequency: 95, volume: 0.28 },
                            { type: 'sine', frequency: 190, volume: 0.18, detune: -6 },
                            { type: 'triangle', frequency: 40, volume: 0.15 }
                        ]
                    };
                } else if (t === 'emp') {
                    return {
                        baseVolume: 0.30,
                        layers: [
                            { type: 'sine', frequency: 50, volume: 0.30 },
                            { type: 'sine', frequency: 200, volume: 0.16, detune: 8 },
                            { type: 'triangle', frequency: 25, volume: 0.20 },
                        ]
                    };
                }
                return { baseVolume: 0.28, layers: [{ type: 'sine', frequency: 90, volume: 0.3 }] };
            }

            case 'storm': {
                const t = (params.type || 'electromagnetic').toLowerCase();
                if (t === 'electromagnetic') {
                    return {
                        baseVolume: 0.38,
                        layers: [
                            { type: 'sine', frequency: 140, volume: 0.32 },
                            { type: 'sine', frequency: 280, volume: 0.18, detune: 12 },
                            { type: 'triangle', frequency: 60, volume: 0.22 },
                            { type: 'square', frequency: 300, volume: 0.15, detune: 3 },
                        ]
                    };
                } else if (t === 'gravitational') {
                    return {
                        baseVolume: 0.36,
                        layers: [
                            { type: 'triangle', frequency: 30, volume: 0.30 },
                            { type: 'sine', frequency: 60, volume: 0.24, detune: -7 },
                            { type: 'sine', frequency: 15, volume: 0.18 },
                            { type: 'square', frequency: 220, volume: 0.15, detune: 3 },
                        ]
                    };
                } else if (t === 'radiation') {
                    return {
                        baseVolume: 0.40,
                        layers: [
                            { type: 'sine', frequency: 220, volume: 0.26 },
                            { type: 'sine', frequency: 440, volume: 0.14, detune: 9 },
                            { type: 'triangle', frequency: 90, volume: 0.20 }
                        ]
                    };
                }
                return { baseVolume: 0.34, layers: [{ type: 'sine', frequency: 120, volume: 0.3 }] };
            }
            case 'sun':
                return {
                    baseVolume: 0.6,
                    layers: [
                        { type: 'sine', frequency: 40, volume: 0.4 }, // Deep rumble
                        { type: 'sine', frequency: 80, volume: 0.3, detune: 5 }, // Harmonic
                        { type: 'sine', frequency: 120, volume: 0.15, detune: -7 }, // Higher harmonic
                        { type: 'triangle', frequency: 30, volume: 0.2 } // Sub-bass vibration
                    ]
                };

            case 'station':
                const stationType = (params.type || 'standard').toLowerCase();
                switch (stationType) {
                    case 'military':
                        // Tense, industrial, disciplined - tritone intervals, march-like 4/4 rhythm
                        // Root: 55Hz (A1), Tritone: 77.78Hz (D#2) - the "devil's interval" for tension
                        return {
                            baseVolume: 0.12,
                            texture: true,
                            lfoFreq: 1.0,           // March tempo ~60 BPM subdivided
                            lfoDepthFactor: 0.15,    // Strong rhythmic pulse
                            reverbSend: 0.03,        // Minimal reverb - tight, controlled
                            delaySend: 0.02,
                            layers: [
                                { type: 'square', frequency: 55, volume: 0.45 },        // Root A1 - harsh, disciplined
                                { type: 'sawtooth', frequency: 77.78, volume: 0.35, detune: 0 },  // Tritone - tension
                                { type: 'square', frequency: 110, volume: 0.25, detune: 5 },     // Octave - reinforcement
                                { type: 'triangle', frequency: 27.5, volume: 0.30 },    // Sub-bass pulse
                                { type: 'sawtooth', frequency: 220, volume: 0.15, detune: -8 }   // High alert whine
                            ]
                        };
                    case 'alien':
                        // Otherworldly, mysterious, crystalline - microtonal, exotic intervals (7ths, 9ths)
                        // Root: 110Hz, Major 7th: 207.65Hz, 9th: 246.94Hz - ethereal chord
                        return {
                            baseVolume: 0.38,
                            texture: true,
                            lfoFreq: 0.33,           // Slow, alien breathing rhythm
                            lfoDepthFactor: 0.12,
                            reverbSend: 0.20,        // Heavy reverb for vastness
                            delaySend: 0.15,         // Echo for otherworldly feel
                            layers: [
                                { type: 'sine', frequency: 110, volume: 0.35, detune: 23 },      // Microtonally shifted root
                                { type: 'sine', frequency: 207.65, volume: 0.30, detune: -17 },  // Major 7th, shimmer
                                { type: 'triangle', frequency: 246.94, volume: 0.25, detune: 31 }, // 9th, crystalline
                                { type: 'sine', frequency: 55, volume: 0.20, detune: 11 },       // Sub-bass, pulsing
                                { type: 'sine', frequency: 440, volume: 0.12, detune: -23 },     // High harmonic glitter
                                { type: 'triangle', frequency: 165, volume: 0.18, detune: 7 }    // Perfect 5th overtone
                            ]
                        };
                    case 'agricultural':
                        // Pastoral, organic, peaceful - major chord (C-E-G), warm sine waves
                        // Root: 65.41Hz (C2), Major 3rd: 82.41Hz (E2), 5th: 98Hz (G2)
                        return {
                            baseVolume: 0.35,
                            texture: true,
                            lfoFreq: 0.15,           // Very slow breathing, like crops swaying
                            lfoDepthFactor: 0.08,    // Subtle modulation
                            reverbSend: 0.12,        // Warm, open reverb
                            delaySend: 0.04,
                            layers: [
                                { type: 'sine', frequency: 65.41, volume: 0.40 },       // Root C2 - warm foundation
                                { type: 'sine', frequency: 82.41, volume: 0.32, detune: 3 },  // Major 3rd - happiness
                                { type: 'sine', frequency: 98, volume: 0.28, detune: -2 },    // Perfect 5th - stability
                                { type: 'triangle', frequency: 130.81, volume: 0.18 },  // Octave, gentle
                                { type: 'sine', frequency: 32.70, volume: 0.22 }        // Sub-bass earth rumble
                            ]
                        };
                    case 'industrial':
                        // Mechanical, rhythmic, grinding - polyrhythmic beating, power chord
                        // Root: 41.2Hz (E1), 5th: 61.74Hz (B1), dissonant 4th: 55Hz for grind
                        return {
                            baseVolume: 0.14,
                            texture: true,
                            lfoFreq: 0.8,            // Fast mechanical pulse
                            lfoDepthFactor: 0.18,    // Heavy pumping rhythm
                            reverbSend: 0.04,        // Tight industrial space
                            delaySend: 0.08,         // Rhythmic echo
                            layers: [
                                { type: 'sawtooth', frequency: 41.2, volume: 0.50 },    // Low grinding root
                                { type: 'square', frequency: 82.4, volume: 0.40, detune: -5 },  // Octave machinery
                                { type: 'sawtooth', frequency: 61.74, volume: 0.35, detune: 7 }, // 5th - power
                                { type: 'square', frequency: 55, volume: 0.30, detune: 3 },     // 4th - beating against 5th
                                { type: 'triangle', frequency: 123.47, volume: 0.20, detune: -10 }, // High grind
                                { type: 'sawtooth', frequency: 20.6, volume: 0.25 }     // Sub-bass rumble
                            ]
                        };
                    case 'mining':
                        // Cavernous, heavy, drilling - very low frequencies, strong pulse
                        // Root: 27.5Hz (A0), 5th: 41.2Hz, emphasis on sub-bass
                        return {
                            baseVolume: 0.15,
                            texture: true,
                            lfoFreq: 0.4,            // Slower drill rhythm
                            lfoDepthFactor: 0.22,    // Heavy modulation for drilling effect
                            reverbSend: 0.15,        // Cavernous reverb
                            delaySend: 0.10,         // Echo in the mine shafts
                            layers: [
                                { type: 'sine', frequency: 27.5, volume: 0.50 },        // Sub-bass - feel it in your chest
                                { type: 'sawtooth', frequency: 41.2, volume: 0.40, detune: 6 },  // 5th - resonant
                                { type: 'square', frequency: 55, volume: 0.35, detune: -4 },     // Octave - drilling
                                { type: 'triangle', frequency: 82.4, volume: 0.25, detune: 8 },  // Higher harmonic
                                { type: 'sine', frequency: 20, volume: 0.30 },          // Infra-bass rumble
                                { type: 'square', frequency: 110, volume: 0.18, detune: -12 }    // Machinery whine
                            ]
                        };
                    case 'tourism':
                        // Luxurious, pleasant, melodic - Major 7th chord, jazzy
                        // Root: 130.81Hz (C3), 3rd: 164.81Hz (E3), 5th: 196Hz (G3), 7th: 246.94Hz (B3)
                        return {
                            baseVolume: 0.32,
                            texture: true,
                            lfoFreq: 0.25,           // Smooth, relaxed modulation
                            lfoDepthFactor: 0.06,    // Subtle shimmer
                            reverbSend: 0.18,        // Lush, spacious reverb
                            delaySend: 0.12,         // Warm delays
                            layers: [
                                { type: 'sine', frequency: 130.81, volume: 0.38 },      // Root C3 - warm
                                { type: 'sine', frequency: 164.81, volume: 0.30, detune: 2 },  // Major 3rd
                                { type: 'triangle', frequency: 196, volume: 0.28, detune: -3 }, // 5th
                                { type: 'sine', frequency: 246.94, volume: 0.22, detune: 5 },  // Major 7th - jazzy
                                { type: 'sine', frequency: 65.41, volume: 0.25 },       // Octave below root
                                { type: 'triangle', frequency: 293.66, volume: 0.15, detune: -2 } // 9th for extra lushness
                            ]
                        };
                    case 'refinery':
                        // Chemical, processing, hissing - mid-high harmonics, irregular, metallic
                        // Root: 73.42Hz (D2), minor 3rd: 87.31Hz (F2), dim 5th: 103.83Hz - dark, chemical
                        return {
                            baseVolume: 0.12,
                            texture: true,
                            lfoFreq: 0.75,           // Irregular processing rhythm
                            lfoDepthFactor: 0.14,    // Pumping, hissing
                            reverbSend: 0.06,        // Industrial echo
                            delaySend: 0.09,
                            layers: [
                                { type: 'sawtooth', frequency: 73.42, volume: 0.42 },   // Root - grinding
                                { type: 'square', frequency: 87.31, volume: 0.35, detune: 4 },  // Minor 3rd - dark
                                { type: 'sawtooth', frequency: 103.83, volume: 0.30, detune: -6 }, // Dim 5th - unstable
                                { type: 'triangle', frequency: 146.83, volume: 0.25, detune: 10 }, // Octave whine
                                { type: 'square', frequency: 220, volume: 0.18, detune: -15 },  // High hiss
                                { type: 'sine', frequency: 36.71, volume: 0.28 }        // Sub-bass
                            ]
                        };
                    case 'post human':
                        // Digital, ethereal, transcendent - pure sines, wide intervals (octave + 5th)
                        // Root: 174.61Hz (F3), Octave: 349.23Hz, Perfect 5th above that: 523.25Hz
                        return {
                            baseVolume: 0.36,
                            texture: true,
                            lfoFreq: 1.5,            // Fast digital shimmer
                            lfoDepthFactor: 0.05,    // Subtle, precise
                            reverbSend: 0.22,        // Vast digital space
                            delaySend: 0.18,         // Clean digital echoes
                            layers: [
                                { type: 'sine', frequency: 174.61, volume: 0.35 },      // Pure root F3
                                { type: 'sine', frequency: 349.23, volume: 0.28, detune: 2 },  // Perfect octave
                                { type: 'sine', frequency: 523.25, volume: 0.22, detune: -3 }, // 5th above octave
                                { type: 'triangle', frequency: 87.31, volume: 0.25 },   // Sub-octave warmth
                                { type: 'sine', frequency: 698.46, volume: 0.15, detune: 5 },  // High digital sparkle
                                { type: 'sine', frequency: 261.63, volume: 0.20, detune: -2 }  // 5th for fullness
                            ]
                        };
                    case 'offworld':
                        // Vast, isolated, frontier - open 5ths, sparse, lonely
                        // Root: 82.41Hz (E2), Perfect 5th: 123.47Hz (B2) - open, wide sound
                        return {
                            baseVolume: 0.34,
                            texture: true,
                            lfoFreq: 0.12,           // Very slow, isolated breathing
                            lfoDepthFactor: 0.10,
                            reverbSend: 0.25,        // Huge, empty reverb
                            delaySend: 0.20,         // Long, lonely echoes
                            layers: [
                                { type: 'sine', frequency: 82.41, volume: 0.40 },       // Root E2 - foundation
                                { type: 'sine', frequency: 123.47, volume: 0.35, detune: 4 },  // Perfect 5th - open
                                { type: 'triangle', frequency: 164.81, volume: 0.25, detune: -5 }, // Octave
                                { type: 'sine', frequency: 41.2, volume: 0.28 },        // Sub-bass - vast space
                                { type: 'sine', frequency: 246.94, volume: 0.15, detune: 7 }   // High, distant harmonic
                            ]
                        };
                    case 'service':
                        // Functional, clean, efficient - simple intervals, steady, neutral
                        // Root: 110Hz (A2), 5th: 165Hz (E3), Octave: 220Hz - clean, functional
                        return {
                            baseVolume: 0.32,
                            texture: true,
                            lfoFreq: 0.5,            // Steady, regular pulse
                            lfoDepthFactor: 0.07,    // Subtle, not distracting
                            reverbSend: 0.08,        // Clean, functional reverb
                            delaySend: 0.05,
                            layers: [
                                { type: 'sine', frequency: 110, volume: 0.40 },         // Root A2
                                { type: 'triangle', frequency: 165, volume: 0.32, detune: 3 },  // Perfect 5th
                                { type: 'sine', frequency: 220, volume: 0.25, detune: -2 },    // Octave
                                { type: 'sine', frequency: 55, volume: 0.22 },          // Sub-octave
                                { type: 'triangle', frequency: 330, volume: 0.12, detune: 4 }  // 2nd harmonic
                            ]
                        };
                    case 'imperial':
                        // Regal, majestic, ceremonial - Perfect 5ths/4ths, brass-like, slow grandeur
                        // Root: 98Hz (G2), 4th: 130.81Hz (C3), 5th: 146.83Hz (D3) - fanfare chord
                        return {
                            baseVolume: 0.38,
                            texture: true,
                            lfoFreq: 0.2,            // Slow, stately modulation
                            lfoDepthFactor: 0.06,    // Dignified, controlled
                            reverbSend: 0.16,        // Grand hall reverb
                            delaySend: 0.08,
                            layers: [
                                { type: 'triangle', frequency: 98, volume: 0.42 },      // Root G2 - brass-like
                                { type: 'triangle', frequency: 130.81, volume: 0.35, detune: 2 }, // Perfect 4th
                                { type: 'sine', frequency: 146.83, volume: 0.32, detune: -3 },  // Perfect 5th
                                { type: 'triangle', frequency: 196, volume: 0.25, detune: 4 },  // Octave - majesty
                                { type: 'sine', frequency: 49, volume: 0.30 },          // Sub-bass power
                                { type: 'triangle', frequency: 293.66, volume: 0.15, detune: -2 } // High harmonic
                            ]
                        };
                    case 'separatist':
                        // Gritty, rebellious, rough - dissonant minor 2nds, irregular, distorted
                        // Root: 55Hz (A1), minor 2nd: 58.27Hz (Bb1), 5th: 82.41Hz - dissonant, tense
                        return {
                            baseVolume: 0.13,
                            texture: true,
                            lfoFreq: 0.7,            // Irregular, restless rhythm  
                            lfoDepthFactor: 0.20,    // Heavy, aggressive modulation
                            reverbSend: 0.05,        // Gritty, close
                            delaySend: 0.06,
                            layers: [
                                { type: 'sawtooth', frequency: 55, volume: 0.48 },      // Root - rough
                                { type: 'square', frequency: 58.27, volume: 0.40, detune: 8 },  // Minor 2nd - CLASH
                                { type: 'sawtooth', frequency: 82.41, volume: 0.35, detune: -5 }, // 5th - some stability
                                { type: 'square', frequency: 110, volume: 0.28, detune: 12 },   // Octave - harsh
                                { type: 'sawtooth', frequency: 27.5, volume: 0.32 },    // Sub-bass aggression
                                { type: 'square', frequency: 116.54, volume: 0.20, detune: -10 } // Minor 2nd up high
                            ]
                        };
                    default: // standard
                        // Neutral, balanced - simple major chord, pleasant but unremarkable
                        // Root: 73.42Hz (D2), 3rd: 92.5Hz (F#2), 5th: 110Hz (A2)
                        return {
                            baseVolume: 0.35,
                            texture: true,
                            lfoFreq: 0.45,
                            lfoDepthFactor: 0.08,
                            reverbSend: 0.10,
                            delaySend: 0.06,
                            layers: [
                                { type: 'sine', frequency: 73.42, volume: 0.42 },       // Root D2
                                { type: 'triangle', frequency: 92.5, volume: 0.32, detune: 2 }, // Major 3rd
                                { type: 'sine', frequency: 110, volume: 0.28, detune: -3 },    // 5th
                                { type: 'sine', frequency: 36.71, volume: 0.25 }        // Sub-octave
                            ]
                        };
                }

            case 'jumpgate':
                return {
                    baseVolume: 0.5,
                    layers: [
                        { type: 'sine', frequency: 150, volume: 0.35 }, // Spatial hum
                        { type: 'sine', frequency: 300, volume: 0.2, detune: 10 }, // Harmonic shimmer
                        { type: 'triangle', frequency: 75, volume: 0.3 }, // Low vibration
                        { type: 'sine', frequency: 450, volume: 0.1, detune: -15 } // High frequency sparkle
                    ]
                };

            case 'planet':
                // Customize planet sound based on color and rings
                const hasRings = params.hasRings || false;
                const colorValue = params.colorValue || 150; // 0-255, affects frequency

                // Map color to frequency range (100-200 Hz)
                const baseFreq = 100 + (colorValue / 255) * 100;

                const layers = [
                    { type: 'sine', frequency: baseFreq, volume: 0.3 }, // Atmospheric hum
                    { type: 'triangle', frequency: baseFreq * 0.5, volume: 0.2 } // Deep resonance
                ];

                // Add ring harmonics if planet has rings
                if (hasRings) {
                    layers.push(
                        { type: 'sine', frequency: baseFreq * 1.5, volume: 0.15, detune: 8 },
                        { type: 'sine', frequency: baseFreq * 2, volume: 0.1, detune: -5 }
                    );
                }

                return {
                    baseVolume: 0.35,
                    layers: layers
                };

            default:
                return {
                    baseVolume: 0.3,
                    layers: [
                        { type: 'sine', frequency: 100, volume: 0.3 }
                    ]
                };
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.AmbientSoundManager = AmbientSoundManager;
}
