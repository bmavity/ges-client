var is = require('is')

module.exports = {
	exists: function(val, name) {
		if(is.undef(val) || is.nil(val)) {
			throw new Error('Parameter ' + name + ' is null or undefined')
		}
	}
, isFn: function(val, name) {
		this.exists(val, name)
		if(!is.fn(val)) {
			throw new Error('Parameter ' + name + ' is not a function')
		}
	}
}