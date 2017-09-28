module.exports=function(Application){
	var {Q,o2s,s2o,fs,os,logger,Session,server_id,argo
		,getSessionVar,tryRequire,persist,getTimeStr
	}=Application;

	argo=argo || {};

	//@see called by Application _ReloadJobMgr()
	function _EntryPromise(){
		logger.log('test from _EntryPromise()',{server_id});
		return Q({STS:'OK'});
	}

	///////////////////////////////////////////////////////////////////////////

	var _reload_flag=false;

	return {
		__filename
		,_EntryPromise
	};
}
