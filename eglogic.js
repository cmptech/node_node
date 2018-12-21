module.exports=function(Application){
	const {
		Q,fs,os,logger,Session,server_id,JobMgr
		,o2s,s2o,devlog,isEmpty,isOK,getTimeStr,quicklog
	}=Application;

	function GetVersion_q(){
		return Q({
			STS:'OK',
			DBG:true
		})
	}

	function Quit_Promise(exit_code){
		var wait_time=(exit_code>0)?exit_code:10;
		var rt={
			STS:"OK",
			errmsg:`Will Quit Server(${server_id}) after 1 sec, please try reconnect later about ${wait_time} seconds for init.`
		};
		setTimeout(()=>{
			Application.quit(exit_code);
		},111);
		return Q(rt);
	}

	return {
		__filename
		,GetVersion_q
		,handleSIGINT(){
			Quit_Promise(1).done(()=>{
				logger.log('Quit for SIGINT/ctrl-c');
			});
		}
		,handleUncaughtException(err){
			quicklog('handleUncaughtException',err)
		}
	}
}
