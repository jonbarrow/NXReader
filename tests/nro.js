const NXReader = require('../'); // Require lib

console.time('NRO Parser');
// Parse NRO executable
const NRO = NXReader.parseNRO(`${__dirname}/MysteryOfSolarusDX.nro`);
console.timeEnd('NRO Parser');

console.log(NRO);