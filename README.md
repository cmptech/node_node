# WTF

tiny api server ... bumptiously!

# DESIGN

```
	protocol(http || https || ws || memory || ipc || ...)
		=> <app module>
		=> [logic + jobmgr]
```

* [egapp, egjobmgr, eglogic, job_Health] are written to demostrate how to build an app with nodenodenode

# TEST

eg.sh

# TODO

* TCP/IPC/UDP/SSL is WIP(work-in-progress)
* To elegantize more
