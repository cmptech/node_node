var debug=0;
const util = require('util');
const moment = require('moment-timezone');//for datetime
moment.tz.setDefault("Asia/Hong_Kong");
var approot=__dirname;//default
const getTimeStr=function(dt,fmt){
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
function copy_o2o(o1,o2){ for(var k in o2){ o1[k]=o2[k]; } return o1; }//copy from o2 to o1, but notes that o1 is not checked here...

const Q=require('q');

//TODO gzip and binary feature not yet supported... 
const _streamToString=function(stream, cb){
	var str = '';
	stream.on('data', function(chunk){
		str += chunk;
	}).on('end', function(){
		if("undefined"==typeof(s2o)){
			cb({STS:"KO",errmsg:"s2o is undefined"});
		}
		try{
			cb(s2o(str)||{STS:"KO",errmsg:"Unable to understand s:"+str});
		}catch(ex){
			cb({STS:"KO",errmsg:""+ex,str:str});
		}
	}).on('error', function(err){
		cb({STS:"KO",errmsg:""+err,str:str});
	})
	;
};

function StreamToStringPromise(stream,maxTimeout){
	if(!maxTimeout)maxTimeout=3333;
	var dfr=Q.defer();
	setTimeout(()=>{
		dfr.reject({STS:"KO",errmsg:"Timeout("+(maxTimeout/1000)+" sec) when PromiseStreamToString()"});
	},maxTimeout);
	_streamToString(stream,function(rst){
		dfr.resolve(rst);
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
		if(debug>2)
			logger.log("! DEBUG tryRequire("+mmm+").ex="+ex);
		return null;
	};
}
function quit(x){ process.exit(x||0); }

var SegfaultHandler=null;

module.exports = function(opts)
{
	var argo=opts.argo||{};
	if(argo.debug>=0){
		debug=argo.debug;
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

	if(argo.approot) approot=argo.approot;

	if(argo.server_id){
		server_id=argo.server_id;
	}
	const Session={};
	var _Storage=null;//for persist() only, don't use at app...
	var _logic={},_jobmgr={};

	var Application={
		argo,logger,Q,fs,os,Session,server_id
		,isEmpty,getTimeStr,o2s,s2o,isOK,copy_o2o,trim,getRegExpMatch,tryRequire,quit

		,getLogic(){ return _logic; }//@deprecated, using .Logic directly (coz the getter/setter is done through defineProperty)
		,getJobMgr(){ return _jobmgr; }//@deprecated, see above.

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
				_Storage=require('node-persist');
				var persit_config= argo.persit_config || {
					continuous: true,
					ttl: 33 * 24 * 3600 * 1000,//keep 33 days 
					expiredInterval: 24 * 3600 * 1000,//clear buffer every day
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
		,devlog(){
			var s=getTimeStr() +" "+ util.format.apply(null, arguments) + '\n';
			var filename = approot+"/"+server_id+".dev.log";
			fs.appendFile(filename, s, function(err) {if(err) throw err;});
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
				delete _logic;
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
					_jobmgr=jobmgrModule(Application);
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
					_logic=logicModule(Application);
				}
				if(isEmpty(_logic)){
					logger.log('nodenodenode WARNING: not found logic module');
				}else if(isEmpty(_jobmgr)){
					logger.log('nodenodenode WARNING: not found jobmgr module');
				}else{//both _logic & _jobmgr
					logger.log("_logic.version=",_logic.version);
					Session.ServerStartTime=_logic.startTime;
					Session.LogicVersion=_logic.version;

					logger.log("_jobmgr.version=",_jobmgr.version);
					Session.JobMgrVersion=_jobmgr.version;

					setTimeout(()=>{
						logger.log('_jobmgr._EntryPromise()[');
						_jobmgr._EntryPromise()
							.fail(err=>{
								logger.log('_jobmgr._EntryPromise.fail.err=',err);
								return err;//to .done()
							})
							.done(rst=>{
								logger.log(']_jobmgr._EntryPromise()');
								//console.log( new Error().stack );
								logger.log('DEBUG _jobmgr._EntryPromise.done()',rst);
								if(rst && rst.toReload){
									logger.log('Reload JobMgr....');
								}else{
									logger.log('Quit JobMgr....',rst);
									if(_logic.Quit_Promise){
										_logic.Quit_Promise().done(()=>{
											logger.log('_logic.Quit_Promise() after _jobmgr._EntryPromise.done.');
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
		}
	};

	Object.defineProperty(Application, 'debug',{
		get: function() { return debug; },
	});
	Object.defineProperty(Application, 'JobMgr',{
		get: function() { return _jobmgr; },
		//set: function(newValue) { _logic = newValue; }
	});
	Object.defineProperty(Application, 'Logic',{
		get: function() { return _logic; },
		//set: function(newValue) { _logic = newValue; }
	});
	Object.defineProperty(Application, 'logic',{
		get: function() { return _logic; },
		//set: function(newValue) { _logic = newValue; }
	});

	Application.version=getTimeStr(fs.statSync(__filename).mtime);
	Application.startTime=getTimeStr();
	Application.TriggerReload();

	return {
		handleHttp:function(req,res){
			var tmA=new Date();
			var tmAgetTime=getTimeStr(tmA);
			var rt={STS:'KO'};
			var m="VOID";
			logger.log(`${tmAgetTime} ${tmA} [`);
			StreamToStringPromise(req)
				.then(o=>{
					if(!o)throw new Error('empty request?');
					var dfr=Q.defer();
					m=o.m||"VOID";
					var mm;
					var maxTimeout=o.timeout || 30000;
					if(m=='GetVersion'){
						setTimeout(()=>{
							dfr.resolve({STS:"OK",app_version:Application.version,app_startTime:Application.startTime});
						},11);
					}else if(m=='LogicReload'){
						Application.TriggerReload();
						setTimeout(()=>{
							dfr.resolve({STS:"OK",app_version:Application.version,app_startTime:Application.startTime,logic_version:_logic.version,logic_startTime:_logic.startTime,jobmgr_version:_jobmgr.version,jobmgr_startTime:_jobmgr.startTime});
						},2222);//sleep a little while to let prev App finish reload...
					}
					else if( m!='VOID' && (mm=m.match(/^(.*)/)) ){
						var nn=mm[1]+'Promise';//try find XXXXPromise() first
						if(typeof(_logic[nn])!='function') nn=mm[1]+'_Promise';//then try find XXXX_Promise()
						if(typeof(_logic[nn])!='function') nn=mm[1];// fall back to try XXXX()
						if(typeof(_logic[nn])!='function'){
							if(typeof(_logic['call'])=='function'){//try .call() if any
								try{
									return _logic.call(mm[1],o.p) || Q({STS:"KO",errmsg:" No Return for call("+mm[1]}+")");
								}catch(ex){
									rt.errmsg=''+mm[1]+'.ex='+ex;
									dfr.resolve(rt);
								}
							}else{
								rt.errcode=666;
								rt.errmsg='Unknown '+mm[1]+'()';
								dfr.resolve(rt);
							}
						}else{
							try{
								return _logic[nn](o.p) || Q({STS:"KO",errmsg:" "+nn+" returns nothing?"});
							}catch(ex){
								rt.errmsg=''+mm[1]+'.ex='+ex;
								dfr.resolve(rt);
							}
						}
					}else{
						rt.errcode=666;
						rt.errmsg='Unknown m='+mm;
						dfr.resolve(rt);
					}
					setTimeout(()=>{
						dfr.reject({STS:"KO",errmsg:"Timeout("+(maxTimeout/1000)+" sec) when invoke "+m});
					},maxTimeout);
					return dfr.promise;
				}).fail((err)=>{
					logger.log('fail.err=',err);
					if(!rt.errmsg)rt.errmsg=""+err;
					//if(!rt.STS) rt.STS="KO";
					return err;//then back to done()
				}).done(rst=>{
					try{
						if(rst==null){
							res.write('');
						}else{
							if(typeof(rst)=='string'){
								res.write(rst);
							}else if(typeof(rst)=='array'){
								res.write(o2s(rst));
							}else{
								rt=rst||{};
								if(!rt.STS) rt.STS="KO";
								res.write(o2s(rt));
							}
						}
					}catch(ex){
						logger.log('fail res.write() at done(), ex=',ex);
					}
					try{
						res.end();
					}catch(ex){
						logger.log('fail res.end() at done(), ex=',ex);
					}
					var tmZ=rt.tmZ=new Date();
					var tmZgetTime=getTimeStr(tmZ);
					logger.log(`] ${m} ${tmAgetTime} ${tmZgetTime}`);
				});
		}//handleHttp

		//TODO
		,handleWebSocket(s,conn){
			//logger.log('handleWebSocket.s=',s);
			conn.sendText(s);
		}

		,handleExit:function(x){
			if(_logic && _logic.handleExit){
				logger.log('app.handleExit() FWD _logic.handleExit()',x);
				_logic.handleExit(x);
			}else{
				logger.log('SKIP _logic.handleExit()',x);
			}
		}

		//unexpected error
		,handleUncaughtException:function(err){
			if(_logic && _logic.handleUncaughtException){
				logger.log('app.handleUncaughtException() FWD _logic.handleUncaughtException()',err);
				_logic.handleUncaughtException(err);
			}else{
				logger.log('SKIP _logic.handleUncaughtException()'+err,err);
			}
		}

		//ctrl-c
		,handleSIGINT:function(){
			if(_logic && _logic.handleSIGINT){
				logger.log('app.handleSIGINT() FWD _logic.handleSIGINT()');
				_logic.handleSIGINT();
			}else{
				logger.log('SKIP _logic.handleSIGINT()');
				Application.quit();
			}
		}
	};//appModule
};
