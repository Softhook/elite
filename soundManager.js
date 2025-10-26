/**
 * Manages sound effects using the sfxr library.
 * Pre-generates 'Normal' and 'Quiet' audio objects for efficient playback,
 * accommodating potential inconsistencies in sfxr's output.
 */
class SoundManager {
    constructor() {
        AUDIO_LOG("SoundManager constructor called.");
        this.sounds = {}; // Stores { definition, audioNormal }
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8
            },

            // Market transactions
            buyConfirm: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0.03864270312919066,
                "p_env_sustain": 0.05749361907217887,
                "p_env_punch": 0.143,
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
                "sample_size": 8
            },
            sellConfirm: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0.03864270312919066,
                "p_env_sustain": 0.05749361907217887,
                "p_env_punch": 0.043,
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
                "sample_size": 8
            },

            // Missions
            missionAccept: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": 0.03864270312919066,
                "p_env_sustain": 0.05749361907217887,
                "p_env_punch": 0.143,
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
                "sample_size": 8
            },
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8 
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8 
            },
            explosionLarge: { "oldParams": true, "wave_type": 3, "p_env_attack": 0, "p_env_sustain": 0.3331, "p_env_punch": 0.2926, "p_env_decay": 0.3540, "p_base_freq": 0.1086, "p_freq_limit": 0, "p_freq_ramp": 0, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0.1855, "p_pha_ramp": -0.2955, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0, "p_hpf_ramp": 0, "sound_vol": 0.4, "sample_rate": 44100, "sample_size": 8 },
            error: { "oldParams": true, "wave_type": 1, "p_env_attack": 0, "p_env_sustain": 0.1579, "p_env_punch": 0, "p_env_decay": 0.1758, "p_base_freq": 0.2731, "p_freq_limit": 0, "p_freq_ramp": 0, "p_freq_dramp": 0, "p_vib_strength": 0, "p_vib_speed": 0, "p_arp_mod": 0, "p_arp_speed": 0, "p_duty": 0.0093, "p_duty_ramp": 0, "p_repeat_speed": 0, "p_pha_offset": 0, "p_pha_ramp": 0, "p_lpf_freq": 1, "p_lpf_ramp": 0, "p_lpf_resonance": 0, "p_hpf_freq": 0.1, "p_hpf_ramp": 0, "sound_vol": 0.25, "sample_rate": 44100, "sample_size": 8 },
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sample_size": 8,
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
                "sample_size": 8
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
                "sample_size": 8
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
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
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
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
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
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8
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
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 16
            },
            jump: {
                "oldParams": true,
                "wave_type": 3,
                "p_env_attack": -0.4145750012451005,
                "p_env_sustain": 0.5272456771338139,
                "p_env_punch": 0.2479218929083218,
                "p_env_decay": 0.4804523596576298,
                "p_base_freq": 0.5903495433764034,
                "p_freq_limit": 0,
                "p_freq_ramp": -0.0017681137189092023,
                "p_freq_dramp": 0.0735803989524578,
                "p_vib_strength": 0.8838517521733452,
                "p_vib_speed": -0.6206637957291772,
                "p_arp_mod": -0.2244272034610615,
                "p_arp_speed": 0.6266429015969779,
                "p_duty": 0.2473777402124855,
                "p_duty_ramp": 0.0026576558969564857,
                "p_repeat_speed": 0.2989276090745494,
                "p_pha_offset": -0.12400096166858156,
                "p_pha_ramp": 0.01936116766289701,
                "p_lpf_freq": 0.25720467300452077,
                "p_lpf_ramp": -0.05666605762423825,
                "p_lpf_resonance": 0.40110077102607167,
                "p_hpf_freq": 0.16900019772542213,
                "p_hpf_ramp": -0.6897831495121087,
                "sound_vol": 0.25,
                "sample_rate": 44100,
                "sample_size": 8,
                "ctime": 1746458443937,
                "mtime": 1746458443938,
                "preset": "random"
            }
        };

        this.initSounds();
    }

    /**
     * Initializes sounds by generating Audio objects from definitions.
     */
    initSounds() {
        if (typeof sfxr === 'undefined' || typeof OFFSCREEN_VOLUME_REDUCTION_FACTOR === 'undefined') {
            console.error("SoundManager Error: sfxr library or OFFSCREEN_VOLUME_REDUCTION_FACTOR not found. Sounds cannot be initialized.");
            return;
        }

        AUDIO_LOG("Initializing SoundManager sounds (Single audio per sound)...");
        let generatedCount = 0;

        for (const name in this.soundDefinitions) {
            const def = this.soundDefinitions[name];
            // Only generate one audio object per sound
            const audio = this._generateSingleSound(name, def, def.sound_vol, "Normal");
            if (audio) {
                this.sounds[name] = {
                    audio: audio,
                    definition: def
                };
                generatedCount++;
            } else {
                this.sounds[name] = { audio: null, definition: def };
            }
        }
        AUDIO_LOG(`SoundManager initSounds finished. Generated sound entries: ${generatedCount}/${Object.keys(this.soundDefinitions).length}`);
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
            if (originalDefinition.preset && typeof originalDefinition.preset === 'string') {
                // Preset-based: generate, then set volume on the data before creating audio object
                const soundData = sfxr.generate(originalDefinition.preset);
                // deep-clone the generated params so we don't pass a live Params instance
                const soundDataCopy = JSON.parse(JSON.stringify(soundData));
                soundDataCopy.sound_vol = targetVolume; // Apply target volume

                // Sanitize wave_type if the preset produced an unexpected value
                if (typeof soundDataCopy.wave_type === 'undefined' || isNaN(parseInt(soundDataCopy.wave_type))) {
                    // Fall back to originalDefinition.wave_type or SAWTOOTH (1)
                    const fallback = (typeof originalDefinition.wave_type !== 'undefined') ? originalDefinition.wave_type : 1;
                    console.warn(`SoundManager: sanitizing generated preset wave_type for '${name}' (using fallback ${fallback})`);
                    soundDataCopy.wave_type = fallback;
                }

                // Ensure numeric and clamp to valid range 0..3
                soundDataCopy.wave_type = Math.max(0, Math.min(3, parseInt(soundDataCopy.wave_type) || 1));

                try {
                    generatedAudio = sfxr.toAudio(soundDataCopy);
                } catch (err) {
                    // If sfxr complains about bad wave type, coerce to a safe default and retry once
                    if (String(err).indexOf('Bad wave type') !== -1) {
                        soundDataCopy.wave_type = 1; // SAWTOOTH
                        try { generatedAudio = sfxr.toAudio(soundDataCopy); } catch (e2) { throw e2; }
                    } else throw err;
                }
            } else {
                // Custom params: create a copy of definition and set volume before creating audio object
                // deep-clone to avoid mutation of the original definition object
                let definitionCopy = JSON.parse(JSON.stringify(originalDefinition || {}));
                definitionCopy.sound_vol = targetVolume; // Apply target volume

                // Coerce wave_type into a valid numeric form (0..3)
                if (typeof definitionCopy.wave_type === 'undefined' || isNaN(parseInt(definitionCopy.wave_type))) {
                    console.warn(`SoundManager: sanitizing custom definition wave_type for '${name}' (defaulting to 1)`);
                    definitionCopy.wave_type = 1;
                }
                definitionCopy.wave_type = Math.max(0, Math.min(3, parseInt(definitionCopy.wave_type) || 1));

                try {
                    generatedAudio = sfxr.toAudio(definitionCopy);
                } catch (err) {
                    if (String(err).indexOf('Bad wave type') !== -1) {
                        definitionCopy.wave_type = 1;
                        try { generatedAudio = sfxr.toAudio(definitionCopy); } catch (e2) { throw e2; }
                    } else throw err;
                }
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
     * Checks if a world position is off-screen relative to the listener's view.
     * @param {number} sourceX - World X coordinate.
     * @param {number} sourceY - World Y coordinate.
     * @param {p5.Vector} listenerPos - World position of the listener.
     * @returns {boolean} True if off-screen, false otherwise.
     */
    _isOffScreen(sourceX, sourceY, listenerPos) {
        // Assumes listenerPos is valid and p5 globals (width, height) are available
        if (!listenerPos || typeof width === 'undefined' || typeof height === 'undefined') {
            // console.warn("_isOffScreen check failed: Missing listenerPos or p5 globals.");
            return false; // Default to on-screen if check cannot be performed
        }
        const tx = width / 2 - listenerPos.x;
        const ty = height / 2 - listenerPos.y;
        const screenLeft = -tx;
        const screenRight = screenLeft + width;
        const screenTop = -ty;
        const screenBottom = screenTop + height;

        return (sourceX < screenLeft || sourceX > screenRight ||
                sourceY < screenTop  || sourceY > screenBottom);
    }

    // Helper: Compute intended volume based on distance
    _computeIntendedVolume(baseVolume, sourceX, sourceY, listenerPos) {
        if (!listenerPos || typeof sourceX !== 'number' || typeof sourceY !== 'number') return baseVolume;
        const dx = sourceX - listenerPos.x;
        const dy = sourceY - listenerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let maxDistance = 1000;
        if (typeof width !== 'undefined' && typeof height !== 'undefined') {
            maxDistance = 1.2 * Math.sqrt(width * width + height * height);
        }
        let dropoff = 1 - (distance / maxDistance);
        dropoff = Math.max(dropoff, 0.04);
        return baseVolume * dropoff;
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
    playWorldSound(name, sourceX, sourceY, listenerPos) {
        const soundEntry = this.sounds[name];
        if (!soundEntry) {
            console.warn(`playWorldSound: Sound entry '${name}' not found (likely failed generation).`);
            return;
        }
        const baseVolume = soundEntry.definition.sound_vol;
        const intendedVolume = this._computeIntendedVolume(baseVolume, sourceX, sourceY, listenerPos);

        // --- Procedural gain control for sfxr sounds using Web Audio API ---
        let usedWebAudio = false;
        try {
            if (typeof sfxr !== 'undefined' && typeof SoundEffect !== 'undefined') {
                // Prepare a sanitized copy for SoundEffect (ensure wave_type is valid 0-3)
                const defCopy = JSON.parse(JSON.stringify(soundEntry.definition || {}));
                let wt = parseInt(defCopy.wave_type);
                // Only coerce if actually invalid (NaN or out of range 0-3)
                if (isNaN(wt) || wt < 0 || wt > 3) wt = 1;
                defCopy.wave_type = wt;

                let sfx = null;
                try {
                    sfx = new SoundEffect(defCopy);
                } catch (err1) {
                    // Retry once with a known-safe wave type
                    if (String(err1).indexOf('Bad wave type') !== -1) {
                        defCopy.wave_type = 1; // SAWTOOTH
                        sfx = new SoundEffect(defCopy);
                    } else {
                        throw err1;
                    }
                }

                const normalized = sfx.getRawBuffer().normalized;
                // Get or create a single AudioContext
                let actx = null;
                if (typeof window !== 'undefined') {
                    if (!window._eliteAudioContext) {
                        window._eliteAudioContext = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext();
                    }
                    actx = window._eliteAudioContext;
                }
                if (actx && normalized && normalized.length) {
                    if (actx.state === 'suspended') actx.resume();
                    const sampleRate = soundEntry.definition.sample_rate || 44100;
                    const audioBuffer = actx.createBuffer(1, normalized.length, sampleRate);
                    audioBuffer.copyToChannel(new Float32Array(normalized), 0);
                    const source = actx.createBufferSource();
                    source.buffer = audioBuffer;
                    const gainNode = actx.createGain();
                    gainNode.gain.value = intendedVolume;
                    source.connect(gainNode);
                    gainNode.connect(actx.destination);
                    source.start();
                    usedWebAudio = true;
                }
            }
        } catch (e) {
            // Quietly fall back for known wave type issues; otherwise log once
            if (String(e).indexOf('Bad wave type') === -1) {
                console.warn('Web Audio API playback failed, falling back to HTMLAudioElement:', e);
            }
        }
        // UI indicator (always call, only once)
        if (typeof uiManager !== 'undefined' && typeof uiManager.trackCombatSound === 'function') {
            uiManager.trackCombatSound(sourceX, sourceY, name);
        }
        if (usedWebAudio) return;

        // --- Fallback: HTMLAudioElement (set .volume property) ---
        let audioToPlay = soundEntry.audio;
        if (!audioToPlay || typeof audioToPlay.play !== 'function') {
            audioToPlay = sfxr.toAudio(soundEntry.definition);
            if (!audioToPlay || typeof audioToPlay.play !== 'function') {
                console.error(`SoundManager: Could not generate playable audio for sound '${name}'.`);
                return;
            }
            soundEntry.audio = audioToPlay;
        }
        let previousVolume = audioToPlay.volume;
        try {
            if (typeof audioToPlay.currentTime !== 'undefined') {
                audioToPlay.currentTime = 0;
            }
            if (typeof audioToPlay.volume !== 'undefined') {
                audioToPlay.volume = intendedVolume;
            }
            audioToPlay.play();
            if (typeof audioToPlay.volume !== 'undefined') {
                setTimeout(() => {
                    audioToPlay.volume = previousVolume;
                }, 100);
            }
        } catch (e) {
            console.error(`SoundManager: Error playing sound '${name}':`, e);
        }
    }

    /**
     * Plays a UI or non-positioned sound, always using the single audio object.
     * @param {string} name - The name of the sound effect.
     * @param {number} [volMultiplier=1.0] - Optional multiplier for the base volume (only works reliably on standard HTMLAudioElements).
     */
    playSound(name, volMultiplier = 1.0) {
        const soundEntry = this.sounds[name];
        if (!soundEntry || !soundEntry.audio || typeof soundEntry.audio.play !== 'function') {
            console.warn(`playSound: Sound '${name}' not found or is not playable.`);
            return;
        }
        const audioToPlay = soundEntry.audio;
        let previousVolume = null;
        let canSetVolume = typeof audioToPlay.volume !== 'undefined';
        try {
            if (canSetVolume && volMultiplier !== 1.0) {
                previousVolume = audioToPlay.volume;
                audioToPlay.volume = constrain(soundEntry.definition.sound_vol * volMultiplier, 0.0, 1.0);
            }
            if (typeof audioToPlay.currentTime !== 'undefined') {
                audioToPlay.currentTime = 0;
            }
            audioToPlay.play();
            if (canSetVolume && previousVolume !== null) {
                setTimeout(() => {
                    audioToPlay.volume = previousVolume;
                }, 100);
            }
        } catch (e) {
            console.error(`SoundManager: Error playing sound '${name}':`, e);
        }
    }

    /**
     * Plays an explosion sound, selecting size and adjusting volume based on world position.
     * @param {number} size - Size parameter to influence sound choice (e.g., radius).
     * @param {number} sourceX - World X coordinate of the explosion.
     * @param {number} sourceY - World Y coordinate of the explosion.
     * @param {p5.Vector} listenerPos - The world position of the listener (player).
     */
    playExplosion(size = 30, sourceX, sourceY, listenerPos) {
        if (!listenerPos) {
             console.warn("SoundManager.playExplosion: listenerPos is required.");
             return;
        }
        // Simple size check for sound selection
        const soundName = size > 60 ? 'explosionLarge' : 'explosionSmall';
        this.playWorldSound(soundName, sourceX, sourceY, listenerPos);
    }

    /**
     * Stops all currently playing sounds.
     * Used when entering GAME_OVER state or resetting the game.
     */
    stopAllSounds() {
        try {
            // Stop all HTMLAudioElement sounds
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
            
            // Stop Web Audio API context if available
            if (typeof getAudioContext === 'function') {
                const actx = getAudioContext();
                if (actx && typeof actx.suspend === 'function') {
                    actx.suspend().then(() => {
                        // Resume after a moment to allow for new sounds
                        setTimeout(() => {
                            if (actx && typeof actx.resume === 'function') {
                                actx.resume();
                            }
                        }, 100);
                    });
                }
            }
            
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
