const fs = require('fs');
const Long = require('long');

const KEYS = require('../../keys.json');
const helpers = require('../../helpers');
const NCA_MAGIC3 = 'NCA3';
const AES = require('../../aes');
const AESCipherXTS = new AES('aes-128-xts', KEYS.header);

module.exports = parseNCA;

function parseNCA(path) {
	/*
		This section is not finished AT ALL
	*/

	const nca_stream = fs.openSync(path, 'r');
	const metadata = {};

	metadata.header = decryptHeader(nca_stream);
	for (let i = 0; i < 4; i++) {
		const entry = metadata.header.entries[i];
		if (entry.offset) {
			entry.offset = helpers.media_unit_to_real_unit(entry.offset);
			entry.size = helpers.media_unit_to_real_unit(entry.end) - entry.offset;
		}
	}

	let crypto_type = (metadata.header.crypto_type > metadata.header.crypto_type2 ? metadata.header.crypto_type2 : metadata.header.crypto_type);
	crypto_type--;

	const has_rights_id = !!(metadata.header.rights_id.toString() == '');
	if (has_rights_id) {
		decryptKeyArea(nca_stream, {
			crypto_type,
			encrypted_keys: metadata.header.encrypted_keys
		});
	} else {
		// Title key
	}
	
	return metadata;
}

function decryptHeader(nca_stream) {
	function header_section_entries(header_section) {
		const entries = [];
		for (let i = 0; i < 0x40; i+=0x10) {
			const entry = Buffer.from(header_section.subarray(i, i + 0x10));
			entries.push({
				offset: Buffer.from(entry.subarray(0, 0x04)).readUInt32LE(),
				end: Buffer.from(entry.subarray(0x04, 0x08)).readUInt32LE()
			});
		}

		return entries;
	}
	function header_section_hashes(header_section) {
		const hashes = [];
		for (let i = 0; i < 0x80; i+=0x20) {
			hashes.push(Buffer.from(header_section.subarray(i, i + 0x20)).toString('hex').toUpperCase());
		}

		return hashes;
	}
	function header_encrypted_keys(header_section) {
		const keys = [];
		for (let i = 0; i < 0x40; i+=0x10) {
			keys.push(Buffer.from(header_section.subarray(i, i + 0x10)).toString('hex').toUpperCase());
		}

		return keys;
	}
	function header_fs_sections(header_section) {
		const sections = [];
		for (let i = 0; i < 0x800; i+=0x200) {
			const section = Buffer.from(header_section.subarray(i, i + 0x200));
			const metadata = {
				partition_type: Buffer.from(section.subarray(0x2, 0x3)).readUInt8(),
				fs_type: Buffer.from(section.subarray(0x3, 0x04)).readUInt8(),
				crypto_type: Buffer.from(section.subarray(0x04, 0x5)).readUInt8()
			};

			switch (metadata.fs_type) {
				case 3:
					metadata.super_block = romfs_superblock(Buffer.from(section.subarray(0x08, 0x100)));
					break;
				default:
					break;
			}

			sections.push(metadata);
		}

		return sections;
	}
	function romfs_superblock(section) {
		function level(level) {
			return {
				offset: Buffer.from(level.subarray(0, 0x08)).readUInt32LE(),
				size: Buffer.from(level.subarray(0x08, 0x10)).readUInt32LE(),
				hash_block_size: Buffer.from(level.subarray(0x10, 0x14)).readUInt32BE()
			};
		}

		return {
			magic: Buffer.from(section.subarray(0, 0x04)).toString(),
			magic_num: Buffer.from(section.subarray(0x04, 0x08)).readUInt32LE(),
			master_hash_size: Buffer.from(section.subarray(0x08, 0x0C)).readUInt32LE(), // this is the correct area, but it never comes out right...
			level_count: Buffer.from(section.subarray(0x0C, 0x10)).readUInt8(),
			level1: level(Buffer.from(section.subarray(0x10, 0x28))),
			level2: level(Buffer.from(section.subarray(0x28, 0x40))),
			level3: level(Buffer.from(section.subarray(0x40, 0x58))),
			level4: level(Buffer.from(section.subarray(0x58, 0x70))),
			level5: level(Buffer.from(section.subarray(0x70, 0x88))),
			level6: level(Buffer.from(section.subarray(0x88, 0xA0))),
			master_hash: Buffer.from(section.subarray(0xC0, 0xE0)).toString('hex').toUpperCase()
		};
	}

	const encrypted_header = Buffer.alloc(0xC00);
	fs.readSync(nca_stream, encrypted_header, 0, 0xC00, 0);

	const header = AESCipherXTS.decrypt_xts(encrypted_header, 0xC00, 0x200);
	const MAGIC = Buffer.from(header.subarray(0x200, 0x200 + 0x04)).toString();

	if (MAGIC !== NCA_MAGIC3) {
		// I have yet to come accross a NCA2 file.
		// Because of that, I cannot test NCA2 decryption properly, and have not added support for it
		throw new Error(`Unexpected NCA magic number '${MAGIC}'. Expected ${NCA_MAGIC3}`);
	}

	return {
		fixed_key_sig: Buffer.from(header.subarray(0, 0x100)).toString('hex').toUpperCase(),
		npdm_key_sig: Buffer.from(header.subarray(0x100, 0x200)).toString('hex').toUpperCase(),
		magic: MAGIC,
		distribution: Buffer.from(header.subarray(0x204, 0x205)).readUInt8(),
		content_type: Buffer.from(header.subarray(0x205, 0x206)).readUInt8(),
		crypto_type: Buffer.from(header.subarray(0x206, 0x207)).readUInt8(),
		key_index: Buffer.from(header.subarray(0x207, 0x208)).readUInt8(),
		size: Buffer.from(header.subarray(0x208, 0x210)).readUInt32LE(),
		tid: helpers.zpad(Long.fromBytesLE(Buffer.from(header.subarray(0x210, 0x218))).toString(16), 16),
		sdk_version: [
			Buffer.from(header.subarray(0x21C, 0x220)).readUInt8(3), //major
			Buffer.from(header.subarray(0x21C, 0x220)).readUInt8(2), // minor
			Buffer.from(header.subarray(0x21C, 0x220)).readUInt8(1), // micro
			Buffer.from(header.subarray(0x21C, 0x220)).readUInt8()   // revision
		].join('.'),
		crypto_type2: Buffer.from(header.subarray(0x220, 0x221)).readUInt8(),
		rights_id: Buffer.from(header.subarray(0x230, 0x240)),
		entries: header_section_entries(Buffer.from(header.subarray(0x240, 0x280))),
		hashes: header_section_hashes(Buffer.from(header.subarray(0x280, 0x300))),
		encrypted_keys: header_encrypted_keys(Buffer.from(header.subarray(0x300, 0x340))),
		fs_sections: header_fs_sections(Buffer.from(header.subarray(0x400)))
	};
}

function decryptKeyArea(nca_stream, aes_settings) {
	// decrypt
}