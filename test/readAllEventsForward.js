var ges = require('../')

ges(function(err, con) {
	con.readAllEventsForward()
})