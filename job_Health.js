/*
node -e "console.log(require('nodenodenode')())" /jobs="['Health']"
node -e "console.log(require('./nodenodenode')())" /jobs="['Health']"

node -e "require('./nodenodenode')()" /jobs="['Health']" /ws_port=3333 /debug=2 /logic=eglogic
*/

module.exports = Application=>{
	const {
		logger,Q
	}=Application;

	let server_id = Application.server_id || process.pid;

	return {
		Preempt_Promise(){
			var rt={STS:"OK"};
			logger.log('TODO job_Health',server_id);
			//throw new Error('WTF');
			rt.sleepTime=3456;
			return Q(rt);
		}
		,__filename };
}

