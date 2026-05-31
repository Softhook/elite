/**
 * SharedPhysics Tests
 * Jest tests for the shared physics module: thrust, drag, speed bursts, and frame-rate independence.
 */

// Mock p5.js math functions FIRST (before ANY requires)
global.cos = Math.cos;
global.sin = Math.sin;
global.PI = Math.PI;
global.HALF_PI = Math.PI / 2;

// Mock getDeltaSeconds for fallback testing
global.getDeltaSeconds = () => 1 / 60;

// Load dependencies in correct order (matching index.htm)
require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../shipUpgrades.js');
require('../enemyConstants.js');
require('../mission.js');
require('../objectPool.js');
require('../thrustParticles.js');
require('../sharedPhysics.js');

// ============================================
// Mock Entity Factory
// ============================================

/**
 * Creates a mock entity with the minimum properties needed for SharedPhysics
 */
function createMockEntity(overrides = {}) {
    return {
        pos: createVector(0, 0),
        vel: createVector(0, 0),
        angle: 0,
        thrustForce: 0.5,  // Standard thrust force
        maxSpeed: 10,
        baseMaxSpeed: 10,
        drag: 0.985,
        isThrusting: false,
        isSpeedBursting: false,
        isCoastingFromBurst: false,
        brakingMultiplier: undefined,
        thrustManager: null,  // No particles in tests
        shipTypeName: 'Viper',
        ...overrides
    };
}

// ============================================
// Frame-Rate Independence Tests
// ============================================

describe('SharedPhysics Frame-Rate Independence', () => {

    test('thrustForward produces same velocity change at 30fps and 60fps', () => {
        // At 30fps, dt = 1/30 = 0.0333s, timeScale = 2.0
        // At 60fps, dt = 1/60 = 0.0166s, timeScale = 1.0
        // After 1 second of thrusting:
        // - 30fps: 30 frames * (force * 2.0) = 60 * force
        // - 60fps: 60 frames * (force * 1.0) = 60 * force
        // Both should be equal!

        const entity30fps = createMockEntity({ angle: 0 });
        const entity60fps = createMockEntity({ angle: 0 });

        const dt30fps = 1 / 30;  // 30 fps
        const dt60fps = 1 / 60;  // 60 fps

        // Simulate 1 second of thrusting at 30fps (30 frames)
        for (let i = 0; i < 30; i++) {
            SharedPhysics.thrustForward(entity30fps, 1.0, false, dt30fps);
        }

        // Simulate 1 second of thrusting at 60fps (60 frames)
        for (let i = 0; i < 60; i++) {
            SharedPhysics.thrustForward(entity60fps, 1.0, false, dt60fps);
        }

        // Velocities should be approximately equal (within floating point tolerance)
        expect(entity30fps.vel.x).toBeCloseTo(entity60fps.vel.x, 4);
        expect(entity30fps.vel.y).toBeCloseTo(entity60fps.vel.y, 4);
    });

    test('thrustForward produces correct velocity at 60fps baseline', () => {
        const entity = createMockEntity({ angle: 0, thrustForce: 0.5 });
        const dt = 1 / 60;

        // Single frame thrust at 60fps with timeScale = 1.0
        SharedPhysics.thrustForward(entity, 1.0, false, dt);

        // At angle 0, thrust should be purely in X direction
        // force = 0.5 * 1.0 * 1.0 (timeScale) = 0.5
        expect(entity.vel.x).toBeCloseTo(0.5, 5);
        expect(entity.vel.y).toBeCloseTo(0, 5);
    });

    test('thrustForward at 120fps produces half the per-frame velocity', () => {
        const entity60fps = createMockEntity({ angle: 0 });
        const entity120fps = createMockEntity({ angle: 0 });

        SharedPhysics.thrustForward(entity60fps, 1.0, false, 1 / 60);
        SharedPhysics.thrustForward(entity120fps, 1.0, false, 1 / 120);

        // 120fps should produce half the velocity per frame
        expect(entity120fps.vel.x).toBeCloseTo(entity60fps.vel.x / 2, 5);
    });

    test('thrustStrafe is frame-rate independent', () => {
        const entity30fps = createMockEntity({ angle: 0 });
        const entity60fps = createMockEntity({ angle: 0 });

        // Simulate 1 second of strafing right
        for (let i = 0; i < 30; i++) {
            SharedPhysics.thrustStrafe(entity30fps, 1, 0.8, false, 1 / 30);
        }
        for (let i = 0; i < 60; i++) {
            SharedPhysics.thrustStrafe(entity60fps, 1, 0.8, false, 1 / 60);
        }

        expect(entity30fps.vel.y).toBeCloseTo(entity60fps.vel.y, 4);
    });

    test('thrustReverse is frame-rate independent', () => {
        const entity30fps = createMockEntity({ angle: 0 });
        const entity60fps = createMockEntity({ angle: 0 });

        // Simulate 1 second of reverse thrust
        for (let i = 0; i < 30; i++) {
            SharedPhysics.thrustReverse(entity30fps, 0.6, false, 1 / 30);
        }
        for (let i = 0; i < 60; i++) {
            SharedPhysics.thrustReverse(entity60fps, 0.6, false, 1 / 60);
        }

        expect(entity30fps.vel.x).toBeCloseTo(entity60fps.vel.x, 4);
    });
});

// ============================================
// Thrust State Flag Tests
// ============================================

describe('SharedPhysics Thrust Flags', () => {

    test('thrustForward sets isThrusting to true', () => {
        const entity = createMockEntity();
        expect(entity.isThrusting).toBe(false);

        SharedPhysics.thrustForward(entity, 1.0, false, 1 / 60);

        expect(entity.isThrusting).toBe(true);
    });

    test('thrustStrafe sets isThrusting to true', () => {
        const entity = createMockEntity();

        SharedPhysics.thrustStrafe(entity, 1, 0.8, false, 1 / 60);

        expect(entity.isThrusting).toBe(true);
    });

    test('thrustReverse sets isThrusting to true', () => {
        const entity = createMockEntity();

        SharedPhysics.thrustReverse(entity, 0.6, false, 1 / 60);

        expect(entity.isThrusting).toBe(true);
    });

    test('thrustForward with zero multiplier sets isThrusting to false', () => {
        const entity = createMockEntity({ isThrusting: true });

        SharedPhysics.thrustForward(entity, 0, false, 1 / 60);

        expect(entity.isThrusting).toBe(false);
    });

    test('thrustForward below threshold does not apply thrust', () => {
        const entity = createMockEntity();

        SharedPhysics.thrustForward(entity, 0.001, false, 1 / 60);

        // Velocity should remain zero (thrust too small)
        expect(entity.vel.mag()).toBe(0);
    });
});

describe('SharedPhysics Analog Thrust Visual Scaling', () => {

    test('thrustForward scales particle count with analog multiplier', () => {
        const entity = createMockEntity({
            thrustManager: { createThrust: jest.fn() }
        });

        SharedPhysics.thrustForward(entity, 0.25, true, 1 / 60);

        expect(entity.thrustManager.createThrust).toHaveBeenCalledWith(
            entity.pos,
            entity.angle,
            entity.size,
            2,
            false,
            'Viper',
            false,
            'rear',
            0.25
        );
    });

    test('thrustStrafe keeps full particle count for near-full analog input', () => {
        const entity = createMockEntity({
            thrustManager: { createThrust: jest.fn() },
            size: 20
        });

        SharedPhysics.thrustStrafe(entity, 1, 0.8, true, 1 / 60);

        expect(entity.thrustManager.createThrust).toHaveBeenCalledWith(
            entity.pos,
            entity.angle,
            entity.size * 0.8,
            3,
            false,
            'Viper',
            false,
            'left',
            0.8
        );
    });

    test('thrustForward uses mid-range particle count for medium analog input', () => {
        const entity = createMockEntity({
            thrustManager: { createThrust: jest.fn() }
        });

        SharedPhysics.thrustForward(entity, 1.2, true, 1 / 60);

        expect(entity.thrustManager.createThrust).toHaveBeenCalledWith(
            entity.pos,
            entity.angle,
            entity.size,
            4,
            false,
            'Viper',
            false,
            'rear',
            1.2
        );
    });

    test('thrustForward clamps particle count at max for high analog input', () => {
        const entity = createMockEntity({
            thrustManager: { createThrust: jest.fn() }
        });

        SharedPhysics.thrustForward(entity, 2.5, true, 1 / 60);

        expect(entity.thrustManager.createThrust).toHaveBeenCalledWith(
            entity.pos,
            entity.angle,
            entity.size,
            6,
            false,
            'Viper',
            false,
            'rear',
            2.5
        );
    });
});

// ============================================
// Speed Capping and Coasting Tests
// ============================================

describe('SharedPhysics Speed Capping', () => {

    test('updatePhysics caps speed at maxSpeed during normal flight', () => {
        const entity = createMockEntity({
            maxSpeed: 10,
            isSpeedBursting: false,
            isCoastingFromBurst: false
        });

        // Give entity excessive speed
        entity.vel.set(20, 0);

        SharedPhysics.updatePhysics(entity, 1 / 60);

        expect(entity.vel.mag()).toBeLessThanOrEqual(10);
    });

    test('updatePhysics allows burst speed above maxSpeed when isSpeedBursting', () => {
        const entity = createMockEntity({
            maxSpeed: 10,
            maxBurstSpeed: 20,
            isSpeedBursting: true,
            isCoastingFromBurst: false
        });

        entity.vel.set(15, 0);

        SharedPhysics.updatePhysics(entity, 1 / 60);

        // Should not cap at 10 since we're bursting
        expect(entity.vel.mag()).toBeGreaterThan(10);
    });

    test('coasting ends when speed drops to maxSpeed', () => {
        const entity = createMockEntity({
            maxSpeed: 10,
            isSpeedBursting: false,
            isCoastingFromBurst: true
        });

        // Set speed just above the threshold (maxSpeed * 1.05)
        entity.vel.set(10.4, 0);

        SharedPhysics.updatePhysics(entity, 1 / 60);

        // Should end coasting since speed is close to maxSpeed
        expect(entity.isCoastingFromBurst).toBe(false);
    });

    test('coasting continues when speed is still well above maxSpeed', () => {
        const entity = createMockEntity({
            maxSpeed: 10,
            isSpeedBursting: false,
            isCoastingFromBurst: true
        });

        // Set speed well above threshold
        entity.vel.set(15, 0);

        SharedPhysics.updatePhysics(entity, 1 / 60);

        // Coasting should continue
        expect(entity.isCoastingFromBurst).toBe(true);
    });
});

// ============================================
// Drag and Braking Tests
// ============================================

describe('SharedPhysics Drag', () => {

    test('updatePhysics applies drag to reduce velocity', () => {
        const entity = createMockEntity({
            drag: 0.9  // High drag for visible effect
        });

        entity.vel.set(10, 0);
        const initialSpeed = entity.vel.mag();

        SharedPhysics.updatePhysics(entity, 1 / 60);

        // Speed should decrease due to drag
        expect(entity.vel.mag()).toBeLessThan(initialSpeed);
    });

    test('brakingMultiplier increases drag effect', () => {
        const entityNormal = createMockEntity({ drag: 0.98 });
        const entityBraking = createMockEntity({ drag: 0.98, brakingMultiplier: 0.8 });

        entityNormal.vel.set(10, 0);
        entityBraking.vel.set(10, 0);

        SharedPhysics.updatePhysics(entityNormal, 1 / 60);
        SharedPhysics.updatePhysics(entityBraking, 1 / 60);

        // Braking entity should slow down more
        expect(entityBraking.vel.mag()).toBeLessThan(entityNormal.vel.mag());
    });

    test('drag is frame-rate independent', () => {
        const entity30fps = createMockEntity({ drag: 0.95 });
        const entity60fps = createMockEntity({ drag: 0.95 });

        entity30fps.vel.set(10, 0);
        entity60fps.vel.set(10, 0);

        // Simulate 1 second at different frame rates
        for (let i = 0; i < 30; i++) {
            SharedPhysics.updatePhysics(entity30fps, 1 / 30);
        }
        for (let i = 0; i < 60; i++) {
            SharedPhysics.updatePhysics(entity60fps, 1 / 60);
        }

        // Final speeds should be approximately equal
        expect(entity30fps.vel.mag()).toBeCloseTo(entity60fps.vel.mag(), 2);
    });
});

// ============================================
// Edge Case Tests
// ============================================

describe('SharedPhysics Edge Cases', () => {

    test('handles NaN angle gracefully', () => {
        const entity = createMockEntity({ angle: NaN });

        // Should not throw
        expect(() => {
            SharedPhysics.thrustForward(entity, 1.0, false, 1 / 60);
        }).not.toThrow();

        // Angle should be reset to 0
        expect(entity.angle).toBe(0);
    });

    test('handles null/undefined entity gracefully', () => {
        expect(() => {
            SharedPhysics.thrustForward(null, 1.0, false, 1 / 60);
        }).not.toThrow();

        expect(() => {
            SharedPhysics.thrustForward(undefined, 1.0, false, 1 / 60);
        }).not.toThrow();
    });

    test('handles entity without vel property gracefully', () => {
        const badEntity = { pos: createVector(0, 0), angle: 0 };

        expect(() => {
            SharedPhysics.thrustForward(badEntity, 1.0, false, 1 / 60);
        }).not.toThrow();
    });

    test('dt fallback works when dt is null', () => {
        const entity = createMockEntity({ angle: 0 });

        // Pass null as dt - should use fallback (hardcoded 1/60)
        SharedPhysics.thrustForward(entity, 1.0, false, null);

        // Should still apply thrust
        expect(entity.vel.mag()).toBeGreaterThan(0);
    });
});
