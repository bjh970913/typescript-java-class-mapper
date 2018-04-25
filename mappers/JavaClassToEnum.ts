import {MediumClass} from '../MediumClass';

export function JavaClassToEnum(cc: MediumClass): string {
  return 'declare enum ' +
    cc.className.split('/').slice(-1)[0].replace(/\$/g, '_') +
    ' {\n\t' +
    cc.fieldData.filter(x => x.name !== '$VALUES').map(x => x.name).join(',\n\t') +
    '\n}';
}
