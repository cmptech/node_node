# using default egapp.js

node -p "require('../nodenodenode')()"

# using testapp.js

```
# call from other dir
node -p "require('../nodenodenode')()" /app=testapp /approot="$PWD"

# if already in $PWD
node -p "require('../nodenodenode')()" /app=testapp
```

protocols test
```
# http
node -p "require('../nodenodenode')()" /app=testapp /http_port=8888 /debug_level=1
node -p "require('../nodenodenode')()" /app=testapp /http_port=8888 /http_host=0.0.0.0

# https
openssl genrsa -out https.key 2048
openssl req -new -key https.key -x509 -days 999 -out https.cert
node -p "require('../nodenodenode')()" /app=testapp /http_port=8888 /debug_level=1 /https_port=8443 /https_key=https.key /https_cert=https.cert

# WS
//currently using "nodejs-websocket" instead of ws/websocket

#node -p "require('../nodenodenode')()" /app=testapp /ws_port=8888 /debug_level=1 /ws_secure=1
node -p "require('../nodenodenode')()" /app=testapp /ws_port=8777 /debug_level=1 /ws_secure=0

```
