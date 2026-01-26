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
        this.waveShaper = null;
        this.reverbSend = null;
        this.voiceNodes = []; // Persistent Panner and Gain nodes for chord voices

        this.distortionCurveCache = new Map();

        this.isPlaying = false;
        this.isInitialized = false;
        this.enabled = true;

        // Volume settings
        this.baseVolume = 0.55; // Subtle background presence
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
        this.sparklePitchMin = 400;
        this.sparklePitchMax = 1200;
        this.stereoSpread = 0.8; // 0 to 1
        this.detuneRange = 1.0; // Multiplier for base detunes
        this.driftSpeed = 0.07; // Hz for pitch drift
        this.driftVariance = 2.0; // cents
        this.evolutionRate = 25; // Seconds between texture shifts

        // Long-term variety state
        this.lastVarietyUpdate = 0;
        this.varietyCycle = 0;

        // Sparkle voice pool (pre-allocated gains to save CPU)
        this.maxSparkleVoices = 5;
        this.sparkleVoices = [];
        this.sparkleGains = [];

        this.baseDetunes = [0.5, -0.8, 1.2, -0.5, 0.3];
        this.currentDetunes = [...this.baseDetunes];
        this.oscType = 'triangle';

        // Harmonic Palettes (Chord Progression)
        this.activePaletteIndex = 0;
        this.palettes = [
            [65.41, 98.00, 146.83, 196.00, 261.63], // Cmaj9 cluster (Pristine/Neutral)
            [65.41, 92.50, 138.59, 185.00, 246.94], // C Phrygian (Dark/Ominous)
            [69.30, 103.83, 155.56, 207.65, 277.18], // Db Lydian (Dreamy/Ethereal)
            [58.27, 87.31, 116.54, 174.61, 233.08],  // Bb Open (Vast/Empty)
            [49.00, 73.42, 110.00, 146.83, 220.00],  // Bm7 cluster (Cold/Isolation)
            [82.41, 123.47, 164.81, 246.94, 329.63], // E Sus (High Energy/Radiant)
            [61.74, 92.50, 123.47, 185.00, 233.08],  // B Mixolydian (Ancient/Alien)
            [55.00, 82.41, 110.00, 164.81, 220.00],  // A Open Fifth (Stable/Fortress)
            [51.91, 77.78, 103.83, 155.56, 207.65],  // G# Maj7 (Warm/Golden Hour)
            [43.65, 65.41, 87.31, 130.81, 174.61],   // F Minor 9 (Melancholic Depth)
            [58.27, 92.50, 116.54, 164.81, 233.08],  // Bb Lydian Dom (Strange/Curiosity)
            [41.20, 61.74, 82.41, 123.47, 164.81],   // E Dorian (Vibrant/Active Space)
            [32.70, 49.00, 65.41, 73.42, 98.00],     // C Deep Drone (Subterranean/Massive)
            [65.41, 73.42, 82.41, 92.50, 103.83],    // Whole Tone Cluster (Stasis/Floating)
            [65.41, 103.83, 130.81, 164.81, 207.65], // C Aug7 (Unstable/Expanding)
            [55.00, 82.41, 123.47, 185.00, 277.18],  // E over A (Open Skies/Positive)
            [61.74, 92.50, 138.59, 207.65, 311.13],  // B Quartal (Modern/Technical)
            [43.65, 65.41, 110.00, 164.81, 196.00],  // F Lydian #11 (Majestic/Awe)
            [38.89, 58.27, 77.78, 116.54, 155.56],   // Eb Min (Grave/Ancient)
            [77.78, 116.54, 155.56, 233.08, 311.13]  // Eb Sus with #4 (Shimmering/Radiation)
        ];
        this.currentFrequencies = [...this.palettes[0]];
        this.chordTransitionTime = 10; // Seconds to glide between chords

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
            "baseVolume": 0.15,
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
     * Helper to smoothly ramp an AudioParam
     * @private
     */
    _rampParam(param, value, duration = 0.05, cancel = true) {
        if (!param || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        try {
            if (cancel) param.cancelScheduledValues(now);
            param.linearRampToValueAtTime(value, now + duration);
        } catch (e) {
            param.value = value;
        }
    }

    /**
     * Create or restart an LFO
     * @private
     */
    _startLFO(type, freq, gainNode, targetParam) {
        try {
            const lfo = this.audioContext.createOscillator();
            lfo.type = type;
            lfo.frequency.value = freq;
            lfo.connect(gainNode);
            if (targetParam) gainNode.connect(targetParam);
            lfo.start();
            return lfo;
        } catch (e) {
            return null;
        }
    }

    /**
     * Create the oscillator layers and audio graph
     * @private
     */
    _createOscillators() {
        if (!this.audioContext) return;

        // Clean up any existing oscillators first
        this._stopOscillators();

        // Create or reuse WaveShaper for soft saturation (analog warmth)
        if (!this.waveShaper) {
            this.waveShaper = this.audioContext.createWaveShaper();
            this.waveShaper.oversample = '4x';
            this.waveShaper.connect(this.masterGain);
        }
        this.waveShaper.curve = this._makeDistortionCurve(this.saturationAmount);

        // Create or reuse lowpass filter for evolving texture
        if (!this.filter) {
            this.filter = this.audioContext.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.Q.value = this.filterResonance;
            this.filter.connect(this.waveShaper);
        }
        this.filter.frequency.value = this.baseFilterFreq;
        this.filter.Q.value = this.filterResonance;

        // Create or reuse filter sweep LFO nodes
        if (this.filterLFOGain) {
            try { this.filterLFOGain.disconnect(); } catch (e) { }
        }

        this.filterLFOGain = this.audioContext.createGain();
        this.filterLFOGain.connect(this.filter.frequency);

        this.filterLFO = this._startLFO('sine', this.filterSweepSpeed, this.filterLFOGain);
        this.filterLFOGain.gain.setValueAtTime(this.filterSweepRange, this.audioContext.currentTime);

        // Lush chord voicing: Based on current palette
        const frequencies = this.currentFrequencies;
        const volumes = [0.4, 0.35, 0.3, 0.25, 0.2];
        const detuneAmounts = this.currentDetunes;

        // Initialize voice node pool if needed
        if (this.voiceNodes.length === 0) {
            for (let i = 0; i < frequencies.length; i++) {
                const panner = this.audioContext.createStereoPanner();
                const oscGain = this.audioContext.createGain();
                panner.connect(oscGain);
                oscGain.connect(this.filter);

                this.voiceNodes.push({ panner, oscGain });
            }
        }

        frequencies.forEach((freq, i) => {
            const voice = this.voiceNodes[i];
            const panner = voice.panner;
            const oscGain = voice.oscGain;

            // Create main oscillator
            const osc = this.audioContext.createOscillator();
            osc.type = this.oscType;
            osc.frequency.value = freq;
            osc.detune.value = detuneAmounts[i] * this.detuneRange;

            // Update Stereo Panner spread
            const panValue = ((i / (frequencies.length - 1)) * 2 - 1) * this.stereoSpread;
            panner.pan.value = panValue;

            oscGain.gain.value = volumes[i];

            // Breathing LFO
            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = volumes[i] * this.breathingAmount * 0.5;
            const lfo = this._startLFO('sine', this.breathingSpeed * (0.8 + (i * 0.13)), lfoGain, oscGain.gain);

            // Pitch drift LFO
            const driftGain = this.audioContext.createGain();
            driftGain.gain.value = this.pitchDriftAmount;
            const driftLfo = this._startLFO('sine', this.driftSpeed + (i * 0.02), driftGain, osc.detune);

            osc.connect(panner);
            osc.start();

            // Store transient references for cleanup
            this.oscillators.push(osc);
            this.gainNodes.push(oscGain);
            this.lfoOscillators.push(lfo, driftLfo);
            this.lfoGains.push(lfoGain, driftGain);
        });

        // Connect to shared reverb bus if available
        if (typeof ambientSoundManager !== 'undefined' &&
            ambientSoundManager?.reverbConvolver) {
            try {
                if (!this.reverbSend) {
                    this.reverbSend = this.audioContext.createGain();
                    this.filter.connect(this.reverbSend);
                }
                // Always try to connect to the bus in case it was recreated
                this.reverbSend.connect(ambientSoundManager.reverbConvolver);
                this.reverbSend.gain.value = this.reverbLushness;
            } catch (e) {
                // Ignore "already connected" errors
            }
        }
    }

    /**
     * Create a distortion curve for the WaveShaper
     * @private
     */
    _makeDistortionCurve(amount) {
        // Round to nearest integer to keep cache small and robust
        const k = Math.round(typeof amount === 'number' ? amount : 50);

        // Return from cache if available
        if (this.distortionCurveCache.has(k)) {
            return this.distortionCurveCache.get(k);
        }

        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }

        // Cache the curve
        this.distortionCurveCache.set(k, curve);

        return curve;
    }

    /**
     * Add a high-frequency "sparkle" note that fades in and out
     * @private
     */
    _addSparkle() {
        if (!this.isPlaying || !this.audioContext || !this.filter) return;

        // Initialize voice pool if needed
        if (this.sparkleGains.length === 0) {
            for (let i = 0; i < this.maxSparkleVoices; i++) {
                const gain = this.audioContext.createGain();
                gain.gain.value = 0;
                gain.connect(this.filter);
                this.sparkleGains.push(gain);
                this.sparkleVoices.push({
                    oscillator: null,
                    busy: false
                });
            }
        }

        // Find available voice
        const voiceIdx = this.sparkleVoices.findIndex(v => !v.busy);
        if (voiceIdx === -1) return; // All voices busy

        const voice = this.sparkleVoices[voiceIdx];
        const gain = this.sparkleGains[voiceIdx];
        voice.busy = true;

        const freq = this.sparklePitchMin + (Math.random() * (this.sparklePitchMax - this.sparklePitchMin));
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        voice.oscillator = osc;

        const now = this.audioContext.currentTime;
        const duration = this.sparkleMinDuration + (Math.random() * (this.sparkleMaxDuration - this.sparkleMinDuration));

        osc.connect(gain);

        // Slow fade in and out
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.02, now + (duration / 2));
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.start(now);
        osc.stop(now + duration);

        // Mark as available when done
        osc.onended = () => {
            voice.busy = false;
            voice.oscillator = null;
            osc.disconnect();
        };
    }

    /**
     * Stop and disconnect all oscillators
     * @private
     */
    _stopOscillators() {
        const disconnectAndStop = (nodes) => {
            nodes.forEach(node => {
                try {
                    if (node.stop) node.stop();
                    node.disconnect();
                } catch (e) { }
            });
        };

        disconnectAndStop(this.oscillators);
        disconnectAndStop(this.lfoOscillators);

        if (this.filterLFO) {
            try { this.filterLFO.stop(); this.filterLFO.disconnect(); } catch (e) { }
            this.filterLFO = null;
        }

        this.sparkleVoices.forEach(voice => {
            if (voice.oscillator) {
                try { voice.oscillator.stop(); voice.oscillator.disconnect(); } catch (e) { }
                voice.oscillator = null;
            }
            voice.busy = false;
        });

        // Clear transient arrays
        this.oscillators = [];
        this.gainNodes = [];
        this.lfoOscillators = [];
        this.lfoGains = [];
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
        const driftAmount = this.driftVariance; // cents

        this.oscillators.forEach((osc, i) => {
            if (i < this.currentDetunes.length) {
                const drift = (Math.random() - 0.5) * driftAmount;
                this.currentDetunes[i] += drift;

                const maxDrift = 5.0;
                this.currentDetunes[i] = Math.max(
                    this.baseDetunes[i] - maxDrift,
                    Math.min(this.baseDetunes[i] + maxDrift, this.currentDetunes[i])
                );

                this._rampParam(osc.detune, this.currentDetunes[i] * this.detuneRange, this.evolutionRate);
            }
        });

        if (this.filter) {
            const newQ = this.filterResonance + (Math.random() - 0.5) * 0.5;
            this._rampParam(this.filter.Q, Math.max(0.1, newQ), 15);
        }
    }

    /**
     * Advance to a random chord progression palette
     */
    advanceChordProgression() {
        if (!this.palettes || this.palettes.length <= 1) return;

        let nextIdx;
        const currentIdx = this.activePaletteIndex;

        // Pick a random index that is different from the current one
        do {
            nextIdx = Math.floor(Math.random() * this.palettes.length);
        } while (nextIdx === currentIdx);

        this.setPalette(nextIdx);
    }

    /**
     * Smoothly transition to a new set of frequencies
     * @param {number} index - Index of the palette to switch to
     */
    setPalette(index) {
        if (index < 0 || index >= this.palettes.length) return;
        this.activePaletteIndex = index;
        const targetFrequencies = this.palettes[index];
        const now = this.audioContext.currentTime;

        this.oscillators.forEach((osc, i) => {
            if (i < targetFrequencies.length) {
                try {
                    osc.frequency.setTargetAtTime(targetFrequencies[i], now, this.chordTransitionTime / 3);
                    this.currentFrequencies[i] = targetFrequencies[i];
                } catch (e) {
                    osc.frequency.value = targetFrequencies[i];
                }
            }
        });
    }

    /**
     * Set the volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        this.baseVolume = Math.max(0, Math.min(1, volume));
        if (this.isPlaying && this.masterGain) {
            this._rampParam(this.masterGain.gain, this.baseVolume, 0.1);
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

        // Properly stop and disconnect the filter LFO
        if (this.filterLFO) {
            try {
                this.filterLFO.stop();
                this.filterLFO.disconnect();
            } catch (e) { }
            this.filterLFO = null;
        }

        if (this.filterLFOGain) {
            try {
                this.filterLFOGain.disconnect();
            } catch (e) { }
            this.filterLFOGain = null;
        }

        if (this.filter) {
            try {
                this.filter.disconnect();
            } catch (e) { }
            this.filter = null;
        }

        if (this.waveShaper) {
            try {
                this.waveShaper.disconnect();
            } catch (e) { }
            this.waveShaper = null;
        }

        if (this.reverbSend) {
            try {
                this.reverbSend.disconnect();
            } catch (e) { }
            this.reverbSend = null;
        }

        if (this.voiceNodes) {
            this.voiceNodes.forEach(v => {
                try { v.panner.disconnect(); } catch (e) { }
                try { v.oscGain.disconnect(); } catch (e) { }
            });
            this.voiceNodes = [];
        }

        if (this.sparkleGains) {
            this.sparkleGains.forEach(g => {
                try { g.disconnect(); } catch (e) { }
            });
            this.sparkleGains = [];
            this.sparkleVoices = [];
        }

        if (this.masterGain) {
            try {
                this.masterGain.disconnect();
            } catch (e) {
                // Already disconnected
            }
        }

        this.isPlaying = false;
        console.log('SpaceMusicManager: Definitely cleaned up');
    }

    setBreathingSpeed(speed) {
        this.breathingSpeed = speed;
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
        if (this.isPlaying && this.filterLFO) {
            this.filterLFO.frequency.setTargetAtTime(this.filterSweepSpeed, this.audioContext.currentTime, 0.05);
        }
    }

    setFilterSweepRange(range) {
        this.filterSweepRange = range;
        if (this.isPlaying && this.filterLFOGain) {
            this._rampParam(this.filterLFOGain.gain, this.filterSweepRange);
        }
    }

    setBaseFilterFreq(freq) {
        this.baseFilterFreq = freq;
        if (this.isPlaying && this.filter) {
            this._rampParam(this.filter.frequency, this.baseFilterFreq);
        }
    }

    setResonance(q) {
        this.filterResonance = q;
        if (this.isPlaying && this.filter) {
            this._rampParam(this.filter.Q, this.filterResonance);
        }
    }

    setPitchDrift(amount) {
        this.pitchDriftAmount = amount;
        if (this.isPlaying) {
            this.lfoGains.forEach((gain, i) => {
                if (i % 2 === 1) this._rampParam(gain.gain, this.pitchDriftAmount);
            });
        }
    }

    setWaveform(type) {
        this.oscType = type;
        if (this.isPlaying) {
            this.oscillators.forEach(osc => { osc.type = type; });
        }
    }

    setSaturation(amount) {
        this.saturationAmount = amount;
        if (this.isPlaying && this.waveShaper) {
            this.waveShaper.curve = this._makeDistortionCurve(this.saturationAmount);
        }
    }

    setReverbLushness(lushness) {
        this.reverbLushness = lushness;
        if (this.isPlaying && this.reverbSend) {
            this._rampParam(this.reverbSend.gain, this.reverbLushness);
        }
    }

    setSparkleChance(chance) {
        this.sparkleChance = chance;
    }

    /**
     * Update multiple parameters at once
     * @param {Object} params - Object containing parameters to update
     */
    updateParams(params) {
        const paramMap = {
            breathingSpeed: 'setBreathingSpeed',
            filterSweepSpeed: 'setFilterSweepSpeed',
            filterSweepRange: 'setFilterSweepRange',
            baseFilterFreq: 'setBaseFilterFreq',
            filterResonance: 'setResonance',
            pitchDriftAmount: 'setPitchDrift',
            saturationAmount: 'setSaturation',
            reverbLushness: 'setReverbLushness',
            sparkleChance: 'setSparkleChance',
            baseVolume: 'setVolume',
            stereoSpread: 'setStereoSpread',
            detuneRange: 'setDetuneRange',
            evolutionRate: 'setEvolutionRate',
            oscType: 'setWaveform',
            breathingAmount: 'setBreathingAmount',
            driftSpeed: 'setDriftSpeed',
            chordTransitionTime: 'setChordTransitionTime',
            sparklePitchMin: 'setSparklePitchMin',
            sparklePitchMax: 'setSparklePitchMax',
            driftVariance: 'setDriftVariance'
        };

        Object.entries(params).forEach(([key, value]) => {
            const methodName = paramMap[key];
            if (methodName && this[methodName]) {
                this[methodName](value);
            } else if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        });
    }

    setStereoSpread(spread) {
        this.stereoSpread = Math.max(0, Math.min(1, spread));
    }

    setDetuneRange(range) {
        this.detuneRange = range;
        if (this.isPlaying) {
            this.oscillators.forEach((osc, i) => {
                if (i < this.currentDetunes.length) {
                    this._rampParam(osc.detune, this.currentDetunes[i] * this.detuneRange);
                }
            });
        }
    }

    setEvolutionRate(rate) { this.evolutionRate = rate; }
    setBreathingAmount(amount) { this.breathingAmount = amount; }
    setDriftSpeed(speed) {
        this.driftSpeed = speed;
        if (this.isPlaying) {
            this.lfoOscillators.forEach((osc, i) => {
                if (i % 2 === 1) osc.frequency.setTargetAtTime(this.driftSpeed + (Math.floor(i / 2) * 0.02), this.audioContext.currentTime, 0.05);
            });
        }
    }

    setChordTransitionTime(time) {
        this.chordTransitionTime = time;
        console.log(`SpaceMusicManager: Chord transition glide set to ${time}s`);
    }

    setSparklePitchMin(val) {
        this.sparklePitchMin = val;
    }

    setSparklePitchMax(val) {
        this.sparklePitchMax = val;
    }

    setDriftVariance(val) {
        this.driftVariance = val;
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
            driftSpeed: this.driftSpeed,
            chordTransitionTime: this.chordTransitionTime,
            sparklePitchMin: this.sparklePitchMin,
            sparklePitchMax: this.sparklePitchMax,
            driftVariance: this.driftVariance
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SpaceMusicManager = SpaceMusicManager;
}
