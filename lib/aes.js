const crypto = require('crypto');

class AES {
	constructor(alg, key) {
		this.alg = alg;
		this.key = key;
	}

	get_nintendo_tweak(sector) {
		const tweak = new Uint8Array(16);
		for (let i = 15; i >= 0; i--) {
			tweak[i] = (sector & 255);
			sector >>= 8;
		}
	
		return tweak;
	}

	decrypt(chunk, sector) {
		const tweak = this.get_nintendo_tweak(sector);
		const decipher = crypto.createDecipheriv(this.alg, Buffer.from(this.key, 'hex'), tweak);
	
		return Buffer.concat([
			decipher.update(chunk),
			decipher.final()
		]);
	}
	
	decrypt_xts(source, length, chunk_size, current_sector=0) {
		const final = [];
		for (let i = 0; i < length; i += chunk_size) {
			final.push(this.decrypt(source.subarray(i, i + chunk_size), current_sector));
			current_sector++;
		}
	
		return Buffer.concat(final);
	}
}

module.exports = AES;