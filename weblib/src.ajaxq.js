ajaxq=(function(xhr){return function(u,a,m){
	var dfr=Q.defer();
	var x=new xhr("Microsoft.XMLHTTP");
	x.onerror=function(e){dfr.reject('{"STS":"KO","errmsg":"Network Failed? '+e+'"}');if(e)console.log(e)};
	x.onreadystatechange=function(){if(x.readyState==4){dfr.resolve(x.responseText)}};
	if(!m)m='POST';
	x.open(m,u,true);
	if(m=='POST')x.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	x.send(a);
	return dfr.promise;
}})(typeof(XMLHttpRequest)?XMLHttpRequest:ActiveXObject)
