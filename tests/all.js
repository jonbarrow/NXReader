const NXReader = require('../'); // Require lib

console.time('XCI Parser');
// Parse cart dump
const XCI = NXReader.parseXCI(`${__dirname}/SuperMarioOdyssey.xci`);
console.timeEnd('XCI Parser');

console.log(XCI);

console.time('NCA Parser');
// Parse NCA executable
const NCA = NXReader.parseNCA(`${__dirname}/SuperMarioOdyssey.nca`);
console.timeEnd('NCA Parser');

console.log(NCA);

console.time('NRO Parser');
// Parse NRO executable
const NRO = NXReader.parseNRO(`${__dirname}/kgdoom.nro`);
console.timeEnd('NRO Parser');

console.log(NRO);