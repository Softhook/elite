/**
 * Manages sound effects using the sfxr library.
 * Generates a single audio object per sound and caches a Web Audio buffer
 * for efficient playback, while sanitizing definitions to handle potential
 * inconsistencies in sfxr's output.
 */
class SoundManager {
    constructor() {
        AUDIO_LOG("SoundManager constructor called.");
        this.sounds = {}; // Stores { definition, audio, audioBuffer, normalized }
        this.audioContext = null; // Shared AudioContext instance
        this.maxInstancesPerSound = 5; // Maximum overlapping instances per sound
        this.activeInstances = {}; // Track active audio instances per sound
        this.activeWebSources = {}; // Track active WebAudio BufferSource nodes per sound for polyphony control
        this.globalActiveSources = []; // Track ALL active Web Audio sources globally
        this.maxGlobalSources = 32; // Hard limit on total concurrent sounds
        this.isDocked = false; // Track station/menu docked state
        this.dockedVolumeScale = 0.1; // Global attenuation factor while docked
        this.soundThrottles = {}; // Track last play time for each sound type
        this.minSoundInterval = 50; // Minimum ms between playing same sound type
        this.soundDefinitions = {
            // --- Sound Definitions ---
            // Proximity mine drop (short mechanical thunk)
            mineDrop: {
                "oldParams": true,
                "wave_type": 2,
                "p_env_attack": 0,
                "p_env_sustain": 0.02,
                "p_env_punch": 0.35,
                "p_env_decay": 0.18,
                "p_base_freq": 0.22,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.12,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.5,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 0.7,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0.1,
                "p_hpf_freq": 0.06,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            laser: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.21916643522029763,
                "p_env_punch": 0,
                "p_env_decay": 0.04768704743184844,
                "p_base_freq": 0.7780606629589863,
                "p_freq_limit": 0.011382423514995433,
                "p_freq_ramp": -0.425491330216931,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.15588532580675873,
                "p_duty_ramp": 0.06911956820054713,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.07481981019431778,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },

            // --- New UI/Game Event Sounds ---
            // chime for successful docking
            dockSuccess: {
                "oldParams": true,
                "wave_type": 0,
                "p_env_attack": 0.02,
                "p_env_sustain": 0.18,
                "p_env_punch": 0.05,
                "p_env_decay": 0.42,
                "p_base_freq": 0.22,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.22,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.05,
                "p_vib_speed": 0.45,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.5,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0.05,
                "p_pha_ramp": -0.02,
                "p_lpf_freq": 0.9,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0.2,
                "p_hpf_freq": 0.02,
                "p_hpf_ramp": 0,
                "sound_vol": 0.22,
                "sample_rate": 44100,
                "sample_size": 16
            },
            // Subtle thrusty whoosh for undocking
            undock: {
                "oldParams": true,
                "wave_type": 0,
                "p_env_attack": 0.02,
                "p_env_sustain": 0.18,
                "p_env_punch": 0.15,
                "p_env_decay": 0.32,
                "p_base_freq": 0.22,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.22,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.05,
                "p_vib_speed": 0.45,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.5,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0.05,
                "p_pha_ramp": -0.02,
                "p_lpf_freq": 0.9,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0.2,
                "p_hpf_freq": 0.02,
                "p_hpf_ramp": 0,
                "sound_vol": 0.22,
                "sample_rate": 44100,
                "sample_size": 16
            },
            // Generic UI screen transition
            uiTransition: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0.03864270312919066,
                "p_env_sustain": 0.05749361907217887,
                "p_env_punch": 0.343,
                "p_env_decay": 0.03935435025198594,
                "p_base_freq": 0.151,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.562,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.6828180539775813,
                "p_vib_speed": 0.44913625706527455,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0.774331019125786,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.9181207466243853,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            // Map open/close are subtle variants
            mapOpen: {
                "oldParams": true,
                "wave_type": 2,
                "p_env_attack": 0.03864270312919066,
                "p_env_sustain": 0.576,
                "p_env_punch": 0.239,
                "p_env_decay": 0.375,
                "p_base_freq": 0.34,
                "p_freq_limit": 0.106,
                "p_freq_ramp": -0.335,
                "p_freq_dramp": 0.073,
                "p_vib_strength": 0.247,
                "p_vib_speed": 0.278,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 1,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.9181207466243853,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            mapClose: {
                "oldParams": true,
                "wave_type": 2,
                "p_env_attack": 0.03864270312919066,
                "p_env_sustain": 0.576,
                "p_env_punch": 0.239,
                "p_env_decay": 0.375,
                "p_base_freq": 0.34,
                "p_freq_limit": 0.106,
                "p_freq_ramp": -0.335,
                "p_freq_dramp": 0.073,
                "p_vib_strength": 0.231,
                "p_vib_speed": 0.278,
                "p_arp_mod": -0.237,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 1,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.9181207466243853,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },

            // Market transactions



            // Missions

            missionComplete: {
                "oldParams": true,
                "wave_type": 0,
                "p_env_attack": 0,
                "p_env_sustain": 0.37016157648303694,
                "p_env_punch": 0,
                "p_env_decay": 0.16436066957608186,
                "p_base_freq": 0.30047267378766307,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.26433471038070866,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.3153331484011347,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },

            // Weapon-specific new sounds
            turretFire: {
                "oldParams": true,
                "wave_type": 2,
                "p_env_attack": 0,
                "p_env_sustain": 0.26340713012757605,
                "p_env_punch": 0.10725435965038245,
                "p_env_decay": 0.362531644088221,
                "p_base_freq": 0.72944259655509,
                "p_freq_limit": 0.03270939482200992,
                "p_freq_ramp": -0.5277282637339529,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.7680517305783727,
                "p_duty_ramp": -0.4560800585934705,
                "p_repeat_speed": 0,
                "p_pha_offset": 0.1733223088369614,
                "p_pha_ramp": -0.1658225543363692,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.01823147620248997,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            tangleCast: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0,
                "p_env_sustain": 0.11203846170956491,
                "p_env_punch": 0.451,
                "p_env_decay": 0.735,
                "p_base_freq": 0.178,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.142,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0.060956037876024605,
                "p_pha_ramp": -0.06622644267093794,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.9818594788493906,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            beam: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0.086,
                "p_env_sustain": 0.733,
                "p_env_punch": 0.242,
                "p_env_decay": 0.5455253623463282,
                "p_base_freq": 0.13615778746815113,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0.7562054020353133,
                "p_duty": 0.7675096106972876,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 0.2635667186352749,
                "p_lpf_ramp": -0.07252280271716516,
                "p_lpf_resonance": 0.9006325262268724,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },

            // Generic explosion alias (used by mines); balanced between small and large
            explosion: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0,
                "p_env_sustain": 0.28,
                "p_env_punch": 0.34,
                "p_env_decay": 0.22,
                "p_base_freq": 0.106,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.18,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0.12,
                "p_pha_ramp": -0.08,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.35,
                "sample_rate": 44100,
                "sample_size": 16
            },
            pickupCoin: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.04581296049541528,
                "p_env_punch": 0.49963998023905043,
                "p_env_decay": 0.36970089169851084,
                "p_base_freq": 0.6445307341814023,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            hit: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.02341326494757967,
                "p_env_punch": 0,
                "p_env_decay": 0.25156448207068977,
                "p_base_freq": 0.7352993482269201,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.6431802140566438,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.31585725782626867,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.0000741028254999998,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            // New bump sound for collisions (provided params)
            bump: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0,
                "p_env_sustain": 0.04096700464291167,
                "p_env_punch": 0.03524927355875311,
                "p_env_decay": 0.20769985853920883,
                "p_base_freq": 0.24230599378054044,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.6184156975704674,
                "p_freq_dramp": 0.049802998395825096,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0.04452029363819773,
                "p_arp_speed": 0.009621067957429487,
                "p_duty": 0,
                "p_duty_ramp": 0.022121954330664093,
                "p_repeat_speed": -0.03799519757448323,
                "p_pha_offset": -0.07481204222296842,
                "p_pha_ramp": -0.030887595233878386,
                "p_lpf_freq": 0.149,
                "p_lpf_ramp": -0.012624089141516685,
                "p_lpf_resonance": -0.016208988029074625,
                "p_hpf_freq": 0.01772773841344913,
                "p_hpf_ramp": 0.017168098793218442,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            explosionSmall: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0,
                "p_env_sustain": 0.2444,
                "p_env_punch": 0.4165,
                "p_env_decay": 0.0050,
                "p_base_freq": 0.1051,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.3072,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0.2161,
                "p_pha_ramp": -0.0017,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.3,
                "sample_rate": 44100,
                "sample_size": 16
            },
            explosionLarge: { "oldParams": true, "wave_type": 3, "p_env_attack": 0, "p_env_sustain": 0.3331, "p_env_punch": 0.2926, "p_env_decay": 0.3540, "p_base_freq": 0.1086, "p_freq_limit": 0, "p_freq_ramp": 0, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0.1855, "p_pha_ramp": -0.2955, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0, "p_hpf_ramp": 0, "sound_vol": 0.4, "sample_rate": 44100, "sample_size": 16 },
            error: { "oldParams": true, "wave_type": 1, "p_env_attack": 0, "p_env_sustain": 0.1579, "p_env_punch": 0, "p_env_decay": 0.1758, "p_base_freq": 0.2731, "p_freq_limit": 0, "p_freq_ramp": 0, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0.0093, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0, "p_pha_ramp": 0, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0.1, "p_hpf_ramp": 0, "sound_vol": 0.25, "sample_rate": 44100, "sample_size": 16 },
            click: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.026111703272301348,
                "p_env_punch": 0.501716455825922,
                "p_env_decay": 0.10666222564948519,
                "p_base_freq": 0.7613432835222875,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            harpoonFire: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0.041,
                "p_env_sustain": 0.668,
                "p_env_punch": 0,
                "p_env_decay": 0.213,
                "p_base_freq": 0.244,
                "p_freq_limit": 0.051,
                "p_freq_ramp": -0.162,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.037186719469318064,
                "p_duty_ramp": 0.05206119049454297,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.063,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
            },
            harpoonBreak: {
                "oldParams": true,
                "wave_type": 0,
                "p_env_attack": 0.041,
                "p_env_sustain": 0.207,
                "p_env_punch": 0,
                "p_env_decay": 0.213,
                "p_base_freq": 0.126,
                "p_freq_limit": 0.051,
                "p_freq_ramp": -0.162,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.037186719469318064,
                "p_duty_ramp": 0.05206119049454297,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0.063,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
            },
            click_off: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.026111703272301348,
                "p_env_punch": 0.501716455825922,
                "p_env_decay": 0.10666222564948519,
                "p_base_freq": 0.576,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            upgrade: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.07715103780477622,
                "p_env_punch": 0,
                "p_env_decay": 0.47119836071341703,
                "p_base_freq": 0.2581767538438034,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.19817947460356228,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 1,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            force: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": -0.02865192767289779,
                "p_env_sustain": 0.4468485473978126,
                "p_env_punch": 0.6297948328587816,
                "p_env_decay": -0.42457926220301545,
                "p_base_freq": 0.32389056408484707,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.2371245536622993,
                "p_freq_dramp": 0.5765501939121432,
                "p_vib_strength": 0.801786143246104,
                "p_vib_speed": 0.8658170330083548,
                "p_arp_mod": -0.6023642556289532,
                "p_arp_speed": 0.20508040760847868,
                "p_duty": 0.40209257042753177,
                "p_duty_ramp": 0.12794075771519756,
                "p_repeat_speed": 0.20188875253790783,
                "p_pha_offset": 0.16212854919276462,
                "p_pha_ramp": 0.0025449672637287172,
                "p_lpf_freq": 0.3955393679658298,
                "p_lpf_ramp": 0.01604927965908056,
                "p_lpf_resonance": -0.6286100626617219,
                "p_hpf_freq": 0.036258766388356824,
                "p_hpf_ramp": -0.03387882807894696,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            // Continuous electric/buzz field used by barrier/field effects
            electricField: {
                "oldParams": true,
                "wave_type": 0,
                "p_env_attack": 0.01,
                "p_env_sustain": 0.46,
                "p_env_punch": 0.0,
                "p_env_decay": 0.24,
                "p_base_freq": 0.22,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.018,
                "p_freq_dramp": 0.0,
                "p_vib_strength": 0.14,
                "p_vib_speed": 0.76,
                "p_arp_mod": 0.0,
                "p_arp_speed": 0.0,
                "p_duty": 0.48,
                "p_duty_ramp": -0.02,
                "p_repeat_speed": 0.0,
                "p_pha_offset": 0.0,
                "p_pha_ramp": 0.0,
                "p_lpf_freq": 0.82,
                "p_lpf_ramp": 0.0,
                "p_lpf_resonance": 0.18,
                "p_hpf_freq": 0.04,
                "p_hpf_ramp": 0.0,
                "sound_vol": 0.22,
                "sample_rate": 44100,
                "sample_size": 16
            },
            thargoid: {
                "oldParams": true,
                "wave_type": 2,
                "p_env_attack": -0.17825692502217524,
                "p_env_sustain": 0.8140800845207565,
                "p_env_punch": 0.15004474295109135,
                "p_env_decay": 0.12218577708949585,
                "p_base_freq": 0.905814324636156,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.034847155936952416,
                "p_freq_dramp": -0.7989093915052705,
                "p_vib_strength": -0.00301940754076396,
                "p_vib_speed": -0.5850069794195327,
                "p_arp_mod": -0.555140862443809,
                "p_arp_speed": 0.17503066730815253,
                "p_duty": 0.7420418473521806,
                "p_duty_ramp": 0.09662151369559566,
                "p_repeat_speed": 0.7138135653397979,
                "p_pha_offset": -0.04571525319441293,
                "p_pha_ramp": 0.01387424799837009,
                "p_lpf_freq": 0.45749747637061355,
                "p_lpf_ramp": -0.1064310942280934,
                "p_lpf_resonance": -0.8194227485996151,
                "p_hpf_freq": 0.0788306478270632,
                "p_hpf_ramp": 0.4810852896290552,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16,
                "ctime": 1746456062710,
                "mtime": 1746456062710,
                "preset": "random"
            },
            targetlock: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.28068620626320706,
                "p_env_punch": 0.4725664917623754,
                "p_env_decay": 0.811940987531992,
                "p_base_freq": 0.13615778746815113,
                "p_freq_limit": 0,
                "p_freq_ramp": 0,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0.8309630450808612,
                "p_duty": 0.10633323053742738,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 0.11981021483155566,
                "p_lpf_ramp": -0.38009365936913375,
                "p_lpf_resonance": 0.7518754118700935,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0.8957764740065794,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            land: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0.041510449853542526,
                "p_env_sustain": 0.35178069787838245,
                "p_env_punch": 0.6559396536981046,
                "p_env_decay": 0.35777231981094343,
                "p_base_freq": 0.07314088104315727,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.11380237395813067,
                "p_freq_dramp": -0.03248985558397188,
                "p_vib_strength": -0.012590730582693645,
                "p_vib_speed": 0.0032216971998137098,
                "p_arp_mod": -0.0032623332246923716,
                "p_arp_speed": 0.0368170436881255,
                "p_duty": 0.011278783686866543,
                "p_duty_ramp": 0.021310612642899872,
                "p_repeat_speed": 0.3869815655522503,
                "p_pha_offset": -0.29840585606532416,
                "p_pha_ramp": -0.4932547935469645,
                "p_lpf_freq": 0.17252126354145558,
                "p_lpf_ramp": -0.7733090445300377,
                "p_lpf_resonance": 0.03666570825184466,
                "p_hpf_freq": -0.025219801242302588,
                "p_hpf_ramp": -0.05649122024558866,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8,
                "p_vib_delay": null
            },
            missileLaunch: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0.131,
                "p_env_sustain": 0.65,
                "p_env_punch": 0.722,
                "p_env_decay": 0.199,
                "p_base_freq": 0.099,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.278,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.141,
                "p_vib_speed": 0,
                "p_arp_mod": -0.726,
                "p_arp_speed": 0.41,
                "p_duty": 1,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0.59,
                "p_pha_offset": 0.82,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            // Barrier toggle sounds (canonical names)
            barrierUp: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0.02,
                "p_env_sustain": 0.18,
                "p_env_punch": 0.1,
                "p_env_decay": 0.22,
                "p_base_freq": 0.28,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.35,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.02,
                "p_vib_speed": 0.4,
                "p_arp_mod": 0.18,
                "p_arp_speed": 0.45,
                "p_duty": 0.5,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.10,
                "sample_rate": 44100,
                "sample_size": 16
            },
            barrierDown: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0.01,
                "p_env_sustain": 0.14,
                "p_env_punch": 0.08,
                "p_env_decay": 0.26,
                "p_base_freq": 0.32,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.38,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.02,
                "p_vib_speed": 0.35,
                "p_arp_mod": -0.16,
                "p_arp_speed": 0.4,
                "p_duty": 0.5,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.20,
                "sample_rate": 44100,
                "sample_size": 16
            },
            // UI/Shield toggle sounds (added to prevent missing-sound warnings)
            shieldUp: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0.02,
                "p_env_sustain": 0.18,
                "p_env_punch": 0.1,
                "p_env_decay": 0.22,
                "p_base_freq": 0.28,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.35,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.02,
                "p_vib_speed": 0.4,
                "p_arp_mod": 0.18,
                "p_arp_speed": 0.45,
                "p_duty": 0.5,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.20,
                "sample_rate": 44100,
                "sample_size": 16
            },
            shieldDown: {
                "oldParams": true,
                "wave_type": 0,
                "p_env_attack": 0,
                "p_env_sustain": 0.0019689857913541167,
                "p_env_punch": 0,
                "p_env_decay": 0.37998526810532873,
                "p_base_freq": 0.20590582277267636,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.31659293978697156,
                "p_freq_dramp": 0,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0.45160591871243816,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0.4314813245138561,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.20,
                "sample_rate": 44100,
                "sample_size": 16
            },
            jump: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 1,
                "p_env_sustain": 0.574,
                "p_env_punch": 0.009316451652865845,
                "p_env_decay": 0.7306385079971163,
                "p_base_freq": 0.15982743559069235,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.3106536267153461,
                "p_freq_dramp": 0.004651114742747062,
                "p_vib_strength": 0.5004505555025632,
                "p_vib_speed": 0.018534250633872595,
                "p_arp_mod": -0.5770590557224542,
                "p_arp_speed": 0.8559254024378746,
                "p_duty": -0.7531610288800299,
                "p_duty_ramp": 0.03836149909179863,
                "p_repeat_speed": 0.16304189988621864,
                "p_pha_offset": 0.5391695592925302,
                "p_pha_ramp": -0.5362752612738444,
                "p_lpf_freq": 0.7068552643938004,
                "p_lpf_ramp": 0.682489672692488,
                "p_lpf_resonance": 0.0218264465896314,
                "p_hpf_freq": 0.0010899082875062552,
                "p_hpf_ramp": -0.08727216650381964,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
            },
            promotion: {
                "oldParams": true,
                "wave_type": 1,
                "p_env_attack": 0,
                "p_env_sustain": 0.395740283690555,
                "p_env_punch": 0,
                "p_env_decay": 0.931,
                "p_base_freq": 0.276,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.13637809529731915,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.20048236340268943,
                "p_vib_speed": 0.5675226855723216,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 1,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
            },
            startSound: {
                "oldParams": true,
                "wave_type": 0,
                "p_env_attack": 0,
                "p_env_sustain": 0.932219643932659,
                "p_env_punch": 0.042,
                "p_env_decay": 1,
                "p_base_freq": 0.245,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.1681968678526442,
                "p_freq_dramp": 0.10393790547550857,
                "p_vib_strength": -0.9086818117076947,
                "p_vib_speed": 0.4055907444194362,
                "p_arp_mod": 0.809199882420264,
                "p_arp_speed": -0.16691909641234193,
                "p_duty": 0,
                "p_duty_ramp": -0.525,
                "p_repeat_speed": 0.066,
                "p_pha_offset": -0.7295611122843414,
                "p_pha_ramp": -0.15755755329654259,
                "p_lpf_freq": 0.3795834374809758,
                "p_lpf_ramp": -0.053404741489011975,
                "p_lpf_resonance": 0.3501110837345296,
                "p_hpf_freq": 0.022788753634165666,
                "p_hpf_ramp": -0.0032750541127067154,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16,
                "p_vib_delay": null
            },
            gameOver: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0.533,
                "p_env_sustain": 1,
                "p_env_punch": 1,
                "p_env_decay": 1,
                "p_base_freq": 0.436,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.16,
                "p_freq_dramp": -0.083,
                "p_vib_strength": 0,
                "p_vib_speed": 0,
                "p_arp_mod": -0.541,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0.547,
                "p_pha_offset": 0,
                "p_pha_ramp": 0,
                "p_lpf_freq": 1,
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0,
                "p_hpf_freq": 0,
                "p_hpf_ramp": 0,
                "sound_vol": 0.04,
                "sample_rate": 44100,
                "sample_size": 8
            },
            // Radio static/crackle for intercom communication start
            radioStaticStart: {
                "oldParams": true,
                "wave_type": 3, // Noise
                "p_env_attack": 0.01,
                "p_env_sustain": 0.08,
                "p_env_punch": 0.15,
                "p_env_decay": 0.12,
                "p_base_freq": 0.15,
                "p_freq_limit": 0,
                "p_freq_ramp": 0.05,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.3,
                "p_vib_speed": 0.6,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0.8,
                "p_pha_offset": 0.1,
                "p_pha_ramp": -0.05,
                "p_lpf_freq": 0.35, // Low-pass for muffled radio quality
                "p_lpf_ramp": 0,
                "p_lpf_resonance": 0.4,
                "p_hpf_freq": 0.08, // High-pass to remove some bass
                "p_hpf_ramp": 0,
                "sound_vol": 0.08,
                "sample_rate": 22050, // Lower sample rate for that downsampled feel
                "sample_size": 8
            },
            // Radio static/crackle for intercom communication end
            radioStaticEnd: {
                "oldParams": true,
                "wave_type": 3, // Noise
                "p_env_attack": 0.02,
                "p_env_sustain": 0.05,
                "p_env_punch": 0.1,
                "p_env_decay": 0.18,
                "p_base_freq": 0.12,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.08,
                "p_freq_dramp": 0,
                "p_vib_strength": 0.2,
                "p_vib_speed": 0.5,
                "p_arp_mod": 0,
                "p_arp_speed": 0,
                "p_duty": 0,
                "p_duty_ramp": 0,
                "p_repeat_speed": 0.6,
                "p_pha_offset": 0.08,
                "p_pha_ramp": -0.03,
                "p_lpf_freq": 0.4,
                "p_lpf_ramp": -0.1,
                "p_lpf_resonance": 0.3,
                "p_hpf_freq": 0.06,
                "p_hpf_ramp": 0,
                "sound_vol": 0.06,
                "sample_rate": 22050,
                "sample_size": 8
            }
        };

        this.initSounds();
    }

    /**
     * Initializes sounds by generating Audio objects from definitions.
     */
    initSounds() {
        if (typeof sfxr === 'undefined') {
            console.error("SoundManager Error: sfxr library not found. Sounds cannot be initialized.");
            return;
        }

        // Initialize shared AudioContext
        if (typeof window !== 'undefined' && !this.audioContext) {
            if (!window._eliteAudioContext) {
                window._eliteAudioContext = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext();
            }
            this.audioContext = window._eliteAudioContext;

            // Create or reuse a shared dynamics compressor as a gentle safety limiter
            if (!window._eliteAudioBus) {
                try {
                    const compressor = this.audioContext.createDynamicsCompressor();
                    // More transparent limiter settings: prevent clipping without obvious compression
                    compressor.threshold.setValueAtTime(-6, this.audioContext.currentTime);  // Higher threshold (was -10)
                    compressor.knee.setValueAtTime(12, this.audioContext.currentTime);       // Softer knee (was 30)
                    compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);      // Harder ratio for true limiting (was 8)
                    compressor.attack.setValueAtTime(0.001, this.audioContext.currentTime);  // Faster attack (was 0.003)
                    compressor.release.setValueAtTime(0.05, this.audioContext.currentTime);  // Faster release (was 0.12)

                    compressor.connect(this.audioContext.destination);
                    window._eliteAudioBus = { compressor };
                } catch (e) {
                    console.warn('Failed to initialize shared audio bus (compressor):', e);
                    window._eliteAudioBus = { compressor: null };
                }
            }
        }

        AUDIO_LOG("Initializing SoundManager sounds (Single audio per sound)...");
        let generatedCount = 0;

        for (const name in this.soundDefinitions) {
            const def = this.soundDefinitions[name];
            // Sanitize once up-front so all later uses (pooling, etc.) are safe
            const sanitizedDef = this._sanitizeDefinition(def, name);
            // Only generate one audio object per sound
            const audio = this._generateSingleSound(name, sanitizedDef, sanitizedDef.sound_vol, "Normal");

            // Pre-generate and cache Web Audio buffers for better performance
            let normalized = null;
            let audioBuffer = null;

            if (this.audioContext && typeof SoundEffect !== 'undefined') {
                try {
                    const sfx = new SoundEffect(sanitizedDef);
                    normalized = sfx.getRawBuffer().normalized;

                    if (normalized && normalized.length) {
                        const sampleRate = sanitizedDef.sample_rate || 44100;
                        audioBuffer = this.audioContext.createBuffer(1, normalized.length, sampleRate);
                        audioBuffer.copyToChannel(new Float32Array(normalized), 0);
                    }
                } catch (e) {
                    AUDIO_LOG(`Failed to pre-generate buffer for '${name}': ${e.message}`);
                }
            }

            if (audio) {
                this.sounds[name] = {
                    audio: audio,
                    definition: sanitizedDef,
                    normalized: normalized,
                    audioBuffer: audioBuffer
                };
                this.activeInstances[name] = [];
                this.activeWebSources[name] = []; // Track Web Audio sources
                generatedCount++;
            } else {
                this.sounds[name] = { audio: null, definition: sanitizedDef, normalized: null, audioBuffer: null };
                this.activeInstances[name] = [];
                this.activeWebSources[name] = [];
            }
        }
        AUDIO_LOG(`SoundManager initSounds finished. Generated sound entries: ${generatedCount}/${Object.keys(this.soundDefinitions).length}`);
    }


    /**
     * Sanitizes a sound definition to ensure valid wave_type and required parameters.
     * @param {object} definition - Sound definition to sanitize
     * @param {string} name - Sound name for logging
     * @returns {object} Sanitized definition copy
     */
    _sanitizeDefinition(definition, name) {
        const defCopy = JSON.parse(JSON.stringify(definition || {}));

        // Ensure wave_type is valid (0=SQUARE, 1=SAWTOOTH, 2=SINE, 3=NOISE)
        let wt = parseInt(defCopy.wave_type);
        if (isNaN(wt) || wt < 0 || wt > 3) {
            wt = 1; // Default to SAWTOOTH
        }
        defCopy.wave_type = wt;

        // Ensure critical parameters exist with safe defaults
        if (typeof defCopy.sound_vol === 'undefined') defCopy.sound_vol = 0.25;
        if (typeof defCopy.sample_rate === 'undefined') defCopy.sample_rate = 44100;
        if (typeof defCopy.sample_size === 'undefined') defCopy.sample_size = 16;

        return defCopy;
    }

    /**
     * Internal helper to generate a single audio object.
     * @param {string} name - Sound name (for logging).
     * @param {object} originalDefinition - The base definition from soundDefinitions.
     * @param {number} targetVolume - The volume to apply to this version.
     * @param {string} versionLabel - "Normal" (for logging).
     * @returns {object|null} The generated audio object (HTMLAudioElement or custom) or null if failed.
     */
    _generateSingleSound(name, originalDefinition, targetVolume, versionLabel) {
        AUDIO_LOG(`   Generating '${name}' (${versionLabel}, Vol: ${targetVolume.toFixed(2)})...`);
        let generatedAudio = null;

        try {
            let definitionCopy;
            if (originalDefinition.preset && typeof originalDefinition.preset === 'string') {
                // Preset-based: generate, then set volume on the data before creating audio object
                const soundData = sfxr.generate(originalDefinition.preset);
                definitionCopy = JSON.parse(JSON.stringify(soundData));
                definitionCopy.sound_vol = targetVolume;
                // Sanitize wave_type if the preset produced an unexpected value
                if (typeof definitionCopy.wave_type === 'undefined' || isNaN(parseInt(definitionCopy.wave_type))) {
                    const fallback = (typeof originalDefinition.wave_type !== 'undefined') ? originalDefinition.wave_type : 1;
                    definitionCopy.wave_type = fallback;
                }
                definitionCopy.wave_type = Math.max(0, Math.min(3, parseInt(definitionCopy.wave_type) || 1));
            } else {
                // Custom params: create a copy of definition and set volume
                definitionCopy = this._sanitizeDefinition(originalDefinition, name);
                definitionCopy.sound_vol = targetVolume;
            }

            try {
                generatedAudio = sfxr.toAudio(definitionCopy);
            } catch (err) {
                // If sfxr complains about bad wave type, coerce to a safe default and retry once
                if (String(err).indexOf('Bad wave type') !== -1) {
                    definitionCopy.wave_type = 1; // SAWTOOTH
                    generatedAudio = sfxr.toAudio(definitionCopy);
                } else throw err;
            }

            // Validate: Must have a .play() method
            if (generatedAudio && typeof generatedAudio.play === 'function') {
                const type = typeof generatedAudio.volume !== 'undefined' ? "Standard HTMLAudioElement" : "Custom sfxr object";
                AUDIO_LOG(`      -> '${name}' (${versionLabel}) seems valid (${type}).`);
                return generatedAudio;
            } else {
                console.error(`   Failed to create a playable ${versionLabel} Audio object for '${name}'. Object received:`, generatedAudio);
                return null;
            }
        } catch (e) {
            console.error(`   Error during ${versionLabel} audio generation for '${name}':`, e);
            return null;
        }
    }

    /**
     * Calculate priority for a sound based on volume and distance.
     * Higher priority = more important to play.
     * @param {number} volume - Intended playback volume (0-1)
     * @param {number} sourceX - World X coordinate
     * @param {number} sourceY - World Y coordinate
     * @param {p5.Vector} listenerPos - Listener position
     * @returns {number} Priority value (higher = more important)
     */
    _calculateSoundPriority(volume, sourceX, sourceY, listenerPos) {
        if (!listenerPos || typeof sourceX !== 'number' || typeof sourceY !== 'number') {
            return 0;
        }

        const dx = sourceX - listenerPos.x;
        const dy = sourceY - listenerPos.y;
        const distanceSq = dx * dx + dy * dy;

        // Priority based on volume and inverse distance (closer = higher priority)
        // Volume range: 0-1, distance contribution: 0-1 (clamped)
        const distanceFactor = 1 / (1 + distanceSq / 1000000); // Normalize distance influence
        return volume * 0.7 + distanceFactor * 0.3;
    }

    /**
     * Stops the oldest/lowest priority sources to make room for new ones.
     * @param {number} count - Number of sources to stop
     */
    _cullOldestSources(count) {
        if (!this.globalActiveSources || this.globalActiveSources.length === 0) return;

        // Sort by priority (lowest first) and age (oldest first)
        const now = Date.now();
        this.globalActiveSources.sort((a, b) => {
            // First sort by priority (lower priority gets culled first)
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Then by age (older gets culled first)
            return a.startTime - b.startTime;
        });

        // Stop the lowest priority/oldest sources
        for (let i = 0; i < Math.min(count, this.globalActiveSources.length); i++) {
            const source = this.globalActiveSources[i];
            if (source && source.source) {
                try {
                    source.source.stop();
                    source.source._ended = true;
                } catch (e) {
                    // Already stopped, ignore
                }
            }
        }

        // Clean up ended sources
        this._cleanupGlobalSources();
    }

    /**
     * Remove ended sources from global tracking.
     */
    _cleanupGlobalSources() {
        if (!this.globalActiveSources) return;

        for (let i = this.globalActiveSources.length - 1; i >= 0; i--) {
            if (this.globalActiveSources[i].source._ended) {
                this.globalActiveSources.splice(i, 1);
            }
        }
    }

    /**
     * Checks if a sound can be played based on throttling rules.
     * @param {string} name - Sound name
     * @returns {boolean} True if sound can play
     */
    _canPlayThrottled(name) {
        if (!this.soundThrottles[name]) {
            this.soundThrottles[name] = 0;
        }

        const now = Date.now();
        const lastPlayTime = this.soundThrottles[name];

        if (now - lastPlayTime < this.minSoundInterval) {
            return false;
        }

        this.soundThrottles[name] = now;
        return true;
    }

    /**
     * Checks if a world position is off-screen relative to the listener's view.
     * @param {number} sourceX - World X coordinate.
     * @param {number} sourceY - World Y coordinate.
     * @param {p5.Vector} listenerPos - World position of the listener.
     * @returns {boolean} True if off-screen, false otherwise.
     */
    _isOffScreen(sourceX, sourceY, listenerPos) {
        // Validate inputs
        if (!listenerPos || typeof width === 'undefined' || typeof height === 'undefined' ||
            typeof sourceX !== 'number' || typeof sourceY !== 'number' ||
            isNaN(sourceX) || isNaN(sourceY)) {
            console.warn("_isOffScreen check failed: Invalid parameters", { sourceX, sourceY, listenerPos });
            return true; // Default to off-screen (muted) if check cannot be performed safely
        }
        const tx = width / 2 - listenerPos.x;
        const ty = height / 2 - listenerPos.y;
        const screenLeft = -tx;
        const screenRight = screenLeft + width;
        const screenTop = -ty;
        const screenBottom = screenTop + height;

        return (sourceX < screenLeft || sourceX > screenRight ||
            sourceY < screenTop || sourceY > screenBottom);
    }

    // Helper: Compute intended volume based on distance and off-screen status
    _computeIntendedVolume(baseVolume, sourceX, sourceY, listenerPos) {
        // Validate all inputs
        if (!listenerPos || typeof sourceX !== 'number' || typeof sourceY !== 'number' ||
            isNaN(sourceX) || isNaN(sourceY) || isNaN(baseVolume)) {
            console.warn("_computeIntendedVolume: Invalid parameters", { baseVolume, sourceX, sourceY });
            return 0; // Mute if invalid
        }

        const dx = sourceX - listenerPos.x;
        const dy = sourceY - listenerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let maxDistance = 1000;
        if (typeof width !== 'undefined' && typeof height !== 'undefined') {
            maxDistance = 1.2 * Math.sqrt(width * width + height * height);
        }
        let dropoff = 1 - (distance / maxDistance);
        dropoff = Math.max(dropoff, 0.04);
        let volume = baseVolume * dropoff;

        // Apply off-screen volume reduction
        if (this._isOffScreen(sourceX, sourceY, listenerPos)) {
            const reductionFactor = typeof OFFSCREEN_VOLUME_REDUCTION_FACTOR !== 'undefined'
                ? OFFSCREEN_VOLUME_REDUCTION_FACTOR
                : 0.1;
            volume *= reductionFactor;
        }

        // Clamp final volume
        return Math.max(0, Math.min(1, volume));
    }

    /**
     * Apply docked attenuation from a centralized factor.
     * @param {number} volume - Base volume before dock scaling
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
    _rampGain(audioParam, targetValue, duration = 0.12) {
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
                // Non-fatal if AudioParam is not writable
            }
        }
    }

    /**
     * Apply dock-state volume to a pooled HTMLAudioElement or sfxr wrapper.
     * @param {any} audioObj
     * @private
     */
    _applyDockedVolumeToAudio(audioObj) {
        if (!audioObj) return;
        const baseVol = (typeof audioObj._eliteBaseVolume === 'number')
            ? audioObj._eliteBaseVolume
            : (typeof audioObj.volume === 'number' ? audioObj.volume : null);
        if (baseVol === null) return;

        const target = this._applyDockedAttenuation(baseVol);

        try {
            if (typeof audioObj.setVolume === 'function' && typeof audioObj.volume === 'undefined') {
                audioObj.setVolume(target);
            } else if (typeof audioObj.volume !== 'undefined') {
                audioObj.volume = target;
            }
        } catch (e) {
            // Ignore per-instance adjustment errors
        }
    }

    /**
     * Apply docked volume to currently pooled audio instances and singletons.
     * @private
     */
    _applyDockedVolumeToAllHtmlAudio() {
        try {
            for (const name in this.activeInstances) {
                const instances = this.activeInstances[name] || [];
                for (const inst of instances) {
                    this._applyDockedVolumeToAudio(inst);
                }
            }

            for (const name in this.sounds) {
                const entry = this.sounds[name];
                if (entry?.audio) {
                    this._applyDockedVolumeToAudio(entry.audio);
                }
            }
        } catch (e) {
            // Non-fatal; best effort only
        }
    }

    /**
     * Plays a sound originating from a specific world location.
     * Sets the volume dynamically for off-screen sounds.
     * Handles both HTMLAudioElement and WebAudio BufferSource (sfxr).
     * @param {string} name - The name of the sound effect.
     * @param {number} sourceX - World X coordinate of the sound source.
     * @param {number} sourceY - World Y coordinate of the sound source.
     * @param {p5.Vector} listenerPos - The world position of the listener (player).
     */
    playWorldSound(name, sourceX, sourceY, listenerPos, sourceEntity = null) {
        // Surface mode filter: only allow sounds from surface entities or player
        // Block all space battle sounds from enemies/NPCs updating in background
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
            // If sourceEntity is provided, check if it's a surface entity
            if (sourceEntity) {
                // Check for explicit isSurface flag (standardized approach)
                const isSurfaceEntity = sourceEntity.isSurface === true;

                // Allow sounds from player (who is currently on surface)
                const isPlayer = sourceEntity === (typeof player !== 'undefined' ? player : null);

                // Block sounds from space enemies/ships
                if (!isSurfaceEntity && !isPlayer) {
                    return; // Block space entity sounds
                }
            } else {
                // No source entity provided - block by default in surface mode
                // Space combat projectiles/explosions shouldn't be heard on surface
                return;
            }
        }

        const soundEntry = this.sounds[name];
        if (!soundEntry) {
            console.warn(`playWorldSound: Sound entry '${name}' not found (likely failed generation).`);
            return;
        }

        // Validate coordinates early
        if (typeof sourceX !== 'number' || typeof sourceY !== 'number' || isNaN(sourceX) || isNaN(sourceY)) {
            console.warn(`playWorldSound: Invalid coordinates for '${name}'`, { sourceX, sourceY });
            return;
        }

        const baseVolume = soundEntry.definition.sound_vol;
        const intendedVolume = this._computeIntendedVolume(baseVolume, sourceX, sourceY, listenerPos);
        const dockedVolume = this._applyDockedAttenuation(intendedVolume);

        // UI indicator (always call, regardless of volume/throttling)
        if (typeof uiManager !== 'undefined' && typeof uiManager.trackCombatSound === 'function') {
            uiManager.trackCombatSound(sourceX, sourceY, name);
        }

        // Skip if volume is too low after dock attenuation
        if (dockedVolume < 0.01) return;

        // Apply throttling to prevent sound spam
        if (!this._canPlayThrottled(name)) {
            // Even if audio is throttled, we might want the visual indicator? 
            // The previous logic had the indicator call at the end, implying it ran for both WebAudio and fallback.
            // However, it was after the volume check.
            // By moving it up, we ensure it runs.
            return;
        }

        // Calculate priority for this sound
        const priority = this._calculateSoundPriority(intendedVolume, sourceX, sourceY, listenerPos);

        // --- Use cached Web Audio buffers for optimal performance ---
        let usedWebAudio = false;
        if (this.audioContext && soundEntry.audioBuffer) {
            try {
                // Handle all AudioContext states
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                } else if (this.audioContext.state === 'closed') {
                    console.warn('AudioContext is closed, cannot play sound');
                    return;
                } else if (this.audioContext.state === 'interrupted') {
                    // iOS-specific state, try to resume
                    this.audioContext.resume();
                }

                // Clean up ended sources first
                this._cleanupGlobalSources();

                // Check global limit and cull if needed
                if (this.globalActiveSources.length >= this.maxGlobalSources) {
                    // Check if this sound is higher priority than the lowest priority active sound
                    const lowestPriority = Math.min(...this.globalActiveSources.map(s => s.priority));
                    if (priority <= lowestPriority) {
                        // Skip this sound if it's lower priority than all active sounds
                        return;
                    }
                    // Cull one source to make room
                    this._cullOldestSources(1);
                }

                // Track active Web Audio sources for this sound
                if (!this.activeWebSources[name]) this.activeWebSources[name] = [];
                const webList = this.activeWebSources[name];

                // Clean out finished sources
                for (let i = webList.length - 1; i >= 0; i--) {
                    if (webList[i]._ended) webList.splice(i, 1);
                }

                const source = this.audioContext.createBufferSource();
                source.buffer = soundEntry.audioBuffer;
                const gainNode = this.audioContext.createGain();

                // Stronger gain scaling: more aggressive volume reduction as sounds stack
                const activeCount = webList.length;
                const scale = 1 / Math.pow(activeCount + 1, 0.85); // Increased from 0.6 to 0.85 for more aggressive reduction
                const baseGain = Math.max(0, Math.min(1, intendedVolume * scale));
                const finalGain = this._applyDockedAttenuation(baseGain);
                gainNode.gain.value = finalGain;

                source.connect(gainNode);

                // Connect through compressor if available
                const bus = (typeof window !== 'undefined' && window._eliteAudioBus) ? window._eliteAudioBus : null;
                if (bus && bus.compressor) {
                    try {
                        gainNode.connect(bus.compressor);
                    } catch (_) {
                        gainNode.connect(this.audioContext.destination);
                    }
                } else {
                    gainNode.connect(this.audioContext.destination);
                }

                // Track this source globally and per-sound
                const sourceInfo = {
                    source: source,
                    gainNode: gainNode,
                    priority: priority,
                    startTime: Date.now(),
                    name: name,
                    baseGain: baseGain
                };

                this.globalActiveSources.push(sourceInfo);
                webList.push(source);

                source.onended = () => {
                    try {
                        gainNode.disconnect();
                        source.disconnect();
                        source._ended = true;

                        // Remove from per-sound tracking list
                        if (this.activeWebSources[name]) {
                            const idx = this.activeWebSources[name].indexOf(source);
                            if (idx !== -1) this.activeWebSources[name].splice(idx, 1);
                        }

                        // Remove from global tracking list
                        const globalIdx = this.globalActiveSources.findIndex(s => s.source === source);
                        if (globalIdx !== -1) this.globalActiveSources.splice(globalIdx, 1);
                    } catch (e) {
                        // Already disconnected, ignore
                    }
                };

                source.start();
                usedWebAudio = true;
            } catch (e) {
                console.warn('Web Audio API playback failed, falling back to HTMLAudioElement:', e);
            }
        }




        if (usedWebAudio) return;

        // --- Fallback: HTMLAudioElement pooling for overlapping sounds ---
        this._playPooledSound(name, soundEntry, intendedVolume);
    }

    /**
     * Play a sound using instance pooling to allow overlapping.
     * @param {string} name - Sound name
     * @param {object} soundEntry - Sound entry object
     * @param {number} volume - Target volume
     */
    _playPooledSound(name, soundEntry, volume) {
        const instances = this.activeInstances[name];

        // Clean up finished instances
        for (let i = instances.length - 1; i >= 0; i--) {
            const inst = instances[i];
            if (inst.ended || inst.paused || (inst.currentTime && inst.currentTime >= inst.duration)) {
                instances.splice(i, 1);
            }
        }

        // Find or create an available instance
        let audioToPlay = null;

        // Try to reuse a finished instance
        for (const inst of instances) {
            if (inst.ended || inst.paused) {
                audioToPlay = inst;
                break;
            }
        }

        // Create new instance if under limit
        if (!audioToPlay && instances.length < this.maxInstancesPerSound) {
            try {
                // soundEntry.definition is already sanitized from init, use it directly
                try {
                    audioToPlay = sfxr.toAudio(soundEntry.definition);
                } catch (err) {
                    // Coerce wave_type on known library complaint and retry once
                    if (String(err).indexOf('Bad wave type') !== -1) {
                        const fallbackDef = JSON.parse(JSON.stringify(soundEntry.definition));
                        fallbackDef.wave_type = 1; // SAWTOOTH fallback
                        audioToPlay = sfxr.toAudio(fallbackDef);
                    } else {
                        throw err;
                    }
                }
                if (audioToPlay && typeof audioToPlay.play === 'function') {
                    instances.push(audioToPlay);
                }
            } catch (e) {
                console.error(`Failed to create audio instance for '${name}':`, e);
                return;
            }
        }

        // If still no instance available, use the oldest one
        if (!audioToPlay && instances.length > 0) {
            audioToPlay = instances[0];
        }

        if (!audioToPlay) {
            console.error(`SoundManager: No playable audio for sound '${name}'.`);
            return;
        }

        this._playAnyAudio(audioToPlay, volume, { resetTime: true });
    }

    /**
     * Helper to play either an HTMLAudioElement or an sfxr WebAudio wrapper.
     * - For HTMLAudioElement: optionally sets volume and resets currentTime
     * - For sfxr wrapper: uses setVolume if available; does not reset time
     * @param {any} audioObj - The audio to play
     * @param {number} volume - Target playback volume (0..1)
     * @param {{resetTime?: boolean, forceSetVolume?: boolean}} opts - Controls behavior
     */
    _playAnyAudio(audioObj, baseVolume, opts = {}) {
        const { resetTime = false, forceSetVolume = true, skipAttenuation = false } = opts;
        const volumeToUse = skipAttenuation ? baseVolume : this._applyDockedAttenuation(baseVolume);
        const finalVolume = Math.max(0, Math.min(1, volumeToUse));
        const shouldForceVolume = forceSetVolume || this.isDocked;
        audioObj._eliteBaseVolume = baseVolume;

        // sfxr WebAudio wrapper path (has setVolume/play methods, but no .volume property)
        if (typeof audioObj.setVolume === 'function' && typeof audioObj.play === 'function' && typeof audioObj.volume === 'undefined') {
            try {
                if (shouldForceVolume) audioObj.setVolume(finalVolume);
                audioObj.play();
                return;
            } catch (e) {
                console.error('SoundManager: Error playing sfxr audio wrapper:', e);
                return;
            }
        }

        // HTMLAudioElement path
        const canSetVolume = typeof audioObj.volume !== 'undefined';
        try {
            if (resetTime && typeof audioObj.currentTime !== 'undefined') {
                audioObj.currentTime = 0;
            }
            if (shouldForceVolume && canSetVolume) {
                audioObj.volume = finalVolume;
            }
            audioObj.play();
            // Note: We no longer restore volume since we're using pooled instances
            // Each instance maintains its own volume for its lifetime
        } catch (e) {
            console.error('SoundManager: Error playing HTML audio:', e);
        }
    }

    /**
     * Plays a UI or non-positioned sound, always using the single audio object.
     * @param {string} name - The name of the sound effect.
     * @param {number} [volMultiplier=1.0] - Optional multiplier for the base volume (only works reliably on standard HTMLAudioElements).
     * @param {object} [sourceEntity=null] - Optional source entity for surface mode filtering.
     */
    playSound(name, volMultiplier = 1.0, sourceEntity = null) {
        // Surface mode filter: block combat sounds from space entities
        // Uses cached Set to avoid allocation on every call
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
            // Lazy-init static cache for combat sounds
            if (!SoundManager._combatSounds) {
                SoundManager._combatSounds = new Set([
                    'shieldUp', 'shieldDown', 'barrierUp', 'barrierDown',
                    'targetlock', 'hit', 'explosion', 'explosionSmall', 'explosionLarge'
                ]);
            }

            if (SoundManager._combatSounds.has(name)) {
                // If sourceEntity is provided, check if it's a surface entity or player
                if (sourceEntity) {
                    const isSurfaceEntity = sourceEntity.isSurface === true;
                    const isPlayer = sourceEntity === (typeof player !== 'undefined' ? player : null);
                    if (!isSurfaceEntity && !isPlayer) {
                        return; // Block space entity combat sounds
                    }
                } else {
                    // No source entity for a combat sound in surface mode - likely from space, block it
                    return;
                }
            }
            // UI sounds (click, upgrade, error, missionComplete, etc.) always play
        }

        const soundEntry = this.sounds[name];
        if (!soundEntry || !soundEntry.audio || typeof soundEntry.audio.play !== 'function') {
            console.warn(`playSound: Sound '${name}' not found or is not playable.`);
            return;
        }

        // Maintain previous behavior:
        // - For UI sounds, only adjust volume when volMultiplier != 1.0
        const baseVol = soundEntry.definition.sound_vol;
        const desiredVol = Math.max(0, Math.min(1, baseVol * volMultiplier));
        const forceSetVolume = (volMultiplier !== 1.0) || this.isDocked;

        // UI sounds should not be attenuated by docking status
        const uiSounds = [
            'click', 'click_off', 'upgrade', 'error',
            'dockSuccess', 'undock', 'uiTransition',
            'mapOpen', 'mapClose', 'buyConfirm', 'sellConfirm',
            'missionAccept', 'missionComplete', 'pickupCoin'
        ];
        const isUISound = uiSounds.includes(name);

        this._playAnyAudio(soundEntry.audio, desiredVol, {
            resetTime: true,
            forceSetVolume,
            skipAttenuation: isUISound
        });
    }

    /**
     * Plays an explosion sound, selecting size and adjusting volume based on world position.
     * @param {number} size - Size parameter to influence sound choice (e.g., radius).
     * @param {number} sourceX - World X coordinate of the explosion.
     * @param {number} sourceY - World Y coordinate of the explosion.
     * @param {p5.Vector} listenerPos - The world position of the listener (player).
     */
    playExplosion(size = 30, sourceX, sourceY, listenerPos, sourceEntity = null) {
        if (!listenerPos) {
            console.warn("SoundManager.playExplosion: listenerPos is required.");
            return;
        }
        // Simple size check for sound selection
        const soundName = size > 60 ? 'explosionLarge' : 'explosionSmall';
        this.playWorldSound(soundName, sourceX, sourceY, listenerPos, sourceEntity);
    }

    /**
     * Apply docked attenuation to all currently playing sounds and future playback.
     * @param {boolean} docked - Whether the player is docked/in-station menus.
     */
    setDockedState(docked) {
        if (this.isDocked === docked) return;
        this.isDocked = docked;

        // Adjust active Web Audio sources with a smooth ramp
        if (this.audioContext && Array.isArray(this.globalActiveSources)) {
            const rampDuration = docked ? 0.08 : 0.14;
            for (const info of this.globalActiveSources) {
                const gainParam = info?.gainNode?.gain;
                if (!gainParam) continue;

                const baseGain = (typeof info.baseGain === 'number')
                    ? info.baseGain
                    : (typeof gainParam.value === 'number' ? gainParam.value : 0);
                info.baseGain = baseGain;

                const target = this._applyDockedAttenuation(baseGain);
                this._rampGain(gainParam, target, rampDuration);
            }
        }

        // Adjust pooled HTMLAudio/sfxr wrapper instances
        this._applyDockedVolumeToAllHtmlAudio();
    }

    /**
     * Stops all currently playing sounds.
     * Used when entering GAME_OVER state or resetting the game.
     */
    stopAllSounds() {
        try {
            // Stop all Web Audio sources
            if (this.globalActiveSources) {
                for (const sourceInfo of this.globalActiveSources) {
                    try {
                        if (sourceInfo.source && !sourceInfo.source._ended) {
                            sourceInfo.source.stop();
                            sourceInfo.source._ended = true;
                        }
                        if (sourceInfo.gainNode) {
                            sourceInfo.gainNode.disconnect();
                        }
                    } catch (e) {
                        // Ignore errors for individual sources
                    }
                }
                this.globalActiveSources = [];
            }

            // Clear per-sound Web Audio tracking
            for (const name in this.activeWebSources) {
                this.activeWebSources[name] = [];
            }

            // Stop all pooled instances
            for (const name in this.activeInstances) {
                const instances = this.activeInstances[name];
                for (const inst of instances) {
                    try {
                        inst.pause();
                        if (typeof inst.currentTime !== 'undefined') {
                            inst.currentTime = 0;
                        }
                    } catch (e) {
                        // Ignore errors for individual instances
                    }
                }
            }

            // Stop original audio objects
            for (const name in this.sounds) {
                const soundEntry = this.sounds[name];
                if (soundEntry && soundEntry.audio) {
                    try {
                        soundEntry.audio.pause();
                        if (typeof soundEntry.audio.currentTime !== 'undefined') {
                            soundEntry.audio.currentTime = 0;
                        }
                    } catch (e) {
                        // Ignore errors for individual sounds
                    }
                }
            }

            // Clear throttle timers
            this.soundThrottles = {};

            // Don't suspend/resume AudioContext - just let it be
            // Suspending can cause issues with subsequent playback

            AUDIO_LOG("All sounds stopped");
        } catch (e) {
            console.warn("Error stopping sounds:", e);
        }
    }
}

// Ensure global availability across classic script tags
if (typeof window !== 'undefined') {
    window.SoundManager = window.SoundManager || SoundManager;
}
