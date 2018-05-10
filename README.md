# Node module for parsing several Switch (NX) file types

## install
```
npm i --save https://github.com/RedDuckss/NXReader
```

## Completed formats:
- [x] XCI (cartridge dumps)
- [ ] NCA (rom executable) (partly complete)
- [ ] NSO (rom executable) (seems to be mostly used for homebrew)
- [x] NRO (rom executable) (seems to be mostly used for homebrew)

**These 4 file formats are the only ones I am aware of. If any more exist I may add support for them later**

## API

## NXReader.parseXCI(path);
### Params:
> - path = path to XCI cartidge dump

## NXReader.parseNCA(path); (Incomplete. Only parses and decrypts NCA header)
### Params:
> - path = path to NCA rom executable

## NXReader.parseNRO(path);
### Params:
> - path = path to NRO rom executable


# Example:
```javascript
const NXReader = require('nxreader'); // Require lib

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
```