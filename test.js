const fs = require('fs');
const NXReader = require('./'); // Require lib

// Parse cart dump
const XCI = NXReader.parseXCI('./bbb-h-aaaca.xci');

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
		const file_offset = (partition.offset + partition.name_table_size) + (0x10 + 0x40 * partition.file_count);
		
		// Allocate the buffer and store the file
		const nca_buffer = Buffer.alloc(file.size);
		fs.readSync(rom_stream, nca_buffer, 0, file.size, file_offset);

		// Parse it
		// (this is unfinished, and does not work yet)
		const NCA = NXReader.parseNCA(nca_buffer);
		// Extract the image(s)
		
		console.log(NCA.decrypted.header);
	}
}

//console.log(XCI);