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
        this.osc3 = null; // Tertiary oscillator for additional voice
        this.envelope = null;
        this.envelope2 = null;
        this.envelope3 = null;
        this.reverb = null;
        this.filter = null;
        this.masterGain = null;

        // Melody state
        this.melody = [];        // Main melodic phrase (composed, not random)
        this.harmony = [];       // Secondary harmony notes
        this.harmony2 = [];      // Tertiary harmony notes
        this.noteIndex = 0;
        this.phraseIndex = 0;    // Track which phrase variation we're on
        this.lastNoteTime = 0;   // Timestamp of last played note

        this.lastHarmony2Freq = 0;

        this.stopTimeout = null; // Track pending stop timeout
        this.noteInterval = 500; // ms between notes (default)
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
     * Each theme defines: scale, motifs, tempo feel, harmonic character, oscillator types, and sonic signature
     * 
     * New properties for distinctive sound:
     * - oscType / osc2Type: oscillator waveforms ('sine', 'triangle', 'square', 'sawtooth')
     * - detune: cents detuning for grit/warmth (0-50)
     * - noteGlide: portamento time in seconds between notes (0-0.3)
     * - filterRes: filter resonance for character (0.1-15)
     * - rhythmVariation: timing variation factor (0 = strict, 0.3 = rubato)
     * - reverbDecay: reverb tail length multiplier (0.5-3)
     * - dynamicRange: velocity variation amount (0-0.4)
     */
    static get STATION_THEMES() {
        return {
            // Imperial: Baroque brass fanfares - regal, ceremonial grandeur
            imperial: {
                baseNote: 48, // C3
                scale: [0, 2, 4, 5, 7, 9, 11], // Major scale
                motifs: [
                    [0, null, 4, 7, 12, null, 12, 7, 4],     // Fanfare with pauses
                    [7, 5, 4, 2, 0, null, 0],                // Descending majesty
                    [0, 4, 7, 12, 14, 12, 7],                // Regal flourish rising
                    [12, 11, 9, 7, null, 5, 4, 2, 0],        // Grand descent
                ],
                harmonyInterval: 7,  // Perfect fifth (stately)
                noteInterval: 750,   // Very slow, grandioso (was 45 frames)
                filterFreq: 1400,    // Warm brass timbre
                filterRes: 2.0,      // Slight warmth
                attackTime: 0.12,
                releaseTime: 0.9,
                oscType: 'triangle',
                osc2Type: 'sine',
                detune: 8,           // Slight chorus for fullness
                noteGlide: 0.05,     // Subtle legato
                reverbDecay: 1.8,    // Grand hall reverb
                dynamicRange: 0.15,  // Subtle dynamics for majesty
            },

            // Military: Disciplined march with clear melodic logic
            military: {
                baseNote: 40, // E2 - low but clear
                // Harmonic minor gives a stronger tonal center and resolving leading tone
                scale: [0, 2, 3, 5, 7, 8, 11],
                motifs: [
                    [0, null, 0, 4, 5, null, 4],     // Tonic call, response to fifth
                    [0, 2, 3, 5, 3, 2, 0],           // Stepwise march line
                    [5, 7, 5, 3, 0],                 // Simple phrased return
                    [0, 0, 7, 0],                    // Strong repeated tonic with octave
                ],
                harmonyInterval: 12, // Octave doubling for solidity
                // Add an upper fifth voice to create triadic spread
                harmonyInterval2: -7,
                osc3Type: 'sawtooth',
                envelope3Range: 0.6,
                noteInterval: 360,   // March tempo that's musical and clear
                filterFreq: 1700,    // Warm but defined
                filterRes: 1.8,      // Mild resonance
                attackTime: 0.02,    // Crisp but not brittle
                releaseTime: 0.28,   // Short sustain for march clarity
                oscType: 'triangle', // Noble, rounded timbre
                osc2Type: 'sine',    // Pure supporting octave
                detune: 4,           // Slight width
                noteGlide: 0.01,     // Minimal smoothing
                reverbDecay: 0.9,    // Small hall for presence
                dynamicRange: 0.15,  // Natural emphasis on strong beats
                volumeMultiplier: 1.0,
            },

            // Agricultural: Celtic folk - pastoral jig, pennywhistle feel
            agricultural: {
                baseNote: 52, // E3
                scale: [0, 2, 4, 7, 9], // Major pentatonic
                motifs: [
                    [0, 2, 4, 7, 4, 2, 0],        // Simple pastoral tune
                    [7, 9, 7, 4, 2, 4],           // Rolling hills
                    [0, 4, 7, 9, 7, 4, 2, 0],     // Folk melody
                    [9, 7, 4, 2, 0, 2, 4],        // Peaceful meandering
                ],
                harmonyInterval: 12, // Octave drone below
                noteInterval: 300,   // Lively jig tempo (was 18 frames)
                filterFreq: 3500,    // Bright, airy
                filterRes: 1.0,      // Clean
                attackTime: 0.03,    // Quick for jig articulation
                releaseTime: 0.25,   // Bouncy
                oscType: 'triangle',
                osc2Type: 'sine',
                detune: 5,           // Slight rustic warmth
                noteGlide: 0.02,     // Light articulation
                reverbDecay: 1.0,    // Open field
                dynamicRange: 0.25,  // Natural folk dynamics
            },

            // Industrial: Techno machinery - polyrhythmic, gritty, pumping
            industrial: {
                baseNote: 33, // A1 - deep bass
                scale: [0, 3, 5, 7, 10], // Minor pentatonic
                motifs: [
                    [0, 0, 5, 0, 7, 0, 5, 0],         // Pumping bass pulse
                    [0, 7, 0, 5, 0, 10, 0, 7],        // Driving rhythm
                    [5, 0, 5, 7, 5, 0, 5, 10],        // Syncopated grind
                    [0, 0, 0, 7, 0, 0, 0, 5],         // Heavy kicks
                ],
                harmonyInterval: 7,  // Fifth drone
                noteInterval: 200,   // Fast 16th note feel (was 12 frames)
                filterFreq: 800,     // Dark, muffled
                filterRes: 8.0,      // Resonant sweep character
                attackTime: 0.005,   // Punchy transients
                releaseTime: 0.2,    // Tight
                oscType: 'sawtooth', // Gritty sawtooth
                osc2Type: 'square',
                detune: 15,          // Thick detuned layer
                noteGlide: 0,        // No glide - mechanical precision
                reverbDecay: 0.5,    // Tight industrial space
                dynamicRange: 0.1,   // Compressed, pounding
                filterSweep: { min: 400, max: 1400, speed: 0.02 }, // Pumping filter
                volumeMultiplier: 1.1,
            },

            // Mining: Reworked - more active, higher low-end and rhythmic
            mining: {
                baseNote: 40, // E2 - audible low-mid register
                scale: [0, 2, 3, 5, 7, 10], // Minor with step for melodic motion
                motifs: [
                    [0, 0, null, 5, 7, null],        // Repeating pulse with resolve
                    [0, 3, 5, null, 5, 3],           // Short rising phrase
                    [7, null, 5, 3, 0, null],        // Anchored return
                    [0, 5, 7, 5, null, 0],           // Drifting motif with bounce
                ],
                harmonyInterval: 12, // Octave below to keep body
                // tertiary drone but not too deep (adds mid-low color)
                harmonyInterval2: 19,
                osc3Type: 'sine',
                envelope3Range: 0.6,
                noteInterval: 360,   // Faster so phrases feel active
                filterFreq: 1100,    // Open mids for presence
                filterRes: 2.6,      // Slight character
                attackTime: 0.04,
                releaseTime: 0.7,    // Shorter tail so texture isn't smothering
                oscType: 'triangle', // Rounded main voice
                osc2Type: 'sawtooth', // Adds harmonic body
                detune: 6,           // Some width
                noteGlide: 0.06,     // Gentle smoothing for drones
                reverbDecay: 1.4,    // Less cavernous, more room-like
                dynamicRange: 0.18,  // More expressive
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
                noteInterval: 466,   // Moderate, pleasant (was 28 frames)
                filterFreq: 3000,   // Bright, shimmery
                filterRes: 1.2,     // Slight shimmer
                attackTime: 0.08,
                releaseTime: 0.5,
                oscType: 'triangle', // Warm and pleasant
                osc2Type: 'sine',
                detune: 6,           // Slight chorus warmth
                noteGlide: 0.03,     // Smooth transitions
                reverbDecay: 1.2,    // Pleasant room
                dynamicRange: 0.15,  // Natural dynamics
            },

            // Refinery: Melodic industrial with rhythmic pulse and clearer phrasing
            refinery: {
                baseNote: 44, // A2 - centered for clear mids
                // Minor-pentatonic palette keeps grit but avoids harsh dissonance
                scale: [0, 3, 5, 7, 10],
                motifs: [
                    [0, null, 5, 7, 5, 3, 0],        // Call-response with resolve
                    [0, 3, 5, 7, null, 7, 5, 3],     // Rising phrase and echo
                    [7, null, 0, 0, 7, null, 5, 3],  // Pulsing return and anchor
                    [0, 5, 7, 8, 7, 5],              // Slight passing tone for color
                ],
                // Make the refinery more corded and slower
                harmonyInterval: 12, // Octave drone for a corded feel
                noteInterval: 720,   // Much slower so chords can breathe
                filterFreq: 1800,     // Warm mids for clarity
                filterRes: 2.2,       // Slight character without ringing
                attackTime: 0.12,
                releaseTime: 2.0,
                oscType: 'triangle',  // Rounded main voice
                osc2Type: 'sawtooth',  // Rich body beneath
                detune: 6,            // Gentle chorus for thickness
                noteGlide: 0.04,      // Gentle smoothing
                reverbDecay: 1.8,     // More spacious metallic environment
                dynamicRange: 0.2,    // Expressive but controlled
                volumeMultiplier: 1.05,
                envelope2Range: 0.9,  // Strong sustained harmony/drone for chord-like texture
                rhythmVariation: 0.08, // Slight humanized timing
                filterSweep: { min: 800, max: 2000, speed: 0.006 }, // Very slow movement
                // Chance to double certain melody notes an octave up for a corded/voiced texture
                octaveDoublingProb: 0.28,
                // How many phrase loops before regenerating motifs (smaller -> more variety)
                regenerateAfterPhrases: 2,
            },

            // Post Human: Ambient electronica - crystalline, transcendent, floating
            'post human': {
                baseNote: 72, // C5 - high, ethereal register
                scale: [0, 2, 4, 6, 7, 11], // Lydian (dreamy #4)
                motifs: [
                    [0, 4, 7, 11, 12, null, 11, 7],   // Floating arpeggios
                    [12, 11, 7, 6, 4, null, 2, 0],    // Descending dream
                    [0, null, 6, null, 11, null, 12], // Sparse crystal
                    [7, 6, 4, null, 2, 0, null, 4],   // Transcendent phrase
                ],
                harmonyInterval: 16, // Two octaves down (wide voicing)
                noteInterval: 916,    // Very slow, floating (was 55 frames)
                filterFreq: 5000,    // Crystalline highs
                filterRes: 0.5,      // Very clean, pure
                attackTime: 0.35,    // Slow fade in - ethereal
                releaseTime: 1.8,    // Long sustain
                oscType: 'sine',     // Pure glass tones
                osc2Type: 'sine',    // Both pure sines
                detune: 2,           // Almost pure
                noteGlide: 0.3,      // Long glides - floating
                reverbDecay: 2.5,    // Vast digital space
                dynamicRange: 0.1,   // Subtle, consistent
                rhythmVariation: 0.4, // Rubato - very free timing
            },

            // Offworld: Frontier americana - vast, lonely, pioneering
            offworld: {
                baseNote: 50, // D3
                scale: [0, 2, 4, 7, 9], // Major pentatonic (americana)
                motifs: [
                    [0, null, 7, null, 12, null, 7, 0],   // Vast open 5ths
                    [12, 9, 7, null, 4, 2, 0],            // Lonely horizon
                    [0, 7, 12, 14, null, 12, 7],          // Expansive frontier
                    [9, 7, 4, 2, null, 0, null, 0],       // Solitary ending
                ],
                harmonyInterval: 7,  // Open 5th (americana sound)
                noteInterval: 833,    // Slow, contemplative (was 50 frames)
                filterFreq: 2000,    // Warm but open
                filterRes: 1.5,      // Slight twang
                attackTime: 0.18,    // Slow "twang" attack
                releaseTime: 1.2,    // Long sustain
                oscType: 'triangle',
                osc2Type: 'sine',
                detune: 7,           // Slight warmth
                noteGlide: 0.15,     // Bending notes
                reverbDecay: 2.2,    // Vast lonely echo
                dynamicRange: 0.25,  // Natural dynamics
            },

            // Service: Elevator muzak - safe, predictable, corporate
            service: {
                baseNote: 52, // E3
                scale: [0, 2, 4, 5, 7, 9], // Major hexatonic (safe)
                motifs: [
                    [0, 2, 4, 5, 4, 2, 0],            // Cookie-cutter pattern
                    [5, 4, 2, 0, 2, 4],               // Predictable cycle
                    [0, 4, 5, 7, 5, 4, 2, 0],         // Standard flourish
                    [7, 5, 4, 2, 0, 2],               // Efficient descent
                ],
                harmonyInterval: 12, // Safe octave
                noteInterval: 466,    // Standard tempo (was 28 frames)
                filterFreq: 2000,    // Neutral
                filterRes: 1.0,      // Clean, unremarkable
                attackTime: 0.06,    // Standard
                releaseTime: 0.4,    // Standard
                oscType: 'triangle', // Inoffensive triangle
                osc2Type: 'sine',
                detune: 3,           // Slight warmth
                noteGlide: 0.02,     // Smooth but minimal
                reverbDecay: 0.8,    // Standard room
                dynamicRange: 0.05,  // Flat, compressed muzak
            },

            // Alien: Xenharmonic ambient - microtonal, unpredictable, eerie
            alien: {
                baseNote: 54, // F#3 - unusual starting note
                scale: [0, 1, 4, 5, 8, 9, 11], // Augmented + extra tensions
                motifs: [
                    [0, 4, 8, null, 9, 5, 1, 0],      // Non-human intervals
                    [8, 5, null, 1, 4, null, 0],     // Discontinuous thought
                    [0, null, 8, 9, null, 4, 1],     // Alien pauses
                    [9, 8, 4, null, 1, 0, 5, 8],     // Strange logic
                ],
                harmonyInterval: 8,  // Augmented 5th (eerie)
                noteInterval: 700,    // Irregular feel (was 42 frames)
                filterFreq: 1800,    // Neither bright nor dark
                filterRes: 5.0,      // Resonant strangeness
                attackTime: 0.2,     // Slow emergence
                releaseTime: 0.9,    // Lingering
                oscType: 'sine',     // Pure but detuned
                osc2Type: 'triangle',
                detune: 45,          // Heavy microtonal detuning
                noteGlide: 0.25,     // Quarter-tone bends
                reverbDecay: 1.8,    // Vast alien space
                dynamicRange: 0.35,  // Unpredictable dynamics
                rhythmVariation: 0.35, // Irregular timing
            },

            // Separatist: Soviet-era tension - paranoid, cold, threatening
            separatist: {
                baseNote: 41, // F2 - ominous low
                scale: [0, 1, 3, 5, 7, 8, 11], // Harmonic minor with leading tone
                motifs: [
                    [0, 1, 3, 5, 8, 7, 5, 3],         // Creeping paranoia
                    [8, 7, 5, 3, 1, 0, 1, 3],         // Suspicious watching
                    [0, 3, 5, 8, 11, 8, 5, 1],        // Rising threat
                    [5, 3, 1, 0, null, 1, 0, null],   // Pregnant pauses
                ],
                harmonyInterval: 3,  // Minor 3rd (dark)
                noteInterval: 583,    // Measured, deliberate (was 35 frames)
                filterFreq: 1300,    // Cold, metallic
                filterRes: 6.0,      // Harsh edge
                attackTime: 0.04,    // Sharp
                releaseTime: 0.5,    // Medium decay
                oscType: 'square',   // Cold square wave
                osc2Type: 'sawtooth',
                detune: 10,          // Slight unease
                noteGlide: 0.05,     // Subtle menace
                reverbDecay: 1.0,    // Cold concrete
                dynamicRange: 0.3,   // Paranoid dynamics
            },

            // Standard: Neutral ambient - calming, balanced, safe
            standard: {
                baseNote: 48, // C3
                scale: [0, 2, 4, 7, 9], // Major pentatonic (universally safe)
                motifs: [
                    [0, 2, 4, 7, null, 4, 2, 0],      // Breathing pattern
                    [7, 4, 2, 0, 2, 4, 7],            // Gentle wave
                    [0, null, 4, 7, 9, 7, 4],         // Spacious
                    [9, 7, 4, 2, 0, null, 0],         // Soft landing
                ],
                harmonyInterval: 12, // Safe octave
                noteInterval: 633,    // Calm pace (was 38 frames)
                filterFreq: 1900,    // Balanced
                filterRes: 1.2,      // Warm
                attackTime: 0.1,     // Gentle
                releaseTime: 0.65,   // Smooth
                oscType: 'triangle',
                osc2Type: 'sine',
                detune: 5,           // Slight warmth
                noteGlide: 0.04,     // Smooth transitions
                reverbDecay: 1.2,    // Pleasant space
                dynamicRange: 0.15,  // Subtle variation
            },
        };
    }

    /**
     * Create an oscillator of the specified type
     * @param {string} oscType - 'sine', 'triangle', 'square', or 'sawtooth'
     * @returns {object} p5 oscillator
     */
    createOscillator(oscType) {
        switch (oscType) {
            case 'sine': return new p5.SinOsc();
            case 'square': return new p5.SqrOsc();
            case 'sawtooth': return new p5.SawOsc();
            case 'triangle':
            default: return new p5.TriOsc();
        }
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
            // Create default oscillators - will be recreated per-theme in setupOscillators()
            this.osc = new p5.TriOsc();
            this.osc2 = new p5.SinOsc();
            this.currentOscType = 'triangle';
            this.currentOsc2Type = 'sine';

            // Create envelope with slow attack for smooth melodic notes
            this.envelope = new p5.Envelope();
            this.envelope.setADSR(0.1, 0.15, 0.5, 0.6);
            this.envelope.setRange(1, 0);

            // Create secondary envelope for harmony (even slower, more pad-like)
            this.envelope2 = new p5.Envelope();
            this.envelope2.setADSR(0.3, 0.2, 0.6, 0.8);
            this.envelope2.setRange(0.4, 0);

            // Create tertiary envelope for additional voice/harmony
            this.envelope3 = new p5.Envelope();
            this.envelope3.setADSR(0.25, 0.2, 0.6, 1.2);
            this.envelope3.setRange(0.5, 0);

            // Create low-pass filter to soften the sound
            this.filter = new p5.LowPass();
            this.filter.freq(2000);
            this.filter.res(1.5);

            // Connect both oscillators to the filter
            this.osc.disconnect();
            this.osc.connect(this.filter);
            this.osc2.disconnect();
            this.osc2.connect(this.filter);
            // Connect tertiary oscillator if present
            if (this.osc3) {
                try { this.osc3.disconnect(); } catch (e) { }
                try { this.osc3.connect(this.filter); } catch (e) { }
            }

            // Master gain controls overall station music loudness (including reverb)
            this.masterGain = new p5.Gain();
            this.filter.disconnect();
            this.filter.connect(this.masterGain);

            // Create reverb for spacey atmosphere (default decay)
            this.reverb = new p5.Reverb();
            this.reverb.process(this.masterGain, 6, 12);

            // CRITICAL FIX: Connect masterGain to audio destination so sound actually plays
            this.masterGain.connect();

            // State for glide/portamento
            this.lastMelodyFreq = 0;
            this.lastHarmonyFreq = 0;

            // Start muted until start()/update() ramps volume
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
     * Setup oscillators for the current theme (switch types if needed)
     * Only switches oscillator types when NOT playing to avoid audio glitches.
     * During melody regeneration (which happens while playing), we keep the current oscillators.
     */
    setupOscillators() {
        if (!this.theme || !this.isInitialized) return;

        const oscType = this.theme.oscType || 'triangle';
        const osc2Type = this.theme.osc2Type || 'sine';

        // CRITICAL: Always recreate oscillators when NOT playing (after stop)
        // Web Audio oscillators cannot be restarted after stop()
        // Only skip recreation during melody regeneration (while isPlaying=true)
        if (!this.isPlaying) {
            try {
                if (this.osc) {
                    try { this.osc.stop(); } catch (e) { /* may already be stopped */ }
                    try { this.osc.disconnect(); } catch (e) { /* ignore */ }
                }
                this.osc = this.createOscillator(oscType);
                this.osc.disconnect();
                this.osc.connect(this.filter);
                this.currentOscType = oscType;
            } catch (e) {
                console.warn('StationMusicManager: Error switching osc type:', e);
            }
        }

        if (!this.isPlaying) {
            try {
                if (this.osc2) {
                    try { this.osc2.stop(); } catch (e) { /* may already be stopped */ }
                    try { this.osc2.disconnect(); } catch (e) { /* ignore */ }
                }
                this.osc2 = this.createOscillator(osc2Type);
                this.osc2.disconnect();
                this.osc2.connect(this.filter);
                this.currentOsc2Type = osc2Type;
            } catch (e) {
                console.warn('StationMusicManager: Error switching osc2 type:', e);
            }
        }

        // Tertiary oscillator
        const osc3Type = this.theme.osc3Type || null;
        if (!this.isPlaying && osc3Type) {
            try {
                if (this.osc3) {
                    try { this.osc3.stop(); } catch (e) { /* may already be stopped */ }
                    try { this.osc3.disconnect(); } catch (e) { /* ignore */ }
                }
                this.osc3 = this.createOscillator(osc3Type);
                this.osc3.disconnect();
                this.osc3.connect(this.filter);
                this.currentOsc3Type = osc3Type;
            } catch (e) {
                console.warn('StationMusicManager: Error switching osc3 type:', e);
            }
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

        // Set timing based on theme (safe to do anytime)
        this.noteInterval = this.theme.noteInterval;

        // CRITICAL: Only configure audio parameters when NOT playing
        // During melody regeneration (isPlaying=true), we just rebuild the melody arrays
        // Changing filter/envelope/reverb mid-playback causes audio glitches
        if (!this.isPlaying) {
            // Set filter based on theme
            if (this.filter) {
                this.filter.freq(this.theme.filterFreq);
                const res = this.theme.filterRes !== undefined ? this.theme.filterRes : 1.5;
                this.filter.res(res);
            }

            // Setup oscillators for this theme (switch types if needed)
            this.setupOscillators();

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
                this.envelope2.setADSR(
                    this.theme.attackTime * 2,
                    0.2,
                    0.6,
                    this.theme.releaseTime * 1.2
                );
                if (typeof this.theme.envelope2Range === 'number') {
                    try { this.envelope2.setRange(this.theme.envelope2Range, 0); } catch (e) { /* ignore */ }
                } else {
                    try { this.envelope2.setRange(0.4, 0); } catch (e) { /* ignore */ }
                }
            }

            // Configure tertiary envelope if theme requests it
            if (this.envelope3) {
                try {
                    this.envelope3.setADSR(
                        this.theme.attackTime * 1.5,
                        0.2,
                        0.6,
                        this.theme.releaseTime * 1.6
                    );
                    if (typeof this.theme.envelope3Range === 'number') {
                        try { this.envelope3.setRange(this.theme.envelope3Range, 0); } catch (e) { }
                    }
                } catch (e) { /* ignore */ }
            }

            // Update reverb decay if theme specifies
            if (this.reverb && this.theme.reverbDecay) {
                try {
                    const decay = 6 * this.theme.reverbDecay;
                    this.reverb.set(decay, 12);
                } catch (e) { /* ignore - some p5 versions don't support set */ }
            }
        }

        // Build the full melody by selecting and combining motifs
        this.melody = [];
        this.harmony = [];
        this.harmony2 = [];

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
                    this.harmony2.push(null);
                } else {
                    // Convert scale degree to actual note
                    const midiNote = this.scaleToMidi(degree, this.theme.baseNote, this.theme.scale);
                    this.melody.push(midiNote);

                    // Add harmony note (interval below the melody)
                    const harmonyNote = midiNote - this.theme.harmonyInterval;
                    this.harmony.push(harmonyNote);
                    // Add optional tertiary harmony (if theme defines an interval)
                    if (typeof this.theme.harmonyInterval2 === 'number') {
                        this.harmony2.push(midiNote - this.theme.harmonyInterval2);
                    } else {
                        this.harmony2.push(null);
                    }
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

        // Theme-driven octave doubling (preferred for corded/refinery textures)
        if (this.theme && typeof this.theme.octaveDoublingProb === 'number' && this.theme.octaveDoublingProb > 0) {
            const prob = Math.max(0, Math.min(1, this.theme.octaveDoublingProb));
            for (let i = 0; i < this.melody.length; i++) {
                if (this.melody[i] !== null && Math.random() < prob) {
                    this.melody[i] += 12;
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

        // Clear any pending stop timeout to prevent race conditions
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }

        if (this.isPlaying) return;

        // Generate new melody based on station type
        // Note: This also sets up oscillators for the theme BEFORE we set isPlaying
        this.generateMelody({
            stationType: stationInfo.stationType || stationInfo.economyType,
            techLevel: stationInfo.techLevel
        });

        // Start oscillators (after setupOscillators has run in generateMelody)
        try {
            this.osc.start();
            this.osc2.start();
            if (this.osc3) try { this.osc3.start(); } catch (e) { }
            this.isPlaying = true;
            // Apply theme volume multiplier if present so certain themes (e.g. refinery)
            // can be louder to remain audible.
            this.targetVolume = this.baseVolume * (this.theme && this.theme.volumeMultiplier ? this.theme.volumeMultiplier : 1);
            this.lastNoteTime = performance.now();
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
                try { this.masterGain.amp(0); } catch (_) { }
            }
        }

        // Mark not playing so update-based playback stops immediately
        this.isPlaying = false;

        // Clear existing timeout if any
        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
        }

        // Stop oscillators after the fade has completed (plus small buffer)
        this.stopTimeout = setTimeout(() => {
            try {
                if (this.osc) {
                    this.osc.stop();
                }
                if (this.osc2) {
                    this.osc2.stop();
                }
                if (this.osc3) {
                    try { this.osc3.stop(); } catch (e) { }
                }
                this.stopTimeout = null;
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
                try { this.masterGain.amp(this.currentVolume); } catch (_) { }
            }
        }

        // Play notes at interval (slower = more ambient)
        const now = performance.now();
        if (now - this.lastNoteTime >= this.noteInterval) {
            this.lastNoteTime = now;
            this.playNextNote();
        }
    }

    /**
     * Play the next note in the melodic sequence
     */
    playNextNote() {
        if (!this.osc || !this.envelope || this.melody.length === 0 || !this.theme) return;

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
                        this.generateMelody({ stationType: this.stationType });
                    }
                }
                return;
            }

            // Calculate base frequencies
            const melodyFreq = this.midiToFreq(melodyNote);
            let harmonyFreq = harmonyNote !== null ? this.midiToFreq(harmonyNote) : 0;

            // Apply detuning for grit/warmth (cents to frequency ratio)
            const detune = this.theme.detune || 0;
            if (detune > 0 && harmonyFreq > 0) {
                // Detune the harmony oscillator relative to melody
                const detuneRatio = Math.pow(2, detune / 1200);
                harmonyFreq *= detuneRatio;
            }

            // Apply note glide (portamento)
            const glideTime = this.theme.noteGlide || 0;
            if (glideTime > 0 && this.lastMelodyFreq > 0) {
                // Use p5's freq ramp for smooth glide
                this.osc.freq(melodyFreq, glideTime);
            } else {
                this.osc.freq(melodyFreq);
            }
            this.lastMelodyFreq = melodyFreq;

            // Play melody note - envelope handles attack/release
            this.envelope.play(this.osc, 0, 0.15);

            // Play harmony note with glide if applicable
            if (this.osc2 && this.envelope2 && harmonyNote !== null && harmonyFreq > 0) {
                if (glideTime > 0 && this.lastHarmonyFreq > 0) {
                    this.osc2.freq(harmonyFreq, glideTime);
                } else {
                    this.osc2.freq(harmonyFreq);
                }
                this.lastHarmonyFreq = harmonyFreq;
                this.envelope2.play(this.osc2, 0, 0.1);
            }

            // Play tertiary harmony if available
            const harmony2Note = (this.harmony2 && this.harmony2.length > 0) ? this.harmony2[this.noteIndex] : null;
            if (this.osc3 && this.envelope3 && harmony2Note !== null) {
                let harmony2Freq = this.midiToFreq(harmony2Note);
                // Optionally apply detune for richness
                const detune2 = (this.theme && this.theme.detune) ? this.theme.detune : 0;
                if (detune2 > 0) {
                    const detuneRatio2 = Math.pow(2, detune2 / 1200);
                    harmony2Freq *= detuneRatio2;
                }
                if (glideTime > 0 && this.lastHarmony2Freq > 0) {
                    this.osc3.freq(harmony2Freq, glideTime);
                } else {
                    this.osc3.freq(harmony2Freq);
                }
                this.lastHarmony2Freq = harmony2Freq;
                this.envelope3.play(this.osc3, 0, 0.12);
            }

            // Advance to next note
            this.noteIndex = (this.noteIndex + 1) % this.melody.length;

            // Apply rhythm variation (rubato) to next note interval
            const rhythmVar = this.theme.rhythmVariation || 0;
            if (rhythmVar > 0) {
                const variance = 1.0 + (Math.random() * 2 - 1) * rhythmVar;
                this.noteInterval = Math.round(this.theme.noteInterval * variance);
            }

            // When we loop back to start, maybe regenerate for variety
            if (this.noteIndex === 0) {
                this.phraseIndex++;
                const regenAfter = (this.theme && typeof this.theme.regenerateAfterPhrases === 'number') ? this.theme.regenerateAfterPhrases : 3;
                if (this.phraseIndex >= regenAfter) {
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

        // Create local references to stop oscillators even if this.osc is nulled

        if (this.stopTimeout) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }

        try {
            if (this.osc) {
                try { this.osc.stop(); } catch (_) { }
                this.osc.disconnect();
                this.osc = null;
            }
            if (this.osc2) {
                try { this.osc2.stop(); } catch (_) { }
                this.osc2.disconnect();
                this.osc2 = null;
            }
            if (this.osc3) {
                try { this.osc3.stop(); } catch (_) { }
                try { this.osc3.disconnect(); } catch (_) { }
                this.osc3 = null;
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
                try { this.masterGain.disconnect(); } catch (_) { }
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
