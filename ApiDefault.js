var Application, Server, session, db, logger; //static class variables;
module.exports = class /*extends require('./ClassApi') */ {
	constructor(_Application, _Server) {
		//super(_Application, _Server);
		Application = this.Application = _Application || {};
		Server = this.Server = _Server || {};
		session = Server.session;
		db = Application.db;
		logger = Application.logger;
	}

	PingPong(param) {
		var {
			ping
		} = param || {}, pong = (new Date()).getTime(), diff = pong - ping;
		return {
			ping,
			pong,
			diff
		};
	}

	GetVersion() {
		var {
			getTimeStr,
			fs
		} = this.Application;
		return {
			filename: require('path').basename(__filename),
			filetime: getTimeStr(fs.statSync(__filename).mtime)
		};
	}
	// static get __filename() {
	//     return __filename;
	// }
};

