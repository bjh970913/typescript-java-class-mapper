#!/usr/bin/env node

const {JavaClassFileReader} = require('java-class-tools');
const walk = require('walk');
const fs = require('fs');
const path = require('path');

function mapper(scanPath, out) {
    const clazzes = [];
    const walker = walk.walk(scanPath);
    walker.on('file', (root, fileStats, next) => {
        const className = fileStats.name.split('/').slice(-1)[0];
        if (fileStats.name.match(/^(?!Q)[^\$]+\.class/) !== null) {
            if (className.match(/^Q[A-Z]/) !== null) {
                return next();
            }
            clazzes.push(path.join(__dirname, root, fileStats.name));
        }
        next();
    });

    const a = {};
    const types = [];
    const reader = new JavaClassFileReader();

    module.exports = a;
    walker.on('end', () => {
        const enums = [];
        let all = clazzes
            .map(fileName => {
                const result = {
                    class: fileName.split('/').slice(-1)[0].replace('.class', ''),
                    fields: []
                };

                const classFile = reader.read(fileName);

                function entryToString(ent) {
                    if (!ent) {
                        return '';
                    }
                    return decodeURIComponent(escape(String.fromCharCode.apply(null, classFile.constant_pool[ent].bytes)));
                }

                function rawTypeMapper(rawType) {
                    switch (rawType) {
                        case '[B':
                        case '[C':
                            return 'string[]';
                        case 'C':
                        case 'ObjectId':
                        case 'String':
                            return 'string';
                        case 'I':
                        case 'Integer':
                        case 'F':
                        case 'Long':
                            return 'number';
                        case 'LocalDateTime':
                        case 'LocalDate':
                        case 'LocalTime':
                            return 'Date';
                        case 'DateTimeFormatter':
                        case 'WeekFields':
                        case 'TemporalField':
                        case 'JSONParser':
                        case 'ResultSet':
                        case 'AtomicReference':
                        case 'RestTemplate':
                        case 'Logger':
                        case 'ResponseErrorHandler':
                        case 'EntityManager':
                        case 'JPAQuery':
                        case 'BatchStatus':
                        case 'ProjectionFactory':
                        case 'ServerWebExchange':
                        case 'AtomicInteger':
                        case 'ReactiveMongoOperations':
                        case 'DiscoveryClient':
                        case 'ConfigurableEnvironment':
                        case 'AtomicBoolean':
                        case 'ObjectMapper':
                        case 'Throwable':
                        case 'AmazonS3Client':
                        case 'Exception':
                        case 'ApplicationContext':
                        case 'SmartValidator':
                        case 'DevicePlatform':
                        case 'CacheLoader':
                        case 'AntPathMatcher':
                        case 'Duration':
                        case 'XPayClient':
                        case 'StringTokenizer':
                        case 'ReadableUserAgent':
                        case 'GrantedAuthority':
                        case 'PrintWriter':
                        case 'MultipartFile':
                        case 'Socket':
                        case 'InputStream':
                        case 'Device':
                        case 'JSONObject':
                            return 'Object';
                        case 'J':
                        case 'Z':
                            return;
                        default:
                            return rawType;
                    }
                }

                if ((classFile.access_flags & 0x4000) === 0x4000) {
                    result.type = 'enum';

                    enums.push({
                        name: result.class,
                        mems: classFile.fields.map(x => {
                            return entryToString(x.name_index);
                        }).filter(x => x!=='$VALUES')
                    });

                    return null;
                }

                const methodOrFieldList = classFile.fields;

                methodOrFieldList.forEach(function (entry) {
                    // Convert to string
                    const name = entryToString(entry.name_index);
                    const descriptor = entryToString(entry.descriptor_index);

                    types.push(descriptor);

                    let ttt = descriptor.split('/').slice(-1)[0].replace(';', '');

                    let appedn = '';
                    if (ttt === 'List' || ttt === 'ArrayList' || ttt === 'Collection' || ttt === 'Set') {
                        ttt = entry.attributes.map(x => entryToString(x.signature_index))
                            .filter(x => x !== '')
                            .map(x => x.match(/(?:[^<]+)<(.+)>(?:[^>]+)/)[1].split('/').slice(-1)[0].replace(';', ''))[0];
                        ttt = ttt.replace(/<[^>]+>/, '');
                        appedn = '[]';
                    }

                    if (ttt === 'Map' || ttt === 'HashMap') {
                        const tmp = entry.attributes.map(x => entryToString(x.signature_index))
                            .filter(x => x !== '')[0]
                            .match(/<([^>]*)>/)[1]
                            .split(';')
                            .filter(x => x!=='')
                            .map(x => x.split('/').slice(-1)[0])
                            .map(x => rawTypeMapper(x));
                        // appedn = '[]';
                        ttt = `{(key: ${tmp[0]}): ${tmp[1]}}`;
                    }

                    if (ttt.match(/\$/)) {
                        return;
                    }

                    ttt = rawTypeMapper(ttt);
                    if (!ttt) {
                        return;
                    }

                    ttt += appedn;

                    result.fields.push({
                        name: name,
                        type: ttt
                    })
                });
                return result;
            })
            .filter(x => x !== null)
            .map(x => {
                return `interface ${x.class} {` + x.fields.map(y => {return `${y.name}: ${y.type};`;}).join('') +`}\n`;
            });

        all = all.concat(enums.map(x => {
            return `declare enum ${x.name} {`+ x.mems.join(`,`) +`}\n`
        }));

        fs.appendFileSync(out, all.join(''));

    });
}

module.exports = mapper;
