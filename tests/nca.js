const NXReader = require('../'); // Require lib

console.time('NCA Parser');
// Parse NCA executable
const NCA = NXReader.parseNCA(`${__dirname}/test.nca`);
console.timeEnd('NCA Parser');

console.log(NCA);