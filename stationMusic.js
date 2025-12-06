/**
 * StationMusicManager - Generative ambient music for space stations
 * Uses TotalSerialism library for algorithmic composition with p5.sound
 * Plays atmospheric generative melodies when the player is docked at a station
 * 
 * Each station type has a distinct musical character:
 * - Imperial: Regal, slow fanfare-like phrases with brass character
 * - Military: Austere, march-like patterns with minor intervals
 * - Agricultural: Pastoral, folk-inspired pentatonic melodies
 * - Industrial: Deep, mechanical patterns with rhythmic pulses
 * - Mining: Cavernous, sparse low drones with echoing notes
 * - Tourism: Bright, welcoming major key arpeggios
 * - Refinery: Harsh, dissonant industrial ambience
 * - Post Human: Ethereal, glassy high-register textures
 * - Alien: Microtonal, otherworldly intervals
 * - Separatist: Tense, minor key suspense
 * - Standard: Neutral, calming ambient pads
 */
// Default station music fade-out duration (ms). Change this single value to adjust undock fade time.
const STATION_MUSIC_FADE_OUT_MS = 3000;

class StationMusicManager {
    constructor() {
        this.isPlaying = false;
        this.isInitialized = false;
        
        // Audio components (p5.sound)
        this.osc = null;
        this.osc2 = null; // Secondary oscillator for harmonies/drones
        this.envelope = null;
        this.envelope2 = null;
        this.reverb = null;
        this.filter = null;
        this.masterGain = null;
        
        // Melody state
        this.melody = [];        // Main melodic phrase (composed, not random)
        this.harmony = [];       // Secondary harmony notes
        this.noteIndex = 0;
        this.phraseIndex = 0;    // Track which phrase variation we're on
        this.frameCounter = 0;
        this.noteInterval = 30;  // Frames between notes (SLOW - about 0.5 sec at 60fps)
        this.restProbability = 0.15; // Chance of silence for breathing room
        
        // Volume control
        this.baseVolume = 0.5;  // Keep it subtle as background music
        this.currentVolume = 0;
        this.targetVolume = 0;
        this.fadeSpeed = 0.05;
        
        // Default fade-out duration (ms) - single editable variable above
        this.fadeOutMs = STATION_MUSIC_FADE_OUT_MS;

        // Current station theme
        this.stationType = 'standard';
        this.theme = null;
    }
    
    /**
     * Musical themes for each station type
     * Each theme defines: scale, motifs, tempo feel, harmonic character
     */
    static get STATION_THEMES() {
        return {
            // Imperial: Grand, regal, slow brass-like fanfares
            imperial: {
                baseNote: 48, // C3
                scale: [0, 2, 4, 5, 7, 9, 11], // Major scale
                motifs: [
                    [0, 4, 7, 12, 7, 4],           // Rising major arpeggio, falling back
                    [7, 5, 4, 2, 0],               // Descending majesty
                    [0, 2, 4, 7, 9, 7, 4, 2],      // Regal flourish
                    [12, 11, 9, 7, 5, 4, 2, 0],    // Descending fanfare
                ],
                harmonyInterval: 7, // Fifth below
                noteInterval: 40,   // Very slow, stately
                filterFreq: 1200,   // Warm, brass-like
                attackTime: 0.15,
                releaseTime: 0.8,
            },
            
            // Military: Austere, minor, march-like
            military: {
                baseNote: 40, // E2
                scale: [0, 2, 3, 5, 7, 8, 10], // Natural minor
                motifs: [
                    [0, 0, 3, 3, 5, 5, 7],        // March rhythm in minor
                    [7, 5, 3, 0, -2, 0],          // Descending duty
                    [0, 5, 3, 0, 7, 5, 3, 0],     // Military call
                    [12, 10, 8, 7, 5, 3, 0],      // Trumpet descent
                ],
                harmonyInterval: 5, // Fourth below
                noteInterval: 25,   // Steady march tempo
                filterFreq: 1500,
                attackTime: 0.05,
                releaseTime: 0.4,
            },
            
            // Agricultural: Pastoral, folk-like, pentatonic
            agricultural: {
                baseNote: 52, // E3
                scale: [0, 2, 4, 7, 9], // Major pentatonic
                motifs: [
                    [0, 2, 4, 7, 4, 2, 0],        // Simple pastoral tune
                    [7, 9, 7, 4, 2, 4],           // Rolling hills
                    [0, 4, 7, 9, 7, 4, 2, 0],     // Folk melody
                    [9, 7, 4, 2, 0, 2, 4],        // Peaceful meandering
                ],
                harmonyInterval: 12, // Octave below (drone)
                noteInterval: 35,    // Gentle, unhurried
                filterFreq: 2500,    // Brighter, airy
                attackTime: 0.12,
                releaseTime: 0.6,
            },
            
            // Industrial: Deep, mechanical, repetitive
            industrial: {
                baseNote: 33, // A1
                scale: [0, 2, 3, 5, 7, 10], // Dorian mode
                motifs: [
                    [0, 0, 5, 0, 0, 7, 0, 5],     // Mechanical pulse
                    [0, 3, 5, 3, 0, 3, 5, 7],     // Factory rhythm
                    [7, 5, 3, 0, 7, 5, 3, 0],     // Repetitive grind
                    [0, 5, 0, 7, 0, 5, 0, 3],     // Industrial drone
                ],
                harmonyInterval: 7, // Fifth
                noteInterval: 22,   // Steady, mechanical
                filterFreq: 900,    // Dark, muffled
                attackTime: 0.02,
                releaseTime: 0.3,
            },
            
            // Mining: Cavernous, sparse, deep echoes
            mining: {
                baseNote: 28, // E1 - very low
                scale: [0, 3, 5, 7, 10], // Minor pentatonic
                motifs: [
                    [0, null, 7, null, 5, null, 0],    // Sparse with rests
                    [0, null, null, 5, null, 3, 0],   // Echoing depths
                    [7, null, 5, null, 0, null, -5],  // Descending shaft
                    [0, 5, null, 7, null, 5, 0, null], // Dripping echoes
                ],
                harmonyInterval: 12, // Octave below (rumble)
                noteInterval: 50,    // Very slow, cavernous
                filterFreq: 600,     // Very dark
                attackTime: 0.08,
                releaseTime: 1.2,    // Long echo tail
            },
            
            // Tourism: Bright, welcoming, major arpeggios
            tourism: {
                baseNote: 55, // G3
                scale: [0, 2, 4, 5, 7, 9, 11], // Major
                motifs: [
                    [0, 4, 7, 11, 12, 11, 7, 4],  // Sparkling arpeggio
                    [12, 9, 7, 4, 2, 0],          // Welcoming descent
                    [0, 2, 4, 7, 9, 11, 12],      // Rising welcome
                    [7, 4, 7, 12, 7, 4, 2, 0],    // Cheerful bounce
                ],
                harmonyInterval: 4, // Major third
                noteInterval: 28,   // Moderate, pleasant
                filterFreq: 3000,   // Bright, shimmery
                attackTime: 0.08,
                releaseTime: 0.5,
            },
            
            // Refinery: Harsh, industrial, slightly dissonant
            refinery: {
                // Shifted to mid-range and opened filter so it's audible
                baseNote: 44, // A2 - higher so melodies cut through
                scale: [0, 3, 5, 6, 7, 10], // Minor/dissonant palette but more mid-focused
                motifs: [
                    [0, 5, 6, 5, 0, 1, 0],        // Grinding dissonance
                    [0, 0, 7, 6, 5, 0],           // Industrial clash
                    [7, 6, 5, 1, 0, 5, 6, 7],     // Harsh machinery
                    [0, 1, 0, 6, 7, 6, 0],        // Burning process
                ],
                harmonyInterval: 7, // Fifth below for stronger presence
                noteInterval: 24,   // Slightly slower so notes are perceptible
                filterFreq: 2600,   // Opened up so the mid/high content is audible
                attackTime: 0.02,
                releaseTime: 0.5,
                volumeMultiplier: 1.15, // Slightly louder than other themes
                envelope2Range: 0.7,    // Stronger harmony/drone for presence
            },
            
            // Post Human: Ethereal, high, glassy textures
            posthuman: {
                baseNote: 65, // F4 - high register
                scale: [0, 2, 4, 6, 7, 9, 11], // Lydian (dreamy)
                motifs: [
                    [0, 4, 6, 11, 12, 11, 6, 4],  // Floating, ethereal
                    [12, 11, 9, 7, 6, 4, 2, 0],   // Descending dream
                    [0, 2, 6, 9, 11, 9, 6, 2],    // Crystalline
                    [7, 6, 4, 2, 0, 2, 4, 6, 7],  // Transcendent rise
                ],
                harmonyInterval: 9, // Major sixth (sweet)
                noteInterval: 45,   // Slow, floating
                filterFreq: 4000,   // Very bright, glassy
                attackTime: 0.2,
                releaseTime: 1.0,
            },
            
            // Alien: Microtonal feel, otherworldly
            alien: {
                baseNote: 50, // D3
                scale: [0, 1, 4, 5, 8, 9], // Augmented/whole-tone hybrid
                motifs: [
                    [0, 4, 8, 9, 8, 4, 1, 0],     // Alien intervals
                    [0, 1, 5, 8, 5, 1, 0],        // Otherworldly
                    [9, 8, 5, 4, 1, 0, 1, 4],     // Strange descent
                    [0, 5, 9, 5, 8, 4, 0],        // Non-human logic
                ],
                harmonyInterval: 8, // Augmented fifth (eerie)
                noteInterval: 38,   // Unhurried, mysterious
                filterFreq: 2000,
                attackTime: 0.1,
                releaseTime: 0.7,
            },
            
            // Separatist: Tense, minor, suspenseful
            separatist: {
                baseNote: 43, // G2
                scale: [0, 1, 3, 5, 7, 8, 10], // Harmonic minor
                motifs: [
                    [0, 3, 5, 8, 7, 5, 3, 0],     // Tense creeping
                    [7, 8, 7, 5, 3, 1, 0],        // Suspicious descent
                    [0, 1, 3, 7, 8, 7, 3, 1, 0],  // Plotting
                    [5, 3, 1, 0, 1, 3, 5, 7],     // Rising tension
                ],
                harmonyInterval: 3, // Minor third (dark)
                noteInterval: 32,   // Moderate, tense
                filterFreq: 1400,
                attackTime: 0.06,
                releaseTime: 0.5,
            },
            
            // Standard: Neutral, ambient, calming
            standard: {
                baseNote: 48, // C3
                scale: [0, 2, 4, 7, 9], // Major pentatonic (safe)
                motifs: [
                    [0, 2, 4, 7, 4, 2, 0],        // Simple, calming
                    [7, 4, 2, 0, 2, 4, 7],        // Gentle wave
                    [0, 4, 7, 9, 7, 4, 0],        // Neutral ambient
                    [9, 7, 4, 2, 0, 2, 4],        // Soft descent
                ],
                harmonyInterval: 12, // Octave (neutral)
                noteInterval: 35,
                filterFreq: 1800,
                attackTime: 0.1,
                releaseTime: 0.6,
            },
        };
    }
    
    /**
     * Initialize audio components - must be called after p5.sound is ready
     * and after user interaction (to unlock AudioContext)
     */
    init() {
        if (this.isInitialized) return true;
        
        // Check if p5.sound is available
        if (typeof p5 === 'undefined' || typeof p5.SinOsc === 'undefined') {
            console.warn('StationMusicManager: p5.sound not available');
            return false;
        }
        
        try {
            // Create primary oscillator - triangle wave for soft, ambient melody
            this.osc = new p5.TriOsc();
            
            // Create secondary oscillator - sine wave for harmony/drone (even softer)
            this.osc2 = new p5.SinOsc();
            
            // Create envelope with slow attack for smooth melodic notes
            this.envelope = new p5.Envelope();
            this.envelope.setADSR(0.1, 0.15, 0.5, 0.6); // Slow attack, long release
            this.envelope.setRange(1, 0);
            
            // Create secondary envelope for harmony (even slower, more pad-like)
            this.envelope2 = new p5.Envelope();
            this.envelope2.setADSR(0.3, 0.2, 0.6, 0.8); // Very slow, drone-like
            this.envelope2.setRange(0.4, 0); // Quieter than main melody
            
            // Create low-pass filter to soften the sound
            this.filter = new p5.LowPass();
            this.filter.freq(2000);
            this.filter.res(1.5);
            
            // Connect both oscillators to the filter
            this.osc.disconnect();
            this.osc.connect(this.filter);
            this.osc2.disconnect();
            this.osc2.connect(this.filter);

            // Master gain controls overall station music loudness (including reverb)
            this.masterGain = new p5.Gain();
            this.filter.disconnect();
            this.filter.connect(this.masterGain);

            // Create reverb for spacey atmosphere and feed it from the master gain
            this.reverb = new p5.Reverb();
            this.reverb.process(this.masterGain, 6, 12); // Long reverb tail

            // Start muted until `start()`/update() ramps volume
            try { this.masterGain.amp(0); } catch (e) { /* ignore */ }
            
            this.isInitialized = true;
            console.log('StationMusicManager: Initialized successfully');
            return true;
        } catch (e) {
            console.error('StationMusicManager: Failed to initialize audio:', e);
            return false;
        }
    }
    
    /**
     * Generate a melody based on the station's theme
     * Uses composed motifs with subtle variations rather than random notes
     * @param {object} options - Generation options
     * @param {string} options.stationType - Station's type for theming
     * @param {number} options.techLevel - Tech level for subtle variations
     */
    generateMelody(options = {}) {
        const stationType = (options.stationType || 'standard').toLowerCase();
        const themes = StationMusicManager.STATION_THEMES;
        
        // Get theme for this station type, fallback to standard
        this.theme = themes[stationType] || themes.standard;
        this.stationType = stationType;
        
        // Set timing and filter based on theme
        this.noteInterval = this.theme.noteInterval;
        if (this.filter) {
            this.filter.freq(this.theme.filterFreq);
        }
        
        // Set envelope characteristics based on theme
        if (this.envelope) {
            this.envelope.setADSR(
                this.theme.attackTime,
                0.15,
                0.5,
                this.theme.releaseTime
            );
        }
        if (this.envelope2) {
            // Harmony envelope is always slower/smoother
            this.envelope2.setADSR(
                this.theme.attackTime * 2,
                0.2,
                0.6,
                this.theme.releaseTime * 1.2
            );
            // Allow themes to request a stronger harmony level (e.g. refinery)
            if (typeof this.theme.envelope2Range === 'number') {
                try { this.envelope2.setRange(this.theme.envelope2Range, 0); } catch (e) { /* ignore */ }
            } else {
                try { this.envelope2.setRange(0.4, 0); } catch (e) { /* ignore */ }
            }
        }
        
        // Build the full melody by selecting and combining motifs
        this.melody = [];
        this.harmony = [];
        
        // Select 2-3 motifs and combine them into a longer phrase
        const numMotifs = 2 + Math.floor(Math.random() * 2);
        const usedMotifs = [];
        
        for (let i = 0; i < numMotifs; i++) {
            // Pick a motif (avoid immediate repetition)
            let motifIndex;
            do {
                motifIndex = Math.floor(Math.random() * this.theme.motifs.length);
            } while (usedMotifs.length > 0 && motifIndex === usedMotifs[usedMotifs.length - 1] && this.theme.motifs.length > 1);
            
            usedMotifs.push(motifIndex);
            const motif = this.theme.motifs[motifIndex];
            
            // Add each note from the motif, converting scale degrees to MIDI notes
            for (const degree of motif) {
                if (degree === null) {
                    // Rest - represented as null in melody
                    this.melody.push(null);
                    this.harmony.push(null);
                } else {
                    // Convert scale degree to actual note
                    const midiNote = this.scaleToMidi(degree, this.theme.baseNote, this.theme.scale);
                    this.melody.push(midiNote);
                    
                    // Add harmony note (interval below the melody)
                    const harmonyNote = midiNote - this.theme.harmonyInterval;
                    this.harmony.push(harmonyNote);
                }
            }
            
            // Add a brief rest between motifs (except after last one)
            if (i < numMotifs - 1) {
                this.melody.push(null);
                this.harmony.push(null);
            }
        }
        
        // Tech level can add subtle octave doubling on some notes
        const techLevel = options.techLevel || 5;
        if (techLevel > 7) {
            // High tech: occasionally add octave shimmer
            for (let i = 0; i < this.melody.length; i++) {
                if (this.melody[i] !== null && Math.random() < 0.15) {
                    this.melody[i] += 12; // Octave up for brightness
                }
            }
        } else if (techLevel < 3) {
            // Low tech: drop some notes down an octave
            for (let i = 0; i < this.melody.length; i++) {
                if (this.melody[i] !== null && Math.random() < 0.2) {
                    this.melody[i] -= 12;
                }
            }
        }
        
        // Reset playback position
        this.noteIndex = 0;
        this.phraseIndex = 0;
        
        console.log(`StationMusicManager: Generated ${this.melody.length}-note melody for ${stationType} station`);
    }
    
    /**
     * Convert a scale degree to a MIDI note number
     * @param {number} degree - Scale degree (can be negative or > octave)
     * @param {number} baseNote - Base MIDI note of the scale
     * @param {number[]} scale - Array of semitone intervals in the scale
     * @returns {number} MIDI note number
     */
    scaleToMidi(degree, baseNote, scale) {
        const scaleLength = scale.length;
        
        // Handle octaves
        const octaves = Math.floor(degree / scaleLength);
        const withinOctave = ((degree % scaleLength) + scaleLength) % scaleLength;
        
        return baseNote + (octaves * 12) + scale[withinOctave];
    }
    
    /**
     * Start playing station music
     * @param {object} stationInfo - Information about the current station
     */
    start(stationInfo = {}) {
        if (!this.init()) {
            console.warn('StationMusicManager: Cannot start - initialization failed');
            return;
        }
        
        if (this.isPlaying) return;
        
        // Generate new melody based on station type
        this.generateMelody({
            stationType: stationInfo.stationType || stationInfo.economyType,
            techLevel: stationInfo.techLevel
        });
        
        // Start oscillators
        try {
            this.osc.start();
            this.osc2.start();
            this.isPlaying = true;
            // Apply theme volume multiplier if present so certain themes (e.g. refinery)
            // can be louder to remain audible.
            this.targetVolume = this.baseVolume * (this.theme && this.theme.volumeMultiplier ? this.theme.volumeMultiplier : 1);
            this.frameCounter = 0;
            console.log('StationMusicManager: Music started for', this.stationType, 'station');
        } catch (e) {
            console.error('StationMusicManager: Error starting music:', e);
        }
    }
    
    /**
     * Stop playing station music with fade out
     * @param {number} fadeMs - Optional fade-out duration in milliseconds (default 600)
     */
    stop(fadeMs) {
        // Use instance default when fadeMs not provided
        if (typeof fadeMs !== 'number') fadeMs = this.fadeOutMs || 600;

        // If nothing is playing and target is already silent, nothing to do
        if (!this.isPlaying && this.targetVolume === 0) return;

        // Ensure we request silence
        this.targetVolume = 0;

        // Use p5.Gain ramp to perform the fade even if update() is not called
        const fadeSec = Math.max(0.01, fadeMs / 1000);
        if (this.masterGain) {
            try {
                this.masterGain.amp(0, fadeSec);
            } catch (e) {
                try { this.masterGain.amp(0); } catch (_) {}
            }
        }

        // Mark not playing so update-based playback stops immediately
        this.isPlaying = false;

        // Stop oscillators after the fade has completed (plus small buffer)
        setTimeout(() => {
            try {
                if (this.osc) {
                    this.osc.stop();
                }
                if (this.osc2) {
                    this.osc2.stop();
                }
            } catch (e) {
                // Oscillator may already be stopped
            }
        }, Math.max(50, fadeMs + 50));

        console.log('StationMusicManager: Music stopped (fade ' + fadeMs + 'ms)');
    }
    
    /**
     * Update the music - call this every frame when docked
     */
    update() {
        if (!this.isPlaying || !this.isInitialized) return;
        
        // Smooth volume transitions
        if (this.currentVolume < this.targetVolume) {
            this.currentVolume = Math.min(this.currentVolume + this.fadeSpeed, this.targetVolume);
        } else if (this.currentVolume > this.targetVolume) {
            this.currentVolume = Math.max(this.currentVolume - this.fadeSpeed, this.targetVolume);
        }
        
        // Update master gain
        if (this.masterGain) {
            try {
                this.masterGain.amp(this.currentVolume, 0.05);
            } catch (e) {
                try { this.masterGain.amp(this.currentVolume); } catch (_) {}
            }
        }
        
        // Play notes at interval (slower = more ambient)
        this.frameCounter++;
        if (this.frameCounter >= this.noteInterval) {
            this.frameCounter = 0;
            this.playNextNote();
        }
    }
    
    /**
     * Play the next note in the melodic sequence
     */
    playNextNote() {
        if (!this.osc || !this.envelope || this.melody.length === 0) return;
        
        try {
            const melodyNote = this.melody[this.noteIndex];
            const harmonyNote = this.harmony[this.noteIndex];
            
            // Handle rests (null notes) - just advance without playing
            if (melodyNote === null) {
                this.noteIndex = (this.noteIndex + 1) % this.melody.length;
                
                // When we loop back to start, maybe regenerate for variety
                if (this.noteIndex === 0) {
                    this.phraseIndex++;
                    if (this.phraseIndex >= 3) {
                        // After 3 loops, generate a new variation
                        this.generateMelody({ stationType: this.stationType });
                    }
                }
                return;
            }
            
            // Play the melody note
            const melodyFreq = this.midiToFreq(melodyNote);
            this.osc.freq(melodyFreq);
            this.envelope.play(this.osc, 0, 0.15);
            
            // Play harmony note (if we have the second oscillator and it's not null)
            if (this.osc2 && this.envelope2 && harmonyNote !== null) {
                const harmonyFreq = this.midiToFreq(harmonyNote);
                this.osc2.freq(harmonyFreq);
                this.envelope2.play(this.osc2, 0, 0.1);
            }
            
            // Advance to next note
            this.noteIndex = (this.noteIndex + 1) % this.melody.length;
            
            // When we loop back to start, maybe regenerate for variety
            if (this.noteIndex === 0) {
                this.phraseIndex++;
                if (this.phraseIndex >= 3) {
                    // After 3 loops, generate a new variation
                    this.generateMelody({ stationType: this.stationType });
                }
            }
        } catch (e) {
            console.error('StationMusicManager: Error playing note:', e);
        }
    }
    
    /**
     * Convert MIDI note number to frequency
     * @param {number} midiNote - MIDI note number (0-127)
     * @returns {number} Frequency in Hz
     */
    midiToFreq(midiNote) {
        // Use p5's midiToFreq if available, otherwise calculate
        if (typeof midiToFreq === 'function') {
            return midiToFreq(midiNote);
        }
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }
    
    /**
     * Set the music volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        this.baseVolume = Math.max(0, Math.min(1, volume));
        if (this.isPlaying) {
            this.targetVolume = this.baseVolume;
            if (this.masterGain) {
                try { this.masterGain.amp(this.baseVolume, 0.05); } catch (_) { this.masterGain.amp(this.baseVolume); }
            }
        }
    }
    
    /**
     * Clean up all audio resources
     */
    cleanup() {
        this.stop();
        
        try {
            if (this.osc) {
                this.osc.disconnect();
                this.osc = null;
            }
            if (this.osc2) {
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
                try { this.masterGain.disconnect(); } catch (_) {}
                this.masterGain = null;
            }
            this.envelope = null;
            this.envelope2 = null;
        } catch (e) {
            // Ignore cleanup errors
        }
        
        this.isInitialized = false;
        console.log('StationMusicManager: Cleaned up');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.StationMusicManager = StationMusicManager;
}
