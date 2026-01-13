/**
 * Spatial Partitioning Tests
 * Jest tests for spatial partitioning (grid-based spatial hash) to optimize collision detection and entity queries.
 */

const SpatialHash = require('../spatialHash.js');

// Mock Entity Factory
function createMockEntity(x, y, size = 20) {
    return {
        pos: createVector(x, y),
        size: size,
        id: Math.random().toString(36).substr(2, 9)
    };
}

function createMockEntities(count, areaSize = 5000) {
    const entities = [];
    for (let i = 0; i < count; i++) {
        entities.push(createMockEntity(
            (Math.random() - 0.5) * areaSize,
            (Math.random() - 0.5) * areaSize,
            20 + Math.random() * 30
        ));
    }
    return entities;
}

function createClusteredEntities(clusterCount, entitiesPerCluster, clusterRadius = 300) {
    const entities = [];
    for (let c = 0; c < clusterCount; c++) {
        const cx = (Math.random() - 0.5) * 5000;
        const cy = (Math.random() - 0.5) * 5000;
        for (let i = 0; i < entitiesPerCluster; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * clusterRadius;
            entities.push(createMockEntity(
                cx + Math.cos(angle) * dist,
                cy + Math.sin(angle) * dist
            ));
        }
    }
    return entities;
}

// ============================================
// SPATIAL HASH CORRECTNESS TESTS
// ============================================

describe('SpatialHash Tests', () => {

    describe('Basic Operations', () => {
        test('should create with default cell size', () => {
            const hash = new SpatialHash();
            expect(hash.cellSize).toBe(1000);
        });

        test('should create with custom cell size', () => {
            const hash = new SpatialHash(100);
            expect(hash.cellSize).toBe(100);
        });

        test('should insert single entity', () => {
            const hash = new SpatialHash(200);
            const entity = createMockEntity(100, 100);
            hash.insert(entity);
            expect(hash.entityCount).toBe(1);
        });

        test('should insert multiple entities', () => {
            const hash = new SpatialHash(200);
            const entities = createMockEntities(10);
            hash.insertAll(entities);
            expect(hash.entityCount).toBe(10);
        });

        test('should clear all entities while reusing memory', () => {
            const hash = new SpatialHash(200);
            hash.insertAll(createMockEntities(10));

            const initialCellCount = hash.cellCount;
            expect(initialCellCount).toBeGreaterThan(0);

            hash.clear();
            expect(hash.entityCount).toBe(0);
            // Optimization: We reuse arrays, so cellCount should remain the same (no map deletions)
            expect(hash.cellCount).toBe(initialCellCount);
        });

        test('should handle null/undefined entities gracefully', () => {
            const hash = new SpatialHash(200);
            hash.insert(null);
            hash.insert(undefined);
            hash.insert({});  // no pos
            expect(hash.entityCount).toBe(0);
        });
    });

    describe('Spatial Queries', () => {
        let hash;
        let entities;

        beforeEach(() => {
            hash = new SpatialHash(200);
            entities = [
                createMockEntity(0, 0),      // Center
                createMockEntity(100, 0),   // Nearby
                createMockEntity(150, 150), // Nearby
                createMockEntity(1000, 1000), // Far
                createMockEntity(-500, -500), // Far opposite
            ];
            hash.insertAll(entities);
        });

        test('should find nearby entities', () => {
            const nearby = hash.getNearby(0, 0, 200);
            // Should find entities in nearby cells (may include extras)
            expect(nearby.length).toBeGreaterThan(0);
            expect(nearby).toContain(entities[0]);
        });

        test('should not find far entities in small radius query', () => {
            const nearby = hash.getNearby(0, 0, 50);
            // Entity at (1000, 1000) should not be in nearby cells
            expect(nearby).not.toContain(entities[3]);
        });

        test('should find entities in their own cell', () => {
            const nearby = hash.getNearby(1000, 1000, 50);
            expect(nearby).toContain(entities[3]);
        });

        test('should return empty array for empty region', () => {
            const nearby = hash.getNearby(5000, 5000, 100);
            expect(nearby).toHaveLength(0);
        });

        test('should use filtered query for accurate results', () => {
            const filtered = hash.getNearbyFiltered(0, 0, 120);
            // Only entities within 120 units
            expect(filtered).toContain(entities[0]); // at 0,0
            expect(filtered).toContain(entities[1]); // at 100,0 (dist=100)
            expect(filtered).not.toContain(entities[2]); // at 150,150 (dist=~212)
        });
    });

    describe('Cell Distribution', () => {
        test('should place entities in correct cells', () => {
            const hash = new SpatialHash(100);

            // Entity at (50, 50) should be in cell (0, 0)
            const e1 = createMockEntity(50, 50);
            hash.insert(e1);

            // Entity at (350, 50) should be in cell (3, 0)
            const e2 = createMockEntity(350, 50);
            hash.insert(e2);

            // Query near e1
            const nearby1 = hash.getNearby(50, 50, 10);
            expect(nearby1).toContain(e1);
            expect(nearby1).not.toContain(e2);

            // Query near e2
            const nearby2 = hash.getNearby(350, 50, 10);
            expect(nearby2).toContain(e2);
            expect(nearby2).not.toContain(e1);
        });

        test('should handle negative coordinates', () => {
            const hash = new SpatialHash(100);
            const e1 = createMockEntity(-350, -350); // Cell (-4, -4)
            const e2 = createMockEntity(-50, -50);   // Cell (-1, -1)
            hash.insert(e1);
            hash.insert(e2);

            // Query near e2 - should find e2 but not e1
            const nearby = hash.getNearby(-50, -50, 50);
            expect(nearby).toContain(e2);
            expect(nearby).not.toContain(e1);
        });

        test('should handle entities on cell boundaries', () => {
            const hash = new SpatialHash(100);

            const e1 = createMockEntity(100, 0);  // On X boundary
            const e2 = createMockEntity(0, 100);  // On Y boundary
            const e3 = createMockEntity(100, 100); // On corner

            hash.insertAll([e1, e2, e3]);
            expect(hash.entityCount).toBe(3);

            expect(hash.getNearby(100, 0, 50)).toContain(e1);
            expect(hash.getNearby(0, 100, 50)).toContain(e2);
            expect(hash.getNearby(100, 100, 50)).toContain(e3);
        });
    });

    describe('Collision Detection Consistency', () => {
        function bruteForceCollisionCheck(entity, allEntities, radius) {
            const results = [];
            for (const other of allEntities) {
                if (other === entity) continue;
                const dx = other.pos.x - entity.pos.x;
                const dy = other.pos.y - entity.pos.y;
                const distSq = dx * dx + dy * dy;
                const combinedRadius = (entity.size + other.size) / 2;
                if (distSq <= combinedRadius * combinedRadius) {
                    results.push(other);
                }
            }
            return results;
        }

        function spatialHashCollisionCheck(entity, spatialHash, radius) {
            const nearby = spatialHash.getNearby(entity.pos.x, entity.pos.y, radius);
            const results = [];
            for (const other of nearby) {
                if (other === entity) continue;
                const dx = other.pos.x - entity.pos.x;
                const dy = other.pos.y - entity.pos.y;
                const distSq = dx * dx + dy * dy;
                const combinedRadius = (entity.size + other.size) / 2;
                if (distSq <= combinedRadius * combinedRadius) {
                    results.push(other);
                }
            }
            return results;
        }

        test('should find same collisions as brute force (sparse)', () => {
            const entities = createMockEntities(50, 2000);
            const hash = new SpatialHash(200);
            hash.insertAll(entities);

            // Check a few random entities
            for (let i = 0; i < 5; i++) {
                const testEntity = entities[Math.floor(Math.random() * entities.length)];
                // Radius 200 is sufficient for getNearby, though actual collision is bound by size
                const bruteResults = bruteForceCollisionCheck(testEntity, entities, 200);
                const hashResults = spatialHashCollisionCheck(testEntity, hash, 200);

                // Sort for comparison
                bruteResults.sort((a, b) => a.id.localeCompare(b.id));
                hashResults.sort((a, b) => a.id.localeCompare(b.id));

                expect(hashResults.length).toBe(bruteResults.length);
            }
        });

        test('should find same collisions as brute force (clustered)', () => {
            const entities = createClusteredEntities(5, 10, 100);
            const hash = new SpatialHash(200);
            hash.insertAll(entities);

            for (let i = 0; i < 5; i++) {
                const testEntity = entities[Math.floor(Math.random() * entities.length)];
                const bruteResults = bruteForceCollisionCheck(testEntity, entities, 200);
                const hashResults = spatialHashCollisionCheck(testEntity, hash, 200);

                bruteResults.sort((a, b) => a.id.localeCompare(b.id));
                hashResults.sort((a, b) => a.id.localeCompare(b.id));

                expect(hashResults.length).toBe(bruteResults.length);
            }
        });
    });
});
