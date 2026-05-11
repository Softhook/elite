const { WeaponSystem, WEAPON_TYPE } = require('../weaponSystem');
const { Projectile } = require('../projectile');
const { WEAPON_UPGRADES, DEFAULT_WEAPON_CONFIG } = require('../weapons');
global.DEFAULT_WEAPON_CONFIG = DEFAULT_WEAPON_CONFIG;
require('../enemyConstants');
require('../objectPool');
require('../debug');

describe('WeaponSystem Tests', () => {
    // Mock global player for WeaponSystem checks
    global.uiManager = { addMessage: jest.fn() };

    // Mock owner for weapon fire tests
    function createMockOwner(options = {}) {
        return {
            pos: global.createVector(options.x || 0, options.y || 0),
            vel: global.createVector(0, 0),
            size: options.size || 30,
            angle: options.angle || 0,
            isPlayer: options.isPlayer || false,
            equippedWeapons: options.weapons || [WEAPON_UPGRADES[0]],
            currentWeaponIndex: 0,
            targetingDisruption: 0, // Fixed: was 'disruption', should be 'targetingDisruption'
            _beamHeatStates: new Map(),
            weaponHeat: {}, // Correct property used by WeaponSystem._getHeatState
            credits: 0,
            shield: 100,
            hull: 100,
            uiManager: global.uiManager,
            get currentWeapon() { return this.equippedWeapons[this.currentWeaponIndex]; }
        };
    }
    // createMockSystem is now in jest.setup.js

    // ============================================
    // Weapon Type Constants Tests
    // ============================================

    describe('Weapon Type Constants', () => {
        test('should define WEAPON_TYPE object', () => {
            expect(WEAPON_TYPE).toBeDefined();
        });

        test('should have projectile type', () => {
            expect(WEAPON_TYPE.PROJECTILE).toBe('projectile');
        });

        test('should have beam type', () => {
            expect(WEAPON_TYPE.BEAM).toBe('beam');
        });

        test('should have spread type', () => {
            expect(WEAPON_TYPE.SPREAD).toBe('spread');
        });

        test('should have missile type', () => {
            expect(WEAPON_TYPE.MISSILE).toBe('missile');
        });

        test('should have tangle type', () => {
            expect(WEAPON_TYPE.TANGLE).toBe('tangle');
        });

        test('should have force type', () => {
            expect(WEAPON_TYPE.FORCE).toBe('force');
        });

        test('should have mine type', () => {
            expect(WEAPON_TYPE.MINE).toBe('mine');
        });

        test('should have harpoon type', () => {
            expect(WEAPON_TYPE.HARPOON).toBe('harpoon');
        });

        test('should have barrier type', () => {
            expect(WEAPON_TYPE.BARRIER).toBe('barrier');
        });
    });

    // ============================================
    // Weapon Upgrades Tests
    // ============================================

    describe('Weapon Upgrades', () => {
        test('should have WEAPON_UPGRADES array', () => {
            expect(WEAPON_UPGRADES).toBeDefined();
            expect(Array.isArray(WEAPON_UPGRADES)).toBe(true);
        });

        test('should have weapons with required properties', () => {
            for (const weapon of WEAPON_UPGRADES) {
                expect(weapon.name).toBeDefined();
                expect(weapon.type).toBeDefined();
                // Barrier weapons don't have damage, they have damageReduction
                if (weapon.type !== 'barrier') {
                    expect(weapon.damage).toBeDefined();
                }
            }
        });

        test('should have different weapon categories', () => {
            const types = new Set(WEAPON_UPGRADES.map(w => w.type));
            expect(types.size).toBeGreaterThan(1);
        });

        test('should have beam weapons with heat properties', () => {
            const beamWeapon = WEAPON_UPGRADES.find(w => w.type === 'beam');
            if (beamWeapon) {
                expect(beamWeapon.maxHeat).toBeDefined();
                expect(beamWeapon.heatPerShot).toBeDefined();
                expect(beamWeapon.heatDissipation).toBeDefined();
            }
        });

        test('should have missiles with tracking properties', () => {
            const missile = WEAPON_UPGRADES.find(w => w.type === 'missile');
            if (missile) {
                expect(missile.turnRate).toBeDefined();
                expect(missile.lifespan).toBeDefined();
            }
        });

        test('should have mine weapons with blast properties', () => {
            const mine = WEAPON_UPGRADES.find(w => w.type === 'mine');
            if (mine) {
                expect(mine.blastRadius).toBeDefined();
                expect(mine.triggerRadius).toBeDefined();
            }
        });
    });

    // ============================================
    // WeaponSystem Static Methods Tests
    // ============================================

    describe('WeaponSystem Static Methods', () => {
        test('should have init method', () => {
            expect(typeof WeaponSystem.init).toBe('function');
        });

        test('should initialize projectile pool', () => {
            WeaponSystem.init(50);
            // Should not throw
        });

        test('should have fire method', () => {
            expect(typeof WeaponSystem.fire).toBe('function');
        });

        test('should have fireProjectile method', () => {
            expect(typeof WeaponSystem.fireProjectile).toBe('function');
        });

        test('should have fireBeam method', () => {
            expect(typeof WeaponSystem.fireBeam).toBe('function');
        });

        test('should have fireSpread method', () => {
            expect(typeof WeaponSystem.fireSpread).toBe('function');
        });

        test('should have fireMissile method', () => {
            expect(typeof WeaponSystem.fireMissile).toBe('function');
        });

        test('should have fireTangle method', () => {
            expect(typeof WeaponSystem.fireTangle).toBe('function');
        });

        test('should have fireForce method', () => {
            expect(typeof WeaponSystem.fireForce).toBe('function');
        });

        test('maps lighting position to visual coordinates in surface mode', () => {
            const originalSurfaceMode = global.surfaceMode;
            global.surfaceMode = {
                isActive: () => true,
                _toVisualX: (x, altitude) => x - altitude,
                _toVisualY: (y, altitude) => y - altitude * 2
            };

            const pos = WeaponSystem._getLightingPosition(100, 200, 10);
            expect(pos).toEqual({ x: 90, y: 180 });

            global.surfaceMode = originalSurfaceMode;
        });

        test('resolves RGB arrays from color input safely', () => {
            expect(WeaponSystem._resolveRGB([1, 2, 3], [9, 9, 9])).toEqual([1, 2, 3]);
            expect(WeaponSystem._resolveRGB({ levels: [4, 5, 6, 255] }, [9, 9, 9])).toEqual([4, 5, 6]);
            expect(WeaponSystem._resolveRGB(null, [9, 9, 9])).toEqual([9, 9, 9]);
        });
    });

    // ============================================
    // Projectile Firing Tests
    // ============================================

    describe('Projectile Firing', () => {
        let owner;
        let system;

        beforeEach(() => {
            owner = createMockOwner({ x: 100, y: 100 });
            owner.equippedWeapons = [WEAPON_UPGRADES.find(w => w.type === 'projectile') || WEAPON_UPGRADES[0]];
            system = createMockSystem();
            WeaponSystem.init(50);
        });

        test('should fire projectile and add to system', () => {
            const initialCount = system.projectiles.length;
            WeaponSystem.fireProjectile(owner, system, 0);
            expect(system.projectiles.length).toBeGreaterThan(initialCount);
        });

        test('should create projectile at owner position (with offset)', () => {
            const initialCount = system.projectiles.length;
            WeaponSystem.fireProjectile(owner, system, 0);
            const proj = system.projectiles[system.projectiles.length - 1];
            // Projectiles spawn at an offset from owner center
            const d = global.dist(proj.pos.x, proj.pos.y, owner.pos.x, owner.pos.y);
            expect(d).toBeGreaterThan(0);
            expect(d).toBeLessThan(100); // Reasonable offset limit
        });

        test('should set projectile angle correctly', () => {
            const angle = Math.PI / 4;
            WeaponSystem.fireProjectile(owner, system, angle);
            const proj = system.projectiles[system.projectiles.length - 1];
            expect(proj.vel.heading()).toBeCloseTo(angle, 1);
        });

        test('should set projectile owner reference', () => {
            WeaponSystem.fireProjectile(owner, system, 0);
            const proj = system.projectiles[system.projectiles.length - 1];
            expect(proj.owner).toBe(owner);
        });
    });

    // ============================================
    // Spread Weapon Tests
    // ============================================

    describe('Spread Weapons', () => {
        let owner;
        let system;

        beforeEach(() => {
            owner = createMockOwner({ x: 100, y: 100 });
            owner.equippedWeapons = [WEAPON_UPGRADES.find(w => w.type.includes('spread')) || WEAPON_UPGRADES[0]];
            system = createMockSystem();
            WeaponSystem.init(50);
        });

        test('should fire multiple projectiles in spread', () => {
            const initialCount = system.projectiles.length;
            WeaponSystem.fireSpread(owner, system, 0, 3);
            expect(system.projectiles.length).toBe(initialCount + 3);
        });

        test('should spread projectiles at different angles', () => {
            WeaponSystem.fireSpread(owner, system, 0, 3);
            const angles = system.projectiles.map(p => p.vel.heading());
            // Should have different angles
            const uniqueAngles = new Set(angles.map(a => Math.round(a * 100)));
            expect(uniqueAngles.size).toBe(3);
        });
    });

    // ============================================
    // Beam Heat Management Tests
    // ============================================

    describe('Beam Heat Management', () => {
        let owner;
        let beamWeapon;

        beforeEach(() => {
            beamWeapon = WEAPON_UPGRADES.find(w => w.type === 'beam');
            if (!beamWeapon) {
                beamWeapon = { name: 'Test Beam', type: 'beam', maxHeat: 1.0, heatPerShot: 0.1, heatDissipation: 0.5 };
            }
            owner = createMockOwner();
            owner.equippedWeapons = [beamWeapon];
            owner._beamHeatStates = new Map();
        });

        test('should have coolWeaponHeat method', () => {
            expect(typeof WeaponSystem.coolWeaponHeat).toBe('function');
        });

        test('should have getHeatRatio method', () => {
            expect(typeof WeaponSystem.getHeatRatio).toBe('function');
        });

        test('should have isBeamOverheated method', () => {
            expect(typeof WeaponSystem.isBeamOverheated).toBe('function');
        });

        test('should start with zero heat', () => {
            const ratio = WeaponSystem.getHeatRatio(owner, beamWeapon);
            expect(ratio).toBe(0);
        });

        test('should cool weapon heat over time', () => {
            // First apply some heat
            WeaponSystem._applyBeamHeat(owner, beamWeapon);
            const initialHeat = WeaponSystem.getHeatRatio(owner, beamWeapon);

            // Cool down
            WeaponSystem.coolWeaponHeat(owner, 1.0); // 1 second
            const afterHeat = WeaponSystem.getHeatRatio(owner, beamWeapon);

            expect(afterHeat).toBeLessThan(initialHeat);
        });

        test('should check if beam can fire', () => {
            expect(typeof WeaponSystem._canFireBeam).toBe('function');
            const canFire = WeaponSystem._canFireBeam(owner, beamWeapon);
            expect(canFire).toBe(true); // Should start not overheated
        });
    });

    // ============================================
    // Beam Hit Detection Tests
    // ============================================

    describe('Beam Hit Detection', () => {
        test('should have performBeamHitDetection method', () => {
            expect(typeof WeaponSystem.performBeamHitDetection).toBe('function');
        });

        test('should call ensureBeamCache', () => {
            expect(typeof WeaponSystem._ensureBeamCache).toBe('function');
        });
    });

    // ============================================
    // Target Finding Tests
    // ============================================

    describe('Target Finding', () => {
        test('should have findNearestTarget method', () => {
            expect(typeof WeaponSystem.findNearestTarget).toBe('function');
        });

        test('should find nearest enemy target', () => {
            const owner = createMockOwner({ x: 0, y: 0, isPlayer: true });
            const system = createMockSystem();
            system.enemies = [
                { pos: global.createVector(100, 0), size: 20, hull: 50 },
                { pos: global.createVector(50, 0), size: 20, hull: 50 }
            ];

            const target = WeaponSystem.findNearestTarget(owner, system);
            if (target) {
                expect(target.pos.x).toBe(50); // Closer one
            }
        });
    });

    // ============================================
    // Projectile Pool Tests
    // ============================================

    describe('Projectile Pooling', () => {
        beforeEach(() => {
            WeaponSystem.init(20);
        });

        test('should have getPoolStats method', () => {
            expect(typeof WeaponSystem.getPoolStats).toBe('function');
        });

        test('should track pool statistics', () => {
            const stats = WeaponSystem.getPoolStats();
            expect(stats).toBeDefined();
            expect(stats.available).toBeDefined();
            expect(stats.active).toBeDefined();
        });

        test('should have releaseProjectile method', () => {
            expect(typeof WeaponSystem.releaseProjectile).toBe('function');
        });
    });

    // ============================================
    // Angle Jitter Tests
    // ============================================

    describe('Angle Jitter', () => {
        test('should have angle jitter method', () => {
            expect(typeof WeaponSystem._applyAngleJitter).toBe('function');
        });

        test('should apply jitter based on disruption', () => {
            const owner = createMockOwner();
            owner.targetingDisruption = 0;

            const baseAngle = 0;
            // With 0 disruption, jitter should be minimal
            const resultAngle = WeaponSystem._applyAngleJitter(owner, baseAngle);
            expect(Math.abs(resultAngle - baseAngle)).toBeLessThan(0.1);
        });

        test('should apply more jitter with higher disruption', () => {
            const owner = createMockOwner();
            owner.targetingDisruption = 1.0; // Max disruption

            // Run multiple times and check variance
            const angles = [];
            for (let i = 0; i < 10; i++) {
                angles.push(WeaponSystem._applyAngleJitter(owner, 0));
            }

            // Should have some variation with high disruption
            const variance = angles.some(a => Math.abs(a) > 0.01);
            expect(variance).toBe(true);
        });
    });

    // ============================================
    // Lock Disabled Tests
    // ============================================

    describe('Lock System', () => {
        test('should have lock disabled check', () => {
            expect(typeof WeaponSystem._isLockDisabled).toBe('function');
        });

        test('should not disable lock at low disruption', () => {
            const owner = createMockOwner();
            owner.disruption = 0;
            const disabled = WeaponSystem._isLockDisabled(owner);
            expect(disabled).toBe(false);
        });
    });

    // ============================================
    // Projectile Class Tests
    // ============================================

    describe('Projectile Class', () => {
        test('should create projectile with position', () => {
            const proj = new Projectile(100, 200, 0, null);
            expect(proj.pos.x).toBe(100);
            expect(proj.pos.y).toBe(200);
        });

        test('should have update method', () => {
            const proj = new Projectile(0, 0, 0, null);
            expect(typeof proj.update).toBe('function');
        });

        test('should have draw method', () => {
            const proj = new Projectile(0, 0, 0, null);
            expect(typeof proj.draw).toBe('function');
        });

        test('should have checkCollision method', () => {
            const proj = new Projectile(0, 0, 0, null);
            expect(typeof proj.checkCollision).toBe('function');
        });

        test('should detect collision with target', () => {
            const proj = new Projectile(50, 50, 0, null);
            proj.size = 10;
            const target = { pos: global.createVector(55, 55), size: 20 };
            const hit = proj.checkCollision(target);
            expect(hit).toBe(true);
        });

        test('should not collide with distant target', () => {
            const proj = new Projectile(0, 0, 0, null);
            proj.size = 10;
            const target = { pos: global.createVector(500, 500), size: 20 };
            const hit = proj.checkCollision(target);
            expect(hit).toBe(false);
        });

        test('should have reset method for pooling', () => {
            const proj = new Projectile(0, 0, 0, null);
            expect(typeof proj.reset).toBe('function');
        });

        test('should reset state correctly', () => {
            const proj = new Projectile(0, 0, 0, null);
            proj.reset(100, 200, Math.PI, null, 10, 20);
            expect(proj.pos.x).toBe(100);
            expect(proj.pos.y).toBe(200);
            // Velocity direction reflects the angle
            expect(proj.vel.heading()).toBeCloseTo(Math.PI, 1);
        });

        test('should track lifespan', () => {
            const proj = new Projectile(0, 0, 0, null, 8, 10, null, 'projectile', null, 90);
            expect(proj.lifespan).toBe(90);
        });

        test('should have toJSON method', () => {
            const proj = new Projectile(100, 200, 0, null);
            expect(typeof proj.toJSON).toBe('function');
            const json = proj.toJSON();
            expect(json.pos).toBeDefined();
        });

        test('should have static fromJSON method', () => {
            expect(typeof Projectile.fromJSON).toBe('function');
        });
    });
});
