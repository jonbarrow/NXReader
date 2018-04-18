module.exports = {
	media_unit_to_real_unit
};

function media_unit_to_real_unit(media_uint) {
	return media_uint * 0x200;
}