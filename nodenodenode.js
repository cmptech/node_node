/*
 * daemon()
 *        server_host/server_port=>http server
 *  [TODO] https_host/https_port=>https server
 *  [TODO] ws_host/ws_port =>web-socket server
 */
var logger=console;//default logger
var nodenodenode=module.exports={
	argv2o:argv=>{
		var m,mm,rt={};
		for(k in argv)(m=(rt[""+k]=argv[k]).match(/^--?([a-zA-Z0-9-_]*)=(.*)/))&&(rt[m[1]]=(mm=m[2].match(/^".*"$/))?mm[1]:m[2]);
		return rt;
	}
	,daemon:argo=>{
		if(!argo){
			if(typeof(global)!='undefined'){
				if(typeof(nw)!='undefined'){
					argo=nodenodenode.argv2o(nw.App.argv);
				}else{
				}
			}else{
				argo=nodenodenode.argv2o(process.argv);
			}
		}
		logger.log(JSON.stringify(argo));
		process.env.UV_THREADPOOL_SIZE = argo.UV_THREADPOOL_SIZE || 126;//MAX=255, increase the thread pool for uv_queue_work()

		logger.log(process.env);
		logger.log("process.versions=",process.versions);

		if(!argo.app) throw new Error('-app is needed');
		var appModule=require(argo.app)({argo});

		////////////////////////////////////////////////////////// HTTP
		var server_host=argo.server_host||argo.h||'0.0.0.0',server_port=argo.server_port||argo.p;
		//||(()=>{
		//throw new Error("-server_port is mandatory")
		//})();
		//var http_server=require('http').createServer(appModule({argo}));
		if(server_port){
			if(!appModule.handleHttp) throw new Exception('appModule.handleHttp is not defined.');
			argo.http_server=require('http').createServer(appModule.handleHttp);//let the internal logic can access
			argo.http_server.listen(server_port,server_host,()=>{logger.log('http listen on ',server_host,':',server_port)});
		}

		////////////////////////////////////////////////////////// HTTPS
		var https_host=argo.https_host||'0.0.0.0',https_port=argo.https_port;
		if(https_port){
			if(!appModule.handleHttps) throw new Exception('appModule.handleHttps is not defined.');
			var https_key=argo.https_key;
			var https_cert=argo.https_cert;
			const options = {
				key: fs.readFileSync(https_key),
				cert: fs.readFileSync(https_cert)
			};
			argo.https_server=require('https').createServer(appModule.handleHttps);//let the internal logic can access
			argo.https_server.listen(server_port,server_host,()=>{logger.log('https listen on ',https_host,':',https_port)});
		}

		////////////////////////////////////////////////////////// WEBSOCKET
		var ws_port=argo.ws_port,ws_host=argo.ws_host||'0.0.0.0';
		if(ws_port){
			var _client_conn_a={};//buffer of conn-s
			try{
				var ws = require("nodejs-websocket");
				if(!ws){
					logger.log("nodejs-websocket module needed");
					process.exit(2);
				}
				if(ws_port>1024){
				}else{
					logger.log("port < 1024?");
					//process.exit(3);//NOTES: outside sh caller will not handle for case 3
				}
				logger.log("pid=",process.pid);
				ws.setMaxBufferLength(20971520);
				var ws_opts={};
				if (argo.ws_secure) ws_opts.secure=true;//TODO wss_host/wss_port
				var ws_server = argo.ws_server = ws.createServer(ws_opts);
				ws_server.on('connection',function(conn){
					var _addr=(conn.socket.remoteAddress);
					var _port=(conn.socket.remotePort);
					var _key=""+_addr+":"+_port;
					logger.log("on conn "+_key);
					conn.key=_key;//用IP加PORT的方法来识别每个conn...
					_client_conn_a[_key]=conn;
					conn.on("error", function (e){
						logger.log("ws_server.conn.error",e);
					});
					conn.on("text", function (data_s){
						logger.log("on text",data_s);
						if(!appModule.handleWebSocket) throw new Exception('appModule.handleWebSocket is not defined.');
						appModule.handleWebSocket(data_s,conn);//TODO
					});
					conn.on("close", function (code, reason){
						logger.log("ws_server.close="+code+","+reason,"key="+ws_server.key);
						_client_conn_a[_key]=null;
						delete _client_conn_a[_key];
					});
				});
				ws_server.on('error', function(e){
					logger.log("ws_server.error",e);
					if (e.code == 'EADDRINUSE'){
						logger.log('Address in use');
						process.exit(3);
					}
				});
				logger.log("ws listen on "+ws_port);
				ws_server.listen(ws_port);
			}catch(ex){
				logger.log("ws.ex=",ex);
			}
		}
		process.on('uncaughtException', err=>{
			appModule.handleUncaughtException(err);
		});
		process.on("exit",function(i){
			logger.log('process.on.exit',i);
			appModule.handleExit();
		});
		process.on('SIGINT', function(){
			appModule.handleSIGINT();
		});
	}
};
