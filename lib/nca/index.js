const fs = require('fs');

const KEYS = require('../keys.json');
const helpers = require('../helpers');
const NCA_MAGIC3 = 'NCA3';
const AES = require('../aes');
const AESCipherXTS = new AES('aes-128-xts', KEYS.header);

module.exports = parseNCA;

function parseNCA(path_or_buff) {
	/*
		This section is not finished AT ALL
	*/

	const buffer = (path_or_buff instanceof Buffer ? path_or_buff : fs.readFileSync(path_or_buff));
	const metadata = {
		decrypted: {}
	};

	metadata.header = decryptHeader(buffer);
	for (let i = 0; i < 4; i++) {
		const entry = metadata.header.entries[i];
		if (entry.offset) {
			entry.offset = helpers.media_unit_to_real_unit(entry.offset);
			entry.size = helpers.media_unit_to_real_unit(entry.end) - entry.offset;
		}
	}
	
	return metadata;
}

function decryptHeader(buffer) {
	function header_section_entries(header_section) {
		const entries = [];
		for (let i = 0; i < 0x40; i+=0x10) {
			const entry = header_section.subarray(i, i + 0x10);
			entries.push({
				offset: entry.subarray(0, 0x04).readUInt32LE(),
				end: entry.subarray(0x04, 0x08).readUInt32LE()
			});
		}

		return entries;
	}
	function header_section_hashes(header_section) {
		const hashes = [];
		for (let i = 0; i < 0x80; i+=0x20) {
			hashes.push(header_section.subarray(i, i + 0x20).toString('hex').toUpperCase());
		}

		return hashes;
	}
	function header_encrypted_keys(header_section) {
		const keys = [];
		for (let i = 0; i < 0x40; i+=0x10) {
			keys.push(header_section.subarray(i, i + 0x10).toString('hex').toUpperCase());
		}

		return keys;
	}
	function header_fs_sections(header_section) {
		const sections = [];
		for (let i = 0; i < 0x800; i+=0x200) {
			const section = header_section.subarray(i, i + 0x200);
			const metadata = {
				partition_type: section.subarray(0x2, 0x3).readUInt8(),
				fs_type: section.subarray(0x3, 0x04).readUInt8(),
				crypto_type: section.subarray(0x04, 0x5).readUInt8()
			};

			switch (metadata.fs_type) {
				case 3:
					metadata.super_block = romfs_superblock(section.subarray(0x08, 0x100));
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
				offset: level.subarray(0, 0x08).readUInt32LE(),
				size: level.subarray(0x08, 0x10).readUInt32LE(),
				hash_block_size: level.subarray(0x10, 0x14).readUInt32BE()
			};
		}

		return {
			magic: section.subarray(0, 0x04).toString(),
			magic_num: section.subarray(0x04, 0x08).readUInt32LE(),
			master_hash_size: section.subarray(0x08, 0x0C).readUInt32LE(), // this is the correct area, but it never comes out right...
			level_count: section.subarray(0x0C, 0x10).readUInt8(),
			level1: level(section.subarray(0x10, 0x28)),
			level2: level(section.subarray(0x28, 0x40)),
			level3: level(section.subarray(0x40, 0x58)),
			level4: level(section.subarray(0x58, 0x70)),
			level5: level(section.subarray(0x70, 0x88)),
			level6: level(section.subarray(0x88, 0xA0)),
			master_hash: section.subarray(0xC0, 0xE0).toString('hex').toUpperCase()
		};
	}

	const header = AESCipherXTS.decrypt_xts(buffer, 0xC00, 0x200);
	const MAGIC = header.subarray(0x200, 0x200 + 0x04).toString();

	if (MAGIC !== NCA_MAGIC3) {
		// I have yet to come accross a NCA2 file.
		// Because of that, I cannot test NCA2 decryption properly, and have not added support for it
		throw new Error(`Unexpected NCA magic number '${MAGIC}'. Expected ${NCA_MAGIC3}`);
	}

	return {
		fixed_key_sig: header.subarray(0, 0x100).toString('hex').toUpperCase(),
		npdm_key_sig: header.subarray(0x100, 0x200).toString('hex').toUpperCase(),
		magic: MAGIC,
		distribution: header.subarray(0x204, 0x205).readUInt8(),
		content_type: header.subarray(0x205, 0x206).readUInt8(),
		crypto_type: header.subarray(0x206, 0x207).readUInt8(),
		key_index: header.subarray(0x207, 0x208).readUInt8(),
		size: header.subarray(0x208, 0x210).readUInt32LE(),
		tid: header.subarray(0x210, 0x218),
		sdk_version: [
			header.subarray(0x21C, 0x220).readUInt8(3), //major
			header.subarray(0x21C, 0x220).readUInt8(2), // minor
			header.subarray(0x21C, 0x220).readUInt8(1), // micro
			header.subarray(0x21C, 0x220).readUInt8()   // revision
		].join('.'),
		crypto_type2: header.subarray(0x220, 0x221).readUInt8(),
		rights_id: header.subarray(0x230, 0x240),
		entries: header_section_entries(header.subarray(0x240, 0x280)),
		hashes: header_section_hashes(header.subarray(0x280, 0x300)),
		encrypted_keys: header_encrypted_keys(header.subarray(0x300, 0x340)),
		fs_sections: header_fs_sections(header.subarray(0x400))
	};
}