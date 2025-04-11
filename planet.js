// ****** planet.js ******

class Planet {
    // Simple static planet for visual interest
    constructor(worldX, worldY, size, color1, color2) {
        this.pos = createVector(worldX, worldY); // World coordinates
        this.size = size; // Diameter
        this.color1 = color1 || color(random(50, 150), random(50, 150), random(100, 200)); // Base color
        this.color2 = color2 || color(red(this.color1)*0.8, green(this.color1)*0.8, blue(this.color1)*1.2); // Accent color
        // Could add more properties: name, type, atmosphere, rings later
    }

    draw() {
        // Drawn relative to world origin, translated by StarSystem.draw
        push();
        translate(this.pos.x, this.pos.y);

        // Simple two-tone drawing
        noStroke();
        fill(this.color1);
        ellipse(0, 0, this.size, this.size);

        // Add a simple crescent/feature
        fill(this.color2);
        arc(0, 0, this.size, this.size, PI * 0.8, PI * 1.8); // Example arc

        pop();
    }
}