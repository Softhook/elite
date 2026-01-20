/**
 * SpaceMusicManager - Generative ambient music for deep space
 * Similar to StationMusicManager but slower, more subtle, and atmospheric.
 * Plays while the player is in flight.
 * 
 * Themes are designed to be "Imperial-like" but subtle and slow.
 */

const SPACE_MUSIC_FADE_DEFAULT_MS = 4000;

class SpaceMusicManager {
    constructor() {
        this.isPlaying = false;
        this.isInitialized = false;

        // Audio components (p5.sound)
        this.osc = null;
        this.osc2 = null; // Secondary oscillator for drones/pads
        this.envelope = null;
        this.envelope2 = null;
        this.reverb = null;
        this.filter = null;
        this.masterGain = null;

        // Melody state
        this.melody = [];
        this.harmony = [];
        this.noteIndex = 0;
        this.phraseIndex = 0;
        this.lastNoteTime = 0;
        this.noteInterval = 2000; // Default slow interval

        // Volume control
        this.baseVolume = 0.85; // more subtle than stations
        this.currentVolume = 0;
        this.targetVolume = 0;
        this.fadeSpeed = 0.005; // very slow fade

        // Current space theme
        this.currentThemeName = 'deep_space';
        this.theme = null;

        // Cleanup tracking
        this.stopTimeout = null;
        this.lastAppliedVolume = 0;
    }

    /**
     * Musical themes for space
     */
    static get SPACE_THEMES() {
        return {
            // "Imperial" style but subtle and slow
            // Focus on low brass-like drones and slow, minor/modal melodic fragments
            imperial_reach: {
                baseNote: 40, // E2 - lower than station imperial
                scale: [0, 1, 3, 5, 7, 8, 10], // Phrygian (dark, modal)
                motifs: [
                    [0, null, null, 7, null, null, 8, 7, 5], // Slow majestic descent
                    [0, null, 7, null, 12, null, 10, 8, 7],   // Rising power
                    [0, 0, 0, -3, 0.5, 0, -3, 0.5, 0],       // Explicit but slow/subtle Imperial hint
                    [7, null, 3, null, 0, null, null, -2, 0], // Solemn ending
                    [0, null, null, null, 7, null, null, null] // Long drone notes
                ],
                harmonyInterval: 5,  // Fourth (stark, medieval feel)
                noteInterval: 1500,  // Very slow
                filterFreq: 800,     // Darker, more muffled brass
                filterRes: 1.2,
                attackTime: 0.8,     // Very slow bloom
                releaseTime: 2.5,    // Long sustain
                oscType: 'triangle',
                osc2Type: 'sine',
                detune: 12,          // Warm chorus
                noteGlide: 0.25,     // Significant glide for "unfolding" feel
                reverbDecay: 3.5,    // Huge space
                dynamicRange: 0.3,
                volumeMultiplier: 0.8
            },

            // Deep Space: Minimalist, cold, vast
            deep_space: {
                baseNote: 43, // G2
                scale: [0, 2, 3, 5, 7, 10], // Minor pentatonic + m2
                motifs: [
                    [0, null, null, null, 7, null, null, null], // Sparse
                    [0, null, null, 3, null, null, 2, null, 0],
                    [7, null, null, null, 5, null, null, null],
                    [null, null, null, null, 12, null, null, null]
                ],
                harmonyInterval: 12, // Octave below
                noteInterval: 2500,  // Extremely slow
                filterFreq: 500,     // Very dark
                filterRes: 0.5,
                attackTime: 1.5,     // Almost imperceptible attack
                releaseTime: 4.0,    // Eternal tail
                oscType: 'sine',
                osc2Type: 'sine',
                detune: 5,
                noteGlide: 0.5,
                reverbDecay: 5.0,    // Vastest possible
                dynamicRange: 0.2
            },

            // Nebula: Ethereal, shimmering, light
            nebula: {
                baseNote: 60, // C4
                scale: [0, 2, 4, 6, 7, 9, 11], // Lydian (airy)
                motifs: [
                    [0, 4, 7, 11, null, null],
                    [12, 11, 7, null, null],
                    [7, 6, 4, 2, 0, null],
                    [14, 12, 11, 7, null]
                ],
                harmonyInterval: 16, // Wide spacing
                noteInterval: 1200,
                filterFreq: 3000,
                filterRes: 0.8,
                attackTime: 0.5,
                releaseTime: 1.5,
                oscType: 'sine',
                osc2Type: 'triangle',
                detune: 15,          // Shimmer
                noteGlide: 0.1,
                reverbDecay: 2.5,
                dynamicRange: 0.4
            }
        };
    }

    createOscillator(oscType) {
        switch (oscType) {
            case 'sine': return new p5.SinOsc();
            case 'square': return new p5.SqrOsc();
            case 'sawtooth': return new p5.SawOsc();
            case 'triangle':
            default: return new p5.TriOsc();
        }
    }

    init() {
        if (this.isInitialized) return true;

        if (typeof p5 === 'undefined' || typeof p5.SinOsc === 'undefined') {
            return false;
        }

        try {
            this.osc = new p5.TriOsc();
            this.osc2 = new p5.SinOsc();
            this.currentOscType = 'triangle';
            this.currentOsc2Type = 'sine';

            this.envelope = new p5.Envelope();
            this.envelope.setADSR(1, 0.5, 0.5, 2);
            this.envelope.setRange(1, 0);

            this.envelope2 = new p5.Envelope();
            this.envelope2.setADSR(2, 1, 0.6, 3);
            this.envelope2.setRange(0.4, 0);

            this.filter = new p5.LowPass();
            this.filter.freq(1000);
            this.filter.res(0.5);

            this.osc.disconnect();
            this.osc.connect(this.filter);
            this.osc2.disconnect();
            this.osc2.connect(this.filter);

            this.masterGain = new p5.Gain();
            this.filter.disconnect();
            this.filter.connect(this.masterGain);

            this.reverb = new p5.Reverb();
            this.reverb.process(this.masterGain, 8, 15); // Large space by default

            this.lastMelodyFreq = 0;
            this.lastHarmonyFreq = 0;

            try { this.masterGain.amp(0); } catch (e) { }

            this.isInitialized = true;
            return true;
        } catch (e) {
            console.error('SpaceMusicManager: Failed to initialize:', e);
            return false;
        }
    }

    setupOscillators() {
        if (!this.theme || !this.isInitialized) return;

        const oscType = this.theme.oscType || 'sine';
        const osc2Type = this.theme.osc2Type || 'sine';

        if (oscType !== this.currentOscType && !this.isPlaying) {
            try {
                if (this.osc) {
                    try { this.osc.stop(); } catch (e) { }
                    try { this.osc.disconnect(); } catch (e) { }
                }
                this.osc = this.createOscillator(oscType);
                this.osc.disconnect();
                this.osc.connect(this.filter);
                this.currentOscType = oscType;
            } catch (e) { }
        }

        if (osc2Type !== this.currentOsc2Type && !this.isPlaying) {
            try {
                if (this.osc2) {
                    try { this.osc2.stop(); } catch (e) { }
                    try { this.osc2.disconnect(); } catch (e) { }
                }
                this.osc2 = this.createOscillator(osc2Type);
                this.osc2.disconnect();
                this.osc2.connect(this.filter);
                this.currentOsc2Type = osc2Type;
            } catch (e) { }
        }
    }

    generateMelody(options = {}) {
        const themeName = options.themeName || 'deep_space';
        const themes = SpaceMusicManager.SPACE_THEMES;
        this.theme = themes[themeName] || themes.deep_space;
        this.currentThemeName = themeName;

        this.noteInterval = this.theme.noteInterval;

        if (!this.isPlaying) {
            if (this.filter) {
                this.filter.freq(this.theme.filterFreq);
                this.filter.res(this.theme.filterRes);
            }
            this.setupOscillators();
            if (this.envelope) {
                this.envelope.setADSR(this.theme.attackTime, 0.5, 0.5, this.theme.releaseTime);
            }
            if (this.envelope2) {
                this.envelope2.setADSR(this.theme.attackTime * 1.5, 1, 0.6, this.theme.releaseTime * 1.5);
            }
            if (this.reverb && this.theme.reverbDecay) {
                try {
                    this.reverb.set(this.theme.reverbDecay * 2, 10);
                } catch (e) { }
            }
        }

        this.melody = [];
        this.harmony = [];

        const numMotifs = 2;
        const usedMotifs = [];

        for (let i = 0; i < numMotifs; i++) {
            let motifIndex = Math.floor(Math.random() * this.theme.motifs.length);
            usedMotifs.push(motifIndex);
            const motif = this.theme.motifs[motifIndex];

            for (const degree of motif) {
                if (degree === null) {
                    this.melody.push(null);
                    this.harmony.push(null);
                } else {
                    const midiNote = this.scaleToMidi(degree, this.theme.baseNote, this.theme.scale);
                    this.melody.push(midiNote);
                    const harmonyNote = midiNote - this.theme.harmonyInterval;
                    this.harmony.push(harmonyNote);
                }
            }
            this.melody.push(null);
            this.harmony.push(null);
        }

        this.noteIndex = 0;
        this.phraseIndex = 0;
    }

    scaleToMidi(degree, baseNote, scale) {
        const scaleLength = scale.length;
        const octaves = Math.floor(degree / scaleLength);
        const withinOctave = ((degree % scaleLength) + scaleLength) % scaleLength;
        return baseNote + (octaves * 12) + scale[withinOctave];
    }

    midiToFreq(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    start(options = {}) {
        if (!this.init()) return;

        const themeName = options.themeName || 'deep_space';

        // If already playing the same theme, do nothing
        if (this.isPlaying && this.currentThemeName === themeName) return;

        // Clear any pending stop timeout to prevent newly started music from being silenced
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }

        this.generateMelody(options);

        try {
            this.osc.start();
            this.osc2.start();
            this.isPlaying = true;
            this.targetVolume = this.baseVolume * (this.theme.volumeMultiplier || 1);
            this.lastNoteTime = performance.now();
            console.log('SpaceMusicManager: Started theme', this.currentThemeName);
        } catch (e) {
            console.error('SpaceMusicManager: Error starting:', e);
        }
    }

    stop(fadeMs = SPACE_MUSIC_FADE_DEFAULT_MS) {
        if (!this.isPlaying && this.targetVolume === 0) return;

        this.targetVolume = 0;
        const fadeSec = fadeMs / 1000;
        if (this.masterGain) {
            try { this.masterGain.amp(0, fadeSec); } catch (e) { }
        }

        this.isPlaying = false;

        // Clear existing timeout if any
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
        }

        this.stopTimeout = setTimeout(() => {
            try {
                if (this.osc) this.osc.stop();
                if (this.osc2) this.osc2.stop();
                this.stopTimeout = null;
            } catch (e) { }
        }, fadeMs + 100);
    }

    update() {
        if (!this.isPlaying || !this.isInitialized) {
            // Even if not "playing", we might be fading out
            if (this.currentVolume > 0 && this.targetVolume === 0) {
                this.currentVolume = Math.max(0, this.currentVolume - this.fadeSpeed);
                if (this.masterGain) this.masterGain.amp(this.currentVolume, 0.05);
            }
            return;
        }

        // Smooth volume transitions
        if (this.currentVolume < this.targetVolume) {
            this.currentVolume = Math.min(this.currentVolume + this.fadeSpeed, this.targetVolume);
        } else if (this.currentVolume > this.targetVolume) {
            this.currentVolume = Math.max(this.currentVolume - this.fadeSpeed, this.targetVolume);
        }

        if (this.masterGain) {
            // Only update gain if it actually changed, or if we are in the middle of a fade
            // This reduces calls to the underlying audio processing nodes
            const needsUpdate = Math.abs(this.currentVolume - this.lastAppliedVolume) > 0.001 ||
                (this.currentVolume === 0 && this.lastAppliedVolume !== 0) ||
                (this.currentVolume === this.targetVolume && this.lastAppliedVolume !== this.targetVolume);

            if (needsUpdate) {
                try {
                    this.masterGain.amp(this.currentVolume, 0.05);
                    this.lastAppliedVolume = this.currentVolume;
                } catch (e) {
                    try {
                        this.masterGain.amp(this.currentVolume);
                        this.lastAppliedVolume = this.currentVolume;
                    } catch (_) { }
                }
            }
        }

        const now = performance.now();
        if (now - this.lastNoteTime >= this.noteInterval) {
            this.lastNoteTime = now;
            this.playNextNote();
        }
    }

    playNextNote() {
        if (!this.osc || !this.envelope || this.melody.length === 0) return;

        try {
            const melodyNote = this.melody[this.noteIndex];
            const harmonyNote = this.harmony[this.noteIndex];

            if (melodyNote !== null) {
                const freq = this.midiToFreq(melodyNote);
                const hFreq = this.midiToFreq(harmonyNote);

                if (this.theme.detune) {
                    this.osc.freq(freq);
                    this.osc2.freq(hFreq + (Math.random() * 2 - 1) * (this.theme.detune / 10));
                } else {
                    this.osc.freq(freq);
                    this.osc2.freq(hFreq);
                }

                this.envelope.play(this.osc, 0, this.theme.noteInterval / 1000);
                this.envelope2.play(this.osc2, 0, this.theme.noteInterval / 1000);
            }

            this.noteIndex = (this.noteIndex + 1) % this.melody.length;

            if (this.noteIndex === 0) {
                this.phraseIndex++;
                if (this.phraseIndex >= 2) {
                    this.generateMelody({ themeName: this.currentThemeName });
                }
            }
        } catch (e) { }
    }

    /**
     * Clean up all audio resources
     */
    cleanup() {
        this.stop(0);

        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }

        try {
            if (this.osc) {
                this.osc.stop();
                this.osc.disconnect();
                this.osc = null;
            }
            if (this.osc2) {
                this.osc2.stop();
                this.osc2.disconnect();
                this.osc2 = null;
            }
            if (this.filter) {
                this.filter.disconnect();
                this.filter = null;
            }
            if (this.reverb) {
                this.reverb.disconnect();
                this.reverb = null;
            }
            if (this.masterGain) {
                this.masterGain.disconnect();
                this.masterGain = null;
            }
            this.envelope = null;
            this.envelope2 = null;
        } catch (e) {
            console.warn('SpaceMusicManager: Error during cleanup:', e);
        }

        this.isInitialized = false;
        this.isPlaying = false;
        console.log('SpaceMusicManager: Resources cleaned up');
    }
}

if (typeof window !== 'undefined') {
    window.SpaceMusicManager = SpaceMusicManager;
}
