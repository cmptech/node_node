var logger = console;
var appname = 'testapp';
module.exports = function(opts)
{
	var appModule = {
		handleExit:function(x){
			logger.log(`${appname}.handleExit(${x})`);
		}
		//@ref https://nodejs.org/api/http.html#http_event_connection
		,handleWeb:(req,resp)=>{
			resp.setHeader('Access-Control-Allow-Origin','*');//tmp hack, improves later
			resp.writeHead(200, { "content-type": "text/plain" });
			resp.write(`from testapp `+new Date());
			try{
				resp.end();
			}catch(ex){
				logger.log('fail resp.end() at done(), ex=',ex);
			}
		}
		,handleHttps:function(req,resp){
			logger.log(`TODO ${appname}.handleHttps()`);
			return appModule.handleWeb(req,resp)
		}
		,handleHttp:function(req,resp){
			logger.log(`TODO ${appname}.handleHttp()`);
			return appModule.handleWeb(req,resp)
		}
	}
	return appModule
}
