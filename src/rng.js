export class XorShift32 {
  constructor(seed) {
    this.state = (seed >>> 0) || 1;
  }

  nextUint32() {
    let x = this.state >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  nextFloat() {
    return this.nextUint32() / 2 ** 32;
  }

  uniform(min, max) {
    return min + (max - min) * this.nextFloat();
  }

  bernoulli(p) {
    return this.nextFloat() < p;
  }
}

