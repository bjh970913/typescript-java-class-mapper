import * as path from 'path';
const walk = require('walk');

export function findClasses(startPath: string) {
  const walker = walk['walk'](startPath);

  return new Promise((resolve) => {
    const files = [];

    walker['on']('file', (root, fileStats, next) => {
      if (fileStats.name.match(/\.class$/)) {
        files.push(path.join(root, fileStats.name));
      }
      next();
    });
    walker['on']('end', () => resolve(files));
  });
}
