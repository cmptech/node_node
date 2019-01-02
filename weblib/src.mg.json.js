//已经包含在 mg_core.js中，不过有时候可能要快速引入才会单独用到
function s2o(strJson){
	try{
	var myjson=null;
	//try{myjson=JSON;}catch(e){};
	//注释了，不要用浏览器自带那个JSON，不知道哪里有奇怪的BUG.
	//比如 UTF8的 BOM不能自适应...
	//if( (typeof JSON)!="undefined" ) myjson=JSON;
	//if(myjson) return myjson.parse(strJson);
	//以前是用eval
	//return eval( "(" + strJson + ")");
	//根据网上介绍，这样return new Function的方法是耗时最少的.
	return (new Function('return '+strJson))();
	}catch(ex){}
}
function o2s(object){
	//var myjson=null;
	////try{myjson=JSON;}catch(e){};
	//if( (typeof JSON)!="undefined" ) myjson=JSON;
	//if(myjson) return myjson.stringify(object);
	//操，官方浏览器的JSON.stringify都有问题，说好的人与人的信任呢?!

	//还是自己来..

	if(null==object)return "null";

	var type = typeof object;

	if('object'== type){
		if (Array == object.constructor) type = 'array';
		else if (RegExp == object.constructor) type = 'regexp';
		else type = 'object';
	}
	switch(type){
		case 'undefined':
		case 'unknown':
			return; break;//return undefined
		case 'function':
		case 'boolean':
		case 'regexp':
			return object.toString(); break;
		case 'number':
			return isFinite(object) ? object.toString() : 'null'; break;
		case 'string':
			return '"' + object.replace(/(\\|\")/g,"\\$1").replace(/\n|\r|\t/g, function(){ var a = arguments[0]; return (a == '\n') ? '\\n': (a == '\r') ? '\\r': (a == '\t') ? '\\t': "" }) + '"'; break;
		case 'object':
			var pp="";var value ="";
			var results = []; 
			try{
				for (var property in object)
				{
					pp=object[property];
					value = o2s(pp);
					if (value !== undefined)
					results.push('"'+property + '":' + value);
				};
			}
			catch(e){ }
			return '{' + results.join(',') + '}';
			break;
		case 'array':
			var results = [];
			if(object.length>=0){
				for(var i = 0; i < object.length; i++){
					var value = o2s(object[i]);
					if (value !== undefined)
						results.push(value);
				};
				return '[' + results.join(',') + ']';
			}
			else{
				for(k in object) {
					var kk=k; var value = o2s(object[k]);
					if (value !== undefined)
						results.push('"'+kk+'":'+value);
				}
				return '{' + results.join(',') + '}';
			}
			break;
	}
}


