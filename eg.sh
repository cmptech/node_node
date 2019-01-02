# eg pm2 later
#node node_modules/nodenodenode/nodenodenode.js /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic

#node -e "require('./nodenodenode')()" /jobs="['Health']" /ws_port=3333 /debug_level=2 /logic=eglogic

#test require.main
#node nodenodenode.js /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic

#node -e "require('./nodenodenode')()" /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic

#pm2 start nodenodenode.js --http_port=3333 --debug_level=2 --app=./egapp --logic=eglogic
#pm2 start nodenodenode.js -- /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic

pm2 stop "test"
pm2 delete "test"
#pm2 start nodenodenode.js -i 2 --name "test" --watch "$PWD" -- /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic
pm2 start nodenodenode.js -i 0 --name "test" --watch "$PWD" --ignore-watch "tmp logs" -- /http_port=3333 /app=./egapp /logic=eglogic
