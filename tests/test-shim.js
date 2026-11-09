class TestRunner {
  constructor() {
    this.tests = [];
  }
  add(name, fn) {
    this.tests.push({ name, fn });
  }
  async run() {
    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const t of this.tests) {
      try {
        await t.fn();
        passed++;
      } catch (err) {
        failed++;
        failures.push({ name: t.name, error: { message: err.message, stack: err.stack } });
        console.error(`FAIL: ${t.name}\n`, err);
      }
    }
    return { total: this.tests.length, passed, failed, failures };
  }
}

export const testRunner = new TestRunner();

export default function test(name, fn) {
  testRunner.add(name, fn);
}

export { test };
