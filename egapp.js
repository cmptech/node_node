//Example App Module
//egapp deps: npm install nodenodenode moment-timezone q node-persist
var debug_level=0;
const util = require('util');
var moment = null;//require('moment-timezone');//for datetime
var approot=__dirname;//default
const getTimeStr=function(dt,fmt){
	if(!moment){
		//tryRequire('moment-timezone') || 
		moment = require('moment-timezone');
		//if(moment){
		//}
		moment.tz.setDefault("Asia/Hong_Kong");
	}
	if(!dt)dt=new Date();
	if(!fmt)fmt='YYYY-MM-DD HH:mm:ss.SSS';
	return moment(dt).format(fmt);
};
var logger=console;//default
const os=require('os');
const fs=require('fs');
var server_id='';

var loggerOverride=function(){
	var optionalParameter = [server_id,getTimeStr()];
	var optionalParameter_l = optionalParameter.length;
	for (var i=0;i<arguments.length;i++) optionalParameter[i+optionalParameter_l]=arguments[i];
	try{console.log.apply(console,optionalParameter);}catch(ex){}
};

const o2s=function(o){try{return JSON.stringify(o);}catch(ex){}};
//const s2o=function(s){try{return JSON.parse(s);}catch(ex){}};//which only accepts {"m":"XXXX"} but fail for parsing like {m:"XXXX"}
const s2o=function(s){try{return(new Function('return '+s))()}catch(ex){}};

// get the 1st match if any:
function getRegExpMatch(re,s){ var ra=re.exec(s); return (ra && ra[1]) ? ra[1] : "" }
function trim(s){ return s?s.trim():"" }
//function copy_o2o(o1,o2){for(var k in o2){o1[k]=o2[k]}return o1}
//function copy_o2o(o1,o2,o3){var o=o3||o2;for(var k in o){o1[k]=o2[k]}return o1}
function copy_o2o(o1,o2,o3){for(var k in (o3||o2)){o1[k]=o2[k]}return o1}

const Q=require('q');

const _streamToString=function(stream, cb){
	var str = '';
	stream.on('data', function(chunk){
		str += chunk;
	}).on('end', function(){
		cb(str)
	}).on('error', function(err){
		cb(''+err);
	})
	;
}

function StreamToStringPromise(stream,maxTimeout){
	if(!maxTimeout)maxTimeout=30000;
	var dfr=Q.defer();
	setTimeout(()=>{
		dfr.reject({STS:"KO",errmsg:"Timeout("+(maxTimeout/1000)+" sec) when PromiseStreamToString()"});
	},maxTimeout);
	_streamToString(stream,function(s){
		if(s){
			dfr.resolve(s2o(s)||{STS:"KO",errmsg:"Unable to understand s",s});
		}else{
			//empty request?
			//dfr.resolve({STS:"OK",errmsg:'empty request'});
			dfr.resolve({});
		}
	});
	return dfr.promise;
}

function tryRequire(mmm,fff){
	try{
		if(fff){
			var p=require.resolve(mmm);
			delete require.cache[p];
		}
		return require(mmm);
	}catch(ex){
		if(debug_level>2) logger.log("! tryRequire("+mmm+").ex=",ex);
		return null;
	};
}
function quit(x){ process.exit(x||0); }

var SegfaultHandler=null;

module.exports = function(opts)
{
	var argo=opts.argo||{};
	if(argo.debug_level>=0){
		debug_level=argo.debug_level;
	}
	if(opts.logger) logger=opts.logger;
	else logger={ log:loggerOverride };//override the logger.log to add time indicator at the beginning

	////////////////////////////////////////////////////////////////////////////////
	if(argo.gdb){
		//@ref https://github.com/ddopson/node-segfault-handler/
		SegfaultHandler = require('segfault-handler');
		SegfaultHandler.registerHandler("crash.log"); // With no argument, SegfaultHandler will generate a generic log file name
		//SegfaultHandler.causeSegfault();//quick test...
	}

	////////////////////////////////////////////////////////////////////////////////
	function isOK(rst){return(rst&&rst.STS=='OK')}
	function isEmpty(o,i){for(i in o){return!1}return!0}
	function isAllOK(ra){ var b=false; for(var k in ra){ if(!isOK(ra[k]))return false; b=true; } return b; }

	if(argo.approot) approot=argo.approot;

	if(argo.server_id){
		server_id=argo.server_id;
	}
	const Session={};
	var _Storage=null;//for persist() only, don't use at app...
	var _defaultLogicModule={},_jobmgr={};

	var Application={
		argo,Q,fs,os//quick objects
		,server_id 
		//short tool functions:
		,isEmpty,getTimeStr,o2s,s2o,isOK,isAllOK,copy_o2o,trim,getRegExpMatch,tryRequire

		//logger related:
		,logger
		,quicklog(){
			var c=0;
			var f=null;
			var a=[];
			for(var k in arguments){
				var v = arguments[k];
				if(c==0){
					f=v;
				}else{
					a.push(v)
				}
				c++;
			}
			if(!f)throw new Error('quicklog(filename, ....)');
			var s=getTimeStr() +" "+ util.format.apply(null, arguments) + '\n';
			fs.appendFile(approot + '/' + f + '.log', s, function(err) {
				if(err) logger.log('quicklog()',err)
			});
		}
		,devlog(){
			var s=getTimeStr() +" "+ util.format.apply(null, arguments) + '\n';
			var filename = approot+"/"+server_id+".dev.log";
			fs.appendFile(filename, s, function(err) {if(err) throw err;});
		}
		
		,quit//for suicide
		,getLogic(){ return _defaultLogicModule; }//@deprecated, using .Logic directly (coz the getter/setter is done through defineProperty)
		,getJobMgr(){ return _jobmgr; }//@deprecated, see above.

		,Session//Memory Session for single-instance-app only...
		// like Session.XXXX but with pathing (xxx.yyy) feature and auto {} fill in
		,getSessionVar(){
			var pathOrKey=arguments[0]||"";
			var r=Session;
			var c=pathOrKey.split('.');
			for(i=0;i<c.length;i++){k=c[i];if(!k)break;r[k]||(r[k]={});r=r[k];}
			return r;
		}

		//simple persist (dont' use at heavy scene)
		,persist(){
			if(!_Storage){
				//TODO make own IO as persist soon...
				_Storage=require('node-persist');
				var persit_config= s2o(argo.persit_config) || {
					continuous: true,
					//ttl: 33 * 24 * 3600 * 1000, //keep 99 days 
					ttl: false,//keep forever...
					//expiredInterval: 24 * 3600 * 1000,//clear buffer every day for those >ttl
					forgiveParseErrors: true //in case parse error
				};
				_Storage.initSync(persit_config);
			}
			var pathOrKey=arguments[0]||"";
			var r=Session;
			var c=pathOrKey.split('.');
			var p=r;
			var k=null;
			for(i=0;i<c.length;i++){p=r;k=c[i];if(!k)break;r[k]||(r[k]={});r=r[k];}
			if(arguments.length>1){//SET MODE
				if(k){
					r=p[k]=arguments[1];//write to memory
					//persit to storage with server_id prefix:
					var async=arguments[2]||false;
					if(async){
						_Storage.setItem(server_id +'_' + pathOrKey,r);
					}else{
						_Storage.setItemSync(server_id +'_' + pathOrKey,r);
					}
				}
			}else{//GET MODE
				if(!r || isEmpty(r)){//if not a meaningful
					//try load from storage:
					r=_Storage.getItemSync(server_id + '_' + pathOrKey);
					if(r){
						if(k){//if found, try write back to session as well...
							p[k]=r;
							r=p[k];
						}
					}
				}
			}
			return r;
		}
		,TriggerReload(){
			var ttt=0;
			if(_jobmgr){
				if(_jobmgr.setReloadFlag)
					_jobmgr.setReloadFlag(true);//let prev jobmgr do quit..
				ttt=1234;//let the jobs have time to finish...
			}
			var _func=function(){
				delete _jobmgr;
				delete _defaultLogicModule;
				var jobmgrModule=null;
				if(argo.jobmgr){
					jobmgrModule=tryRequire(approot+'/'+argo.jobmgr,true);
					if(!jobmgrModule){
						jobmgrModule=tryRequire(argo.jobmgr,true);
					}
				}else{
					if(!jobmgrModule){
						jobmgrModule=tryRequire(approot+'/jobmgr.js',true);
					}
					if(!jobmgrModule){//if not found the jobmgr at approot then use egjobmgr at __dirname/
						jobmgrModule=tryRequire(__dirname+'/egjobmgr.js',true);
					}
				}
				if(jobmgrModule){
					if(jobmgrModule.__filename){
						if(!jobmgrModule.version){
							jobmgrModule.version=getTimeStr(fs.statSync(jobmgrModule.__filename).mtime)
						}
						if(!jobmgrModule.startTime){
							jobmgrModule.startTime=getTimeStr()
						}
					}
					_jobmgr=jobmgrModule(Application);
					if(_jobmgr.__filename){
						if(!_jobmgr.version){
							_jobmgr.version=getTimeStr(fs.statSync(_jobmgr.__filename).mtime)
						}
						if(!_jobmgr.startTime){
							_jobmgr.startTime=getTimeStr()
						}
					}
				}

				var logicModule=null;
				if(argo.logic){
					logicModule=tryRequire(approot+'/'+argo.logic,true);
					if(!logicModule){
						logicModule=tryRequire(argo.logic,true);
					}
				}else{
					if(!logicModule){
						logicModule=tryRequire(approot+'/logic.js',true);
					}
				}
				if(logicModule){
					if(logicModule.__filename){
						if(!logicModule.version){
							logicModule.version=getTimeStr(fs.statSync(logicModule.__filename).mtime)
						}
						if(!logicModule.startTime){
							logicModule.startTime=getTimeStr()
						}
					}
					_defaultLogicModule=logicModule(Application);
					if(_defaultLogicModule.__filename){
						if(!_defaultLogicModule.version){
							_defaultLogicModule.version=getTimeStr(fs.statSync(_defaultLogicModule.__filename).mtime)
						}
						if(!_defaultLogicModule.startTime){
							_defaultLogicModule.startTime=getTimeStr()
						}
					}
				}
				if(isEmpty(_defaultLogicModule)){
					if(debug_level>0){
						logger.log('nodenodenode WARNING: not found logic module',{logicModule,approot});
					}
				}else if(isEmpty(_jobmgr)){
					if(debug_level>0){
						logger.log('nodenodenode WARNING: not found jobmgr module');
					}
				}else{//both _defaultLogicModule & _jobmgr

					if(_defaultLogicModule.handleExit){
						appModule.handleExit=function(x){
							_defaultLogicModule.handleExit(x);
						}
					}

					if(_defaultLogicModule.handleUncaughtException){
						appModule.handleUncaughtException=function(err){
							if(debug_level>0){
								logger.log('app.handleUncaughtException() FWD _defaultLogicModule.handleUncaughtException()',err);
							}
							_defaultLogicModule.handleUncaughtException(err);
						}
					}

					if(_defaultLogicModule.handleSIGINT){
						//ctrl-c
						process.on('SIGINT', function(){
							_defaultLogicModule.handleSIGINT();
						});
					}

					if(_defaultLogicModule.handleUncaughtException){
						process.on('uncaughtException', err=>{
							appModule.handleUncaughtException(err);
						});
					}				

					if(_defaultLogicModule.handleExit){
						process.on("exit",function(x){
							_defaultLogicModule.handleExit(x);
						});
					}

					if(_defaultLogicModule.handleSIGTERM){
						process.on('SIGTERM', function(){
							_defaultLogicModule.handleSIGTERM();
						});
					}

					if(debug_level>1){
						logger.log("_defaultLogicModule.version=",_defaultLogicModule.version);
					}
					Session.ServerStartTime=_defaultLogicModule.startTime;
					Session.LogicVersion=_defaultLogicModule.version;

					if(debug_level>1){
						logger.log("_jobmgr.version=",_jobmgr.version);
					}
					Session.JobMgrVersion=_jobmgr.version;

					setTimeout(()=>{
						if(debug_level>1){
							logger.log('_jobmgr._EntryPromise()[');
						}
						_jobmgr._EntryPromise()
							.fail(err=>{
								if(debug_level>0){
									logger.log('_jobmgr._EntryPromise.fail.err=',err);
								}
								return err;//to .done()
							})
							.done(rst=>{
								if(debug_level>1){
									logger.log(']_jobmgr._EntryPromise()');
									logger.log('DEBUG _jobmgr._EntryPromise.done()',rst);
								}
								if(rst && rst.toReload){
									if(debug_level>1){
										logger.log('Reload JobMgr....');
									}
								}else{
									if(debug_level>1){
										logger.log('Quit JobMgr....',rst);
									}
									var _quit_q = _defaultLogicModule.Quit_q || _defaultLogicModule.Quit_Promise;//@_Promise is @deprecated
									if(_quit_q){
										_quit_q().done(()=>{
											if(debug_level>1){
												logger.log('_quit_q() after _jobmgr._EntryPromise.done.');
											}
										});
									}else{
										process.exit(1);
									}
								}
							});
					},111);
				}
			};

			if(ttt>0) setTimeout(_func,ttt);
			else _func();
		}//TriggerReload()
	};

	Object.defineProperty(Application, 'debug_level',{
		get: function() { return debug_level; },
	});
	Object.defineProperty(Application, 'JobMgr',{
		get: function() { return _jobmgr; },
	});
	Object.defineProperty(Application, 'Logic',{
		get: function() { return _defaultLogicModule; },
	});
	Object.defineProperty(Application, 'logic',{
		get: function() { return _defaultLogicModule; },
	});

	Application.version=getTimeStr(fs.statSync(__filename).mtime);
	Application.startTime=getTimeStr();
	Application.TriggerReload();//init

	var appModule = {
		Application,
		handleHttp:function(req,res){
			res.setHeader('Access-Control-Allow-Origin','*');//tmp hack, improves later
			var tmA=new Date();
			var tmAgetTime=getTimeStr(tmA);
			var rt={STS:'KO'};
			var m=null;
			var c=null;
			if(debug_level>1){
				//logger.log(`${tmAgetTime} ${tmA} [`);
				logger.log(`${tmA} [`);
			}
			StreamToStringPromise(req)
				.then(o=>{
					var _url = req.url||req.originalUrl;
					//if(!o)throw new Error('empty request?');
					var dfr=Q.defer();
					m=o.m||req.m||"";
					c=o.c||req.c||"";
					var p=o.p||req.p||o;
					copy_o2o(p,req.query)
					var cc=null,mm=null;
					mm=m;
					var maxTimeout=o.timeout || 30000;
					if(!c && m=='GetVersion'){
						setTimeout(()=>{
							dfr.resolve({STS:"OK",app_version:Application.version,app_startTime:Application.startTime,logic_version:_defaultLogicModule.version,logic_startTime:_defaultLogicModule.startTime,jobmgr_version:_jobmgr.version,jobmgr_startTime:_jobmgr.startTime});
						},11);
					}else if(!c && m=='LogicReload'){
						Application.TriggerReload();
						setTimeout(()=>{
							dfr.resolve({STS:"OK",app_version:Application.version,app_startTime:Application.startTime,logic_version:_defaultLogicModule.version,logic_startTime:_defaultLogicModule.startTime,jobmgr_version:_jobmgr.version,jobmgr_startTime:_jobmgr.startTime});
						},2222);//sleep a little while to let prev App finish reload...
					}
					else if( mm=m.match(/^(.+)/) ){
						if(c){
							var _logicModule=Application.loadApiCls ? Application.loadApiCls(c) : tryRequire(approot+'/_api/'+c,true);
							if(_logicModule){
								if(_logicModule.__filename){
									if(!_logicModule.version){
										_logicModule.version=getTimeStr(fs.statSync(_logicModule.__filename).mtime)
									}
									if(!_logicModule.startTime){
										_logicModule.startTime=getTimeStr()
									}
								}
								cc =new _logicModule(Application,
									//Server Object:
									{
										req,res,session:req.session,c,m
										//TODO _s/GET/POST/REQUEST later...
									}
								);
							}
						}
						if(!cc){//using default logic module
							cc = _defaultLogicModule;//NOTES: for case that only $m.api, a very-default module is applied, which DO NOT support 'Server' yet !!!
						}
						var nn=mm[1]+'Promise';//try find XXXXPromise() first
						if(typeof(cc[nn])!='function') nn=mm[1]+'_q';//then try find XXXX_q()
						if(typeof(cc[nn])!='function') nn=mm[1]+'_Promise';//then try find XXXX_Promise() @deprecated...
						if(typeof(cc[nn])!='function') nn=mm[1];// fall back to try XXXX()
						if(typeof(cc[nn])!='function'){
							if(typeof(cc['call'])=='function'){//try .call() if any
								try{
									return (cc.call(mm[1],p) || Q({STS:"KO",errmsg:" No Return for call("+mm[1]}+")"))
								}catch(ex){
									rt.errcode=668;
									rt.errmsg=''+mm[1]+'.ex='+ex;
									dfr.resolve(rt);
								}
							}else{
								rt.errcode=667;
								//rt.errmsg='Unknown '+c+'.'+mm[1]+'() '+((c&&m)?(req.url||req.originalUrl):'');
								//rt.errmsg='Unknown '+((c&&m)?(req.url||req.originalUrl):'');
								rt.errmsg='Unknown '+c+"."+m;
								dfr.resolve(rt);
							}
						}else{
							var result = cc[nn](p);
							if(!result) return Q({STS:"KO",errcode:999,errmsg:" "+nn+" returns nothing?"})
							if(Q.isPromise(result)) return result;
							else return Q(result);
						}
					}else{
						try {
							if("/"==_url) _url = "/index.html";
							var raw = fs.createReadStream(__dirname + _url);
							raw.on('error', (err)=>{
								logger.log(err);
								dfr.reject({STS:"KO",message:_url})
							});
							raw.on('end', ()=>dfr.resolve(true));
							//TODO
							//res.writeHead(200, { "content-type": "text/plain" });
							raw.pipe(res);
						} catch (err) {
							logger.log(err);
							rt.errcode=666;
							rt.errmsg='Unknown '+_url;
							dfr.resolve(rt);
						}
					}
					setTimeout(()=>{
						dfr.reject({STS:"KO",errmsg:"Timeout("+(maxTimeout/1000)+" sec) when invoke "+m});
					},maxTimeout);
					return dfr.promise;
				}).fail(err=>{
					//var rt=err;
					var rt={};
					if(err && (err.message || err.code || err.stack))//若为错误则调整一下 errmsg && errcode...
					{
						if(err.stack) logger.log('DEBUG:.'+m+'().err.stack='+err.stack,',err.code=',err.code,'err.message=',err.message);
						if(!rt.STS) rt.STS='KO';
						if(!rt.errmsg){
							if(err.message){
								rt.errmsg=err.message;
							}else{
								rt.errmsg=''+err;//try whatever...
							}
						}
						if(!rt.errcode && err.errcode) rt.errcode=err.errcode;
						//if(!rt.errno && err.errno) rt.errno=err.errno;
						if(!rt.errcode) rt.errcode=9999;//Unknow errcode for fail()
						//if(!rt.errno) rt.errno=-1;
					}
					return rt;
				}).done(rst=>{
					try{
						if(typeof(rst)=='string'){
							res.write(rst);
						}else if( null === rst ){
							//do nothing if return a really null.
						}else if( true === rst ){
							//do nothing if return a really true.
						}else{
							if(rst.STS=="OK" && !rst.errcode) rst.errcode=0;
							res.write(o2s(rst));
						}
					}catch(ex){
						if(debug_level>0){
							logger.log('fail res.write() at done(), ex=',ex);
						}
					}
					try{
						res.end();
					}catch(ex){
						if(debug_level>0){
							logger.log('fail res.end() at done(), ex=',ex);
						}
					}
					var tmZ=rt.tmZ=new Date();
					var tmZgetTime=getTimeStr(tmZ);
					if(debug_level>1){
						//logger.log(`] ${m} ${tmAgetTime} ${tmZgetTime}`);
						logger.log(`] ${m} ${tmZgetTime}`);
					}
				});
		}//handleHttp

		//TODO to merge with handleHttp !!!
		,handleIPC:function(conn){
			//throw new Error('handleIPC() is waiting for rewriting...');
			conn.write("{\"errmsg\":\"TODO\"}");
		}//handleIPC

		//TODO to merge with handleHttp
		,handleWebSocket(s,conn){
			if(debug_level>2){
				logger.log('handleWebSocket.s=',s);
			}
			conn.sendText(s);
		}

	};//appModule
	return appModule;
};
