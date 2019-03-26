# WTF

* tiny api server ... bumptiously!
* mini dependencies - almost none but: q moment-timezone

# DESIGN

wrap protocol return nodenodeode.findHandler(argo).handle()

* not using cookie
* handle session with implicit _s

```
	protocol(http || https || ws || memory || ipc || ...)
		=> <app module>
		=> [logic + jobmgr]
```

for handler, object Applicatoin is important.

* [egapp, egjobmgr, eglogic, job_Health] are written to demostrate how to build an app with nodenodenode

# api

* handle session at apiCommon

# TEST

eg.sh

# TODO

* TCP/IPC/UDP/SSL is WIP(work-in-progress)
* To elegantize more
