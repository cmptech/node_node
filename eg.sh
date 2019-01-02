# eg pm2 later
#node node_modules/nodenodenode/nodenodenode.js /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic

#node -e "require('./nodenodenode')()" /jobs="['Health']" /ws_port=3333 /debug_level=2 /logic=eglogic

#test require.main
#node nodenodenode.js /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic

#node -e "require('./nodenodenode')()" /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic

#pm2 start nodenodenode.js --http_port=3333 --debug_level=2 --app=./egapp --logic=eglogic
#pm2 start nodenodenode.js -- /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic

pm2 start nodenodenode.js -i 2 --name "test" -- /http_port=3333 /debug_level=2 /app=./egapp /logic=eglogic
#echo pm2 stop "test"
#echo pm2 del "test"
