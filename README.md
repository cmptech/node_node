# nodenodenode

build tool/soft in few seconds...

## Design

```
nodenodenode
	=> daemon( protocol(http || https || ws || memory || ipc || ...) ) => app module => <logic + jobmgr>
```

* 'egapp.js' and egjobmgr.js are written to demostrate how to build an app with nodenodenode
* test_*.js are for your quick reference...
