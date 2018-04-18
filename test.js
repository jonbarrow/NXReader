const fs = require('fs');
const NXReader = require('./'); // Require lib

console.time('Parser');
// Parse cart dump
const XCI = NXReader.parseXCI('./bbb-h-aaaca.xci');
console.timeEnd('Parser');

// Function used for extracting dumps icon
for (const file of XCI.partitions.normal.files) {
	// Open the stream
	// We do this to read the NCA from the file without loading the whole file into memory
	const rom_stream = fs.openSync('./bbb-h-aaaca.xci', 'r');

	// Find the `NCA` in the `normal` partition
	// this file holds all the rom icons
	if (file.type == 'nca') {
		// Calculate the files offset
		const partition = XCI.partitions.normal;
		const file_offset = (partition.offset + file.offset);
		
		// Allocate the buffer and store the file
		const nca_buffer = Buffer.alloc(file.size);
		fs.readSync(rom_stream, nca_buffer, 0, file.size, file_offset);

		// Parse it
		// (this is unfinished, and does not work yet)
		const NCA = NXReader.parseNCA('./test.nca');
		
		console.log(NCA.header);
	}
}

console.log(XCI);