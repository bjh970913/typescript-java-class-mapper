import {FieldInfo, JavaClassFile, JavaClassFileReader as JCT, MethodInfo} from 'java-class-tools';

export class MediumClass {
  public static ignoredClasses: string[] = [];
  private static reader = new JCT();
  private rawData: JavaClassFile;

  constructor(public classPath: string) {
    this.rawData = MediumClass.reader.read(classPath);
  }

  get classAccessFlag() {
    return {
      ACC_PUBLIC: !!(this.rawData.access_flags & 0x0001),
      ACC_FINAL: !!(this.rawData.access_flags & 0x0010),
      ACC_SUPER: !!(this.rawData.access_flags & 0x0020),
      ACC_INTERFACE: !!(this.rawData.access_flags & 0x0200),
      ACC_ABSTRACT: !!(this.rawData.access_flags & 0x0400),
      ACC_SYNTHETIC: !!(this.rawData.access_flags & 0x1000),
      ACC_ANNOTATION: !!(this.rawData.access_flags & 0x2000),
      ACC_ENUM: !!(this.rawData.access_flags & 0x4000)
    };
  }

  get className() {
    return this.entryToString(this.getConstant(this.rawData.this_class)['name_index']);
  }

  get superClass() {
    return this.entryToString(this.getConstant(this.rawData.super_class)['name_index']);
  }

  get methodData(): {
    name: string;
    returnType: string;
    paramsTypes: string[];
  }[] {
    return this.rawData.methods.map(x => {
      const descriptor = this.entryToString(x.descriptor_index).match(/\(([^)]*)\)(.*)/);
      return {
        name: this.entryToString(x.name_index),
        returnType: this.parseJavaFieldDesc(descriptor[2], null, x),
        paramsTypes: descriptor[1].split(';').slice(0, -1).map((x) => this.parseJavaFieldDesc(x, null, null))
      };
    });
  }

  get fieldData(): {
    name: string;
    type: string;
    rawType: string;
  }[] {
    return this.rawData.fields.map(x => {
      return {
        name: this.entryToString(x.name_index),
        type: this.parseJavaFieldDesc(this.entryToString(x.descriptor_index), x, null),
        rawType: this.entryToString(x.descriptor_index)
      };
    });
  }

  get annotationData() {
    return (this.rawData.attributes.map(x => {
      return {a: this.entryToString(x.attribute_name_index), x};
    })
      .filter(x => {
        return x.a === 'RuntimeVisibleAnnotations';
      })
      .map(x => x.x)
      .map(x => {
        if (x['annotations']) {
          return x['annotations'];
        }
      })
      .map(x => {
        return x.map(y => Object.assign(y, {
          type: this.entryToString(y.type_index)
        }));
      })[0] || [])
      .map(y => {
        y.element_value_pairs = y.element_value_pairs && y.element_value_pairs.map(x => {
          // console.log(x);
          x.name = this.entryToString(x.element_name_index);
          const vk = Object.keys(x.element_value.value)[0];
          const value = x.element_value.value[vk];
          if (typeof value !== 'object') {
            x.value = this.entryToString(value);
          }
          return x;
        });
        return y;
      });
  }

  mediumTypeToTsType(str: string, fieldData: FieldInfo): string {
    const className = str.split('/').slice(-1)[0].replace(/;$/, '');
    if (MediumClass.ignoredClasses.filter(x => str.match(x) !== null).length !== 0 || str === '*') {
      // console.error('[skip] ', str);
      return 'any';
    }

    switch (str) {
      case 'java/lang/Boolean;':
        return 'boolean';
      case 'java/lang/String;':
      case 'java/lang/StringBuilder;':
        return 'string';
      case 'java/lang/Long;':
      case 'Ljava/lang/Long;':
      case 'java/lang/Integer;':
        return 'number';
      case 'java/time/LocalDate;':
      case 'java/time/LocalDateTime;':
      case 'java/time/LocalTime;':
        return 'Date';
      case 'java/lang/Class;':
        return 'any';
      case 'java/util/Set;':
      case 'java/util/List;':
      case 'java/util/ArrayList;':
      case 'java/util/Collection;':
        if (fieldData) {
          const signature = this.entryToString(fieldData.attributes[0]['signature_index'])
            .match(/.+<([^>]+)>/)[1];

          return this.mediumTypeToTsType(signature, null) + '[]'
        } else {
          return 'any[]';
        }
      case 'java/util/Map;':
      case 'java/util/HashMap;':
        if (fieldData) {
          const signature = this.entryToString(fieldData.attributes[0]['signature_index'])
            .match(/.+<([^>]+)>/)[1];
          if (signature === '*' || signature === 'TK;TV;') {
            return '{[key: string]: any}';
          }
          return `{[key: string]: ${this.mediumTypeToTsType(signature.split(';')[1], null)}}`;
        } else {
          return '{[key: string]: any}';
        }
    }
    if (className === '') {
      return 'any';
    }
    return className;
  }

  parseJavaFieldDesc(str: string, fieldData: FieldInfo, methodInfo: MethodInfo): string {
    const typeT = str[0];
    const type = str.slice(1);
    switch (typeT) {
      case 'B':
        return 'string';
      case 'V':
        return 'void';
      case 'C':
        return 'string';
      case 'D':
        return 'number';
      case 'F':
        return 'number';
      case 'I':
        return 'number';
      case 'J':
        return 'number';
      case 'L':
        return this.mediumTypeToTsType(type, fieldData);
      case 'S':
        return 'number';
      case 'Z':
        return 'boolean';
      case '[':
        return this.parseJavaFieldDesc(type, fieldData, methodInfo) + '[]';
    }
    return str;
  }

  private entryToString(entry: number) {
    const bytes = this.getConstant(entry)['bytes'];
    try {
      return decodeURIComponent(escape(String.fromCharCode.apply(null, bytes)));
    } catch (e) {
      return bytes;
    }
  }

  private getConstant(entry) {
    return this.rawData.constant_pool[entry];
  }
}