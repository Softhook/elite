// starfield.js - shared starfield implementation for title, save, and loading screens
class Starfield {
    constructor() {
        this.bgStars = [];
        this.cacheW = 0;
        this.cacheH = 0;
    }

    rebuildIfNeeded() {
        if (this.cacheW === width && this.cacheH === height && this.bgStars.length > 0) return;
        this.bgStars = [];
        const area = width * height;
        const base = Math.min(600, Math.max(100, Math.floor(area / 2000)));
        for (let i = 0; i < base; i++) {
            this.bgStars.push({
                x: random(width),
                y: random(height),
                size: random(0.8, 3.5),
                brightness: random(60, 220),
                parallax: random(0.05, 0.5),
                twinkle: random(0, TWO_PI)
            });
        }
        this.cacheW = width;
        this.cacheH = height;
    }

    // Draw the starfield. Static stars (no scrolling, no twinkle).
    draw() {
        this.rebuildIfNeeded();
        push();
        noStroke();
        for (let i = 0; i < this.bgStars.length; i++) {
            const star = this.bgStars[i];
            fill(star.brightness);
            ellipse(star.x, star.y, star.size, star.size);
        }
        pop();
    }
}

// Shared singleton for screens to use
if (typeof sharedStarfield === 'undefined') {
    var sharedStarfield = new Starfield();
}
