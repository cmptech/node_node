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
			//TODO fwd to cmp()
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
		,handleWebSocket:function(s,conn){
			//logger.log(`TODO ${appname}.handleWebSocket()`,s);
			logger.log(s,conn.key,conn.lmt);
			conn.sendText(JSON.stringify({pong:new Date().getTime()}))
		}
	}
	return appModule
}
