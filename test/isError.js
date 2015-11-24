
module.exports = function(obj) {
	return Object.prototype.toString.call(obj) === '[object Error]'
}
