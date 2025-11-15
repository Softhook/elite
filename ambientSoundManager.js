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
        }
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
            this.audioContext.resume();
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
            baseVolume: profile.baseVolume || 0.5
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
        
        // Connect main gain to master
        soundConfig.mainGain.gain.value = 0; // Start muted, will be updated by distance
        soundConfig.mainGain.connect(this.masterGain);
        
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
            
            // Apply docked state - mute external sounds when docked
            if (this.isDocked && !sourceId.includes('station_internal')) {
                volume = 0;
            }
            
            // Smooth volume changes to avoid clicking
            const currentTime = this.audioContext.currentTime;
            soundConfig.mainGain.gain.linearRampToValueAtTime(volume, currentTime + 0.1);
        }
    }
    
    /**
     * Set the docked state (mutes external sounds when docked)
     * @param {boolean} docked - Whether the player is docked
     */
    setDockedState(docked) {
        this.isDocked = docked;
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
                return {
                    baseVolume: 0.4,
                    layers: [
                        //{ type: 'sawtooth', frequency: 110, volume: 0.3 }, // Mechanical hum
                        //{ type: 'square', frequency: 220, volume: 0.15, detune: 3 }, // Electrical buzz
                        { type: 'sine', frequency: 55, volume: 0.45 }, // Deep machinery
                        { type: 'triangle', frequency: 100, volume: 0.4, detune: -5 } // Ventilation
                    ]
                };
                
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
