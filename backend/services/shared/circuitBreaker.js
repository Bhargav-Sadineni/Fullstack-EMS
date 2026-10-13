// Circuit Breaker implementation for inter-service communication
export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 10000; // 10 seconds
    this.state = "CLOSED"; // CLOSED, OPEN, HALF-OPEN
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async execute(fn, fallbackFn) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF-OPEN`);
        this.state = "HALF-OPEN";
      } else {
        console.warn(`[CircuitBreaker:${this.name}] Circuit is OPEN. Executing fallback.`);
        if (fallbackFn) return fallbackFn();
        throw new Error(`CircuitBreaker:${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      if (this.state === "HALF-OPEN") {
        console.log(`[CircuitBreaker:${this.name}] Request succeeded in HALF-OPEN. Resetting to CLOSED.`);
        this.state = "CLOSED";
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();
      console.warn(`[CircuitBreaker:${this.name}] Failure ${this.failures}/${this.failureThreshold}: ${err.message}`);

      if (this.failures >= this.failureThreshold) {
        console.error(`[CircuitBreaker:${this.name}] Trip to OPEN state.`);
        this.state = "OPEN";
      }

      if (fallbackFn) return fallbackFn();
      throw err;
    }
  }
}
