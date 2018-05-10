module.exports = {
	media_unit_to_real_unit,
	zpad
};

function media_unit_to_real_unit(media_uint) {
	return media_uint * 0x200;
}

function zpad(string, length) {
	string = String(string);
	length -= string.length;

	while (length --> 0) {
		string = '0' + string;
	}

	return string;
}