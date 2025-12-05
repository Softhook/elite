/**
 * StationMusicManager - Generative ambient music for space stations
 * Uses TotalSerialism library for algorithmic composition with p5.sound
 * Plays atmospheric generative melodies when the player is docked at a station
 */
class StationMusicManager {
    constructor() {
        this.isPlaying = false;
        this.isInitialized = false;
        
        // Audio components (p5.sound)
        this.osc = null;
        this.envelope = null;
        this.reverb = null;
        this.filter = null;
        this.masterGain = null;
        
        // Melody state
        this.notes = [];
        this.noteIndex = 0;
        this.frameCounter = 0;
        this.noteInterval = 12; // Frames between notes (slower, more ambient)
        
        // Volume control
        this.baseVolume = 0.4; // Keep it subtle as background music
        this.currentVolume = 0;
        this.targetVolume = 0;
        this.fadeSpeed = 0.04;
        
        // Variation parameters (can be set per-station)
        this.baseNote = 36; // Starting MIDI note
        this.noteRange = 24; // Range of notes
        this.complexity = 4; // Number of pattern repetitions
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
        
        // Check if TotalSerialism is available
        if (typeof TotalSerialism === 'undefined') {
            console.warn('StationMusicManager: TotalSerialism library not loaded');
            return false;
        }
        
        try {
            // Create oscillator - use triangle wave for softer, more ambient sound
            this.osc = new p5.TriOsc();
            
            // Create envelope with slow attack for smooth notes
            this.envelope = new p5.Envelope();
            this.envelope.setADSR(0.05, 0.1, 0.4, 0.3); // Slower, more ambient envelope
            // Envelope shapes each note; keep its range at full (1) and control overall
            // loudness via a dedicated master gain so reverb/wet signals are also scaled.
            this.envelope.setRange(1, 0);
            
            // Create low-pass filter to soften the sound
            this.filter = new p5.LowPass();
            this.filter.freq(2000);
            this.filter.res(2);
            this.osc.disconnect();
            this.osc.connect(this.filter);

            // Master gain controls overall station music loudness (including reverb)
            this.masterGain = new p5.Gain();
            this.filter.disconnect();
            this.filter.connect(this.masterGain);

            // Create reverb for spacey atmosphere and feed it from the master gain
            this.reverb = new p5.Reverb();
            this.reverb.process(this.masterGain, 8, 15); // Long reverb tail

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
     * Generate a new melody pattern based on station characteristics
     * @param {object} options - Generation options
     * @param {string} options.economyType - Station's economy type for theming
     * @param {number} options.techLevel - Tech level affects complexity
     * @param {string} options.securityLevel - Security level affects mood
     */
    generateMelody(options = {}) {
        if (typeof TotalSerialism === 'undefined') {
            console.warn('StationMusicManager: TotalSerialism not available for melody generation');
            return;
        }
        
        const Gen = TotalSerialism.Generative;
        const Mod = TotalSerialism.Transform;
        const Util = TotalSerialism.Utility;
        
        // Adjust parameters based on station type
        let baseNote = this.baseNote;
        let noteRange = this.noteRange;
        let noteCount = 8;
        let complexity = this.complexity;
        let intervals = [0, 7, 12, 19, 24]; // Perfect intervals for ambient sound
        
        // Customize based on economy type
        const economyType = (options.economyType || '').toLowerCase();
        switch (economyType) {
            case 'imperial':
                baseNote = 40; // Higher, more regal
                intervals = [0, 4, 7, 12, 16]; // Major chord intervals
                this.noteInterval = 14;
                break;
            case 'military':
                baseNote = 32; // Lower, more serious
                intervals = [0, 5, 7, 12, 17]; // Minor feel
                this.noteInterval = 10;
                break;
            case 'separatist':
                baseNote = 36;
                intervals = [0, 3, 7, 10, 15]; // Minor/diminished
                this.noteInterval = 11;
                break;
            case 'agricultural':
                baseNote = 43; // Brighter, pastoral
                intervals = [0, 4, 7, 11, 14]; // Major 7th feel
                this.noteInterval = 15;
                break;
            case 'industrial':
                baseNote = 30; // Deep, mechanical
                intervals = [0, 5, 7, 12, 17];
                this.noteInterval = 9;
                break;
            case 'tourism':
                baseNote = 45; // Bright, welcoming
                intervals = [0, 4, 7, 12, 16]; // Pure major
                this.noteInterval = 13;
                break;
            case 'mining':
                baseNote = 28; // Very deep
                intervals = [0, 5, 7, 10, 12];
                this.noteInterval = 10;
                break;
            default:
                baseNote = 38;
                intervals = [0, 7, 12, 19, 24]; // Default fifths/octaves
                this.noteInterval = 12;
        }
        
        // Adjust complexity based on tech level
        const techLevel = options.techLevel || 5;
        if (techLevel > 7) {
            noteCount = 10;
            complexity = 5;
        } else if (techLevel < 3) {
            noteCount = 6;
            complexity = 3;
        }
        
        try {
            // Generate base notes spread across the range
            this.notes = Gen.spreadInclusive(noteCount, baseNote, baseNote + noteRange);
            
            // Create palindrome and duplicate for longer phrase
            this.notes = Mod.duplicate(Mod.palindrome(this.notes), complexity);
            
            // Add intervallic variation
            this.notes = Util.add(this.notes, intervals);
            
            // Reset playback position
            this.noteIndex = 0;
            
            console.log(`StationMusicManager: Generated ${this.notes.length} note melody for ${economyType || 'standard'} station`);
        } catch (e) {
            console.error('StationMusicManager: Error generating melody:', e);
            // Fallback to simple melody
            this.notes = [48, 52, 55, 60, 55, 52, 48, 45];
        }
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
        
        // Generate new melody based on station
        this.generateMelody({
            economyType: stationInfo.economyType,
            techLevel: stationInfo.techLevel,
            securityLevel: stationInfo.securityLevel
        });
        
        // Start oscillator
        try {
            this.osc.start();
            this.isPlaying = true;
            this.targetVolume = this.baseVolume;
            this.frameCounter = 0;
            console.log('StationMusicManager: Music started');
        } catch (e) {
            console.error('StationMusicManager: Error starting music:', e);
        }
    }
    
    /**
     * Stop playing station music with fade out
     */
    stop() {
        if (!this.isPlaying) return;
        
        this.targetVolume = 0;
        this.isPlaying = false;
        
        // Stop oscillator after fade
        setTimeout(() => {
            try {
                if (this.osc) {
                    this.osc.stop();
                }
            } catch (e) {
                // Oscillator may already be stopped
            }
        }, 500);
        
        console.log('StationMusicManager: Music stopped');
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
        
        // Envelope remains at full range; control overall loudness via master gain.
        if (this.envelope) {
            this.envelope.setRange(1, 0);
        }
        if (this.masterGain) {
            try {
                this.masterGain.amp(this.currentVolume, 0.05);
            } catch (e) {
                // Some p5 versions may not support time parameter; fallback to direct set
                try { this.masterGain.amp(this.currentVolume); } catch (_) {}
            }
        }
        
        // Play notes at interval
        this.frameCounter++;
        if (this.frameCounter >= this.noteInterval) {
            this.frameCounter = 0;
            this.playNextNote();
        }
    }
    
    /**
     * Play the next note in the sequence
     */
    playNextNote() {
        if (!this.osc || !this.envelope || this.notes.length === 0) return;
        
        try {
            const midiNote = this.notes[this.noteIndex];
            const frequency = this.midiToFreq(midiNote);
            
            this.osc.freq(frequency);
            this.envelope.play(this.osc, 0, 0.15);
            
            // Advance to next note
            this.noteIndex = (this.noteIndex + 1) % this.notes.length;
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
