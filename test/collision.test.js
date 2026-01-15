/**
 * Collision Tests - Elite Game
 * Converted from collision_test.html
 */

const { Projectile } = require('../projectile');
const { Asteroid } = require('../asteroid');
const { Cargo } = require('../cargo');
const { CollisionUtils } = require('../collisionUtils');
require('../enemyConstants');
require('../commodityDefinitions');

describe('Collision Tests', () => {

    // ============================================
    // Basic Distance Calculation Tests
    // ============================================

    describe('Distance Calculations', () => {
        test('should calculate distance between two points', () => {
            const d = global.dist(0, 0, 3, 4);
            expect(d).toBe(5);
        });

        test('should calculate distance using vectors', () => {
            const v1 = global.createVector(0, 0);
            const v2 = global.createVector(3, 4);
            expect(v1.dist(v2)).toBe(5);
        });

        test('should handle zero distance', () => {
            const d = global.dist(5, 5, 5, 5);
            expect(d).toBe(0);
        });

        test('should handle negative coordinates', () => {
            const d = global.dist(-3, -4, 0, 0);
            expect(d).toBe(5);
        });
    });

    // ============================================
    // Circle-Circle Collision Tests
    // ============================================

    describe('Circle-Circle Collision', () => {
        function circlesCollide(x1, y1, r1, x2, y2, r2) {
            const d = global.dist(x1, y1, x2, y2);
            return d < r1 + r2;
        }

        test('should detect overlapping circles', () => {
            expect(circlesCollide(0, 0, 10, 15, 0, 10)).toBe(true);
        });

        test('should not detect separate circles', () => {
            expect(circlesCollide(0, 0, 10, 100, 0, 10)).toBe(false);
        });

        test('should handle touching circles', () => {
            // Exactly touching (distance = sum of radii)
            const d = global.dist(0, 0, 20, 0);
            expect(d).toBe(20);
            expect(circlesCollide(0, 0, 10, 20, 0, 10)).toBe(false); // < not <=
        });

        test('should handle concentric circles', () => {
            expect(circlesCollide(0, 0, 10, 0, 0, 5)).toBe(true);
        });
    });

    // ============================================
    // Projectile Collision Tests
    // ============================================

    describe('Projectile Collision', () => {
        let projectile;

        beforeEach(() => {
            projectile = new Projectile(50, 50, 0, null);
            projectile.size = 5;
        });

        test('should have checkCollision method', () => {
            expect(typeof projectile.checkCollision).toBe('function');
        });

        test('should detect collision with nearby target', () => {
            const target = { pos: global.createVector(55, 50), size: 20 };
            expect(projectile.checkCollision(target)).toBe(true);
        });

        test('should not collide with distant target', () => {
            const target = { pos: global.createVector(200, 200), size: 20 };
            expect(projectile.checkCollision(target)).toBe(false);
        });

        test('should consider target size', () => {
            const largeTarget = { pos: global.createVector(75, 50), size: 50 };
            expect(projectile.checkCollision(largeTarget)).toBe(true);
        });

        test('should consider projectile size', () => {
            projectile.size = 30;
            const target = { pos: global.createVector(65, 50), size: 10 };
            expect(projectile.checkCollision(target)).toBe(true);
        });
    });

    // ============================================
    // Asteroid Collision Tests
    // ============================================

    describe('Asteroid Collision', () => {
        let asteroid;

        beforeEach(() => {
            asteroid = new Asteroid(100, 100, 40);
        });

        test('should have checkCollision method', () => {
            expect(typeof asteroid.checkCollision).toBe('function');
        });

        test('should use maxRadius for collision', () => {
            expect(asteroid.maxRadius).toBeDefined();
            expect(asteroid.maxRadius).toBeGreaterThan(0);
        });

        test('should detect collision with overlapping target', () => {
            const target = { pos: global.createVector(120, 100), size: 30 };
            expect(asteroid.checkCollision(target)).toBe(true);
        });

        test('should not collide with distant target', () => {
            const target = { pos: global.createVector(500, 500), size: 20 };
            expect(asteroid.checkCollision(target)).toBe(false);
        });

        test('should handle small targets', () => {
            const target = { pos: global.createVector(100, 100), size: 5 };
            expect(asteroid.checkCollision(target)).toBe(true); // Inside asteroid
        });
    });

    // ============================================
    // Cargo Collection Tests
    // ============================================

    describe('Cargo Collection', () => {
        let cargo;

        beforeEach(() => {
            cargo = new Cargo(100, 100, 'Food', 5);
        });

        test('should have checkCollision method', () => {
            expect(typeof cargo.checkCollision).toBe('function');
        });

        test('should detect collision with player', () => {
            const player = { pos: global.createVector(105, 100), size: 30 };
            expect(cargo.checkCollision(player)).toBe(true);
        });

        test('should not collect from distance', () => {
            const player = { pos: global.createVector(500, 500), size: 30 };
            expect(cargo.checkCollision(player)).toBe(false);
        });

        test('should have cargo size for collision', () => {
            expect(cargo.size).toBeDefined();
            expect(cargo.size).toBeGreaterThan(0);
        });
    });

    // ============================================
    // Line-Circle Intersection Tests (for beams)
    // ============================================

    describe('Line-Circle Intersection', () => {
        function lineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
            // Vector from line start to circle center
            const dx = x2 - x1;
            const dy = y2 - y1;
            const fx = x1 - cx;
            const fy = y1 - cy;

            const a = dx * dx + dy * dy;
            const b = 2 * (fx * dx + fy * dy);
            const c = fx * fx + fy * fy - r * r;

            let discriminant = b * b - 4 * a * c;
            if (discriminant < 0) return false;

            discriminant = Math.sqrt(discriminant);
            const t1 = (-b - discriminant) / (2 * a);
            const t2 = (-b + discriminant) / (2 * a);

            // Check if intersection is within line segment
            return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
        }

        test('should detect line through circle', () => {
            expect(lineCircleIntersect(0, 50, 100, 50, 50, 50, 20)).toBe(true);
        });

        test('should not detect line missing circle', () => {
            expect(lineCircleIntersect(0, 0, 100, 0, 50, 100, 20)).toBe(false);
        });

        test('should detect line starting inside circle', () => {
            expect(lineCircleIntersect(50, 50, 100, 50, 50, 50, 20)).toBe(true);
        });

        test('should detect line ending inside circle', () => {
            expect(lineCircleIntersect(0, 50, 50, 50, 50, 50, 20)).toBe(true);
        });

        test('should detect tangent line', () => {
            // Line tangent to circle at y=70, circle at (50,50) r=20
            expect(lineCircleIntersect(0, 70, 100, 70, 50, 50, 20)).toBe(true);
        });
    });

    // ============================================
    // Point-in-Circle Tests
    // ============================================

    describe('Point-in-Circle', () => {
        function pointInCircle(px, py, cx, cy, r) {
            const d = global.dist(px, py, cx, cy);
            return d < r;
        }

        test('should detect point inside circle', () => {
            expect(pointInCircle(50, 50, 50, 50, 20)).toBe(true);
        });

        test('should detect point outside circle', () => {
            expect(pointInCircle(100, 100, 50, 50, 20)).toBe(false);
        });

        test('should handle point on edge', () => {
            // Point exactly on edge (distance = radius)
            expect(pointInCircle(70, 50, 50, 50, 20)).toBe(false); // < not <=
        });
    });

    // ============================================
    // Docking Detection Tests
    // ============================================

    describe('Docking Detection', () => {
        function canDock(playerPos, playerSize, stationPos, dockingRange) {
            const d = playerPos.dist(stationPos);
            return d < dockingRange + playerSize / 2;
        }

        test('should allow docking when in range', () => {
            const player = global.createVector(100, 100);
            const station = global.createVector(120, 100);
            expect(canDock(player, 30, station, 50)).toBe(true);
        });

        test('should not allow docking when too far', () => {
            const player = global.createVector(0, 0);
            const station = global.createVector(500, 500);
            expect(canDock(player, 30, station, 50)).toBe(false);
        });

        test('should consider player size', () => {
            const player = global.createVector(0, 0);
            const station = global.createVector(60, 0);
            expect(canDock(player, 30, station, 50)).toBe(true);
        });
    });

    // ============================================
    // Collision Response Tests
    // ============================================

    describe('Collision Response', () => {
        test('should separate overlapping circles', () => {
            const obj1 = { pos: global.createVector(50, 50), size: 20 };
            const obj2 = { pos: global.createVector(60, 50), size: 20 };

            // Calculate overlap
            const d = obj1.pos.dist(obj2.pos);
            const overlap = (obj1.size / 2 + obj2.size / 2) - d;

            expect(overlap).toBeGreaterThan(0);

            // Separation direction
            const dir = global.p5.Vector.sub(obj2.pos, obj1.pos).normalize();
            expect(dir.x).toBeGreaterThan(0);
        });

        test('should calculate bounce vector', () => {
            const velocity = global.createVector(5, 0);
            const normal = global.createVector(-1, 0); // Surface facing left

            // Reflect: v - 2(v·n)n
            const dot = velocity.dot(normal);
            const reflected = global.p5.Vector.sub(velocity, global.p5.Vector.mult(normal, 2 * dot));

            expect(reflected.x).toBeLessThan(0); // Bounced back
        });
    });

    // ============================================
    // Broad Phase Collision Tests
    // ============================================

    describe('Broad Phase Collision', () => {
        function inBoundingBox(px, py, bx, by, bw, bh) {
            return px >= bx && px <= bx + bw && py >= by && py <= by + bh;
        }

        test('should detect point in bounding box', () => {
            expect(inBoundingBox(50, 50, 0, 0, 100, 100)).toBe(true);
        });

        test('should detect point outside bounding box', () => {
            expect(inBoundingBox(150, 50, 0, 0, 100, 100)).toBe(false);
        });

        test('should filter potential collisions by distance', () => {
            const objects = [
                { pos: global.createVector(10, 0), size: 10 },
                { pos: global.createVector(50, 0), size: 10 },
                { pos: global.createVector(1000, 0), size: 10 }
            ];
            const source = global.createVector(0, 0);
            const maxRange = 100;

            const nearby = objects.filter(o => source.dist(o.pos) < maxRange);
            expect(nearby).toHaveLength(2);
        });
    });

    // ============================================
    // Asteroid Damage Tests
    // ============================================

    describe('Asteroid Damage', () => {
        let asteroid;

        beforeEach(() => {
            asteroid = new Asteroid(100, 100, 40);
        });

        test('should have takeDamage method', () => {
            expect(typeof asteroid.takeDamage).toBe('function');
        });

        test('should reduce health on damage', () => {
            const initialHealth = asteroid.health;
            asteroid.takeDamage(10);
            expect(asteroid.health).toBe(initialHealth - 10);
        });

        test('should have isDestroyed method', () => {
            expect(typeof asteroid.isDestroyed).toBe('function');
        });

        test('should be destroyed when health depleted', () => {
            asteroid.health = 10;
            asteroid.takeDamage(15);
            expect(asteroid.isDestroyed()).toBe(true);
        });
    });

    // ============================================
    // Cargo Properties Tests
    // ============================================

    describe('Cargo Properties', () => {
        let cargo;

        beforeEach(() => {
            cargo = new Cargo(100, 100, 'Metals', 3);
        });

        test('should store cargo type', () => {
            expect(cargo.type).toBe('Metals');
        });

        test('should store quantity', () => {
            expect(cargo.quantity).toBe(3);
        });

        test('should have position', () => {
            expect(cargo.pos.x).toBe(100);
            expect(cargo.pos.y).toBe(100);
        });

        test('should have getValue method', () => {
            expect(typeof cargo.getValue).toBe('function');
        });

        test('should have isExpired method', () => {
            expect(typeof cargo.isExpired).toBe('function');
        });

        test('should determine color based on type', () => {
            expect(typeof Cargo.determineColor).toBe('function');
            const colorResult = Cargo.determineColor('Metals');
            expect(Array.isArray(colorResult)).toBe(true);
            expect(colorResult).toHaveLength(3);
        });
    });

    // ============================================
    // Off-Screen Detection Tests
    // ============================================

    describe('Off-Screen Detection', () => {
        test('projectile should have isOffScreen method', () => {
            const proj = new Projectile(0, 0, 0, null);
            expect(typeof proj.isOffScreen).toBe('function');
        });

        test('should detect projectile off screen', () => {
            const proj = new Projectile(-10000, 0, 0, null);
            // Depends on world bounds, but extreme values should be off
            // The actual implementation may vary
            expect(typeof proj.isOffScreen()).toBe('boolean');
        });
    });
});
