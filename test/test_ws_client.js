/*
https://github.com/sitegui/nodejs-websocket
ws.connect(URL, [options], [callback])
Returns a new Connection object, representing a websocket client connection

URL is a string with the format "ws://localhost:8000/chat" (the port can be omitted)

options is an object that will be passed to net.connect() (or tls.connect() if the protocol is "wss:"). The properties "host" and "port" will be read from the URL. The optional property extraHeaders will be used to add more headers to the HTTP handshake request. If present, it must be an object, like {'X-My-Header': 'value'}. The optional property protocols will be used in the handshake (as "Sec-WebSocket-Protocol" header) to allow the server to choose one of those values. If present, it must be an array of strings.

callback will be added as "connect" listener
*/
var ws = require('nodejs-websocket');
var conn=ws.connect("ws://localhost:8777/test"/*, aa=>{
	console.log('connect callback',aa);
}*/)
	.on('binary',dd=>{
		console.log('on binary',dd);
	})
	.on('text',cc=>{
		console.log('on text',cc);
	})
	.on('connect',bb=>{
		console.log('on connect',bb);
		conn.sendText(JSON.stringify({ping:new Date().getTime()}));
	});
