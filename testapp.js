const util = require('util');
const moment = require('moment-timezone');//for datetime
moment.tz.setDefault("Asia/Hong_Kong");
const __DIR__= __dirname;//PHP compliance
const getTimeStr=function(dt,fmt){
	if(!dt)dt=new Date();
	if(!fmt)fmt='YYYY-MM-DD HH:mm:ss.SSS';
	return moment(dt).format(fmt);
};
var logger=console;//default
const os=require('os');
const fs=require('fs');
//process.stdout.write
//var loggerOverride=function(){
//	var optionalParameter = [getTimeStr()];
//	for (var i=0;i<arguments.length;i++) optionalParameter[i+1]=arguments[i];
//	//try{console.log.apply(console,optionalParameter);}catch(ex){}
//	var s=getTimeStr() +" "+ util.format.apply(null, arguments) + '\n';
//	//process.stdout.write(s);
//	process.stderr.write(s);
//};
const o2s=function(o){try{return JSON.stringify(o);}catch(ex){}};
//const s2o=function(s){try{return JSON.parse(s);}catch(ex){}};//which only accepts {"m":"XXXX"} but fail for parsing like {m:"XXXX"}
const s2o=function(s){try{return(new Function('return '+s))()}catch(ex){}};

/* TODO fix stdin
https://github.com/cotejp/nwjs-j5-fix/blob/master/nwjs-j5-fix.js
var obj = {
  fix: function() {
    if (!process.versions.nw || parseFloat(process.versions.nw) < 0.13) {
      throw "This module is only relevant when run under NW.js v0.13 or higher."
    }
    var Readable = nw.require("stream").Readable;
    var util = nw.require("util");
    function MyStream(opt) {
      Readable.call(this, opt);
    }
    util.inherits(MyStream, Readable);
    MyStream.prototype._read = function() {};
    process.__defineGetter__("stdin", function() {
      if (process.__stdin) return process.__stdin;
      process.__stdin = new MyStream();
      return process.__stdin;
    });
  }
};
obj.abracadabra = obj.fix;
module.exports = obj;
*/
const Q=require('q');

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

//var SegfaultHandler=null;

//var logger={ log:loggerOverride };//override the logger.log to add time indicator at the beginning

module.exports = function(opts)
{
	var argo=opts.argo;
	if(opts.logger) logger=opts.logger;
	//else logger={ log:loggerOverride };//override the logger.log to add time indicator at the beginning

	function isEmpty(o,i){for(i in o){return!1}return!0}
	const util = require('util');
	const server_id=argo.server_id || "unknown_server_id";
	const Session={};
	//const Storage=require('node-persist');
	var _logic={},_jobmgr={};

	//Storage.initSync({
	//	ttl: 7 * 24 * 3600 * 1000,//keep 7 days record for PHP insert/update
	//	expiredInterval: 24 * 3600 * 1000,//clear buffer every 7 days
	//});

	var Application={
		argo,logger,Q,o2s,s2o,fs,os,isEmpty,Session,server_id,getTimeStr
		,getJobMgr(){ return _jobmgr; }
		,getLogic(){ return _logic; }

		//根据path去拿内容，"而且自动生成{}...".  跟直接 Session最大的不同是支持路径，这两个特性方便用于需要 path式设置对象....
		//跟直接 Session.XXXX 的不同主要在于 Session.XXXX不会遇到没有会生成{}、而且不支持路径式访问.
		,getSessionVar(){
			var pathOrKey=arguments[0]||"";
			var r=Session;
			var c=pathOrKey.split('.');
			for(i=0;i<c.length;i++){k=c[i];if(!k)break;r[k]||(r[k]={});r=r[k];}
			return r;
		}

		//persist() 有点像getSessionVar(),但是如果拿不到就试Storage拿并回写Session
		//NOTES: 性能还没优化好，但基本功能应该OK了.(不过有BUG，就是需要persist的东西尽量用第一层操作，多层操作时会不准，这是由现在用的Storage不支持多层有关...)
		//NOTES 另外，node-persist 仅适合单进程工具型ApiServer! 如果是要做 cluster 型，务必不要用,而改为用 redis/db...!!
		//,persist(){
		//	var pathOrKey=arguments[0]||"";
		//	var r=Session;
		//	var c=pathOrKey.split('.');
		//	var p=r;
		//	var k=null;
		//	for(i=0;i<c.length;i++){p=r;k=c[i];if(!k)break;r[k]||(r[k]={});r=r[k];}
		//	if(arguments.length>1){//SET MODE
		//		if(k){
		//			r=p[k]=arguments[1];//write to memory
		//			//persit to storage with server_id prefix:
		//			var async=arguments[2]||false;
		//			if(async){
		//				Storage.setItem(server_id +'_' + pathOrKey,r);
		//			}else{
		//				Storage.setItemSync(server_id +'_' + pathOrKey,r);
		//			}
		//		}
		//	}else{//GET MODE
		//		if(!r || isEmpty(r)){//if not a meaningful
		//			//try load from storage:
		//			r=Storage.getItemSync(server_id + '_' + pathOrKey);
		//			if(r){
		//				if(k){//if found, try write back to session as well...
		//					p[k]=r;
		//					r=p[k];
		//				}
		//			}
		//		}
		//	}
		//	return r;
		//}
		,tryRequire(mmm,fff){
			try{
				if(fff){
					var p=require.resolve(mmm);
					delete require.cache[p];
				}
				return require(mmm);
			}catch(ex){
				logger.log("tryRequire("+mmm+").ex=",ex);
				//return ex;
				return null;
			};
		}
		,devlog(){
			var s=getTimeStr() +" "+ util.format.apply(null, arguments) + '\n';
			var filename = __dirname+"/"+server_id+".dev.log";
			fs.appendFile(filename, s, function(err) {if(err) throw err;}); 
		}
		,quit(x){ process.exit(x||0); }

		,TriggerReload(){
			//TMP TEST
			//if(argo && argo.is_nwjs){
			//	var _win=argo.init_window;
			//	if(_win){
			//		_win.alert('Reload...');
			//	}
			//}
			var ttt=0;
			if(_jobmgr){
				if(_jobmgr.setReloadFlag)
					_jobmgr.setReloadFlag(true);//let prev jobmgr do quit..
				ttt=1234;//let the jobs have time to finish...
			}
			var _func=function(){
				delete _jobmgr;
				//_jobmgr=null;
				delete _logic;
				//TODO
				//_logic=null;
				//var jobmgrModule=Application.tryRequire('./jobmgr.js',true);
				//var logicModule=Application.tryRequire('./logic.js',true);
				//_jobmgr=jobmgrModule(Application);
				//_logic=logicModule(Application);
				if(!isEmpty(_logic) && !isEmpty(_jobmgr)){
					logger.log("_logic.version=",_logic.version);
					logger.log("_jobmgr.version=",_jobmgr.version);

					Session.ServerStartTime=_logic.startTime;
					Session.LogicVersion=_logic.version;
					Session.JobMgrVersion=_jobmgr.version;

					//WJC TMP
					Session.auto_login_flag=Storage.getItemSync(server_id+'_auto_login_flag');
					logger.log('_jobmgr._EntryPromise()[');
					_jobmgr._EntryPromise()
						.fail(err=>{
							logger.log('_jobmgr._EntryPromise.fail=',err);
							return err;//will fall into done();
						})
						.done(rst=>{
							//logger.log('DEBUG _jobmgr._EntryPromise.done()',rst);
							if(rst && rst.toReload){
								logger.log('Reload JobMgr....');
							}else{
								logger.log('Quit JobMgr....');
								_logic.Quit_Promise().done(()=>{
									logger.log('Auto quiting for _jobmgr._EntryPromise.done.');
								});
							}
						});
					logger.log(']_jobmgr._EntryPromise()');
				}
			};
			if(ttt>0) setTimeout(_func,ttt);
			else _func();
		}
		//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		// NOTES: 新加函数跟具体业务有关基本都要在 logic！！！
	};
	Application.version=Application.getTimeStr(fs.statSync(__filename).mtime);
	Application.startTime=Application.getTimeStr();
	Application.TriggerReload();
	
	return {
		handleHttp:function(req,res){
			var tmA=new Date();
			var tmAgetTime=Application.getTimeStr(tmA);
			var rt={};
			var m="VOID";
			logger.log(`${tmAgetTime} ${tmA} [`);
			StreamToStringPromise(req)
				.then(o=>{
					var dfr=Q.defer();
					m=o.m||"VOID";
					var mm;
					var maxTimeout=30000;//default 30 sec timeout...TODO will be overrided by api param later?
					if(m=='GetVersion'){
						setTimeout(()=>{
							dfr.resolve({STS:"OK",app_version:Application.version,app_startTime:Application.startTime});
						},11);
					}else if(m=='LogicReload'){
						Application.TriggerReload();
						//给点时间让之前那个loop完成...
						setTimeout(()=>{
							dfr.resolve({STS:"OK",app_version:_logic.version,app_startTime:_logic.startTime,jobmgr_version:_jobmgr.version,jobmgr_startTime:_jobmgr.startTime});
						},2222);
					}else if( m!='VOID' && (mm=m.match(/^(.*)/)) ){
						var nn=mm[1]+'Promise';
						if(typeof(_logic[nn])!='function') nn=mm[1]+'_Promise';
						if(typeof(_logic[nn])!='function') nn=mm[1];//After all fixed with Promise,line should be commented.
						if(typeof(_logic[nn])!='function'){
							rt.errcode=666;
							rt.errmsg='Unknown '+mm[1]+"/"+nn;
							dfr.resolve(rt);
						}else{
							try{
								return _logic[nn](o.p) || Q({STS:"KO",errmsg:" "+nn+" returns not Promise"});
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
					if(!rt.STS) rt.STS="KO";
					return err;
				}).done(rst=>{
					rt=rst||{};
					if(!rt.STS) rt.STS="KO";
					try{
						res.write(o2s(rt));
						res.end();
					}catch(ex){
						logger.log('failed to write to response at done(), ex=',ex);
					}
					var tmZ=rt.tmZ=new Date();
					var tmZgetTime=Application.getTimeStr(tmZ);
					logger.log(`] ${m} ${tmAgetTime} ${tmZgetTime}`);
				});
		}//handleHttp
		,handleExit:function(){
			logger.log('TODO handleExit');
		}
		,handleUncaughtException:function(err){
			console.log('handleUncaughtException=>'+err.message);
			/*
			if(Application){
				//Application.persist('LastUncaughtException',(err&&err.message)?err.message:(""+err));
				var lgc=Application.getLogic();
				if(lgc){
					lgc.Quit_Promise().done(()=>{
						logger.log('Quit for uncaughtException',err);
					});
				}else{
					logger.log('handleUncaughtException',err);
				}
			}
			*/
		}
		,handleSIGINT:function(){
			if(Application){
				var lgc=Application.getLogic();
				if(lgc){
					if(lgc.Quit_Promise){
						lgc.Quit_Promise().done(()=>{
							logger.log('Quit for SIGINT/ctrl-c');
						});
					}else{
						logger.log('Direct Quit for SIGINT/ctrl-c');
						//process.exit();
						setTimeout(()=>{
							Application.quit();
						},1000);
					}
				}else{
					logger.log('Quit for SIGINT/ctrl-c');
				}
			}
		}
	};//the return appModule object
};


