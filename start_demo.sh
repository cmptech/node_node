APPROOT=$(dirname "$0")
while true; do
	#node app.js -jobs="['login']" $*
	node -e "require('nodenodenode').daemon({approot:process.cwd(),http_port:4321})" $*
	node -e "require('./nodenodenode').daemon({approot:process.cwd(),http_port:4321})" /jobs="['test']" $*
	sleep 1
done
