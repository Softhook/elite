// Add a simple Beam class for the title screen
class TitleScreenBeam {
    constructor(start, end, color, width, duration, owner) {
        this.start = start;
        this.end = end;
        this.color = color || [255, 0, 0, 200]; // Default red
        this.width = width || 3;
        this.maxDuration = duration || 150;
        this.duration = this.maxDuration;
        this.owner = owner;
    }

    update(deltaTime) {
        this.duration -= deltaTime;
    }

    isExpired() {
        return this.duration <= 0;
    }

    draw() {
        push();
        strokeWeight(this.width);
        // Fade out as beam expires
        const alpha = map(this.duration, 0, this.maxDuration, 0, this.color[3] || 200);
        stroke(this.color[0], this.color[1], this.color[2], alpha);
        line(this.start.x, this.start.y, this.end.x, this.end.y);
        
        // Add glow effect
        strokeWeight(this.width + 2);
        stroke(this.color[0], this.color[1], this.color[2], alpha * 0.3);
        line(this.start.x, this.start.y, this.end.x, this.end.y);
        pop();
    }
}

// Title screen and instruction page for Elite

class TitleScreen {
    constructor() {
        // Animation properties for title text
        this.titleY = -100; // Start off-screen
        this.authorAlpha = 0;
        
        // Scene elements for dynamic flight scene
        this.displayShips = [];
        this.projectiles = [];
        this.beams = [];
        this.explosions = []; 

        this.setupDynamicScene();
        
        // Instructions screen - fixed position
        this.instructionScrollY = height * 0.1; 
        this.bgStarsCache = []; // Cache for starfield
    }

    setupDynamicScene() {
        this.displayShips = []; 
        this.projectiles = [];
        this.beams = [];
        this.explosions = [];

        // Filter ships that have a drawFunction and at least one weapon defined
        // CHANGED: Look for armament property instead of weapons
        const shipTypesAvailable = Object.keys(SHIP_DEFINITIONS).filter(
            shipKey => typeof SHIP_DEFINITIONS[shipKey].drawFunction === 'function' && 
                       SHIP_DEFINITIONS[shipKey].armament && 
                       SHIP_DEFINITIONS[shipKey].armament.length > 0
        );

        if (shipTypesAvailable.length === 0) {
            console.warn("TitleScreen.setupDynamicScene: No suitable ships with weapons found for title screen display.");
            return;
        }

        // Create 3-5 ships for the dynamic scene
        const numShips = floor(random(3, 6));
        const usedShipTypes = [];
        
        // Generate ships with varied behaviors
        for (let i = 0; i < numShips; i++) {
            // Select ship type
            let shipType = "";
            if (i === 0 && shipTypesAvailable.includes("CobraMkIII")) {
                shipType = "CobraMkIII";
            } else if (i === 1 && shipTypesAvailable.includes("Viper")) {
                shipType = "Viper";
            } else {
                // Get a ship type not already used if possible
                const availableTypes = shipTypesAvailable.filter(t => !usedShipTypes.includes(t));
                shipType = availableTypes.length > 0 ? random(availableTypes) : random(shipTypesAvailable);
            }
            usedShipTypes.push(shipType);
            
            const shipDef = SHIP_DEFINITIONS[shipType];
            if (!shipDef) continue;

            // Find a weapon for the ship - CHANGED: Look for armament instead of weapons
            let weaponName = "PulseLaser"; // Default fallback
            if (shipDef.armament && shipDef.armament.length > 0) {
                weaponName = shipDef.armament[0]; // Use first weapon in armament array
            }
            
            // Get the weapon definition from WEAPON_UPGRADES
            let shipWeaponDef = WEAPON_UPGRADES.find(w => w.name === weaponName);
            if (!shipWeaponDef) {
                shipWeaponDef = WEAPON_UPGRADES.length > 0 ? WEAPON_UPGRADES[0] : null;
            }

            // Create ship with dynamic properties
            this.displayShips.push({
                id: `title_ship_${i}_${shipType}`,
                type: shipType,
                def: shipDef,
                pos: createVector(
                    random(width * 0.1, width * 0.9),
                    random(height * 0.1, height * 0.7)
                ),
                vel: p5.Vector.random2D().mult(random(0.3, 1.2)),
                angle: random(TWO_PI),
                targetAngle: random(TWO_PI),
                turnRate: random(0.0002, 0.001),
                maxSpeed: random(0.8, 1.5),
                scale: shipDef.size > 60 ? 1.5 : 2.0,
                fireCooldown: random(1000, 3000),
                weapon: shipWeaponDef,
                color: shipDef.color || [200, 200, 200],
                behavior: random(['patrol', 'chase', 'evade']),
                target: null,
                targetUpdateTime: 0,
                isThrusting: false,
                thrustParticles: []
            });
        }

        // Assign targets for ships with chase behavior
        this.displayShips.filter(ship => ship.behavior === 'chase')
            .forEach(ship => {
                const potentialTargets = this.displayShips.filter(s => s !== ship);
                if (potentialTargets.length > 0) {
                    ship.target = random(potentialTargets);
                }
            });
    }
    
    update(deltaTime) {
        if (gameStateManager.currentState === "TITLE_SCREEN") {
            // Animate title entrance
            if (this.titleY < height * 0.4) {
                this.titleY += deltaTime * 0.05; 
            } else {
                this.titleY = height * 0.4;
            }
            
            // Fade in author credit after title appears
            if (this.titleY >= height * 0.15 && this.authorAlpha < 255) {
                this.authorAlpha = min(255, this.authorAlpha + deltaTime * 0.1);
            }

            // Update each ship based on its behavior
            for (const ship of this.displayShips) {
                // Periodically update target selection
                ship.targetUpdateTime -= deltaTime;
                if (ship.targetUpdateTime <= 0) {
                    this.updateShipTarget(ship);
                    ship.targetUpdateTime = 5000 + random(-1000, 1000);
                }
                
                // Update ship movement based on behavior
                switch (ship.behavior) {
                    case 'chase':
                        this.updateChaseShip(ship, deltaTime);
                        break;
                    case 'evade':
                        this.updateEvadeShip(ship, deltaTime);
                        break;
                    case 'patrol':
                    default:
                        this.updatePatrolShip(ship, deltaTime);
                        break;
                }
                
                // Update position and boundaries
                ship.pos.add(p5.Vector.mult(ship.vel, deltaTime * 0.05));
                
                // Screen wrap - allow ships to fly offscreen but reappear on the other side
                if (ship.pos.x < -100) ship.pos.x = width + 100;
                if (ship.pos.x > width + 100) ship.pos.x = -100;
                if (ship.pos.y < -100) ship.pos.y = height + 100;
                if (ship.pos.y > height + 100) ship.pos.y = -100;
                
                // Handle shooting
                ship.fireCooldown -= deltaTime;
                if (ship.fireCooldown <= 0 && ship.weapon) {
                    this.fireTitleScreenWeapon(ship);
                    ship.fireCooldown = random(1500, 4000);
                }
                
                // Update thrust particles
                this.updateThrustParticles(ship, deltaTime);
            }

            // Update projectiles
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const p = this.projectiles[i];
                p.update(deltaTime);
                
                // Remove if off-screen or expired
                if (p.lifetime <= 0 || 
                    p.pos.x < -200 || p.pos.x > width + 200 ||
                    p.pos.y < -200 || p.pos.y > height + 200) {
                    this.projectiles.splice(i, 1);
                }
            }

            // Update beams
            for (let i = this.beams.length - 1; i >= 0; i--) {
                const b = this.beams[i];
                b.update(deltaTime);
                if (b.isExpired()) {
                    this.beams.splice(i, 1);
                }
            }
            
            // Update explosions
            for (let i = this.explosions.length - 1; i >= 0; i--) {
                this.explosions[i].update();
                if (this.explosions[i].isDone()) {
                    this.explosions.splice(i, 1);
                }
            }
            
            // Occasionally create an explosion for visual effect
            if (random() < 0.001) {
                const x = random(width * 0.1, width * 0.9);
                const y = random(height * 0.1, height * 0.7);
                this.explosions.push(new Explosion(x, y, random(20, 40)));
            }
        }
    }

    updateShipTarget(ship) {
        if (ship.behavior === 'chase') {
            // Pick a random ship as target
            const otherShips = this.displayShips.filter(s => s !== ship);
            if (otherShips.length > 0) {
                ship.target = random(otherShips);
            }
        } else if (ship.behavior === 'evade') {
            // Find closest ship to avoid
            let closestShip = null;
            let closestDist = Infinity;
            
            for (const otherShip of this.displayShips) {
                if (otherShip !== ship) {
                    const dist = p5.Vector.dist(ship.pos, otherShip.pos);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestShip = otherShip;
                    }
                }
            }
            ship.target = closestShip;
        }
    }
    
    updateChaseShip(ship, deltaTime) {
        ship.isThrusting = false;
        
        // If we have a target, pursue it
        if (ship.target) {
            // Calculate angle to target
            const dx = ship.target.pos.x - ship.pos.x;
            const dy = ship.target.pos.y - ship.pos.y;
            ship.targetAngle = Math.atan2(dy, dx);
            
            // Turn toward target angle
            let angleDiff = (ship.targetAngle - ship.angle + TWO_PI) % TWO_PI;
            if (angleDiff > PI) angleDiff -= TWO_PI;
            
            ship.angle += angleDiff * ship.turnRate * deltaTime;
            ship.angle = (ship.angle + TWO_PI) % TWO_PI;
            
            // Thrust if pointing approximately toward target
            if (Math.abs(angleDiff) < 0.5) {
                // Calculate desired velocity
                const dir = p5.Vector.fromAngle(ship.angle);
                dir.mult(ship.maxSpeed);
                
                // Smoothly accelerate
                ship.vel.lerp(dir, 0.01);
                ship.isThrusting = true;
                
                // Add thrust particles
                if (random() < 0.3) {
                    this.createThrustParticle(ship);
                }
            }
        } else {
            // Default patrol behavior if no target
            this.updatePatrolShip(ship, deltaTime);
        }
    }
    
    updateEvadeShip(ship, deltaTime) {
        ship.isThrusting = false;
        
        // If we have a target to evade
        if (ship.target) {
            // Calculate angle away from target
            const dx = ship.pos.x - ship.target.pos.x;
            const dy = ship.pos.y - ship.target.pos.y;
            ship.targetAngle = Math.atan2(dy, dx);
            
            // Turn toward escape angle
            let angleDiff = (ship.targetAngle - ship.angle + TWO_PI) % TWO_PI;
            if (angleDiff > PI) angleDiff -= TWO_PI;
            
            ship.angle += angleDiff * ship.turnRate * deltaTime;
            ship.angle = (ship.angle + TWO_PI) % TWO_PI;
            
            // Thrust if pointing approximately away from target
            if (Math.abs(angleDiff) < 0.7) {
                // Calculate desired velocity
                const dir = p5.Vector.fromAngle(ship.angle);
                dir.mult(ship.maxSpeed * 1.2); // Faster when evading
                
                // Accelerate
                ship.vel.lerp(dir, 0.02);
                ship.isThrusting = true;
                
                // Add thrust particles more frequently
                if (random() < 0.5) {
                    this.createThrustParticle(ship);
                }
            }
            
            // Check if we're getting too close to screen edge
            const edgeMargin = 100;
            if (ship.pos.x < edgeMargin || ship.pos.x > width - edgeMargin ||
                ship.pos.y < edgeMargin || ship.pos.y > height - edgeMargin) {
                // Turn toward center of screen
                ship.targetAngle = Math.atan2(height/2 - ship.pos.y, width/2 - ship.pos.x);
            }
        } else {
            // Default patrol behavior if no threat
            this.updatePatrolShip(ship, deltaTime);
        }
    }
    
    updatePatrolShip(ship, deltaTime) {
        // Regular patrol behavior with occasional changes in direction
        let angleDiff = (ship.targetAngle - ship.angle + TWO_PI) % TWO_PI;
        if (angleDiff > PI) angleDiff -= TWO_PI;
        
        ship.angle += angleDiff * ship.turnRate * deltaTime;
        ship.angle = (ship.angle + TWO_PI) % TWO_PI;

        // Pick a new target angle if nearly aligned or randomly
        if (Math.abs(angleDiff) < 0.05 || random() < 0.001) {
            ship.targetAngle = random(TWO_PI);
        }

        // Thrust in current direction
        const dir = p5.Vector.fromAngle(ship.angle);
        dir.mult(ship.maxSpeed);
        
        // Smoothly interpolate current velocity toward desired direction
        ship.vel.lerp(dir, 0.005);
        
        // Apply thrusting visual effect
        ship.isThrusting = true;
        if (random() < 0.2) {
            this.createThrustParticle(ship);
        }
        
        // Adjust course if nearing screen edge
        const edgeMargin = 150;
        if (ship.pos.x < edgeMargin) {
            ship.targetAngle = 0; // Turn east
        } else if (ship.pos.x > width - edgeMargin) {
            ship.targetAngle = PI; // Turn west
        } else if (ship.pos.y < edgeMargin) {
            ship.targetAngle = HALF_PI; // Turn south
        } else if (ship.pos.y > height - edgeMargin) {
            ship.targetAngle = -HALF_PI; // Turn north
        }
    }
    
    createThrustParticle(ship) {
        if (!ship.thrustParticles) ship.thrustParticles = [];
        
        // Calculate thrust position (back of ship)
        const shipSize = ship.def.size * ship.scale;
        const thrustAngle = ship.angle + PI; // Opposite direction of ship
        const thrustDist = shipSize * 0.5;
        
        // Create a new thrust particle
        ship.thrustParticles.push({
            pos: createVector(
                ship.pos.x + cos(thrustAngle) * thrustDist,
                ship.pos.y + sin(thrustAngle) * thrustDist
            ),
            vel: p5.Vector.fromAngle(thrustAngle + random(-0.3, 0.3)).mult(random(0.5, 1.5)),
            size: random(3, shipSize * 0.3),
            alpha: random(150, 200),
            lifespan: random(20, 40)
        });
        
        // Limit particles for performance
        while (ship.thrustParticles.length > 20) {
            ship.thrustParticles.shift();
        }
    }
    
    updateThrustParticles(ship, deltaTime) {
        if (!ship.thrustParticles) ship.thrustParticles = [];
        
        // Update existing particles
        for (let i = ship.thrustParticles.length - 1; i >= 0; i--) {
            const p = ship.thrustParticles[i];
            
            // Update position
            p.pos.add(p.vel);
            
            // Shrink and fade
            p.size *= 0.95;
            p.alpha -= 5;
            p.lifespan -= 1;
            
            // Remove expired particles
            if (p.lifespan <= 0 || p.alpha <= 0 || p.size < 1) {
                ship.thrustParticles.splice(i, 1);
            }
        }
        
        // Add new particles if thrusting
        if (ship.isThrusting && random() < 0.3) {
            this.createThrustParticle(ship);
        }
    }

    fireTitleScreenWeapon(ship) {
        if (!ship.weapon || !ship.def) {
            return;
        }

        const weaponDef = ship.weapon; 
        // Estimate muzzle position based on ship size and angle
        const muzzleOffset = (ship.def.size || 30) * ship.scale * 0.5; 
        const muzzlePos = createVector(
            ship.pos.x + cos(ship.angle) * muzzleOffset,
            ship.pos.y + sin(ship.angle) * muzzleOffset
        );

        // Create simplified 'firedBy' object
        const firedBy = {
            id: ship.id, 
            pos: ship.pos.copy(),
            vel: ship.vel.copy(),
            isPlayer: false,
            color: ship.color, 
            faction: "TitleScreenDisplay", 
            teamId: ship.id,
            type: ship.type,
            angle: ship.angle,
        };

    if (weaponDef.type === 'beam') {
        const beamEndPos = createVector(
            muzzlePos.x + cos(ship.angle) * (weaponDef.range || 1000),
            muzzlePos.y + sin(ship.angle) * (weaponDef.range || 1000)
        );
        // CHANGE THIS LINE
        const beam = new TitleScreenBeam( // <-- Changed from "Beam" to "TitleScreenBeam"
            muzzlePos,
            beamEndPos,
            weaponDef.color || [255, 0, 0, 200],
            weaponDef.beamWidth || 3,
            weaponDef.beamDuration || 150,
            firedBy
        );
        this.beams.push(beam);
        if (typeof soundManager !== 'undefined' && soundManager.playSound && weaponDef.soundFire) {
            soundManager.playSound(weaponDef.soundFire);
        }
    } else if (weaponDef.type === 'missile') {
        } else {
            const projectile = new Projectile(
                muzzlePos.x, muzzlePos.y,
                ship.angle,
                firedBy,
                weaponDef.speed || 8,
                weaponDef.damage || 10,
                weaponDef.color,
                weaponDef.type,
                null,
                weaponDef.lifespan || (weaponDef.type === "missile" ? 240 : 90),
                weaponDef.turnRate || 0,
                weaponDef.speed || 8,
                weaponDef.dragDuration || 5.0,
                weaponDef.dragMultiplier || 10.0
            );
            this.projectiles.push(projectile);
            if (typeof soundManager !== 'undefined' && soundManager.playSound && weaponDef.soundFire) {
                soundManager.playSound(weaponDef.soundFire);
            }
        }
    }
    
    drawTitleScreen() {
        background(0);
        this.drawStarfield();
        
        // Draw explosions behind ships
        for (const explosion of this.explosions) {
            explosion.draw();
        }
        
        // Draw projectiles and beams behind ships
        for (const p of this.projectiles) {
            p.draw();
        }
        for (const b of this.beams) {
            b.draw();
        }
        
        // Draw ships with thrust particles
        for (const ship of this.displayShips) {
            // Draw thrust particles first
            if (ship.thrustParticles) {
                for (const p of ship.thrustParticles) {
                    push();
                    noStroke();
                    // Orange-yellow gradient for thrust
                    fill(255, 150 + p.alpha/2, 50, p.alpha);
                    ellipse(p.pos.x, p.pos.y, p.size, p.size);
                    pop();
                }
            }
            
            // Draw ship - CHANGED: rotate by -HALF_PI instead of +HALF_PI for correct orientation
            if (ship.def && typeof ship.def.drawFunction === 'function') {
                push();
                translate(ship.pos.x, ship.pos.y);
                rotate(ship.angle); // Changed from + to - to rotate 90 degrees counterclockwise 
                scale(ship.scale);
                ship.def.drawFunction(ship.def.size, ship.isThrusting, ship.color);
                pop();
            }
        }

        // Rest of the drawing code remains unchanged

        // Draw Title Text with glow effect
        push();
        textFont(font); 
        
        // Glow effect
        for (let i = 5; i > 0; i--) {
            textSize(100 + i);
            textAlign(CENTER, CENTER);
            fill(0, 80 + i*20, 155, 50/i);
            text("Elite Redux", width/2 + random(-1, 1), this.titleY + random(-1, 1));
        }
        
        // Main title
        textSize(100);
        textAlign(CENTER, CENTER);
        fill(0, 180, 255, 240);
        stroke(0, 100, 200, 240);
        strokeWeight(3);
        text("Elite Redux", width/2, this.titleY);
        
        // Author Credit
        textSize(20);
        fill(200, 200, 255, this.authorAlpha);
        noStroke();
        text("Christian Nold, Easter 2025", width/2, this.titleY + 80);
        pop();
        
        // Draw "Click to Continue" Prompt with pulsing effect
        push();
        textAlign(CENTER, CENTER);
        textSize(30);
        const promptY = height * 0.85;
        const pulse = sin(millis() / 300) * 50 + 200;
        fill(pulse, pulse, 255);
        textFont(font);
        text("Click to Continue", width/2, promptY);
        pop();
    }
    
    drawInstructionScreen() {
        background(0);
        this.drawStarfield();
        
        push();
        textAlign(CENTER, TOP);
        const startY = this.instructionScrollY;
        
        // Title
        textFont(font);
        textSize(42);
        fill(0, 180, 255);
        text("HOW TO PLAY", width/2, startY);
        
        // Game description and controls (text content unchanged)
        textSize(20);
        fill(200, 200, 255);
        textAlign(LEFT, TOP);
        let textX = width * 0.1; 
        let textY = startY + 80;
        const lineHeight = 30;
        
        // Introduction
        text("Hide in an Ion Nebula near the station and ambush the Imperial Courier - you know the deal...", textX, textY);
        textY += lineHeight * 2;
        
        // Controls section
        textSize(30);
        fill(0, 180, 255);
        text("CONTROLS:", textX, textY);
        textY += lineHeight;
        
        // Control instructions
        textSize(20);
        fill(200, 200, 255);
        text("W or UP ARROW - Thrust forward", textX, textY); textY += lineHeight;
        text("S or DOWN ARROW - Thrust back", textX, textY); textY += lineHeight;
        text("Q or LEFT ARROW - Rotate left", textX, textY); textY += lineHeight;
        text("E or RIGHT ARROW - Rotate right", textX, textY); textY += lineHeight;
        text("A - Skate left", textX, textY); textY += lineHeight;
        text("D - Skate right", textX, textY); textY += lineHeight;
        text("R - Speed Boost", textX, textY); textY += lineHeight;
        text("HOLD SPACEBAR - Fire weapons", textX, textY); textY += lineHeight;
        text("1-9 - Switch weapons", textX, textY); textY += lineHeight;
        text("M - Galaxy map", textX, textY); textY += lineHeight;
        text("I - Inventory while flying", textX, textY); textY += lineHeight;
        text("H and J - AutoPilot to Station or Jump Zone", textX, textY); textY += lineHeight;
        text("Mouse to target beam weapons", textX, textY); textY += lineHeight * 2;

        // Gameplay tips
        textSize(30);
        fill(0, 180, 255);
        textY = startY + 140;
        textX = width * 0.4;
        text("GAMEPLAY:", textX, textY);
        textY += lineHeight;
        
        textSize(20);
        fill(200, 200, 255);
        text("• Dock with stations to trade, upgrade, take missions and save game", textX, textY); textY += lineHeight;
        text("• Jump between systems by going to the Jumpzone and use the galaxy map", textX, textY); textY += lineHeight;
        text("• Become Elite", textX, textY); textY += lineHeight * 2;
        
        // Start prompt
        textSize(30);
        textAlign(CENTER); 
        const pulse = sin(millis() / 300) * 50 + 200;
        fill(pulse, pulse, 255);
        text("Press SPACE or CLICK to Begin", width/2, height * 0.85);
        
        pop();
    }
    
    drawStarfield() {
        push();
        noStroke();
        // Initialize cache if it doesn't exist or is empty
        if (!this.bgStarsCache || this.bgStarsCache.length === 0) {
            this.bgStarsCache = [];
            for (let i = 0; i < 200; i++) {
                this.bgStarsCache.push({
                    x: random(width),
                    y: random(height),
                    size: random(1, 3.5),
                    brightness: random(50, 200),
                    parallax: random(0.1, 0.5)
                });
            }
        }

        // Draw stars from cache
        for (let i = 0; i < this.bgStarsCache.length; i++) {
            const star = this.bgStarsCache[i];
            // Calculate scrolled position (simple horizontal scroll)
            const scrollOffset = (millis() * 0.005 * star.parallax) % width;
            const x = (star.x + scrollOffset) % width;

            fill(star.brightness);
            ellipse(x, star.y, star.size, star.size);
        }
        pop();
    }
    
    handleClick() {
        if (gameStateManager.currentState === "TITLE_SCREEN") {
            gameStateManager.setState("INSTRUCTIONS");
        } else if (gameStateManager.currentState === "INSTRUCTIONS") {
            gameStateManager.setState("NEW_GAME_SETUP");
        }
    }
    
    handleKeyPress(keyCode, key) {
        // Allow SPACE to advance from instructions
        if (gameStateManager.currentState === "INSTRUCTIONS" && (keyCode === 32 || key === ' ')) {
            gameStateManager.setState("NEW_GAME_SETUP");
        }
        // Allow ESCAPE to go back from instructions to title
        if (keyCode === ESCAPE) {
            if (gameStateManager.currentState === "INSTRUCTIONS") {
                gameStateManager.setState("TITLE_SCREEN");
            }
        }
    }
}