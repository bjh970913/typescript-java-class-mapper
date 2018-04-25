import {MediumClass} from '../MediumClass';
import {SpringProjectionToInterFace} from './SpringProjectionToInterFace';

const setting = {
  processSpringProjection: true
};

export function JavaClassToInterFace(cc: MediumClass): string {
  if (setting.processSpringProjection) {
    const tmp = SpringProjectionToInterFace(cc);
    if (tmp !== '') {
      return tmp;
    }
  }

  return 'interface ' +
    cc.className.split('/').slice(-1)[0].replace(/\$/g, '_') +
    ' {\n\t' +
    cc.fieldData.filter(x => x.type.indexOf('$') === -1).map(x => `${x.name}: ${x.type};`).join('\n\t') +
    '\n}';
}