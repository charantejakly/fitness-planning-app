export const fs = {
  existsSync(p) { return true; },
  statSync(p) { return { size: 120000 }; },
  readFileSync(p) {
    if (p.includes('sw.js')) return 'const ASSETS = ["/assets/anatomy/front.png", "/assets/anatomy/back.png"];';
    if (p.includes('build.mjs')) return 'await cp(resolve(root, "assets"), resolve(output, "assets"));';
    return '';
  }
};
export default fs;
