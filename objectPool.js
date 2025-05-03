class ObjectPool {
  constructor(objectType, initialSize = 20, maxSize = 1000) {
    this.objectType = objectType;
    this.pool = [];
    this.active = new Set();
    this.maxSize = maxSize;
    this.totalCreated = 0;
    this.totalReused = 0;
    
    // Type name for debugging
    this.typeName = objectType.name || "Object";
    
    // Pre-populate pool (without running constructor logic yet)
    this.growPool(initialSize);
  }
  
  // Create additional objects for the pool
  growPool(count) {
    const newCount = Math.min(count, this.maxSize - this.pool.length);
    for (let i = 0; i < newCount; i++) {
      this.pool.push(new this.objectType());
      this.totalCreated++;
    }
  }
  
  // Get an object from the pool or create one if needed
  get(...args) {
    let object;
    
    if (this.pool.length > 0) {
      object = this.pool.pop();
      this.totalReused++;
    } else {
      // Pool is empty, create a new object if we haven't reached max size
      if (this.active.size < this.maxSize) {
        object = new this.objectType();
        this.totalCreated++;
      } else {
        console.warn(`${this.typeName} pool maxed out (${this.maxSize} objects)`);
        return null;
      }
    }
    
    // Reset if it has a reset method, otherwise initialize fresh
    if (typeof object.reset === 'function') {
      object.reset(...args);
    }
    
    this.active.add(object);
    return object;
  }
  
  // Return an object to the pool
  release(object) {
    if (!object || !this.active.has(object)) return;
    
    this.active.delete(object);
    
    // Only add to pool if it's not already full
    if (this.pool.length < this.maxSize) {
      this.pool.push(object);
    }
  }
  
  // Release all active objects
  releaseAll() {
    this.active.forEach(object => {
      this.pool.push(object);
    });
    this.active.clear();
  }
  
  // Get usage statistics
  getStats() {
    return {
      available: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size,
      created: this.totalCreated,
      reused: this.totalReused
    };
  }
}