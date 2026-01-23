/**
 * SpaceMusicManager - Aeolian harp-style ambient music for space flight
 * Creates subtle, evolving drone pads with slow harmonic changes
 * Designed to complement ambient tones without overwhelming the soundscape
 */
class SpaceMusicManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.oscillators = [];
        this.gainNodes = [];
        this.lfoOscillators = [];
        this.lfoGains = [];
        this.filter = null;
        this.filterLFO = null;
        this.filterLFOGain = null;

        this.isPlaying = false;
        this.isInitialized = false;
        this.enabled = true;

        // Volume settings
        this.baseVolume = 0.85; // Subtle background presence
        this.targetVolume = 0;
        this.baseFilterFreq = 600;
        this.filterResonance = 1.5;
        this.filterSweepRange = 250;
        this.pitchDriftAmount = 2;

        // LFO settings for breathing effect
        this.breathingSpeed = 0.02; // Hz - reduced from 0.05 for slower breathing
        this.breathingAmount = 0.15; // Intensity of volume pulsing (0-1)
        this.filterSweepSpeed = 0.012; // Hz - reduced from 0.03 for slower sweep
        this.saturationAmount = 40;
        this.reverbLushness = 0.35;
        this.sparkleChance = 0.4;
        this.sparkleMinDuration = 10;
        this.sparkleMaxDuration = 30;
        this.stereoSpread = 0.8; // 0 to 1
        this.detuneRange = 1.0; // Multiplier for base detunes
        this.driftSpeed = 0.07; // Hz for pitch drift
        this.evolutionRate = 25; // Seconds between texture shifts

        // Long-term variety state
        this.lastVarietyUpdate = 0;
        this.varietyCycle = 0;
        this.sparkleOscillators = [];
        this.sparkleGains = [];
        this.baseDetunes = [0.5, -0.8, 1.2, -0.5, 0.3];
        this.currentDetunes = [...this.baseDetunes];
        this.oscType = 'triangle';

        // Timeout reference for cleaning up after fade-out
        this.stopTimeout = null;

        // --- PASTE EXPORTED PARAMETERS HERE ---
        // Pure Sine Configuration - Smooth and steady
        // Current Space Music Configuration
        this.updateParams({
            "breathingSpeed": 0.05,
            "filterSweepSpeed": 0.001,
            "filterSweepRange": 90,
            "baseFilterFreq": 240,
            "filterResonance": 0.6,
            "pitchDriftAmount": 6.5,
            "saturationAmount": 2,
            "reverbLushness": 0.25,
            "sparkleChance": 0.55,
            "baseVolume": 0.34,
            "stereoSpread": 1,
            "detuneRange": 0.7,
            "evolutionRate": 51,
            "oscType": "sawtooth",
            "breathingAmount": 0.15,
            "driftSpeed": 0.371
        });
        // --------------------------------------

        this.initAudioContext();
    }

    /**
     * Initialize the shared audio context and create audio graph
     */
    initAudioContext() {
        if (typeof window === 'undefined') return;

        // Reuse the same AudioContext from other audio managers
        if (!window._eliteAudioContext) {
            window._eliteAudioContext = window.AudioContext ?
                new window.AudioContext() : new window.webkitAudioContext();
        }
        this.audioContext = window._eliteAudioContext;

        // Create master gain for overall volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0; // Start muted
        this.masterGain.connect(this.audioContext.destination);

        this.isInitialized = true;
    }

    /**
     * Initialize and start the space music
     */
    init() {
        if (!this.isInitialized || !this.audioContext) {
            console.warn('SpaceMusicManager: Audio context not available');
            return false;
        }

        // Handle suspended audio context
        if (this.audioContext.state === 'suspended') {
            try {
                this.audioContext.resume().catch(e =>
                    console.warn('SpaceMusicManager: resume() rejected', e)
                );
            } catch (e) {
                console.warn('SpaceMusicManager: resume() rejected', e);
            }
        } else if (this.audioContext.state === 'closed') {
            console.warn('SpaceMusicManager: AudioContext is closed');
            return false;
        }

        return true;
    }

    /**
     * Create the oscillator layers and audio graph
     * @private
     */
    _createOscillators() {
        if (!this.audioContext) return;

        // Clean up any existing oscillators first
        this._stopOscillators();

        // Create WaveShaper for soft saturation (analog warmth)
        this.waveShaper = this.audioContext.createWaveShaper();
        this.waveShaper.curve = this._makeDistortionCurve(this.saturationAmount);
        this.waveShaper.oversample = '4x';
        this.waveShaper.connect(this.masterGain);

        // Create lowpass filter for evolving texture
        this.filter = this.audioContext.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = this.baseFilterFreq; // Lower base frequency for warmth
        this.filter.Q.value = this.filterResonance; // Slight resonance for character
        this.filter.connect(this.waveShaper);

        // Create filter sweep LFO
        this.filterLFO = this.audioContext.createOscillator();
        this.filterLFO.type = 'sine';
        this.filterLFO.frequency.value = this.filterSweepSpeed;

        this.filterLFOGain = this.audioContext.createGain();
        this.filterLFOGain.gain.value = this.filterSweepRange; // Sweep range

        this.filterLFO.connect(this.filterLFOGain);
        this.filterLFOGain.connect(this.filter.frequency);
        this.filterLFO.start();

        // Lush chord voicing: Cmaj9(no 3rd) spread across octaves
        // C2, G2, D3, G3, C4
        const frequencies = [
            65.41,  // C2
            98.00,  // G2
            146.83, // D3 (9th)
            196.00, // G3
            261.63  // C4
        ];

        const volumes = [0.4, 0.35, 0.3, 0.25, 0.2];
        const detuneAmounts = this.currentDetunes; // Use evolving detunes

        frequencies.forEach((freq, i) => {
            // Create oscillator
            const osc = this.audioContext.createOscillator();
            // Default to triangle for richness, but configurable
            osc.type = this.oscType;
            osc.frequency.value = freq;
            osc.detune.value = detuneAmounts[i] * this.detuneRange;

            // Create Stereo Panner for spread
            const panner = this.audioContext.createStereoPanner();
            // Spread oscillators across the stereo field based on index and stereoSpread
            const panValue = ((i / (frequencies.length - 1)) * 2 - 1) * this.stereoSpread;
            panner.pan.value = panValue;

            // Create gain node for this oscillator
            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = volumes[i]; // Audible base volume

            // Create LFO for breathing effect - each with slightly different rate
            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            // Use prime-like variations for asynchronous feel
            lfo.frequency.value = this.breathingSpeed * (0.8 + (i * 0.13));

            // Create LFO gain (modulation depth)
            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = volumes[i] * this.breathingAmount * 0.5;

            // Connect: LFO -> LFO Gain -> Oscillator Gain (modulating volume)
            lfo.connect(lfoGain);
            lfoGain.connect(oscGain.gain);

            // Create slow pitch drift LFO (wow/flutter)
            const driftLfo = this.audioContext.createOscillator();
            driftLfo.type = 'sine';
            driftLfo.frequency.value = this.driftSpeed + (i * 0.02);
            const driftGain = this.audioContext.createGain();
            driftGain.gain.value = this.pitchDriftAmount; // ±2 cents drift
            driftLfo.connect(driftGain);
            driftGain.connect(osc.detune);
            driftLfo.start();

            // Connect: Oscillator -> Panner -> Oscillator Gain -> Filter -> WaveShaper -> Master
            osc.connect(panner);
            panner.connect(oscGain);
            oscGain.connect(this.filter);

            // Start oscillators
            osc.start();
            lfo.start();

            // Store references
            this.oscillators.push(osc);
            this.gainNodes.push(oscGain);
            this.lfoOscillators.push(lfo);
            this.lfoOscillators.push(driftLfo); // Store drift LFO for cleanup
            this.lfoGains.push(lfoGain);
            this.lfoGains.push(driftGain);
        });

        // Connect to shared reverb bus if available
        if (typeof ambientSoundManager !== 'undefined' &&
            ambientSoundManager?.reverbConvolver) {
            try {
                this.reverbSend = this.audioContext.createGain();
                this.reverbSend.gain.value = this.reverbLushness; // Lush reverb
                this.filter.connect(this.reverbSend);
                this.reverbSend.connect(ambientSoundManager.reverbConvolver);
            } catch (e) {
                console.warn('SpaceMusicManager: Could not connect to reverb bus', e);
            }
        }
    }

    /**
     * Create a distortion curve for the WaveShaper
     * @private
     */
    _makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    /**
     * Add a high-frequency "sparkle" note that fades in and out
     * @private
     */
    _addSparkle() {
        if (!this.isPlaying || !this.audioContext || !this.filter) return;

        const freq = 400 + (Math.random() * 800); // Higher frequencies
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = this.audioContext.createGain();
        gain.gain.value = 0;

        const now = this.audioContext.currentTime;
        const duration = this.sparkleMinDuration + (Math.random() * (this.sparkleMaxDuration - this.sparkleMinDuration));

        osc.connect(gain);
        gain.connect(this.filter);

        // Slow fade in and out
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.02, now + (duration / 2));
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.start(now);
        osc.stop(now + duration);

        this.sparkleOscillators.push(osc);
        this.sparkleGains.push(gain);

        // Clean up arrays periodically
        setTimeout(() => {
            this.sparkleOscillators = this.sparkleOscillators.filter(o => o !== osc);
            this.sparkleGains = this.sparkleGains.filter(g => g !== gain);
        }, duration * 1000 + 100);
    }

    /**
     * Stop and disconnect all oscillators
     * @private
     */
    _stopOscillators() {
        // Stop all oscillators
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch (e) {
                // Already stopped
            }
        });

        // Stop all LFOs
        this.lfoOscillators.forEach(lfo => {
            try {
                lfo.stop();
                lfo.disconnect();
            } catch (e) {
                // Already stopped
            }
        });

        // Stop filter LFO
        if (this.filterLFO) {
            try {
                this.filterLFO.stop();
                this.filterLFO.disconnect();
            } catch (e) {
                // Already stopped
            }
        }

        // Stop sparkles
        this.sparkleOscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch (e) { }
        });
        this.sparkleGains.forEach(gain => {
            try {
                gain.disconnect();
            } catch (e) { }
        });

        // Disconnect gain nodes
        this.gainNodes.forEach(gain => {
            try {
                gain.disconnect();
            } catch (e) {
                // Already disconnected
            }
        });

        this.lfoGains.forEach(gain => {
            try {
                gain.disconnect();
            } catch (e) {
                // Already disconnected
            }
        });

        if (this.filterLFOGain) {
            try {
                this.filterLFOGain.disconnect();
            } catch (e) {
                // Already disconnected
            }
        }

        // Disconnect filter
        if (this.filter) {
            try {
                this.filter.disconnect();
            } catch (e) {
                // Already disconnected
            }
        }

        // Clear arrays
        this.oscillators = [];
        this.gainNodes = [];
        this.lfoOscillators = [];
        this.lfoGains = [];
        this.filterLFO = null;
        this.filterLFOGain = null;
        this.filter = null;
        this.sparkleOscillators = [];
        this.sparkleGains = [];
    }

    /**
     * Start playing space music with fade-in
     * @param {number} fadeMs - Fade-in duration in milliseconds (default 3000)
     */
    start(fadeMs = 3000) {
        if (!this.enabled || !this.isInitialized) return;

        // If we're already playing and not fading out, do nothing
        if (this.isPlaying && this.targetVolume > 0) return;

        // Cancel any pending stop timeout
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }

        if (!this.init()) {
            console.warn('SpaceMusicManager: Cannot start - initialization failed');
            return;
        }

        // Create oscillators if not already playing
        if (!this.isPlaying) {
            this._createOscillators();
            this.lastVarietyUpdate = this.audioContext.currentTime;
        }

        this.isPlaying = true;
        this.targetVolume = this.baseVolume;

        // Smooth fade-in using Web Audio API
        const fadeSec = Math.max(0.1, fadeMs / 1000);
        const currentTime = this.audioContext.currentTime;

        try {
            this.masterGain.gain.cancelScheduledValues(currentTime);
            this.masterGain.gain.setValueAtTime(0, currentTime);
            this.masterGain.gain.linearRampToValueAtTime(this.baseVolume, currentTime + fadeSec);
        } catch (e) {
            this.masterGain.gain.value = this.baseVolume;
        }

        console.log('SpaceMusicManager: Space music started');
    }

    /**
     * Stop playing space music with fade-out
     * @param {number} fadeMs - Fade-out duration in milliseconds (default 2000)
     */
    stop(fadeMs = 2000) {
        // Only stop if we're currently playing or fading in
        if (!this.isPlaying || this.targetVolume === 0) return;

        // Cancel any existing stop timeout to avoid duplicates
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
        }

        this.targetVolume = 0;
        const fadeSec = Math.max(0.1, fadeMs / 1000);
        const currentTime = this.audioContext.currentTime;

        // Smooth fade-out
        try {
            this.masterGain.gain.cancelScheduledValues(currentTime);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0, currentTime + fadeSec);
        } catch (e) {
            this.masterGain.gain.value = 0;
        }

        // Stop oscillators after fade completes
        this.stopTimeout = setTimeout(() => {
            this._stopOscillators();
            this.isPlaying = false;
            this.stopTimeout = null;
        }, fadeMs + 100);

        console.log('SpaceMusicManager: Space music stopping...');
    }

    /**
     * Update method - called each frame
     * Currently handled by Web Audio API automation, but available for future enhancements
     */
    update() {
        if (!this.isPlaying || !this.audioContext || !this.isInitialized) return;

        const now = this.audioContext.currentTime;

        // Long-term evolution every evolutionRate seconds
        if (now - this.lastVarietyUpdate > this.evolutionRate) {
            this._evolveTexture();
            this.lastVarietyUpdate = now;

            // Occasional sparkles
            if (Math.random() > (1 - this.sparkleChance)) {
                this._addSparkle();
            }
        }
    }

    /**
     * Slowly shift harmonics for continuous variety
     * @private
     */
    _evolveTexture() {
        if (!this.isPlaying || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const driftAmount = 2.0; // cents

        this.oscillators.forEach((osc, i) => {
            if (i < this.currentDetunes.length) {
                // Move current detune towards a new random target
                const drift = (Math.random() - 0.5) * driftAmount;
                this.currentDetunes[i] += drift;

                // Clamp drift to stay within reasonable bounds of base
                const maxDrift = 5.0;
                this.currentDetunes[i] = Math.max(
                    this.baseDetunes[i] - maxDrift,
                    Math.min(this.baseDetunes[i] + maxDrift, this.currentDetunes[i])
                );

                // Smoothly ramp to new detune
                try {
                    osc.detune.linearRampToValueAtTime(this.currentDetunes[i], now + 20);
                } catch (e) {
                    osc.detune.value = this.currentDetunes[i];
                }
            }
        });

        // Subtly shift filter Q
        if (this.filter) {
            const newQ = 1.0 + Math.random() * 1.5;
            try {
                this.filter.Q.linearRampToValueAtTime(newQ, now + 15);
            } catch (e) {
                this.filter.Q.value = newQ;
            }
        }

        console.log('SpaceMusicManager: Soundscape evolved');
    }

    /**
     * Set the volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        this.baseVolume = Math.max(0, Math.min(1, volume));
        if (this.isPlaying && this.masterGain) {
            const currentTime = this.audioContext.currentTime;
            try {
                this.masterGain.gain.cancelScheduledValues(currentTime);
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
                this.masterGain.gain.linearRampToValueAtTime(this.baseVolume, currentTime + 0.1);
            } catch (e) {
                this.masterGain.gain.value = this.baseVolume;
            }
        }
    }

    /**
     * Enable or disable space music
     * @param {boolean} enabled - Whether space music should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.isPlaying) {
            this.stop(500);
        }
    }

    /**
     * Clean up all audio resources
     */
    cleanup() {
        this._stopOscillators();

        if (this.masterGain) {
            try {
                this.masterGain.disconnect();
            } catch (e) {
                // Already disconnected
            }
        }

        this.isPlaying = false;
        console.log('SpaceMusicManager: Cleaned up');
    }

    setBreathingSpeed(speed) {
        this.breathingSpeed = speed;
        console.log(`SpaceMusicManager: Breathing speed set to ${speed}Hz`);
        if (this.isPlaying) {
            this.lfoOscillators.forEach((lfo, i) => {
                if (i % 2 === 0) {
                    const oscIndex = Math.floor(i / 2);
                    lfo.frequency.setTargetAtTime(this.breathingSpeed * (0.8 + (oscIndex * 0.13)), this.audioContext.currentTime, 0.05);
                }
            });
        }
    }

    setFilterSweepSpeed(speed) {
        this.filterSweepSpeed = speed;
        console.log(`SpaceMusicManager: Filter sweep speed set to ${speed}Hz`);
        if (this.isPlaying && this.filterLFO) {
            this.filterLFO.frequency.setTargetAtTime(this.filterSweepSpeed, this.audioContext.currentTime, 0.05);
        }
    }

    setFilterSweepRange(range) {
        this.filterSweepRange = range;
        console.log(`SpaceMusicManager: Filter sweep range set to ${range}Hz`);
        if (this.isPlaying && this.filterLFOGain) {
            this.filterLFOGain.gain.setTargetAtTime(this.filterSweepRange, this.audioContext.currentTime, 0.05);
        }
    }

    setBaseFilterFreq(freq) {
        this.baseFilterFreq = freq;
        console.log(`SpaceMusicManager: Base filter frequency set to ${freq}Hz`);
        if (this.isPlaying && this.filter) {
            this.filter.frequency.setTargetAtTime(this.baseFilterFreq, this.audioContext.currentTime, 0.05);
        }
    }

    setResonance(q) {
        this.filterResonance = q;
        console.log(`SpaceMusicManager: Filter resonance set to ${q}`);
        if (this.isPlaying && this.filter) {
            this.filter.Q.setTargetAtTime(this.filterResonance, this.audioContext.currentTime, 0.05);
        }
    }

    setPitchDrift(amount) {
        this.pitchDriftAmount = amount;
        console.log(`SpaceMusicManager: Pitch drift set to ${amount}`);
        if (this.isPlaying) {
            this.lfoGains.forEach((gain, i) => {
                if (i % 2 === 1) {
                    gain.gain.setTargetAtTime(this.pitchDriftAmount, this.audioContext.currentTime, 0.05);
                }
            });
        }
    }

    setWaveform(type) {
        this.oscType = type;
        console.log(`SpaceMusicManager: Waveform set to ${type}`);
        if (this.isPlaying) {
            this.oscillators.forEach(osc => {
                osc.type = type;
            });
        }
    }

    setSaturation(amount) {
        this.saturationAmount = amount;
        console.log(`SpaceMusicManager: Saturation set to ${amount}`);
        if (this.isPlaying && this.waveShaper) {
            this.waveShaper.curve = this._makeDistortionCurve(this.saturationAmount);
        }
    }

    setReverbLushness(lushness) {
        this.reverbLushness = lushness;
        console.log(`SpaceMusicManager: Reverb set to ${lushness}`);
        if (this.isPlaying && this.reverbSend) {
            this.reverbSend.gain.setTargetAtTime(this.reverbLushness, this.audioContext.currentTime, 0.05);
        }
    }

    setSparkleChance(chance) {
        this.sparkleChance = chance;
        console.log(`SpaceMusicManager: Sparkle chance set to ${chance}`);
    }

    /**
     * Update multiple parameters at once
     * @param {Object} params - Object containing parameters to update
     */
    updateParams(params) {
        if (params.breathingSpeed !== undefined) this.setBreathingSpeed(params.breathingSpeed);
        if (params.filterSweepSpeed !== undefined) this.setFilterSweepSpeed(params.filterSweepSpeed);
        if (params.filterSweepRange !== undefined) this.setFilterSweepRange(params.filterSweepRange);
        if (params.baseFilterFreq !== undefined) this.setBaseFilterFreq(params.baseFilterFreq);
        if (params.filterResonance !== undefined) this.setResonance(params.filterResonance);
        if (params.pitchDriftAmount !== undefined) this.setPitchDrift(params.pitchDriftAmount);
        if (params.saturationAmount !== undefined) this.setSaturation(params.saturationAmount);
        if (params.reverbLushness !== undefined) this.setReverbLushness(params.reverbLushness);
        if (params.sparkleChance !== undefined) this.setSparkleChance(params.sparkleChance);
        if (params.baseVolume !== undefined) this.setVolume(params.baseVolume);
        if (params.stereoSpread !== undefined) this.setStereoSpread(params.stereoSpread);
        if (params.detuneRange !== undefined) this.setDetuneRange(params.detuneRange);
        if (params.evolutionRate !== undefined) this.setEvolutionRate(params.evolutionRate);
        if (params.oscType !== undefined) this.setWaveform(params.oscType);
        if (params.breathingAmount !== undefined) this.setBreathingAmount(params.breathingAmount);
        if (params.driftSpeed !== undefined) this.setDriftSpeed(params.driftSpeed);
    }

    setStereoSpread(spread) {
        this.stereoSpread = Math.max(0, Math.min(1, spread));
        console.log(`SpaceMusicManager: Stereo spread set to ${this.stereoSpread}`);
        // Requires oscillator recreation to apply fully to existing nodes if panners aren't stored,
        // but it's fine for the next start() or just as a setting.
    }

    setDetuneRange(range) {
        this.detuneRange = range;
        console.log(`SpaceMusicManager: Detune range set to ${range}`);
        if (this.isPlaying) {
            const detuneAmounts = this.currentDetunes;
            this.oscillators.forEach((osc, i) => {
                if (i < detuneAmounts.length) {
                    osc.detune.setTargetAtTime(detuneAmounts[i] * this.detuneRange, this.audioContext.currentTime, 0.05);
                }
            });
        }
    }

    setEvolutionRate(rate) {
        this.evolutionRate = rate;
        console.log(`SpaceMusicManager: Evolution rate set to ${rate}s`);
    }

    setBreathingAmount(amount) {
        this.breathingAmount = amount;
        console.log(`SpaceMusicManager: Breathing intensity set to ${amount}`);
        if (this.isPlaying) {
            this.lfoGains.forEach((gain, i) => {
                if (i % 2 === 0) {
                    const volumes = [0.4, 0.35, 0.3, 0.25, 0.2];
                    const oscIndex = Math.floor(i / 2);
                    gain.gain.setTargetAtTime(volumes[oscIndex] * this.breathingAmount * 0.5, this.audioContext.currentTime, 0.05);
                }
            });
        }
    }

    setDriftSpeed(speed) {
        this.driftSpeed = speed;
        console.log(`SpaceMusicManager: Drift speed set to ${speed}Hz`);
        if (this.isPlaying) {
            this.lfoOscillators.forEach((osc, i) => {
                if (i % 2 === 1) {
                    const oscIndex = Math.floor(i / 2);
                    osc.frequency.setTargetAtTime(this.driftSpeed + (oscIndex * 0.02), this.audioContext.currentTime, 0.05);
                }
            });
        }
    }

    /**
     * Get all current parameters for export
     */
    getParams() {
        return {
            breathingSpeed: this.breathingSpeed,
            filterSweepSpeed: this.filterSweepSpeed,
            filterSweepRange: this.filterSweepRange,
            baseFilterFreq: this.baseFilterFreq,
            filterResonance: this.filterResonance,
            pitchDriftAmount: this.pitchDriftAmount,
            saturationAmount: this.saturationAmount,
            reverbLushness: this.reverbLushness,
            sparkleChance: this.sparkleChance,
            baseVolume: this.baseVolume,
            stereoSpread: this.stereoSpread,
            detuneRange: this.detuneRange,
            evolutionRate: this.evolutionRate,
            oscType: this.oscType,
            breathingAmount: this.breathingAmount,
            driftSpeed: this.driftSpeed
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SpaceMusicManager = SpaceMusicManager;
}
