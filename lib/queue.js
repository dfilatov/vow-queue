var vow = require('vow'),

    DEFAULT_QUEUE_PARAMS = {
        weightLimit : 100
    },
    DEFAULT_TASK_PARAMS = {
        weight   : 1,
        priority : 1
    },

    extend = function() {
        var res = {};

        for(var i = 0, len = arguments.length; i < len; i++) {
            var obj = arguments[i];
            if(obj) {
                for(var key in obj) {
                    obj.hasOwnProperty(key) && (res[key] = obj[key]);
                }
            }
        }

        return res;
    },

    Queue = module.exports = function(params) {
        this._pendingTasks = [];
        this._params = extend(DEFAULT_QUEUE_PARAMS, params);
        this._curWeight = 0;
        this._isRunScheduled = false;
    };

Queue.prototype = {
    enqueue : function(taskFn, taskParams) {
        var task = {
                fn      : taskFn,
                params  : extend(DEFAULT_TASK_PARAMS, taskParams),
                promise : vow.promise()
            };

        if(task.params.weight > this._params.weightLimit) {
            throw Error('task with weight ' +
                task.params.weight +
                ' couldn\'t be executed in queue with weight limit of ' +
                this._params.weightLimit);
        }

        this._enqueueTask(task);
        this._scheduleDequeue();

        return task.promise;
    },

    params : function(params) {
        if(typeof params.weightLimit !== 'undefined') {
            this._params.weightLimit = params.weightLimit;
            this._scheduleDequeue();
        }
    },

    _enqueueTask : function(task) {
        var pendingTasks = this._pendingTasks,
            i = pendingTasks.length;

        while(i) {
            if(pendingTasks[i - 1].params.priority >= task.params.priority) {
                i === pendingTasks.length?
                    pendingTasks.push(task) :
                    pendingTasks.splice(i, 0, task);
                return;
            }
            i--;
        }

        pendingTasks.push(task);
    },

    _scheduleDequeue : function() {
        if(!this._isRunScheduled) {
            this._isRunScheduled = true;
            process.nextTick(this._dequeue.bind(this));
        }
    },

    _dequeue : function() {
        this._isRunScheduled = false;
        while(this._pendingTasks.length && this._allowRunTask(this._pendingTasks[0])) {
            this._runTask(this._pendingTasks.shift());
        }
    },

    _allowRunTask : function(task) {
        return this._curWeight + task.params.weight <= this._params.weightLimit;
    },

    _runTask : function(task) {
        this._curWeight += task.params.weight;

        var promise = task.fn();
        promise.always(
            function() {
                this._curWeight -= task.params.weight;
                this._scheduleDequeue();
            },
            this);

        task.promise.sync(promise);
    }
};