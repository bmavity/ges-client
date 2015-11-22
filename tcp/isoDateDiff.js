
module.exports = diff

function diff(d1, d2) {
	return Date.parse(d1) - Date.parse(d2)
}

module.exports.fromNow = function(d) {
	return diff(new Date().toISOString(), d)
}
