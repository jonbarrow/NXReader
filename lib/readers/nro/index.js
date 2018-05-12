const fs = require('fs');

module.exports = parseNRO;

function parseNRO(path) {
	const nro_stream = fs.openSync(path, 'r');
	const metadata = {};

	if (!isNRO(nro_stream)) {
		throw new Error('File not NRO');
	}

	metadata.start = parseStart(nro_stream);
	metadata.header = parseHeader(nro_stream);
	metadata.is_homebrew = isHomebrew(nro_stream);

	if (metadata.is_homebrew) {
		metadata.homebrew = getHomebrewMetadata(nro_stream);
	}

	return metadata;
}

function isNRO(nro_stream) {
	const header = Buffer.alloc(4);
	fs.readSync(nro_stream, header, 0, 4, 0x10);
	return header.toString() == 'NRO0';
}

function isHomebrew(nro_stream) {
	const size = getSize(nro_stream);
	const magic = Buffer.alloc(4);
	fs.readSync(nro_stream, magic, 0, 4, size);

	return magic.toString() == 'ASET';
}

function parseStart(nro_stream) {
	const start = Buffer.alloc(0x10);
	fs.readSync(nro_stream, start, 0, 0x10);

	return {
		MOD0_offset: Buffer.from(start.subarray(0x04, 0x08)).readUInt32LE()
	};
}

function parseHeader(nro_stream) {
	const header = Buffer.alloc(0x70);
	fs.readSync(nro_stream, header, 0, 0x70, 0x10);

	const metadata = {
		magic: Buffer.from(header.subarray(0, 0x04)).toString(),
		format_version: Buffer.from(header.subarray(0x04, 0x08)).readUInt32LE(),
		size: Buffer.from(header.subarray(0x08, 0x0C)).readUInt32LE(),
		flags: Buffer.from(header.subarray(0x0C, 0x10)),
		segment_headers: [
			segmentHeader(Buffer.from(header.subarray(0x10, 0x18))),
			segmentHeader(Buffer.from(header.subarray(0x18, 0x20))),
			segmentHeader(Buffer.from(header.subarray(0x20, 0x28)))
		],
		bss_size: Buffer.from(header.subarray(0x28, 0x2C)),
		build_id: Buffer.from(header.subarray(0x30, 0x50))
	};

	return metadata;
}

function segmentHeader(buffer) {
	return {
		file_offset: Buffer.from(buffer.subarray(0x00, 0x04)).readUInt32LE(),
		size: Buffer.from(buffer.subarray(0x04, 0x08)).readUInt32LE()
	};
}

function getHomebrewMetadata(nro_stream) {
	const size = getSize(nro_stream);
	const asset_header = Buffer.alloc(0x38);
	fs.readSync(nro_stream, asset_header, 0, 0x38, size);
	
	const metadata = {
		magic: Buffer.from(asset_header.subarray(0, 0x04)).toString(),
		format_version: Buffer.from(asset_header.subarray(0x04, 0x08)).readUInt32LE(),
		asset_section_headers: {
			icon: assetSectionHeader(Buffer.from(asset_header.subarray(0x08, 0x18))),
			nacp: assetSectionHeader(Buffer.from(asset_header.subarray(0x18, 0x28))),
			romfs: assetSectionHeader(Buffer.from(asset_header.subarray(0x28, 0x38)))
		}
	};

	return metadata;
}

function assetSectionHeader(buffer) {
	return {
		file_offset: readUInt64LE(Buffer.from(buffer.subarray(0x00, 0x08))),
		size: readUInt64LE(Buffer.from(buffer.subarray(0x08, 0x10)))
	};
}

function getSize(nro_stream) {
	const size = Buffer.alloc(4);
	fs.readSync(nro_stream, size, 0, 4, 0x18);
	return size.readUInt32LE();
}

function readUInt64LE(buffer, offset=0) {
	return (buffer.readUInt32LE(offset) << 8) + buffer.readUInt32LE(offset + 4);
}