import {MediumClass} from '../MediumClass';

export function SpringProjectionToInterFace(cc: MediumClass): string {
  const match = cc.annotationData.filter(x => x.type === 'Lorg/springframework/data/rest/core/config/Projection;');
  if (match.length === 0) {
    return '';
  }

  const annotationMeta = match[0];
  const className = cc.className.split('/').slice(-1)[0].replace(/;$/, '');
  return 'interface ' +
    // annotationMeta.element_value_pairs.filter(x => x.name === 'name')[0].value +
    className +
    ' {\n\t' +
    cc.methodData
      .filter(x => x.name.match(/get[A-Z0-9]/)).map(x => {
      return `${x.name.slice(3, 4).toLowerCase() + x.name.slice(4)}: ${x.returnType};`;
    }).join('\n\t') +
    '\n}';
}
