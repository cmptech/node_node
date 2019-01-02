var Application=null;
var Server = null;
class ApiCommon
//extends ?
{
	constructor(_Application,_Server){
		Application=_Application;
		Server = _Server;
	}

	GetRand(){
		const {getTimeStr}=Application;
		return getTimeStr()+","+Math.random();
	}
}
module.exports=ApiCommon;

