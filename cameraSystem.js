class CameraSystem {
    constructor() {
        this.pos = null;
        this.shakeOffset = null;
        this.shakeIntensity = 0;
        this.shakeDecay = 0.92; // Decay rate per frame (16.67ms)
        this.lookAheadFactor = 7.0; // Viewport shift multiplier based on player velocity
        this.lerpFactor = 0.07; // Camera tracking smooth speed (higher = faster, lower = smoother)
        this.initialized = false;
    }

    _initVectors() {
        if (!this.pos && typeof createVector !== 'undefined') {
            this.pos = createVector(0, 0);
            this.shakeOffset = createVector(0, 0);
        }
    }

    /**
     * Resets the camera initialization state and clears any screenshake.
     */
    reset() {
        this.initialized = false;
        if (this.shakeOffset) {
            this.shakeOffset.set(0, 0);
        }
        this.shakeIntensity = 0;
    }

    /**
     * Updates the camera position and screen shake.
     * @param {p5.Vector} playerPos - The player's current world position
     * @param {p5.Vector} playerVel - The player's current velocity
     * @param {number} playerAngle - The player's current facing angle
     * @param {number} dt - Delta time in milliseconds
     */
    update(playerPos, playerVel, playerAngle, dt) {
        this._initVectors();
        const timeScale = dt ? (dt / 16.67) : 1.0;

        if (playerPos) {
            if (this.pos) {
                // Target position = playerPos + velocity lookahead (leading)
                let targetX = playerPos.x;
                let targetY = playerPos.y;

                if (playerVel) {
                    targetX += playerVel.x * this.lookAheadFactor;
                    targetY += playerVel.y * this.lookAheadFactor;
                }

                // Initialize position on the first update to avoid sliding in from (0,0) or previous positions
                if (!this.initialized) {
                    this.pos.set(targetX, targetY);
                    this.initialized = true;
                }

                // Smooth camera lerp tracking (frame-rate independent)
                const currentLerp = 1 - Math.pow(1 - this.lerpFactor, timeScale);
                this.pos.x = lerp(this.pos.x, targetX, currentLerp);
                this.pos.y = lerp(this.pos.y, targetY, currentLerp);
            }
        }

        // Update screenshake offset
        if (this.shakeIntensity > 0.05) {
            if (this.shakeOffset) {
                this.shakeOffset.x = random(-this.shakeIntensity, this.shakeIntensity);
                this.shakeOffset.y = random(-this.shakeIntensity, this.shakeIntensity);
            }
            // Apply exponential decay
            this.shakeIntensity *= Math.pow(this.shakeDecay, timeScale);
        } else {
            if (this.shakeOffset) {
                this.shakeOffset.set(0, 0);
            }
            this.shakeIntensity = 0;
        }
    }

    /**
     * Triggers a screen shake of the specified intensity.
     * @param {number} intensity - Shake magnitude in pixels (reduced internally for subtle feedback)
     */
    triggerShake(intensity) {
        if (isNaN(intensity) || intensity <= 0) return;
        // Apply a global reduction factor (0.3) to make the shake effect less extreme
        const reducedIntensity = intensity * 0.3;
        // Cap maximum intensity to a comfortable limit (12 pixels) to avoid disorienting shakes
        this.shakeIntensity = Math.min(12, this.shakeIntensity + reducedIntensity);
    }

    /**
     * Applies the camera translation and shake transformation to the drawing context.
     * @param {number} zoomScale - Current view zoom scale
     */
    applyTransform(zoomScale = 1.0) {
        this._initVectors();
        const posX = this.pos ? this.pos.x : 0;
        const posY = this.pos ? this.pos.y : 0;
        const shakeX = this.shakeOffset ? this.shakeOffset.x : 0;
        const shakeY = this.shakeOffset ? this.shakeOffset.y : 0;

        // Calculate translation centered on camera pos + shake offset
        const tx = width / 2 - (posX + shakeX);
        const ty = height / 2 - (posY + shakeY);
        translate(tx, ty);

        // Zoom around player center if applicable (e.g. death zoom, intro zoom)
        if (zoomScale > 1.0) {
            translate(posX, posY);
            scale(zoomScale);
            translate(-posX, -posY);
        }
    }
}

// Instantiate globally
if (typeof window !== 'undefined') {
    window.cameraSystem = new CameraSystem();
}
