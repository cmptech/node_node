//try clone with the one of lambda, so that in future we can have similiar serverless stuffs
//@ref context
//https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
//@ref handler
//https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html
//const Application = require('./Application')();
//require('./ApplicationExt')(Application);

exports.handler = async({req,res,post_o,Application},context) => new Promise( async(resolve,reject)=>{

	//var { s2o, o2s, o2o, tryRequire, approot, base64_decode, base64_encode } = Application;

	////lambda related
	//var { queryStringParameters, httpMethod, body, path, requestContext } = event || {};
	//var headers = { 'Access-Control-Allow-Origin': '*' };
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

	var _jobmgr={};//TODO 重构 jobs...

	//var {req,res,post_o,Application} = event;
	var {flag_production,fs,s2o,o2s,o2o,getTimeStr,debug_level,approot=__dirname,logger,tryRequire,isEmpty} = Application;

	//TODO 需要一个大一点的 try/catch 在这个 函数里。待修...

	var req_o = o2o({},post_o);//copy post

	const url = require('url');

	res.setHeader('Access-Control-Allow-Origin','*');

	var rt={STS:'KO'};

	if(debug_level>1) logger.log(`handleWeb [`);
	//cmp-I ----------------------------------------------------------------
	var u,c,m,p;
	var _url = req.url||req.originalUrl;
	var _url_parts = url.parse(_url,true);
	var get_o = o2o({},_url_parts.query);
	o2o(req_o,get_o);//merge get_o to req_o
	var url_path = _url_parts.pathname || '';
	var mmm = url_path.match(/.*\/([a-zA-Z0-9_]*)\.([a-zA-Z0-9_]+)(\.api)?$/);// [C.M,.M,C.M.api,.M.api]
	if(mmm){
		[u,c,m]=mmm;
	}else{
		var mmm = url_path.match(/.*\/([a-zA-Z0-9_]+)(\.api)?$/);// [M,M.api]
		if(mmm){ [u,m]=mmm; }
	}
	if(c) req.c=c; 
	if(m) req.m=m;

	//TODO I18N lang
	//		//如果有显式的lang参数就用显式的，否则就用session中的，如果也没有就默认conf里面的defaultLang，再没有就用dn【也是参考ACE的经验】
	//		let lang = req.query.lang;
	//		if(!lang) lang = req.session.lang;
	//		//if(!lang) lang = req.cookies.lang;//TODO later
	//		if(!lang) lang = "en";
	//		//简单做了下判断。只保存合法的lang。后续新增lang要修改下
	//
	//		//const {appTools:{contains}}=Application;//reuse Application.appTools.contains
	//		const contains = Application.appTools.contains;
	//		if(lang) lang = lang.toLowerCase();
	//		if(contains(["zh-cn","zh","cn"],lang))
	//			lang = "zh-cn";
	//		else if(contains(["zh-hk","zh-tw","hk","tw"],lang))
	//			lang = "zh-tw";
	//		else
	//			lang = "en";
	//		req.lang = lang;
	//cmp-I -------------------------------------------------------------

	//cmp-II ----------------------------------------------------------{
	m=req_o.m||req.m||"";
	c=req_o.c||req.c||"";
	var p=req_o.p||req.p||req_o;

	var session_code = req_o['_s']||req['_s']||req_o['s']||req['s'];
	var s = session_code;
	var x = req_o.x||req.x||"";//TODO for encrypted..
	//cmp-II ----------------------------------------------------------}

	//o2o(p,req.query)//NOTES: req.query is from 'express'

	if(debug_level>1) logger.log('REQUEST=',{url:_url,post:post_o,get:get_o,req:req_o,path:_url_parts.path,pathname:url_path},{c,m,p});
	var cc,mm=m;
	var maxTimeout=req_o.timeout || 30000;//TODO  use argo config_max_timeout

	var flag_try_static = true;
	do{
		if (!c && m=='GetServerVersion') {
			var {no_daemon,pid,pm_id,fk_id,flagMaster,flagPm2,cluster_mode,cpus,version,startTime}=Application;
			return resolve({STS:"OK",jobmgr_version:_jobmgr.version,jobmgr_startTime:_jobmgr.startTime
				,version,startTime,no_daemon,flagMaster,flagPm2,pid,fk_id,pm_id,cluster_mode,cpus});
		}
		if ( mm=m.match(/^(.+)/) ) {// if maybe has Method
			if(!c)c='Default';//route to ApiDefault
			if(c.substr(0,3)!="Api")c="Api"+c;//we need Prefix for c
			var _logicModule;
			try{
				if(Application.loadApiCls){
					_logicModule = Application.loadApiCls(c);
				}else{
					//_logicModule = tryRequire(approot+'/_api/'+c,!flag_production);
					_logicModule = tryRequire(approot+'/_api/'+c);
				}
			}catch(ex){
				//TODO !!! 如果文件不存在就404，否则应该是报具体错，否则语法类错误未弄出来....
				//TODO 识别出非404类的错误要暴露回去.
				if(debug_level>1)
				logger.log('TODO loadApiCls.ex=',ex,{c,url_path});
				break;
			}

			var session = req.session||{};
			session.session_code = session_code;
			//var Server={ req:{post_o,get_o,req_o,request_o:req_o,headers,req.headers},res,session,c,m };

			req.post_o=post_o;
			req.get_o=get_o;
			req.req_o=req_o;
			req.request_o=req_o;
			var Server={ req,res,session,c,m };

			if(_logicModule){
				if(_logicModule.__filename){
					if(!_logicModule.version){ _logicModule.version=getTimeStr(fs.statSync(_logicModule.__filename).mtime) }
					if(!_logicModule.startTime){ _logicModule.startTime=getTimeStr() }
				}
				try{
					cc =new _logicModule(Application,Server);
				}catch(ex){
					logger.log('DEBUG ex when load module',ex);
					return reject(ex);
				}
			}
			if(cc){
				if(Application.preCall){
					try{
						await Application.preCall(Application,Server);//prepare before calling
					}catch(ex){
						//logger.log('TMP preCall.ex=',ex);
						return reject(ex);
					}
				}
				var nn=mm[1]+'Promise';//try find XXXXPromise() first
				if(typeof(cc[nn])!='function') nn=mm[1]+'_q';//then try find XXXX_q()
				if(typeof(cc[nn])!='function') nn=mm[1]+'_p';//then try find XXXX_q()
				if(typeof(cc[nn])!='function') nn=mm[1]+'_Promise';//then try find XXXX_Promise() @deprecated...
				if(typeof(cc[nn])!='function') nn=mm[1];// fall back to try XXXX()
				if(typeof(cc[nn])!='function'){
					if(typeof(cc['call'])=='function'){ //try .call() if any
						try{
							var result = cc.call(mm[1],p) || ({STS:"KO",errmsg:" No Return for call("+mm[1]}+")");
							return resolve(result);
						}catch(ex){
							rt.errcode=668;
							rt.errmsg=''+mm[1]+'.ex='+ex;
							return resolve(rt);
						}
					}
					else{
						rt.errcode=667;
						rt.errmsg='Unknown '+c+"."+m;
						return resolve(rt);
					}
				}else{
					try{
						var result = cc[nn](p);
						return resolve(result);
					}catch(ex){
						rt.errcode=669;
						rt.errmsg=''+nn+'.ex='+ex;
						return resolve(rt);
					}
				}
			}//if (cc)
		}
	}while(false);
	try {
		if(!isEmpty(post_o)){
			logger.log('err post_o',post_o);
			rt.errcode=404;
			rt.errmsg='err post_o';
			rt.post_o = post_o;
			return resolve(rt);
		}
		_url = url_path;
		if("/"==_url && !(c||m)){ _url = "/index.html"; }
		var fileName = url_path
		if("/"==fileName && !(c||m)){ fileName = "/index.html"; }
		return resolve(Application.sendFile_p({res,fileName}))
	} catch (err) {
		logger.log('ERR=',err);
		rt.errcode=666;
		rt.errmsg='err '+err+','+_url;
		resolve(rt);
	}
	setTimeout(()=>reject({STS:"KO",errmsg:"Timeout("+(maxTimeout/1000)+" sec) when invoke "+m}),maxTimeout);
	//aws:
	//{
	//	statusCode: 200,
	//		headers,
	//		body: handle_body((call_mode == 1) ?
	//			o2s((callbackId) ? { responseId: callbackId, responseData: rst } : rst) :
	//			(typeof(rst) == 'string') ? rst : o2s(rst))
	//}
});
