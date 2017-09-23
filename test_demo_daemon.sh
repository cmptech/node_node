APPROOT=$(dirname "$0")
while true; do
	node -e "require('./nodenodenode')({approot:process.cwd(),logic:'test_logic.js',http_port:4321})" /jobs="['test']" $*
	sleep 1
done
