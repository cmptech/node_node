module.exports=function(Application){
	var {Q,o2s,s2o,fs,os,logger,Session,server_id,argo
		,getSessionVar,tryRequire,persist,getTimeStr
	}=Application;

	argo=argo || {};

	function _getJob(id){
		var Job=getSessionVar('Jobs.'+id);
		var _flag_found_job = false;
		if(Job && Job.logic){
			var _Preempt_q = Job.logic.Preempt_Promise || Job.logic.Preempt_q;
			if(_Preempt_q && 'function'==typeof(_Preempt_q)){
				_flag_found_job=true;
			}
		}
		if(_flag_found_job){
			//skip, no need to require again
		}else{
			var job_module=tryRequire(argo.approot + '/job_'+id,true);
			if(job_module){
				if(job_module.__filename){
					if(!job_module.version){
						job_module.version=getTimeStr(fs.statSync(job_module.__filename).mtime)
					}
					if(!job_module.startTime){
						job_module.startTime=getTimeStr()
					}
				}
				Job.logic=job_module(Application);
				Job.sts=persist('job_status_'+id);
			}else{
				throw new Error("failed to load ./job_"+id+"???");
			}
		}
		return Job;
	}

	//@seeAlso logic.js
	function changeJobStatus(job_id,new_status){
		persist('job_status_'+id,new_status);
	}
	//@see sub job js
	function getReloadFlag(){
		return _reload_flag;
	}
	//@see app.js
	function setReloadFlag(flag){
		if(flag){
			//clear the cached Jobs.
			Session.Jobs={};//@see _getJob()
		}
		_reload_flag=flag;
		return _reload_flag;
	}

	//@see called by Application _ReloadJobMgr()
	function _EntryPromise(){
		var dfr=Q.defer();
		if(getReloadFlag()){
			dfr.resolve({STS:"OK",errmsg:"_EntryPromise skip for 'to reload'",toReload:true});
		}
		for(var i in JobsArr){
			if(getReloadFlag()){
				dfr.resolve({STS:"OK",errmsg:"_EntryPromise skip for() for 'to reload'",toReload:true});
			}
			(job_id=>{
				var _job_preempt=function(){
					if(getReloadFlag()){
						dfr.resolve({STS:"OK",errmsg:"_EntryPromise skip _job_preempt for 'to reload'",toReload:true});
					}else{
						var job=_getJob(job_id);
						var _sleepTime=1111;//default
						if(job.sts!='disabled'){
							if(job.logic){
								var _Preempt_q = job.logic.Preempt_Promise || job.logic.Preempt_q;
								if(_Preempt_q && 'function'==typeof(_Preempt_q)){
									try{
										_Preempt_q()
											.fail(err=>{
												if(err && err.STS) return err;
												return {STS:"KO",err}
											})
											.done(rst=>{
												if(rst){
													if(rst.type){
														process.stdout.write(rst.type);
													}
													if(rst.sleepTime){
														_sleepTime=rst.sleepTime;
													}
													if(rst.STS!="OK"){
														logger.log("WARNING _job_preempt ",job_id,".done(KO!!)",rst);
													}
												}else{
													logger.log("DEBUG job("+job_id+").preempt empty rst?",rst);
												}
												setTimeout(()=>{
													_job_preempt();
												},_sleepTime);
											});
									}catch(ex){
										logger.log('ERROR when _Preempt_q() =',ex);
										setTimeout(()=>{
											_job_preempt();
										},_sleepTime);
									}
								}else{
									logger.log('ERROR no job.logic._Preempt_q for ',job_id,job);
									setTimeout(()=>{
										_job_preempt();
									},_sleepTime);
								}
							}else{
								logger.log('ERROR no job.logic???');
								setTimeout(()=>{
									_job_preempt();
								},_sleepTime);
							}
						}else{//disabled
							setTimeout(()=>{
								_job_preempt();
							},_sleepTime);
						}
					}
				};
				logger.log("kickstart _job_preempt",job_id);
				_job_preempt();
			})(JobsArr[i]);
		}
		return dfr.promise;
	}

	///////////////////////////////////////////////////////////////////////////
	var JobsArr=[];
	if(argo.jobs){
		JobsArr=s2o(argo.jobs);
	}
	if(JobsArr && JobsArr.length>0)
	logger.log('JobsArr=',JobsArr);

	var _reload_flag=false;

	//var stats = fs.statSync(__filename);//module.filename;
	//var version=getTimeStr(stats.mtime);
	//var startTime=getTimeStr();
	return {_EntryPromise,__filename
		//,version,startTime
		,changeJobStatus,getReloadFlag,setReloadFlag
	};
}
