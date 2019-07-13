/*

node -e "require('nodenodenode')()"  -- /server_host=0.0.0.0 /server_port=9999 /approot=$PWD /app=app.js
node -e "require('nodenodenode')()"  -- /approot=$PWD /app=app.js
node -e "require('nodenodenode')()"  -- /app=app.js

node app /debug_level=1 /server_port=9999

# https
openssl genrsa -out https.key 2048
openssl req -new -key https.key -x509 -days 999 -out https.cert
node app /debug_level=1 /https_port=8443 /https_key=https.key /https_cert=https.cert

 */
//similar as egapp.js in nodenodenode,
//except not using q.js anymore (now only native Promise)

module.exports = function(opts) //{argo,logger} from nodenodenode
{
	//Application reusable for many apps.
	const Application = require('./Application')(opts||{});

	//Ext Tool Functions for this app
	//require('./ApplicationExt')(Application);

	var appname = Application.appname = Application.config.app_name || 'no_name_in_conf';

	//default not use master worker improvement.
	if(Application.argo.master_worker_module){
		require('./master_and_workers.js')(Application);
	}

	var {flag_production,fs,s2o,o2s,o2o,getTimeStr,debug_level,logger,tryRequire} = Application;

	//const stream2str=(st,cb,ca=[])=>st.on('error',e=>cb(''+e)).on('data',c=>ca.push(c)).on('end',()=>cb(Buffer.concat(ca).toString()))
	const mapEvents=(o,evo)=>{for(var k in evo)o.on(k,evo[k])}
	const stream2str=(st,cb,ca=[])=>mapEvents(st,{error:e=>cb(''+e),data:c=>ca.push(c),end:()=>cb(''+Buffer.concat(ca))})

//const stream2str2=(st,cb,ca=[])=>mapEvents(st,{error:e=>cb(''+e),data:c=>ca.push(c),end:()=>cb((ca.join('')))})
	const stream2bf=(st,cb)=>{var bf = new Buffer(0);mapEvents(st,{error:e=>cb(''+e),data:c=>bf=Buffer.concat([bf, c]),end:()=>cb(bf)})}
	//TODO @see p4web.stream2buffer_p for promise version

	//TODO use stream2buffer_p => Buffer.toString() 
	function stream2str_p(stream,maxTimeout){
		if(!maxTimeout)maxTimeout=30000;//TODO get from argo...
		return new Promise( (resolve, reject) => {
			setTimeout(()=>reject({STS:"KO",errmsg:"Timeout("+(maxTimeout/1000)+" sec) at stream2str_p()"}),maxTimeout);
			stream2str(stream,(s)=>resolve( s? (s2o(s)||{STS:"KO",errmsg:"Not understand s",s}) : {}))
		});
	}

	//TODO use p4web.stream2buffer_p version later.
	function stream2str_form_p(stream,maxTimeout){
		if(!maxTimeout)maxTimeout=30000;//TODO get from argo...
		return new Promise( (resolve, reject) => {
			setTimeout(()=>reject({STS:"KO",errmsg:"Timeout("+(maxTimeout/1000)+" sec) at stream2str_p()"}),maxTimeout);
			stream2bf(stream,(s)=>resolve( s))
		});
	}

	const url = require('url');

	Application.sendFile_p = (opts={}) => {

		return new Promise( (resolve, reject) =>{
			var {res,fileName,ContentType}=opts||{};
			var filePath = '../docs'+ fileName;
			var raw = fs.createReadStream(Application.argo.approot +'/'+filePath);
			raw.on('error', (err)=>{
				//logger.log('DEBUG ERROR',err,err.stack);
				reject({STS:"KO",errmsg:'404 '+fileName,errcode:404})
			});
			raw.on('end', ()=>resolve(true));
			//TODO quick content-type later
			if(!ContentType){
				if(new RegExp(".js$","i").test(filePath)){
					res.writeHead(200, { "content-type": "text/javascript" });
				}
				//	res.writeHead(200, { "content-type": "text/plain" });
			}
			raw.pipe(res);
		});
	}

	var appModule = {
		config:Application.config,
		no_daemon: Application.no_daemon,//let nodenodenode handle skip daemon mode
		handleExit:(x)=>logger.log(`${appname}.handleExit(${x})`)

		,handleUncaughtException:(err)=>{
			var {no_daemon,pid,pm_id,fk_id,flagMaster,flagPm2,cluster_mode,cpus,version,startTime}=Application;
			logger.log(`${appname}.handleUncaughtException()`,
				{no_daemon,pid,pm_id,fk_id,flagMaster,flagPm2,cluster_mode,cpus,version,startTime
					/*,stackInfo:Application.stackInfo(err)*/,err
				}/*,err.stack*/)
			//if(!err)err={};
			//process.exit(err.errcode || err.code || -999);
		}

		//TODO combile with handleWebSocket()
		//TODO add module of handler as lambda, exports.handler = (event, context) => {}
		,handleWeb:async(req,res)=>{
			var req_content_type = req.headers['content-type']||'';

			var post_o,rst;
			if(req_content_type.indexOf("multipart/form-data") !== -1){
				var form_bf = await stream2str_form_p(req);
				//console.log('1',form_bf);
				post_o = {form_bf};
			}else{
				post_o = await stream2str_p(req);//TODO 好像用 stream2str_form_p(req) 也可以?
			}

				// post_o = await stream2str_p(req);
			//TODO change to {statusCode,body,headers} like lambda.

			try{
				rst = await require('./handler').handler({
					post_o,
					Application,
					req,res,
				})/*.catch(err=>{
					console.log('not handle err',err);
					return rst;
				});*/
			}catch(err){
				//logger.log('Error from handler',err)
				//rst = {statusCode:500,body:''+err};

				var rt = err;
				if(err)//tune errmsg && errcode...
				{
					var err_log_id = rt.err_log_id = Math.random();//NOTES: for log search.... use uuid later for improving.
					
					//(err.errmsg || err.message || err.code || err.stack)
					if(rt.stack){
						logger.log('DEBUG.fail:.'+m+'().err.stack='+err.stack,',err.code=',err.code,'err.message=',err.message,'err_log_id=',err_log_id);
						delete rt.stack;//保护机制-不返回.stack
					}
					if(!rt.STS) rt.STS='KO';
					if(!rt.errmsg){
						if(err.message){
							rt.errmsg=err.message;
							delete err.message;
						}else{
							rt.errmsg=''+err;//try whatever?
						}
						//保护sqlMessage,
						if(rt.sqlMessage){
							rt.errmsg = rt.code || 'SQLERR';//
							delete rt.code;
							delete rt.sqlMessage;
						}
					}
					//if(!rt.errcode && err.errcode) rt.errcode=err.errcode;
					if(!rt.errcode){
						rt.errcode=9999;
						if(!rt.errmsg) rt.errmsg = 'Unknown error '+m+'.'+'.c';
					}
				}else{
					logger.log('DEBUG catch.err',err);
				}
				rst = rt;
			}
			try{
				if( null === rst || true === rst || typeof(rst)=="undefined"){
					//do nothing if return a really null/true/undefined
				}else if(typeof(rst)=='string'){
					//res.writeHead(200, { "content-type": "text/plain" });
					res.write(rst);
				}else{//special dump
					if(rst && rst.STS=="OK" && !rst.errcode) rst.errcode=0;
					res.writeHead(200, { "content-type": "text/plain" });
					res.write(o2s(rst));
				}
				//TODO
				//res.writeHead(rst.statusCode, rst.headers);
				//res.write(rst.body);
				res.end();
			}catch(err){
				logger.log(err);
			}
			return;

			//var call_mode = 0; //{0:'web', 1:'websocket'}
			//var callbackId = null;
			//var enc_way_a = null;
			//var handle_body = function(body_txt) {
			//	if (enc_way_a != null) {
			//		//TODO 稍后根据类别进行编码返回:
			//		return base64_encode(body_txt);
			//	}
			//	return body_txt;
			//};

			//TODO 加密模式:
			//if (Array === post_o.constructor && post_o.length > 1) {
			//	enc_way_a = post_o[0]; //TODO 稍后要用回这个解码..
			//	//暂时先用死 base64，稍后支持 xxtea(考虑可能已登陆的才用xxtea)
			//	post_o = s2o(base64_decode(post_o[1]));
			//}
			//
			//if (typeof(post_o)=='Array'){
			// 要解码，见之前lambda index.js
			//}

			//callbackId = request_o.callbackId;
			//if (path) {
			//	call_mode = 0; //web
			//}
			//else if (requestContext) {
			//	call_mode = 1; //websocket
			//}
			//else {
			//	call_mode = 2; //quick test when edit for quick code syntax error check...
			//	mm = 'EditQuickTest';
			//}

		}//handleWeb()

		//TODO 稍后研究 转发到 handleWeb，合并同一函数.
		,handleWebSocket:async(s,conn)=>{
			logger.log('TODO handleWebSocket',s,conn.key,conn.lmt);
			conn.sendText(JSON.stringify({pong:new Date().getTime()}))

			var rst;
			try{
				rst = await require('./handler').handler({
					post_o,
					Application,
					req,res,
				});
			}catch(err){
				rst=err;
			}
		}
	};//appModule

	if(appModule.handleSIGINT)process.on('SIGINT',appModule.handleSIGINT);
	if(appModule.handleUncaughtException) process.on('uncaughtException',appModule.handleUncaughtException);
	if(appModule.handleExit) process.on("exit",appModule.handleExit);
	if(appModule.handleSIGTERM) process.on('SIGTERM',appModule.handleSIGTERM);

	appModule.handleHttps = appModule.handleHttp = appModule.handleWeb;

	return appModule
}

var require,module;
if(require && module && require.main==module){
	require('./nodenodenode')({app:'app.js'});
}

