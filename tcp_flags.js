var is = require('is')
	, flags = {
			None: 0x00,
      Authenticated: 0x01,
		}
	, codes = Object.keys(flags).reduce(function(all, flag) {
			var code = flags[flag]
			all[code] = flag
			return all
		}, {})

module.exports = function getFlagOrCode(flagOrCode) {
	console.log(flagOrCode, flags[flagOrCode])
	return is.string(flagOrCode) ? flags[flagOrCode] : codes[flagOrCode]
}

