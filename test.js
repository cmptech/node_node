require('./nodenodenode').daemon({
	//app:__dirname+'/egapp.js',
	approot:__dirname,//need for using default app(egapp), then auto find the "app.js" in folder $approot ...
	http_port:4321,
});
setTimeout(()=>{
	var exec = require('child_process').exec;
	var cmd_s="curl http://127.0.0.1:4321/ -d \"{'m':'GetVersion'}\"";
	console.log(cmd_s);
	var exec_o=exec(cmd_s);//,function(err,stdout,stderr){ if(err) { console.log('error:'+err); } console.log('stderr:'+stderr); console.log('stdout:'+stdout); }
	exec_o.stdout.pipe(process.stdout);
	//exec_o.stderr.pipe(process.stderr);
},444);
