function deepEqualCheck(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqualCheck(a[k], b[k])) return false;
  }
  return true;
}

export const assert = {
  ok(val, msg) {
    if (!val) throw new Error(msg || 'Expected truthy value but got ' + val);
  },
  equal(a, b, msg) {
    if (a != b) throw new Error(msg || `Expected ${JSON.stringify(a)} == ${JSON.stringify(b)}`);
  },
  strictEqual(a, b, msg) {
    if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
  },
  notEqual(a, b, msg) {
    if (a == b) throw new Error(msg || `Expected ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  },
  notStrictEqual(a, b, msg) {
    if (a === b) throw new Error(msg || `Expected ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  },
  deepEqual(a, b, msg) {
    if (!deepEqualCheck(a, b)) throw new Error(msg || `Deep equal mismatch:\nGot: ${JSON.stringify(a)}\nExp: ${JSON.stringify(b)}`);
  },
  throws(fn, expected, msg) {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) throw new Error(msg || 'Expected function to throw');
  }
};

export default assert;
