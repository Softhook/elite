/**
 * Cargo class for representing floating cargo containers in space
 * Can be collected by the player for profit
 */
class Cargo {
    constructor(x, y, type, quantity = 1) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-0.5, 0.5), random(-0.5, 0.5));
        this.type = type || random(LEGAL_CARGO); // Default to random legal cargo
        this.quantity = Math.min(50, Math.max(1, quantity));
        this.size = 8;
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.01, 0.01);
        this.collected = false;
        this.lifetime = 1800; // Exists for 30 seconds (60fps * 30)
        this.color = Cargo.determineColor(this.type);
    }

    /**
     * Determines the color of the cargo based on its type.
     * @param {string} type - The cargo type.
     * @returns {Array} RGB color array.
     */
    static determineColor(type) {
        if (ILLEGAL_CARGO.includes(type)) {
            return [200 + random(55), 20 + random(30), 20 + random(30)];
        }
        if (["Food", "Textiles"].includes(type)) {
            return [30 + random(30), 150 + random(50), 30 + random(30)];
        }
        if (["Machinery", "Metals", "Minerals"].includes(type)) {
            return [150 + random(50), 150 + random(50), 150 + random(50)];
        }
        if (["Chemicals", "Medicine"].includes(type)) {
            return [150 + random(50), 150 + random(50), 200 + random(55)];
        }
        if (["Computers", "Adv Components"].includes(type)) {
            return [200 + random(55), 150 + random(50), 30 + random(30)];
        }
        if (["Luxury Goods"].includes(type)) {
            return [200 + random(55), 80 + random(40), 200 + random(55)];
        }
        return [200 + random(55), 200 + random(55), 200 + random(55)];
    }

    update() {
        if (this.collected) return;
        this.pos.add(this.vel);
        this.vel.mult(0.98);
        this.rotation = (this.rotation + this.rotationSpeed) % TWO_PI;
        this.lifetime--;
    }

    draw() {
        if (this.collected) return;
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);
        fill(this.color);
        stroke(min(255, this.color[0] * 0.7), min(255, this.color[1] * 0.7), min(255, this.color[2] * 0.7));
        strokeWeight(1);
        // Draw container
        beginShape();
        vertex(-this.size/1.5, -this.size/1.5);
        vertex(this.size/1.5, -this.size/1.5);
        vertex(this.size/1.5, this.size/1.5);
        vertex(-this.size/1.5, this.size/1.5);
        endShape(CLOSE);
        // Draw details (packaging lines)
        stroke(min(255, this.color[0] * 0.6), min(255, this.color[1] * 0.6), min(255, this.color[2] * 0.6));
        line(-this.size/1.5, 0, this.size/1.5, 0);
        line(0, -this.size/1.5, 0, this.size/1.5);
        // Asymmetrical mark for rotation visibility
        fill(255, 255, 255, 120);
        noStroke();
        triangle(
            -this.size/2.5, -this.size/2.5,
            -this.size/1.8, -this.size/2.5,
            -this.size/2.5, -this.size/1.8
        );
        // Glint for valuable content
        if (this.lifetime % 60 < 15) {
            fill(255, 255, 255, 180);
            noStroke();
            ellipse(this.size/3, -this.size/3, 2, 2);
        }
        pop();
        // Fading effect when lifetime is low
        if (this.lifetime < 120) {
            const fadeOpacity = map(this.lifetime, 0, 120, 0, 255);
            stroke(255, fadeOpacity);
            strokeWeight(1);
            noFill();
            ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
        }
    }

    isExpired() {
        return this.lifetime <= 0;
    }

    checkCollision(player) {
        if (!player || !player.pos) return false;
        const d = dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
        return d < (player.size/2 + this.size * 2);
    }

    getValue() {
        const baseValues = {
            'Food': 8, 'Textiles': 12, 'Machinery': 95, 'Metals': 45, 'Minerals': 35,
            'Chemicals': 65, 'Computers': 220, 'Medicine': 140, 'Adv Components': 350,
            'Luxury Goods': 400, 'Narcotics': 300, 'Weapons': 250, 'Slaves': 350
        };
        const baseValue = baseValues[this.type] || 50;
        return Math.floor(baseValue * this.quantity * random(0.8, 1.2));
    }
}