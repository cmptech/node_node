//@see TEST.md for usage examples.
const util = require('util');
var debug_level=0;//debug_level
var logger=console;//default logger
const o2o = (o1,o2)=>{for(var k in o2){o1[k]=o2[k]}return o1}
const argv2o=a=>(a||process.argv||[]).reduce((r,e)=>((m=e.match(/^(\/|--?)([\w-]*)="?(.*)"?$/))&&(r[m[2]]=m[3]),r),{});
var argo={};
var flag_daemon=false;
var nodenodenode = this_argo => {
	var rt={STS:'OK'};
	//tune argo
	o2o(argo,argv2o());
	o2o(argo,this_argo);
	if (process.versions.nw) {
		//if('undefined'==typeof nw){	throw new Error('nw is undefined while process.versions.nw?');}
		o2o(argo,argv2o(nw.App.argv));//nwjs command line parameters override
		rt.is_nwjs=true;
	}
	var {debug_level}=argo;
	logger= argo.logger || {
		log: (debug_level>0) ? (
			(rt.is_nwjs) ?  function(){
				try{console.log(util.format.apply(null, arguments))}catch(ex){console.log.apply(console,arguments);}
			} : console.log ) : (()=>{}), 
	};
	if(typeof(global)!='undefined') rt.has_global=has_global=true; 
	//optimize for uv_queue_work()
	process.env.UV_THREADPOOL_SIZE = argo.UV_THREADPOOL_SIZE || 99;
	//NOTES load app module from $approot/$app.js 
	if(!argo.approot) rt.approot=argo.approot=process.cwd(); 
	rt.app=argo.app= (argo.app) ? (argo.approot + '/' + argo.app) : (__dirname + '/egapp.js');
	var appModule=rt.appModule=require(argo.app)({argo});
	const nameMap = {
		http:'Http'
		,https:'Https'
		,ipc:'IPC'
		,tcp:'TCP'
		,udp:'UDP'
		,ws:'WebSocket'
	};
	const createMap = {
		http:()=>require('http').createServer()
		,https:()=>require('https').createServer({
			key: fs.readFileSync(argo.https_key),
			cert: fs.readFileSync(argo.https_cert)
		})
		,ipc:()=>require('net').createServer()
		,tcp:()=>require('net').createServer()
		,udp:()=>require('dgram').createSocket('udp4')
		,ws:()=>require("nodejs-websocket").createServer({secure:(argo.ws_secure)?true:false})
	}
	const normalHandle = (type,port,host) => {
		var handleEntryName = 'handle'+nameMap[type];
		var handleEntry = appModule[handleEntryName];
		if(!handleEntry) throw (`needs appModule.${handleEntryName}()`);
		try{
			if (process.platform ==='win32') {
				port = port.replace(new RegExp("^/"),'').replace(new RegExp("/", 'g'), '-')
				port = `\\\\.\\pipe\\${port}`;
			}
			var server = rt[type+'_server'] = createMap[type]()
				.on('error',err=>{
					if (err.code == 'EADDRINUSE'){
						logger.log(`${type}_server EADDRINUSE`)
					}else logger.log(`${type}_server error:\n${err.stack}`)
				})
				.on('request',handleEntry)
				.on('message',handleEntry)
				.on('listening',()=>logger.log(`${type}_server listen on ${host}:${port}`))
			switch(type){
				case 'udp':
					server.bind(port)
					break;
				case 'ws':
					var _client_conn_a={};//conn pool
					server.setMaxBufferLength(20971520);
					server.on('connection',function(conn){
						//pack remote info on to the conn obj
						var _addr=(conn.socket.remoteAddress);
						var _port=(conn.socket.remotePort);
						var _key=""+_addr+":"+_port;
						logger.log("on conn "+_key);
						conn.key=_key;
						conn.lmt=(new Date()).getTime();
						_client_conn_a[_key]=conn;
						conn.on("error", function (e){
							logger.log("ws_server.conn.error",e);
						});
						conn.on("text", function (data_s){
							logger.log("on text",data_s);
							handleEntry(data_s,conn);
						});
						conn.on("close", function (code, reason){
							logger.log("ws_server.close="+code+","+reason,"key="+ws_server.key);
							_client_conn_a[_key]=null;
							delete _client_conn_a[_key];
						});
					})
				default:
					server.listen(port,host);
			}
			rt['flag_'+type]=true;
			flag_daemon=true;
		}catch(ex){
			logger.log('failed to start http_server on '+host+':'+port,"\n",ex);
		}
	}
	// HTTP
	var http_host=argo.server_host||argo.http_host||argo.h||'localhost',http_port=argo.server_port||argo.http_port||argo.p;
	if(http_port) normalHandle('http',http_port,http_host); 
	// HTTPS
	var https_host=argo.https_host||'localhost',https_port=argo.https_port;
	if(https_port) normalHandle('https',https_port,https_host); 
	// IPC
	var ipc_path=argo.ipc_path;
	if(ipc_path) normalHandle('ipc',ipc_path);
	// TCP
	var tcp_port=argo.tcp_port;
	if(tcp_port) normalHandle('tcp',tcp_port);
	// UDP
	var udp_port=argo.udp_port;
	if(udp_port) normalHandle('udp',udp_port);
	// WS
	var ws_port=argo.ws_port,ws_host=argo.ws_host||'localhost';
	if(ws_port) normalHandle('ws',ws_port);

	rt.flag_daemon=flag_daemon;
	return rt;
};

//return in MODULE mode or execute in PROGRAM mode
var require,module;
(require&&module) && ( require.main==module ? nodenodenode() : (module.exports=nodenodenode) );
