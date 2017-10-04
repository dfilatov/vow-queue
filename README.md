# vow-queue
[![NPM Version](https://img.shields.io/npm/v/vidom.svg?style=flat-square)](https://www.npmjs.com/package/vow-queue)
[![Build Status](https://img.shields.io/travis/dfilatov/vow-queue/master.svg?style=flat-square)](https://travis-ci.org/dfilatov/vow-queue/branches)

===============

vow-queue is a module for task queue with weights and priorities

Installation
------------

Module can be installed using `npm`:

```
npm install vow-queue
```

or `bower`:

```
bower install vow-queue
```

Usage
-----

````javascript
var Queue = require('vow-queue'),
    queue = new Queue({ weightLimit : 10 });
    
queue.enqueue(function() { // simple function
    return 2 * 2;
});

queue.enqueue(function() { // function returns a promise
    // do job
    return promise;
});

queue.enqueue( // task with custom priority and weight
    function() {
        // do job
    },
    {
        priority : 3, // this task will be started before the previous two
        weight   : 5
    });
    
queue.start(); // starts tasks processing

queue.enqueue(function() { }); // and enqueue yet another task
````

API
-----
### Creating queue
#### new Queue([params])
  * `params.weightLimit=100` limit of summary tasks weight which can be processed concurrently

### Methods of queue
#### Promise enqueue(taskFn, [taskParams])
Enqueue given task in queue
  * `taskFn` task function which can return either a promise or a value
  * `taskParams.weight=1` weight of given task
  * `taskParams.priority=1` priority of given task

Returns promise which will be resolved when given task is done

#### void start()
Starts processing of tasks in queue

#### void stop()
Stops processing of tasks in queue

####Boolean isStarted()
Returns whether processing is started

####void setParams(params)
Sets queue params
* `params.weightLimit=100` limit of summary tasks weight which can be processed concurrently

####Object getStats()
Returns statistics about queue
