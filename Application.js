// npm install p4web

//NOTES: Application是给信任的 cmp呼叫的主函数库，如果应用中那些面向用户插件式的逻辑坚决不能暴露，需要另外在sandbox中构建!!!

module.exports = opts => {

	//const p4web = require('./p4web');
	const p4web = require('p4web');
	const p4web_o = p4web();
	var {fs,s2o,o2s,o2o,getTimeStr,isEmpty,P,PSTS,POK,PKO }=p4web_o;

	//TMP patch for old p4web...
	//if(!isEmpty) isEmpty=(o,i)=>{for(i in o){return!1}return!0}
	if(!isEmpty) throw new Error('npm install p4web');

	const isOK = rst => (rst&&rst.STS=='OK')||false;
	//function isEmpty(o,i){for(i in o){return!1}return!0}
	function isAllOK(ra){ var b=false; for(var k in ra){ if(!isOK(ra[k]))return false; b=true; } return b; }

	var argo = opts.argo || {};

	var {debug_level,approot}=argo;

	var flag_production = (argo.production)?true:false;

	var server_id= argo.server_id || "";

	var logger = opts.logger || { log:function(){
		var optionalParameter = [server_id,getTimeStr()];
		var optionalParameter_l = optionalParameter.length;
		for (var i=0;i<arguments.length;i++) optionalParameter[i+optionalParameter_l]=arguments[i];
		try{console.log.apply(console,optionalParameter);}catch(ex){}
	} };//override the logger.log to add time/server_id indicator as prefix

	var Application={
		uuid: () => {
			var d = new Date().getTime();
			var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
				var r = (d + Math.random() * 16) % 16 | 0;
				d = Math.floor(d / 16);
				return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
			});
			return uuid;
		},
		tryRequire:(mmm,fff)=>{
			try{
				if(fff){ delete require.cache[require.resolve(mmm)] }
				return require(mmm);
			}catch(ex){
				if(debug_level>2)
					logger.log("! tryRequire("+mmm+").ex=",ex);
				return null;
			};
		},
		//@ref https://cnodejs.org/topic/504061d7fef591855112bab5
		md5: (s) => require('crypto').createHash('md5').update(s).digest('hex'),
		md5_ascii : function(){for(var m=[],l=0;64>l;)m[l]=0|4294967296*Math.abs(Math.sin(++l));return function(c){var e,g,f,a,h=[];c=unescape(encodeURI(c));for(var b=c.length,k=[e=1732584193,g=-271733879,~e,~g],d=0;d<=b;)h[d>>2]|=(c.charCodeAt(d)||128)<<8*(d++%4);h[c=16*(b+8>>6)+14]=8*b;for(d=0;d<c;d+=16){b=k;for(a=0;64>a;)b=[f=b[3],(e=b[1]|0)+((f=b[0]+[e&(g=b[2])|~e&f,f&e|~f&g,e^g^f,g^(e|~f)][b=a>>4]+(m[a]+(h[[a,5*a+1,3*a+5,7*a][b]%16+d]|0)))<<(b=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21][4*b+a++%4])|f>>>32-b),e,g];for(a=4;a;)k[--a]=k[a]+b[a]}for(c="";32>a;)c+=(k[a>>3]>>4*(1^a++&7)&15).toString(16);return c}}(),

		base64_encode: t => Buffer.from(t).toString('base64'),
		base64_decode: t => Buffer.from(t, 'base64').toString(),

		sha1: (s) => require('crypto').createHash('sha1').update(s).digest('hex'),
		sha1_ascii: function (d){var l=0,a=0,f=[],b,c,g,h,p,e,m=[b=1732584193,c=4023233417,~b,~c,3285377520],n=[],k=unescape(encodeURI(d));for(b=k.length;a<=b;)n[a>>2]|=(k.charCodeAt(a)||128)<<8*(3-a++%4);for(n[d=b+8>>2|15]=b<<3;l<=d;l+=16){b=m;for(a=0;80>a;b=[[(e=((k=b[0])<<5|k>>>27)+b[4]+(f[a]=16>a?~~n[l+a]:e<<1|e>>>31)+1518500249)+((c=b[1])&(g=b[2])|~c&(h=b[3])),p=e+(c^g^h)+341275144,e+(c&g|c&h|g&h)+882459459,p+1535694389][0|a++/20]|0,k,c<<30|c>>>2,g,h])e=f[a-3]^f[a-8]^f[a-14]^f[a-16];for(a=5;a;)m[--a]=m[a]+b[a]|0}for(d="";40>a;)d+=(m[a>>3]>>4*(7-a++%8)&15).toString(16);return d},

		aesEncode:(data, key="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")=>{
			let crypto = require('crypto');
			const cipher = crypto.createCipher('aes192', key);
			var crypted = cipher.update(data, 'utf8', 'hex');
			crypted += cipher.final('hex');
			return crypted;
		},
		aesDecode:(encrypted, key="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")=>{
			let crypto = require('crypto');
			const decipher = crypto.createDecipher('aes192', key);
			var decrypted = decipher.update(encrypted, 'hex', 'utf8');
			decrypted += decipher.final('utf8');
			return decrypted;
		},
		
		argo,isEmpty,isOK,isAllOK,
		P,PSTS,POK,PKO,
		server_id,logger,
		flag_production,debug_level,o2o,o2s,s2o,getTimeStr
		,approot,fs
		,version:getTimeStr(fs.statSync(__filename).mtime)
		,startTime:getTimeStr()

	};

	var tryRequire = Application.tryRequire;

	var loadCls = (type,name) => require("./_"+type+"/"+name);

	//Application.loadApiCls = name => loadCls('api',name) ;
	Application.loadApiCls = name => { return tryRequire("./_api/"+name) || tryRequire("./"+name) || (()=>{throw new Error("404 "+name);})(); };
	Application.loadLgcCls = name => loadCls("lgc",name) ;
	Application.loadOrmCls = name => loadCls("orm",name) ;
	Application.loadBizCls = name => loadCls("biz",name) ;
	//Application.loadLibCls = name => { return Application.tryRequire("./_lib/"+name) || Application.tryRequire(name) || (()=>{throw new Error("loadLibCls: not found lib "+name);})(); };
	Application.loadLibCls = name => { return tryRequire("./_lib/"+name) || tryRequire(name) || (()=>{throw new Error("loadLibCls: not found lib "+name);})(); };

	//more quick function.
	Application.loadLgc = (name,Server) => new (loadCls("lgc",name))(Application,Server) ;
	Application.loadOrm = (name,Server) => new (loadCls("orm",name))(Application,Server) ;
	Application.loadBiz = (name,Server) => new (loadCls("biz",name))(Application,Server) ;
	Application.loadLib = (name,Server) => new (loadCls("lib",name))(Application,Server) ;

	Application.config = require('./config');

	Application.getConf = pathOrKey =>{
		//var pathOrKey=arguments[0]||"";
		if(!pathOrKey) pathOrKey = "";
		var r=Application.config;
		var c=pathOrKey.split('.');
		for(i=0;i<c.length;i++){k=c[i];if(!k)break;r[k]||(r[k]={});r=r[k];}
		//return r;
		return Application.isEmpty( r ) ? null:r;
	}
	
	return Application;
}


