import {findClasses} from './FindClasses';
import {MediumClass} from './MediumClass';
import {JavaClassToEnum} from './mappers/JavaClassToEnum';
import {JavaClassToInterFace} from './mappers/JavaClassToInterFace';
import * as fs from 'fs';

const all_types_exists: string[] = [];
const all_types_references: string[] = [];

MediumClass.ignoredClasses = [
  'org/springframework',
  'java/util/Locale;',
  'java/lang/Object;',
  'org/json/simple/JSONObject;',
  'org/aspectj',
  'com/fasterxml/jackson',
  'com/showdownstudio/showdown/util/collection/TimeOutMap',
  'com/querydsl',
  'java/util/StringTokenizer;',
  'java/net/Socket;',
  'org/slf4j/Logger;',
  'javax/persistence/EntityManager;',
  'lgdacom/XPayClient',
  'org/json/simple/parser/JSONParser;',
  'com/google/common/cache/Cache',
  'com/amazonaws',
  'java/io',
  'java/sql',
  'java/lang/Throwable;',
  'java/lang/Exception;',
  'java/security',
  'Ljava/util/concurrent/atomic/AtomicReference;',
  'java/time/temporal',
  'DateTimeFormatter',
  'java/util/concurrent/atomic',
  'net/sf/uadetector/ReadableUserAgent;',
  'HttpSession'
];

Promise.all([
  findClasses('../../SDST/gymhub-reverse-proxy'),
  findClasses('../../SDST/gymhub-core-model'),
  findClasses('../../SDST/showdown-user-core'),
  findClasses('../../SDST/showdown-user'),
  findClasses('../../SDST/showdown-util'),
  findClasses('../../SDST/showdown-pay'),
  findClasses('../../SDST/showdown-security'),
  // findClasses('../../SDST/gymhub-reverse-proxy/target/classes'),
])
  .then(all => [].concat.apply([], all))
  .then((x: string[]) => x.map(y => new MediumClass(y)))
  .then(y => {
    return y.map(cc => {
      all_types_exists.push('L' + cc.className + ';');

      cc.fieldData
        .filter(x => all_types_references.indexOf(x.rawType) === -1 && x.type.match(/any|string|number|boolean|Date/) === null)
        .map(x => x.rawType)
        .map(x => x.replace(/^\[/, ''))
        .forEach(x => all_types_references.push(x));

      if (cc.classAccessFlag.ACC_ENUM) {
        return JavaClassToEnum(cc);
      } else {
        return JavaClassToInterFace(cc);
      }
    }).join('\n\n');
  })
  .then(buff => {
    console.log(all_types_references.filter(x => all_types_exists.indexOf(x) === -1));

    fs.writeFileSync('./typings.ts', buff);
  });