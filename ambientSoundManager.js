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
                        return {
                            baseVolume: 0.1,
                            texture: true,
                            lfoFreq: 0.7,
                            lfoDepthFactor: 0.10,
                            layers: [
                                { type: 'square', frequency: 45, volume: 0.5 }, // Heavy machinery
                                { type: 'sawtooth', frequency: 90, volume: 0.35, detune: 3 }, // Aggressive hum
                                { type: 'triangle', frequency: 135, volume: 0.25, detune: -2 } // Alert systems
                            ]
                        };
                    case 'alien':
                        return {
                            baseVolume: 0.42,
                            texture: true,
                            lfoFreq: 0.9,
                            lfoDepthFactor: 0.07,
                            layers: [
                                { type: 'sine', frequency: 120, volume: 0.4 }, // High-frequency alien tech
                                { type: 'triangle', frequency: 240, volume: 0.3, detune: 7 }, // Harmonic shimmer
                                { type: 'sine', frequency: 60, volume: 0.35, detune: -4 } // Sub-bass thrum
                            ]
                        };
                    case 'agricultural':
                        return {
                            baseVolume: 0.38,
                            texture: true,
                            lfoFreq: 0.45,
                            lfoDepthFactor: 0.06,
                            layers: [
                                { type: 'sine', frequency: 50, volume: 0.45 }, // Gentle organic hum
                                { type: 'triangle', frequency: 100, volume: 0.4, detune: 2 }, // Ventilation
                                { type: 'sine', frequency: 25, volume: 0.3 } // Low rumble
                            ]
                        };
                    case 'industrial':
                        return {
                            baseVolume: 0.1,
                            texture: true,
                            lfoFreq: 0.65,
                            lfoDepthFactor: 0.11,
                            layers: [
                                { type: 'sawtooth', frequency: 40, volume: 0.5 }, // Heavy industrial rumble
                                { type: 'square', frequency: 40, volume: 0.4, detune: -3 }, // Machinery
                                { type: 'triangle', frequency: 60, volume: 0.25, detune: 5 } // High-pitched whine
                            ]
                        };
                    case 'mining':
                        return {
                            baseVolume: 0.1,
                            texture: true,
                            lfoFreq: 0.55,
                            lfoDepthFactor: 0.10,
                            layers: [
                                { type: 'sawtooth', frequency: 35, volume: 0.5 }, // Drilling vibration
                                { type: 'square', frequency: 70, volume: 0.4, detune: 4 }, // Heavy equipment
                                { type: 'sine', frequency: 140, volume: 0.3, detune: -6 } // Compressor hum
                            ]
                        };
                    case 'tourism':
                        return {
                            baseVolume: 0.35,
                            texture: true,
                            lfoFreq: 0.4,
                            lfoDepthFactor: 0.2,
                            layers: [
                                { type: 'sine', frequency: 110, volume: 0.4 }, // Pleasant ambient
                                { type: 'triangle', frequency: 150, volume: 0.3, detune: 3 }, // Melodic harmony
                                { type: 'sine', frequency: 85, volume: 0.35 } // Comforting base
                            ]
                        };
                    case 'refinery':
                        return {
                            baseVolume: 0.1,
                            texture: true,
                            lfoFreq: 0.6,
                            lfoDepthFactor: 0.08,
                            layers: [
                                { type: 'sawtooth', frequency: 65, volume: 0.45 }, // Chemical processing
                                { type: 'square', frequency: 130, volume: 0.35, detune: 6 }, // Pumping systems
                                { type: 'triangle', frequency: 30, volume: 0.3 } // Low hiss
                            ]
                        };
                    case 'post human':
                        return {
                            baseVolume: 0.4,
                            texture: true,
                            lfoFreq: 1.0,
                            lfoDepthFactor: 0.07,
                            layers: [
                                { type: 'sine', frequency: 150, volume: 0.4 }, // Clean electronic
                                { type: 'triangle', frequency: 300, volume: 0.3, detune: 8 }, // Digital harmonics
                                { type: 'sine', frequency: 75, volume: 0.35, detune: -5 } // Subtle base
                            ]
                        };
                    case 'offworld':
                        return {
                            baseVolume: 0.38,
                            texture: true,
                            lfoFreq: 0.5,
                            lfoDepthFactor: 0.08,
                            layers: [
                                { type: 'sine', frequency: 90, volume: 0.4 }, // Open space hum
                                { type: 'triangle', frequency: 180, volume: 0.3, detune: 4 }, // Structural resonance
                                { type: 'sine', frequency: 45, volume: 0.35 } // Distant drone
                            ]
                        };
                    case 'service':
                        return {
                            baseVolume: 0.35,
                            texture: true,
                            lfoFreq: 0.6,
                            lfoDepthFactor: 0.09,
                            layers: [
                                { type: 'sine', frequency: 120, volume: 0.4 }, // Electronic hum
                                { type: 'triangle', frequency: 60, volume: 0.3, detune: -3 }, // Life support
                                { type: 'sine', frequency: 180, volume: 0.2, detune: 5 } // High tech whine
                            ]
                        };
                    case 'imperial':
                        return {
                            baseVolume: 0.4,
                            texture: true,
                            lfoFreq: 0.5,
                            lfoDepthFactor: 0.06,
                            layers: [
                                { type: 'sine', frequency: 85, volume: 0.45 }, // Regal depth
                                { type: 'triangle', frequency: 170, volume: 0.35, detune: 4 }, // Noble harmonics
                                { type: 'sine', frequency: 42.5, volume: 0.4, detune: -3 } // Stately base
                            ]
                        };
                    case 'separatist':
                        return {
                            baseVolume: 0.1,
                            texture: true,
                            lfoFreq: 0.6,
                            lfoDepthFactor: 0.1,
                            layers: [
                                { type: 'sawtooth', frequency: 50, volume: 0.5 }, // Rough machinery
                                { type: 'square', frequency: 100, volume: 0.4, detune: 5 }, // Industrial edge
                                { type: 'triangle', frequency: 25, volume: 0.35 } // Deep vibration
                            ]
                        };
                    default: // standard
                        return {
                            baseVolume: 0.4,
                            texture: true,
                            lfoFreq: 0.6,
                            lfoDepthFactor: 0.08,
                            layers: [
                                { type: 'sine', frequency: 55, volume: 0.45 }, // Deep machinery
                                { type: 'triangle', frequency: 50, volume: 0.4, detune: -5 } // Ventilation
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
