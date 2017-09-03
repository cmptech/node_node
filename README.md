# nodenodenode (node^3 or node-cube)

a tiny app for tiny tools :)

## Design

```
nodenodenode
=> daemon( protocol(.http || .ws || .memory) )
=> app module => <logic + jobmgr>
```

'egapp.js' and egjobmgr.js are attached to demostrating how to build an app with nodenodenode
