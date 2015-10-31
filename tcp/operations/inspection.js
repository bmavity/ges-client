var ensure = require('../../ensure')
	, inspectionDecision = Object.create(Object.prototype, {
			DoNothing: { value: 0 }
		, EndOperation: { value: 1 }
		, Retry: { value: 2 }
		, Reconnect: { value: 3 }
		, Subscribed: { value: 4 }
		})

module.exports = InspectionResult
module.exports.decision = inspectionDecision


function InspectionResult(decision, description, tcpEndpoint, secureTcpEndpoint) {
	if(!(this instanceof InspectionResult)) {
		return new InspectionResult(decision, description, tcpEndpoint, secureTcpEndpoint)
	}

	if(!tcpEndpoint) tcpEndpoint = null
	if(!secureTcpEndpoint) secureTcpEndpoint = null

	if(decision === inspectionDecision.Reconnect) {
    ensure.exists(tcpEndpoint, 'tcpEndpoint');
	} else if(tcpEndpoint !== null) {
    throw new Error('tcpEndpoint is not null for decision ' + decision)
  }

  Object.defineProperty(this, 'decision', { value: decision })
  Object.defineProperty(this, 'description', { value: description })
  Object.defineProperty(this, 'tcpEndpoint', { value: tcpEndpoint })
  Object.defineProperty(this, 'secureTcpEndpoint', { value: secureTcpEndpoint })
}
