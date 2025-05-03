import { advplGenerator } from './advplGenerator.js';
import { queryGenerator } from './queryGenerator.js';
import { Files, readInput } from './src/files/files.js';

(async () => {
    const sb1 = readInput('sb1');
    const sb5 = readInput('sb5');
    const data = []
    const dataNotExists = []

    sb5.forEach(row => {
        const Produto = row["Produto     "];
        const _item = sb1.find(item => item["Codigo      "] === Produto)
        if (_item) {
            data.push({
                ...row,
                ..._item
            })
        } else {
            dataNotExists.push(row)
        }
    })

    const CamposReplace = {
        'Altura      ': 'Alt/Comp    ',
        'Comprimento ': 'Alt/Comp    ',
        'Largura     ': 'Largura     ',
        'Requadro    ': 'Req/Esp.    ',
        'Espessura   ': 'Req/Esp.    ',
    }

    const interacaoes = [
        {
            grupo: ["0112"],
            tipo: ["EM"],
            'Altura      ': "Finder,1,MM",
            'Comprimento ': "",
            'Largura     ': "",
            'Espessura   ': "",
            'Requadro    ': "",
            regex: function extractFourAndThreeDigits(text) {
                const regex = /(\d{4})\s*X\s*(\d{3})/g;
                const [data] = [...text.matchAll(regex)].map(match => [match[1], match[2]]);
                return data
            }
        },
        {
            grupo: ["0113"],
            tipo: ["EM"],
            'Altura      ': "",
            'Comprimento ': "",
            'Largura     ': "Finder,1,MM",
            'Espessura   ': "Finder,2,MM",
            'Requadro    ': "",
            regex: function extractTwoNumbers(text) {
                const regex = /([\d.]+)MM\s*X\s*([\d,]+)/g;
                const [data] = [...text.matchAll(regex)].map(match => [match[1], match[2]]);
                return data
            }
        },
        {
            grupo: ["0122"],
            tipo: ["EM"],
            'Altura      ': "",
            'Comprimento ': "Alt/Comp    ",
            'Largura     ': "Largura     ",
            'Espessura   ': "Req/Esp.    ",
            'Requadro    ': "",
        },
        {
            grupo: ["0099"],
            tipo: ["MC"],
            'Altura      ': "",
            'Comprimento ': "",
            'Largura     ': "Largura     ",
            'Espessura   ': "Req/Esp.    ",
            'Requadro    ': "Finder,1,CM",
            regex: function extractReqNumbers(text) {
                const regex = /REQ\.(\d+)/g;
                const matches = [...text.matchAll(regex)].map(match => match[1]);
                return matches
            },
        },
        {
            grupo: ["0001", "0002", '0003', '0004', '0010', '0011', '0020', '0021', '0097', '0098'],
            tipo: ["ME"],
            'Altura      ': "Alt/Comp    ",
            'Comprimento ': "",
            'Largura     ': "Largura     ",
            'Espessura   ': "",
            'Requadro    ': "Req/Esp.    ",
        },
        {
            grupo: [
                "0200",
                "0201",
                "0202",
                "0203",
                "0204",
                "0210",
                "0211",
            ],
            tipo: ["MP"],
            'Altura      ': "",
            'Comprimento ': "",
            'Largura     ': "Largura     ",
            'Espessura   ': "Req/Esp.    ",
            'Requadro    ': ""
        },
        {
            grupo: [
                "0220",
                "0221",
                "0222",
                "0223",
            ],
            tipo: ["MP"],
            'Altura      ': "",
            'Comprimento ': "Alt/Comp    ",
            'Largura     ': "",
            'Espessura   ': "",
            'Requadro    ': ""
        },
        {
            grupo: [
                "0500",
                "0501",
                "0502",
            ],
            tipo: ["PI"],
            'Altura      ': "",
            'Comprimento ': "Alt/Comp    ",
            'Largura     ': "",
            'Espessura   ': "",
            'Requadro    ': ""
        },
        {
            grupo: [
                "0902",
            ],
            tipo: ["SV"],
            'Altura      ': "",
            'Comprimento ': "Alt/Comp    ",
            'Largura     ': "",
            'Espessura   ': "",
            'Requadro    ': ""
        },
        {
            grupo: ["0111"],
            tipo: ["OI"],
            'Altura      ': "",
            'Comprimento ': "Finder,3,MM",
            'Largura     ': "Finder,2,MM",
            'Espessura   ': "Finder,1,MM",
            'Requadro    ': "",
            regex: function extractThreeNumbers(text) {
                text = text.replace(/MM/g, '').split("*")[0];
                const pattern = /.*?(\d+)\D+(\d+)\D+(\d+)(?!.*\d)/;
                const match = text.match(pattern);
                return match ? match.slice(1, 4).map(Number).sort((a, b) => a - b).map(e => String(e)) : null;
            }
        },
        {
            grupo: ["0125"],
            tipo: ["OI"],
            'Altura      ': "",
            'Comprimento ': "Finder,1,MM",
            'Largura     ': "Finder,2,MM",
            'Espessura   ': "Finder,3,MM",
            'Requadro    ': "",
            regex: function extractDimensions(str) {
                const dimensionPattern = /(\d{3,4},?\d*)[Xx](\d{2,3},?\d*)[Xx](\d{2,3},?\d*)/g;
                let dimensionsArray = [];
                let match;
                while ((match = dimensionPattern.exec(str)) !== null) {
                    dimensionsArray.push([
                        parseFloat(match[1].replace(',', '.')),
                        parseFloat(match[2].replace(',', '.')),
                        parseFloat(match[3].replace(',', '.'))
                    ]);
                }
                return dimensionsArray[0]?.map(e => String(e));
            }
        },
        {
            grupo: ["0132", "0135", "0136", "0138", "0105"],
            tipo: ["OI"],
            'Altura      ': "Alt/Comp    ",
            'Comprimento ': "",
            'Largura     ': "Largura     ",
            'Espessura   ': "Req/Esp.    ",
            'Requadro    ': "",
        },
        {
            grupo: [
                "0003",
                "0020",
                "0021",
                "0304",
                "0305",
                "0309",
                "0310",
                "0313",
                "0314",
                "0407",
                "0408",
                "0412",
                "0500",
                "0502",
                "0507",
                "0602",
                "0311",
                "0409",
                "0505",
                "0606"
            ],
            tipo: ["PI"],
            'Altura      ': "Finder,1,CM",
            'Comprimento ': "",
            'Largura     ': "Finder,2,CM",
            'Espessura   ': "",
            'Requadro    ': "Finder,3,CM",
            regex: function extractDimensions(text) {
                const line = text;
                const regex = /(\d+)X(\d+)\s+(?:REQ\.|R\.)(\d+)/gi;
                const lineMatchesArray = [];
                let match;
                while ((match = regex.exec(line)) !== null) {
                    const num1 = match[1];
                    const num2 = match[2];
                    const num3 = match[3];
                    lineMatchesArray.push([num1, num2, num3]);
                }
                const result = lineMatchesArray[0]
                return result?.length === 3 ? result : null;
            },
        },
        {
            grupo: [
                "0001",
                "0002",
                "0003",
                "0004",
                "0010",
                "0011",
                "0020",
                "0021",
            ],
            tipo: ["PA"],
            'Altura      ': "Alt/Comp    ",
            'Comprimento ': "",
            'Largura     ': "Largura     ",
            'Espessura   ': "",
            'Requadro    ': "Req/Esp.    ",
        },
        {
            grupo: [
                "0223",
            ],
            tipo: ["PI"],
            'Altura      ': "Alt/Comp    ",
            'Comprimento ': "",
            'Largura     ': "",
            'Espessura   ': "",
            'Requadro    ': "",
        },
        {
            grupo: [
                "0301",
                "0401"
            ],
            tipo: ["PI"],
            'Altura      ': "",
            'Comprimento ': "",
            'Largura     ': "",
            'Espessura   ': "Req/Esp.    ",
            'Requadro    ': "",
        },
        {
            grupo: [
                "0302",
                "0402"
            ],
            tipo: ["PI"],
            'Altura      ': "",
            'Comprimento ': "",
            'Largura     ': "Largura     ",
            'Espessura   ': "Req/Esp.    ",
            'Requadro    ': "",
        },
        {
            grupo: [
                "0303",
                "0403",
                "0306",
                "0307",
                "0406"
            ],
            tipo: ["PI"],
            'Altura      ': "",
            'Comprimento ': "Alt/Comp    ",
            'Largura     ': "Largura     ",
            'Espessura   ': "Req/Esp.    ",
            'Requadro    ': "",
        },
        {
            grupo: [
                "0308",
            ],
            tipo: ["PI"],
            'Altura      ': "Alt/Comp    ",
            'Comprimento ': "",
            'Largura     ': "Largura     ",
            'Espessura   ': "",
            'Requadro    ': "Finder,3,CM",
            regex: function extractDimensions(text) {
                const line = text;
                const regex = /(\d+)X(\d+)\s+(?:REQ\.|R\.)(\d+)/gi;
                const lineMatchesArray = [];
                let match;
                while ((match = regex.exec(line)) !== null) {
                    const num1 = match[1];
                    const num2 = match[2];
                    const num3 = match[3];
                    lineMatchesArray.push([num1, num2, num3]);
                }
                const result = lineMatchesArray[0]
                return result?.length === 3 ? result : null;
            },
        }
    ]
    const result = {}
    let number = 0

    interacaoes.forEach((interacao, _index) => {
        let tabelaName = `${_index}-`

        Object.entries(interacao).forEach(([key, value]) => {
            if (key == "tipo") {
                value.forEach(item => {
                    tabelaName += `${item} `
                })
            }
            if (key == "Altura      " && value) {
                tabelaName += "Ax"
            }
            if (key == "Comprimento " && value) {
                tabelaName += "Cx"
            }
            if (key == "Largura     " && value) {
                tabelaName += "Lx"
            }
            if (key == "Espessura   " && value) {
                tabelaName += "Ex"
            }
            if (key == "Requadro    " && value) {
                tabelaName += "Rx"
            }
        })
        tabelaName = tabelaName.substring(0, tabelaName.length - 1)


        const dataFiltred = data.filter(row => (
            interacao.grupo.includes(row["Grupo       "]) ||
            interacao.grupo === "") &&
            (interacao.tipo.includes(row["Tipo        "]) || interacao.tipo === ""))

        number += dataFiltred.length + 1

        if (_index === 12) {
            console.log(_index, interacao, data.length, dataFiltred.length)
        }
        dataFiltred.forEach(row => {
            let produto = row["Produto     "]
            const nome = row["Nome Cientif"]
            const grupo = row["Grupo       "]
            const tipo = row["Tipo        "]
            const _data = {
                Produto: produto,
                Descrução: nome,
                Grupo: grupo,
                Tipo: tipo,
            }
            Object.entries(interacao).forEach(([key, value]) => {

                if (key == "grupo" || key == "tipo" || key == "unit" || key == "regex") {
                    return
                }
                if (interacao[key] && typeof interacao[key] === "string" && interacao[key].includes("Finder")) {
                    const valueExists = row[CamposReplace[key]]
                    if (valueExists) {
                        _data[key] = valueExists
                    } else {
                        const [_, index, unit] = interacao[key].split(",")
                        const regexIndex = Number(index)
                        const extract = interacao.regex(nome)
                        if (extract) {
                            let value = extract[regexIndex - 1]
                            if (typeof extract[regexIndex - 1] === "string") {
                                value = value.replace(".", "").replace(",", ".")
                                value = Number(value)
                                if (unit === "MM") {
                                    value = value / 1000
                                } else if (unit === "CM") {
                                    value = value / 100
                                }
                                _data[key] = value
                            } else {
                                _data[key] = ""
                            }
                        } else {
                            _data[key] = ""
                        }
                    }
                } else {
                    const dataRow = row[interacao[key]]
                    _data[key] = dataRow
                }
            })

            if (!result[tabelaName]) {
                result[tabelaName] = []
            }

            result[tabelaName].push(_data)
        })
        console.log(_index, tabelaName, result[tabelaName] && result[tabelaName].length)
    })
    const saves = new Files("resultado");

    const original = data.map(row => {
        let produto = row["Produto     "];
        let altura = row["Alt/Comp    "];
        let largura = row["Largura     "];
        let espessura = row["Req/Esp.    "];
        let descrGrupo = row["Descr. Grupo"];
        let grupo = row["Grupo       "];
        let tipo = row["Tipo        "];
        let nome = row["Nome Cientif"];
        return {
            "Produto": produto,
            "Nome": nome,
            "Tipo": tipo,
            "Grupo": grupo,
            "Descr. Grupo": descrGrupo,
            "Alt/Comp": altura,
            "Largura": largura,
            'Req/Esp': espessura,
            "Espessura": ""
        }
    })

    //console.log(result)
    let total = 0
    let outputData = []


    advplGenerator.emptyFile()
    const start = advplGenerator.generateStartFile()
    advplGenerator.addDataToFile(start)

    Object.entries(result).forEach(([key, value]) => {

        const addEmbalagem = value.map(row => {
            const obj = row
            Object.entries(row).forEach(([key2, value2]) => {
                if (key2 == "Altura      ") {
                    if (value2) {
                        obj["AlturaCX"] = value2 + 0.01
                    } else {
                        obj["AlturaCX"] = ""
                    }
                } else if (key2 == "Comprimento ") {
                    if (value2) {
                        obj["ComprimentoCX"] = value2 + 0.01
                    } else {
                        obj["ComprimentoCX"] = ""
                    }
                } else if (key2 == "Largura     ") {
                    if (value2) {
                        obj["LarguraCX"] = value2 + 0.01
                    } else {
                        obj["LarguraCX"] = ""
                    }
                } else if (key2 == "Espessura   ") {
                    if (value2) {
                        obj["EspessuraCX"] = value2 + 0.01
                    } else {
                        obj["EspessuraCX"] = ""
                    }
                } else if (key2 == "Requadro    ") {
                    if (value2) {
                        obj["RequadroCX"] = value2 + 0.01
                    } else {
                        obj["RequadroCX"] = ""
                    }
                }
            })
            return obj

        })
        total += value.length

        if (value) {
            outputData.push(...addEmbalagem)
            saves.createWorksheet(addEmbalagem, key)

            const numberOfChunks = queryGenerator.processLargeDataset(value, key);
            console.log(`Processed ${numberOfChunks} chunks`);
            advplGenerator.processLargeDataset(value, key);
        }
    })

    const end = advplGenerator.finally()
    advplGenerator.addDataToFile(end)
    console.log("Total de entrada: ", data.length)
    console.log('total de saidas', total)

    saves.createWorksheet(outputData, "Todas as saidas")
    saves.createWorksheet(original, "Dados Originais")
    saves.saveOutput()

    // Generate queries



    console.log("Processamento concluído. O arquivo resultado.xlsx foi salvo.");
})()

