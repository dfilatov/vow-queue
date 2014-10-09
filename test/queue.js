var Queue = require('../lib/queue'),
    vow = require('vow'),
    nextTick = typeof setImmediate !== 'undefined'? setImmediate : process.nextTick;

describe('queue', function() {
    it('enqueue should return promise', function() {
        var queue = new Queue();
        vow.isPromise(queue.enqueue(function() {})).should.be.true;
    });

    it('enqueue should return promise that would be fulfilled on task resolve', function(done) {
        var queue = new Queue(),
            defer = vow.defer();

        queue.enqueue(
            function() {
                return defer.promise();
            }).then(function(res) {
                res.should.be.equal('ok');
                done();
            });

        queue.start();

        defer.resolve('ok');
    });

    it('enqueue should return promise that would be rejected on task fail', function(done) {
        var queue = new Queue(),
            defer = vow.defer();

        queue.enqueue(
            function() {
                return defer.promise();
            }).fail(function(res) {
                res.should.be.equal('err');
                done();
            });

        defer.reject('err');

        queue.start();
    });

    it('enqueue should return promise for synchronous task', function(done) {
        var queue = new Queue();

        queue.enqueue(
            function() {
                return 'ok';
            }).then(function(res) {
                res.should.be.equal('ok');
                done();
            });

        queue.start();
    });

    it('should run tasks while weight limit not exceeded', function(done) {
        var queue = new Queue({ weightLimit : 2 }),
            d1 = vow.defer(),
            d2 = vow.defer(),
            d3 = vow.defer(),
            callCount = 0;

        queue.enqueue(function() {
            callCount++;
            return d1.promise();
        });

        queue.enqueue(function() {
            callCount++;
            return d2.promise();
        });

        queue.enqueue(function() {
            callCount++;
            return d3.promise();
        });

        queue.start();

        nextTick(function() {
            callCount.should.be.equal(2);
            done();
        });
    });

    it('should run tasks with the release of the queue', function(done) {
        var queue = new Queue({ weightLimit : 2 }),
            d1 = vow.defer(),
            d2 = vow.defer(),
            d3 = vow.defer(),
            callCount = 0,
            p1task = queue.enqueue(function() {
                callCount++;
                return d1.promise();
            });

        queue.enqueue(function() {
            callCount++;
            return d2.promise();
        });

        queue.enqueue(function() {
            callCount++;
            return d3.promise();
        });

        queue.enqueue(function() {
            callCount++;
            return d3.promise();
        });

        d1.resolve();
        p1task.then(function() {
            callCount.should.be.equal(2);
            done();
        });

        queue.start();
    });

    it('should run tasks with the release of the queue and according to their weights', function(done) {
        var queue = new Queue({ weightLimit : 5 }),
            d1 = vow.defer(),
            d2 = vow.defer(),
            d3 = vow.defer(),
            d4 = vow.defer(),
            d5 = vow.defer(),
            callCount = 0,
            p1task = queue.enqueue(function() {
                callCount++;
                return d1.promise();
            }),
            p2task = queue.enqueue(
                function() {
                    callCount++;
                    return d2.promise();
                },
                { weight : 4 });

        queue.enqueue(
            function() {
                callCount++;
                return d3.promise();
            },
            { weight : 2 });

        var p4task = queue.enqueue(
                function() {
                    callCount++;
                    return d4.promise();
                },
                { weight : 3 }),
            p5task = queue.enqueue(
                function() {
                    callCount++;
                    return d5.promise();
                },
                { weight : 2 });

        queue.start();

        nextTick(function() {
            callCount.should.be.equal(2);
        });

        d1.resolve();

        p1task.then(function() {
            callCount.should.be.equal(2);
            d2.resolve();
            p2task.then(function() {
                callCount.should.be.equal(2);
                d4.resolve();
                p4task.then(function() {
                    callCount.should.be.equal(4);
                    d5.resolve();
                    p5task.then(function() {
                        callCount.should.be.equal(5);
                        done();
                    });
                });
            });
        });
    });

    it('should run tasks if new limit is increased', function(done) {
        var queue = new Queue({ weightLimit : 3 }),
            d1 = vow.defer(),
            d2 = vow.defer(),
            d3 = vow.defer(),
            d4 = vow.defer(),
            d5 = vow.defer(),
            callCount = 0;

        queue.enqueue(function() {
            callCount++;
            return d1.promise();
        });

        queue.enqueue(
            function() {
                callCount++;
                return d2.promise();
            },
            { weight : 2 });

        queue.enqueue(function() {
            callCount++;
            return d3.promise();
        });

        queue.enqueue(function() {
            callCount++;
            return d4.promise();
        });

        queue.enqueue(function() {
            callCount++;
            return d5.promise();
        });

        queue.start();

        nextTick(function() {
            callCount.should.be.equal(2);

            queue.setParams({ weightLimit : 5 });

            nextTick(function() {
                callCount.should.be.equal(4);
                done();
            });
        });
    });

    it('should throw exception if task weight more than weight limit of queque', function(done) {
        var queue = new Queue({ weightLimit : 5 });

        (function() {
            queue.enqueue(function() {}, { weight : 6 });
        }).should.throw('task with weight of 6 can\'t be performed in queue with limit of 5');

        done();
    });

    it('should pass notification', function(done) {
        var queue = new Queue();

        queue
            .enqueue(function() {
                var defer = vow.defer();
                setTimeout(function() {
                    defer.notify('notify');
                }, 20);
                return defer.promise();
            })
            .progress(function(val) {
                val.should.be.equal('notify');
                done();
            });

        queue.start();
    });

    describe('start/stop', function() {
        it('should not run task while if it is not started', function(done) {
            var queue = new Queue(),
                passed = true;

            queue.enqueue(function() {
                passed = false;
            });

            setTimeout(function() {
                passed.should.be.true;
                done();
            }, 20);
        });

        it('should not notify about processed task if it is stopped', function(done) {
            var queue = new Queue(),
                passed = true;

            queue.enqueue(function() { return 'ok'; }).then(function() {
                passed = false;
            });

            queue.start();
            queue.stop();

            setTimeout(function() {
                passed.should.be.true;
                done();
            }, 20);
        });

        it('should notify about processed task after it is started', function(done) {
            var queue = new Queue(),
                res = [];

            vow.all([
                queue.enqueue(function() { return 1; }),
                queue.enqueue(function() { return 2; })
            ]).then(function(_res) {
                res = _res;
            });

            queue.start();
            queue.stop();

            setTimeout(function() {
                res.should.be.eql([]);
                queue.start();
                setTimeout(function() {
                    res.should.be.eql([1, 2]);
                    done();
                }, 20);
            }, 20);
        });
    });

    describe('stats', function() {
        it('should properly count pending tasks counter', function(done) {
            var queue = new Queue();

            queue.getStats().pendingTasksCount.should.be.equal(0);

            queue
                .enqueue(function() {})
                .done(function() {
                    queue.getStats().pendingTasksCount.should.be.equal(0);
                    done();
                });

            queue.getStats().pendingTasksCount.should.be.equal(1);

            queue.start();
        });

        it('should properly count processing tasks counter', function(done) {
            var queue = new Queue();

            queue.getStats().processingTasksCount.should.be.equal(0);

            queue
                .enqueue(function() {
                    return vow.resolve('ok').delay(30);
                })
                .done(function() {
                    queue.getStats().processingTasksCount.should.be.equal(0);
                    done();
                });

            queue.getStats().processingTasksCount.should.be.equal(0);

            setTimeout(
                function() {
                    queue.getStats().processingTasksCount.should.be.equal(1);
                },
                10);

            queue.start();
        });

        it('should properly count processed tasks counter', function(done) {
            var queue = new Queue();

            queue.getStats().processedTasksCount.should.be.equal(0);

            queue
                .enqueue(function() {})
                .done(function() {
                    queue.getStats().processedTasksCount.should.be.equal(1);
                    done();
                });

            queue.getStats().processedTasksCount.should.be.equal(0);

            queue.start();
        });
    });
});
