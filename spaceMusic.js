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
        this.baseVolume = 0.15; // Subtle background presence
        this.currentVolume = 0;
        this.targetVolume = 0;

        // LFO settings for breathing effect
        this.breathingSpeed = 0.05; // Hz - very slow breathing
        this.filterSweepSpeed = 0.03; // Hz - ultra-slow filter movement

        // Timeout reference for cleaning up after fade-out
        this.stopTimeout = null;

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

        // Create lowpass filter for evolving texture
        this.filter = this.audioContext.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 800; // Base frequency
        this.filter.Q.value = 1.0;
        this.filter.connect(this.masterGain);

        // Create filter sweep LFO
        this.filterLFO = this.audioContext.createOscillator();
        this.filterLFO.type = 'sine';
        this.filterLFO.frequency.value = this.filterSweepSpeed;

        this.filterLFOGain = this.audioContext.createGain();
        this.filterLFOGain.gain.value = 300; // Sweep range ±300Hz

        this.filterLFO.connect(this.filterLFOGain);
        this.filterLFOGain.connect(this.filter.frequency);
        this.filterLFO.start();

        // Define chord voicing - open fifths and octaves for aeolian harp character
        // C2, G2, C3 - very resonant and wind-like
        const frequencies = [
            65.41,  // C2 - fundamental
            98.00,  // G2 - perfect fifth
            130.81, // C3 - octave
            196.00  // G3 - upper fifth for shimmer
        ];

        const volumes = [0.35, 0.30, 0.25, 0.15]; // Decreasing volumes for upper partials
        const detuneAmounts = [0, 3, -2, 5]; // Slight detuning for organic feel

        frequencies.forEach((freq, i) => {
            // Create oscillator
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine'; // Pure sine for aeolian harp quality
            osc.frequency.value = freq;
            osc.detune.value = detuneAmounts[i];

            // Create gain node for this oscillator
            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = volumes[i];

            // Create LFO for breathing effect
            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            // Slightly different LFO speeds for each layer to create evolving texture
            lfo.frequency.value = this.breathingSpeed * (1 + (i * 0.1));

            // Create LFO gain (modulation depth)
            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = volumes[i] * 0.12; // Subtle modulation

            // Connect: LFO -> LFO Gain -> Oscillator Gain
            lfo.connect(lfoGain);
            lfoGain.connect(oscGain.gain);

            // Connect: Oscillator -> Oscillator Gain -> Filter -> Master
            osc.connect(oscGain);
            oscGain.connect(this.filter);

            // Start oscillators
            osc.start();
            lfo.start();

            // Store references
            this.oscillators.push(osc);
            this.gainNodes.push(oscGain);
            this.lfoOscillators.push(lfo);
            this.lfoGains.push(lfoGain);
        });

        // Connect to shared reverb bus if available (from ambientSoundManager)
        if (typeof ambientSoundManager !== 'undefined' &&
            ambientSoundManager?.reverbConvolver) {
            try {
                const reverbSend = this.audioContext.createGain();
                reverbSend.gain.value = 0.25; // Heavy reverb for spacious feel
                this.filter.connect(reverbSend);
                reverbSend.connect(ambientSoundManager.reverbConvolver);
            } catch (e) {
                console.warn('SpaceMusicManager: Could not connect to reverb bus', e);
            }
        }
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
        // LFO and filter sweeps are handled by Web Audio API automation
        // This method is available for future contextual music changes
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
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SpaceMusicManager = SpaceMusicManager;
}
