# WTF

nodenodenode/n3/nodecube build tool/soft in few seconds ... bumptiously!

# DESIGN

```
daemon mode:
	protocol(http || https || ws || memory || ipc || ...) => app module => [logic + jobmgr]

onetime mode: /* for some console cases that need to share the Application/Logic etc... */
  jobmgr._EntryPromise()
```

* 'egapp.js' and egjobmgr.js are written to demostrate how to build an app with n3

# TEST

* test/*.js for quick reference...


# TODO/PLAN

* TCP/IPC/UDP is WIP(work-in-progress)
* examples to all
