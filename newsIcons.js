// ****** newsIcons.js ******
// Programmatic icon drawing for news headlines
// These replace Unicode emojis that aren't supported by the Frontier.ttf font

/**
 * Icon tokens used in news headlines - map to drawing functions
 */
const NEWS_ICON_TOKENS = {
    '[STAR]': 'star',
    '[SWORDS]': 'swords',
    '[FIRE]': 'fire',
    '[SKULL]': 'skull',
    '[FAMINE]': 'famine',
    '[MEDAL]': 'medal',
    '[FIST]': 'fist',
    '[SHIELD]': 'shield',
    '[ALIEN]': 'alien',
    '[STORM]': 'storm'
};

/**
 * NewsIcons - Draws minimal vector icons for news headlines
 */
const NewsIcons = {
    /**
     * Icon size (width and height)
     */
    SIZE: 16,

    /**
     * Check if text contains an icon token at the start
     * @param {string} text - The headline text
     * @returns {string|null} The icon type if found, null otherwise
     */
    getIconToken(text) {
        for (const [token, iconType] of Object.entries(NEWS_ICON_TOKENS)) {
            if (text.startsWith(token)) {
                return iconType;
            }
        }
        return null;
    },

    /**
     * Get the token string for an icon type
     * @param {string} iconType - The icon type
     * @returns {string} The token string
     */
    getTokenString(iconType) {
        for (const [token, type] of Object.entries(NEWS_ICON_TOKENS)) {
            if (type === iconType) return token;
        }
        return '';
    },

    /**
     * Remove icon token from text
     * @param {string} text - The headline text
     * @returns {string} Text with token removed
     */
    stripIconToken(text) {
        for (const token of Object.keys(NEWS_ICON_TOKENS)) {
            if (text.startsWith(token)) {
                return text.substring(token.length).trimStart();
            }
        }
        return text;
    },

    /**
     * Draw an icon at the specified position
     * @param {string} iconType - Type of icon to draw
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} [size=16] - Icon size
     */
    draw(iconType, x, y, size = 16) {
        const s = size / 2;
        push();
        translate(x, y);
        noStroke();

        switch (iconType) {
            case 'star':
                this._drawStar(s);
                break;
            case 'swords':
                this._drawSwords(s);
                break;
            case 'fire':
                this._drawFire(s);
                break;
            case 'skull':
                this._drawSkull(s);
                break;
            case 'famine':
                this._drawFamine(s);
                break;
            case 'medal':
                this._drawMedal(s);
                break;
            case 'fist':
                this._drawFist(s);
                break;
            case 'shield':
                this._drawShield(s);
                break;
            case 'alien':
                this._drawAlien(s);
                break;
            case 'storm':
                this._drawStorm(s);
                break;
        }

        pop();
    },

    /**
     * Gold star - military hero
     */
    _drawStar(s) {
        fill(255, 220, 80);
        beginShape();
        for (let i = 0; i < 5; i++) {
            const angle1 = TWO_PI * i / 5 - HALF_PI;
            const angle2 = TWO_PI * (i + 0.5) / 5 - HALF_PI;
            vertex(cos(angle1) * s, sin(angle1) * s);
            vertex(cos(angle2) * s * 0.4, sin(angle2) * s * 0.4);
        }
        endShape(CLOSE);
    },

    /**
     * Crossed swords - skirmish
     */
    _drawSwords(s) {
        stroke(180, 180, 200);
        strokeWeight(2);
        noFill();
        // Sword 1 (top-left to bottom-right)
        line(-s * 0.8, -s * 0.8, s * 0.8, s * 0.8);
        // Sword 2 (top-right to bottom-left)
        line(s * 0.8, -s * 0.8, -s * 0.8, s * 0.8);
        // Hilts
        strokeWeight(3);
        line(-s * 0.5, -s * 0.2, -s * 0.2, -s * 0.5);
        line(s * 0.5, -s * 0.2, s * 0.2, -s * 0.5);
        strokeWeight(1);
        noStroke();
    },

    /**
     * Fire/flames - full war
     */
    _drawFire(s) {
        // Outer flame (orange)
        fill(255, 120, 30);
        beginShape();
        vertex(0, -s);
        vertex(s * 0.5, s * 0.3);
        vertex(s * 0.3, s * 0.5);
        vertex(0, s);
        vertex(-s * 0.3, s * 0.5);
        vertex(-s * 0.5, s * 0.3);
        endShape(CLOSE);
        // Inner flame (yellow)
        fill(255, 200, 50);
        beginShape();
        vertex(0, -s * 0.5);
        vertex(s * 0.25, s * 0.3);
        vertex(0, s * 0.6);
        vertex(-s * 0.25, s * 0.3);
        endShape(CLOSE);
    },

    /**
     * Skull - plague/death
     */
    _drawSkull(s) {
        fill(220, 220, 210);
        // Cranium
        ellipse(0, -s * 0.2, s * 1.6, s * 1.4);
        // Jaw
        rect(-s * 0.5, s * 0.1, s, s * 0.5, 2);
        // Eye sockets
        fill(40, 40, 50);
        ellipse(-s * 0.35, -s * 0.25, s * 0.45, s * 0.4);
        ellipse(s * 0.35, -s * 0.25, s * 0.45, s * 0.4);
        // Nose hole
        triangle(0, 0, -s * 0.15, s * 0.2, s * 0.15, s * 0.2);
    },

    /**
     * Wilted leaf - famine
     */
    _drawFamine(s) {
        fill(150, 100, 50);
        // Drooping leaf shape
        beginShape();
        vertex(0, -s * 0.8);
        bezierVertex(s * 0.6, -s * 0.3, s * 0.8, s * 0.4, s * 0.3, s * 0.8);
        bezierVertex(0, s * 0.6, -s * 0.2, s * 0.3, 0, -s * 0.8);
        endShape(CLOSE);
        // Stem
        stroke(100, 70, 40);
        strokeWeight(2);
        line(0, -s * 0.8, -s * 0.3, -s);
        noStroke();
    },

    /**
     * Medal - Imperial hero
     */
    _drawMedal(s) {
        // Ribbon
        fill(100, 50, 150);
        rect(-s * 0.4, -s, s * 0.8, s * 0.5);
        // Medal circle
        fill(255, 200, 50);
        ellipse(0, s * 0.2, s * 1.2, s * 1.2);
        // Inner detail
        fill(255, 220, 100);
        ellipse(0, s * 0.2, s * 0.7, s * 0.7);
    },

    /**
     * Raised fist - Separatist hero
     */
    _drawFist(s) {
        fill(200, 80, 60);
        // Fist shape (simplified)
        rect(-s * 0.5, -s * 0.3, s, s * 0.9, 3);
        // Thumb
        rect(-s * 0.7, -s * 0.1, s * 0.3, s * 0.5, 2);
        // Wrist
        rect(-s * 0.4, s * 0.5, s * 0.8, s * 0.4);
        // Finger lines
        stroke(150, 50, 40);
        strokeWeight(1);
        line(-s * 0.3, -s * 0.3, -s * 0.3, s * 0.4);
        line(0, -s * 0.3, 0, s * 0.4);
        line(s * 0.3, -s * 0.3, s * 0.3, s * 0.4);
        noStroke();
    },

    /**
     * Shield - police hero
     */
    _drawShield(s) {
        // Shield shape
        fill(80, 120, 180);
        beginShape();
        vertex(0, -s);
        vertex(s * 0.8, -s * 0.6);
        vertex(s * 0.8, s * 0.2);
        vertex(0, s);
        vertex(-s * 0.8, s * 0.2);
        vertex(-s * 0.8, -s * 0.6);
        endShape(CLOSE);
        // Inner highlight
        fill(100, 150, 220);
        beginShape();
        vertex(0, -s * 0.6);
        vertex(s * 0.5, -s * 0.35);
        vertex(s * 0.5, s * 0.1);
        vertex(0, s * 0.6);
        vertex(-s * 0.5, s * 0.1);
        vertex(-s * 0.5, -s * 0.35);
        endShape(CLOSE);
    },

    /**
     * UFO/Alien Head - Alien threat
     */
    _drawAlien(s) {
        fill(50, 200, 50); // Alien Green

        // Classic UFO Saucer shape
        // Dome
        arc(0, -s * 0.2, s * 1.0, s * 1.0, PI, TWO_PI);

        // Saucer body
        fill(100, 100, 100);
        ellipse(0, 0, s * 2.0, s * 0.6);

        // Lights on saucer
        fill(255, 50, 50); // Red lights
        ellipse(-s * 0.5, 0, s * 0.3, s * 0.3);
        ellipse(0, s * 0.1, s * 0.3, s * 0.3);
        ellipse(s * 0.5, 0, s * 0.3, s * 0.3);
    },

    /**
     * Storm Cloud/Lightning - Environmental hazard
     */
    _drawStorm(s) {
        // Cloud
        fill(100, 100, 110);
        noStroke();
        ellipse(-s * 0.3, -s * 0.3, s * 0.9, s * 0.7);
        ellipse(s * 0.3, -s * 0.4, s * 1.1, s * 0.8);
        ellipse(0, -s * 0.5, s * 0.8, s * 0.6);

        // Lightning bolt
        fill(255, 255, 0);
        beginShape();
        vertex(-s * 0.1, -s * 0.1);
        vertex(s * 0.3, -s * 0.1);
        vertex(0, s * 0.3);
        vertex(s * 0.2, s * 0.3);
        vertex(-s * 0.2, s * 0.9);
        vertex(-s * 0.1, s * 0.4);
        vertex(-s * 0.4, s * 0.4);
        endShape(CLOSE);
    }
};
