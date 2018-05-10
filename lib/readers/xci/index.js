const fs = require('fs');
const struct = require('python-struct');

const CARTS = require('../../cart_types');

module.exports = parseXCI;

function parseXCI(path) {
	const xci_stream = fs.openSync(path, 'r'); // Open the stream
	const metadata = { // Default metadata
		cart_size: 0,
		partitions: {}
	};

	// Get the cartridge type and store it
	// 0xF8 = 2 GB
	// 0xF0 = 4 GB
	// 0xE0 = 8 GB
	// 0xE1 = 16 GB
	// 0xE2 = 32 GB
	const cart_type = Buffer.alloc(0x1);
	fs.readSync(xci_stream, cart_type, 0, 0x1, 0x10D);
	switch (cart_type.readUInt8()) {
		case CARTS['2GB']: metadata.cart_size = '2 GB'; break;
		case CARTS['4GB']: metadata.cart_size = '4 GB'; break;
		case CARTS['8GB']: metadata.cart_size = '8 GB'; break;
		case CARTS['16GB']: metadata.cart_size = '16 GB'; break;
		case CARTS['32GB']: metadata.cart_size = '32 GB'; break;
		default:
			break;
	}

	// Get the offset for the roms Root partition
	const root_buffer = Buffer.alloc(0x8);
	fs.readSync(xci_stream, root_buffer, 0, 0x8, 0x130);
	const FS_OFFSET = struct.unpack('<Q', root_buffer)[0].toNumber();

	metadata.partitions.root = parsePartition(xci_stream, FS_OFFSET);

	// parse the other 3 partitions
	for (const partition of metadata.partitions.root.files) {
		const partition_offset = FS_OFFSET + partition.offset;
		metadata.partitions[partition.name] = parsePartition(xci_stream, partition_offset);
	}

	return metadata;
}

function parsePartition(stream, offset) {
	const metadata = {
		offset,
		files: []
	};

	const header_check = Buffer.alloc(0x4);
	fs.readSync(stream, header_check, 0, 0x4, offset);
	if (header_check.toString() !== 'HFS0') {
		throw new Error(`Error reading rom. Invalid Root Partition offset: ${offset}. Expected MAGIC 'HFS0', got '${header_check.toString()}'`);
	}

	// Store the partition header, to get the offsets of the other files
	// HFS0_header[0] = magic
	// HFS0_header[1] = number of files in partition
	// HFS0_header[2] = name table size
	// HFS0_header[3] = rest
	let HFS0_header = Buffer.alloc(0x10);
	fs.readSync(stream, HFS0_header, 0, 0x10, offset);
	HFS0_header = struct.unpack('<IIII', HFS0_header);
	
	// Parse the partition
	const name_table = Buffer.alloc(HFS0_header[2]);
	fs.readSync(stream, name_table, 0, HFS0_header[2], (offset + (0x10 + 0x40 * HFS0_header[1])));
	
	offset += 0x10;
	for (let i=0;i<HFS0_header[1];i++) {
		let file_metadata = Buffer.alloc(0x40);
		fs.readSync(stream, file_metadata, 0, 0x40, offset);
		file_metadata = struct.unpack('<QQIIII32s', file_metadata);
		file_metadata = {
			offset: 0x10 + 0x40 * HFS0_header[1] + HFS0_header[2] + (file_metadata[0].toNumber()),
			size: file_metadata[1].toNumber(),
			name_offset: file_metadata[2],
			hash_size: file_metadata[3],
			unknown1: file_metadata[4],
			unknown2: file_metadata[5],
			hash: file_metadata[6]
		};

		file_metadata.name = name_table.toString().substr(file_metadata.name_offset).split('\0')[0];
		file_metadata.type = file_metadata.name.split('.').slice(1).join('.');

		metadata.files.push(file_metadata);

		offset += 0x40;
	}

	metadata.name_table = name_table.toString();
	metadata.name_table_size = HFS0_header[2];
	metadata.file_count = HFS0_header[1];
	metadata.remaining = HFS0_header[3];

	return metadata;
}