
module.exports = function reverse(events) {
	return events.reduce(function(all, evt) {
		all.unshift(evt)
		return all
	}, [])
}