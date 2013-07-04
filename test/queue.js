var Queue = require('../lib/queue'),
    vow = require('vow');

describe('queue', function() {
    it('should run tasks while weight limit not exceeded', function(done) {
        var queue = new Queue({ weightLimit : 2 }),
            p1 = vow.promise(),
            p2 = vow.promise(),
            p3 = vow.promise(),
            callCount = 0;

        queue.enqueue(function() {
            callCount++;
            return p1;
        });

        queue.enqueue(function() {
            callCount++;
            return p2;
        });

        queue.enqueue(function() {
            callCount++;
            return p3;
        });

        process.nextTick(function() {
            callCount.should.be.equal(2);
            done();
        });
    });

    it('should run tasks with the release of the queue', function(done) {
        var queue = new Queue({ weightLimit : 2 }),
            p1 = vow.promise(),
            p2 = vow.promise(),
            p3 = vow.promise(),
            callCount = 0;

        var p1task = queue.enqueue(function() {
            callCount++;
            return p1;
        });

        queue.enqueue(function() {
            callCount++;
            return p2;
        });

        queue.enqueue(function() {
            callCount++;
            return p3;
        });

        queue.enqueue(function() {
            callCount++;
            return p3;
        });

        p1.fulfill();
        p1task.then(function() {
            callCount.should.be.equal(3);
            done();
        });
    });

    it('should run tasks with the release of the queue and according their weights', function(done) {
        var queue = new Queue({ weightLimit : 5 }),
            p1 = vow.promise(),
            p2 = vow.promise(),
            p3 = vow.promise(),
            p4 = vow.promise(),
            p5 = vow.promise(),
            callCount = 0;

        var p1task = queue.enqueue(function() {
            callCount++;
            return p1;
        });

        var p2task = queue.enqueue(
            function() {
                callCount++;
                return p2;
            },
            { weight : 4 });

        queue.enqueue(
            function() {
                callCount++;
                return p3;
            },
            { weight : 2 });

        var p4task = queue.enqueue(
            function() {
                callCount++;
                return p4;
            },
            { weight : 3 });

        queue.enqueue(
            function() {
                callCount++;
                return p5;
            },
            { weight : 2 });

        process.nextTick(function() {
            callCount.should.be.equal(2);
        });

        p1.fulfill();
        p1task.then(function() {
            callCount.should.be.equal(2);
            p2.fulfill();
            p2task.then(function() {
                callCount.should.be.equal(4);
                p4.fulfill();
                p4task.then(function() {
                    callCount.should.be.equal(5);
                    done();
                });
            });
        });
    });

    it('should run tasks if new limit is increased', function(done) {
        var queue = new Queue({ weightLimit : 3 }),
            p1 = vow.promise(),
            p2 = vow.promise(),
            p3 = vow.promise(),
            p4 = vow.promise(),
            p5 = vow.promise(),
            callCount = 0;

        queue.enqueue(function() {
            callCount++;
            return p1;
        });

        queue.enqueue(
            function() {
                callCount++;
                return p2;
            },
            { weight : 2 });

        queue.enqueue(function() {
            callCount++;
            return p3;
        });

        queue.enqueue(function() {
            callCount++;
            return p4;
        });

        queue.enqueue(function() {
            callCount++;
            return p5;
        });

        process.nextTick(function() {
            callCount.should.be.equal(2);

            queue.params({ weightLimit : 5 });

            process.nextTick(function() {
                callCount.should.be.equal(4);
                done();
            });
        });
    });

    it('should throw exception if task weight more than weight limit of queque', function(done) {
        var queue = new Queue({ weightLimit : 5 });

        (function() {
            queue.enqueue(function() {}, { weight : 6 });
        }).should.throw('task with weight 6 couldn\'t be executed in queue with weight limit of 5');

        done();
    });
});