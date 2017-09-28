# WTF

build tool/soft in few seconds... bumptiously!

# DESIGN

```
daemon mode:
	protocol(http || https || ws || memory || ipc || ...) => app module => <logic + jobmgr>
onetime mode: /* for some console cases that need to share the Applicatoni/Logic etc... */
  jobmgr._EntryPromise()
```

* 'egapp.js' and egjobmgr.js are written to demostrate how to build an app with nodenodenode
* test_*.js are for your quick reference...


# TODO/PLAN

* TCP/IPC/UDP is work-in-progress

* examples to all
