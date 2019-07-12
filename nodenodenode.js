const util = require('util');
const fs = require('fs');
const o2o = (o1,o2)=>{for(var k in o2){o1[k]=o2[k]}return o1}
const argv2o=a=>(a||process.argv||[]).reduce((r,e)=>((m=e.match(/^(\/|--?)([\w-]*)="?(.*)"?$/))&&(r[m[2]]=m[3]),r),{});
var argo=argv2o();
var nodenodenode = call_argo => {
	var rt={STS:'OK'};
	o2o(argo,call_argo);
	if (process.versions.nw) {
		o2o(argo,argv2o(nw.App.argv));//nwjs command line parameters override
		rt.is_nwjs=true;
	}
	//var logger = argo.logger || console;
	var logger= argo.logger || { log: (argo.debug_level>0) ? ( (rt.is_nwjs) ?  function(){
		try{console.log(util.format.apply(null, arguments))}catch(ex){console.log.apply(console,arguments);}
	} : console.log ) : (()=>{}) };//tune for nwjs logger, and not log for !(debug_level>0)
	process.env.UV_THREADPOOL_SIZE = argo.UV_THREADPOOL_SIZE || 99; //tune for uv_queue_work()
	if(!argo.approot) rt.approot=argo.approot=process.cwd(); 
	rt.app=argo.app= (argo.app) ? (argo.approot + '/' + argo.app) : (__dirname + '/egapp.js');
	var appModule=rt.appModule=require(argo.app)({argo});
	if(appModule.no_daemon===true){//for (flagIsMaster && flagHasWorker)
		logger.log('appModule.no_daemon === true');
	}else{
		( (argo,f)=>{
			f('http',argo.server_port||argo.http_port||argo.p,argo.server_host||argo.http_host||argo.h||'localhost');
			f('https',argo.https_port,argo.https_host||'localhost');
			f('ipc',argo.ipc_path);
			f('tcp',argo.tcp_port,argo.tcp_host||"localhost");
			f('udp',argo.udp_port,argo.udp_host||"localhost");
			f('ws',argo.ws_port,argo.ws_host||'localhost');
		})( o2o(argo,(appModule.config||{}).argo), (type,port,host) => {
			if(!port)return;
			var handleEntryName = 'handle'+{ http:'Http' ,https:'Https' ,ipc:'IPC' ,tcp:'TCP' ,udp:'UDP' ,ws:'WebSocket' }[type];
			var handleEntry = appModule[handleEntryName];
			try{
				if(!handleEntry) throw (`needs appModule.${handleEntryName}()`);
				if (type=='ipc' && process.platform ==='win32') port = "\\\\.\\pipe\\"+port.replace(new RegExp("^/"),'').replace(new RegExp("/", 'g'), '-');
				var server = rt[type+'_server'] = {
					http:()=>require('http').createServer()
					,https:()=>require('https').createServer({key:fs.readFileSync(argo.https_key),cert:fs.readFileSync(argo.https_cert)})
					,ipc:()=>require('net').createServer()
					,tcp:()=>require('net').createServer()
					,udp:()=>require('dgram').createSocket('udp4')
					,ws:()=>(ws=require("nodejs-websocket"),ws.setMaxBufferLength(20971520),ws.createServer({secure:(argo.ws_secure)?true:false}))
				}[type]()
					.on('error',err=>logger.log(`${type}_server error(${err.code}):\n${err.stack}`))
					.on('request',handleEntry)
					.on('message',handleEntry)
					.on('listening',()=>logger.log(`${type}_server listen on ${host}:${port}`))
				switch(type){
					case 'ws'://"nodejs-websocket" special
						var _client_conn_a={};//conn pool
						server.on('connection',function(conn){
							var _addr=(conn.socket.remoteAddress);
							var _port=(conn.socket.remotePort);
							var _key=""+_addr+":"+_port;
							logger.log("on connection "+_key);
							conn.key=_key;
							conn.lmt=(new Date()).getTime();
							_client_conn_a[_key]=conn;
							conn.on("error", (e)=>logger.log("ws_server.conn.error",e));
							conn.on("text", (data_s)=>handleEntry(data_s,conn));
							conn.on("close", function (code, reason){
								logger.log("ws_server.close="+code+","+reason,"key="+_key);
								_client_conn_a[_key]=null;
								delete _client_conn_a[_key];
							});
						})
					default:server[type=='udp'?'bind':'listen'](port,host);
				}
				rt.flag_daemon=rt['flag_'+type]=true;
			}catch(ex){ logger.log('failed to start http_server on '+host+':'+port,"\n",ex); }
		} )
	}
	return rt;
};
module.exports=nodenodenode;
////return it in MODULE mode or direct execute in PROGRAM mode
//var require,module;
//(require&&module) && ( require.main==module ? nodenodenode() : (module.exports=nodenodenode) );
