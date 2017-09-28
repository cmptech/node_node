module.exports=Application=>{
	const {Q,Logic,Session}=Application;

	return {
		Preempt_Promise(){
			return Q({STS:'OK',type:"DEBUG FROM job_test...\n",sleepTime:3333});
		}
		,__filename
	};
};

