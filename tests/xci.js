const NXReader = require('../'); // Require lib

console.time('XCI Parser');
// Parse cart dump
const XCI = NXReader.parseXCI(`${__dirname}/bbb-h-aaaca.xci`);
console.timeEnd('XCI Parser');

console.log(XCI);