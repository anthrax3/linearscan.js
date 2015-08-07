'use strict';

var assert = require('assert');

var linearscan = require('../');
var Operand = linearscan.Operand;

describe('Interval', function() {
  var interval;
  beforeEach(function() {
    interval = new linearscan.Interval(null);
  });

  describe('ranges', function() {
    it('should add new range', function() {
      interval.addRange(0, 1);
      assert.equal(interval.ranges.length, 1);

      interval.addRange(2, 3);

      assert.equal(interval.ranges.length, 2);
      assert.equal(interval.ranges[0].end, 1);
      assert.equal(interval.ranges[1].start, 2);
    });

    it('should coalesce to previous range', function() {
      interval.addRange(0, 1);
      assert.equal(interval.ranges.length, 1);

      interval.addRange(1, 2);

      assert.equal(interval.ranges.length, 1);
      assert.equal(interval.ranges[0].start, 0);
      assert.equal(interval.ranges[0].end, 2);
    });

    it('should coalesce to next range', function() {
      interval.addRange(0, 1);
      interval.addRange(3, 4);
      assert.equal(interval.ranges.length, 2);

      interval.addRange(2, 3);

      assert.equal(interval.ranges.length, 2);
      assert.equal(interval.ranges[1].start, 2);
      assert.equal(interval.ranges[1].end, 4);
    });

    it('should support covers', function() {
      interval.addRange(0, 1);
      interval.addRange(3, 4);
      interval.addRange(2, 3);

      assert(interval.covers(0));
      assert(!interval.covers(1));
      assert(interval.covers(2));
      assert(interval.covers(3));
      assert(!interval.covers(4));
    });

    it('should update start', function() {
      interval.addRange(1, 2);
      interval.updateStart(0);

      assert(interval.covers(0));
      assert(interval.covers(1));
      assert(!interval.covers(2));
    });

    it('should support start()/end()', function() {
      interval.addRange(0, 1);
      interval.addRange(2, 3);

      assert.equal(interval.start(), 0);
      assert.equal(interval.end(), 3);
    });

    it('should not add empty range', function() {
      interval.addRange(10, 10);

      assert.equal(interval.ranges.length, 0);
    });

    describe('fillRange', function() {
      it('should fill empty interval', function() {
        interval.fillRange(0, 10);

        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 10);
      });

      it('should add chunk at interval start', function() {
        interval.addRange(11, 12);
        interval.fillRange(0, 10);

        assert.equal(interval.ranges.length, 2);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 12);
      });

      it('should add chunk at interval end', function() {
        interval.addRange(0, 10);
        interval.fillRange(11, 12);

        assert.equal(interval.ranges.length, 2);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 12);
      });

      it('should grow interval to the right', function() {
        interval.addRange(0, 10);
        interval.fillRange(8, 12);

        assert.equal(interval.ranges.length, 1);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 12);
      });

      it('should grow interval to the left', function() {
        interval.addRange(8, 12);
        interval.fillRange(0, 10);

        assert.equal(interval.ranges.length, 1);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 12);
      });

      it('should grow interval to both sides', function() {
        interval.addRange(8, 10);
        interval.fillRange(0, 12);

        assert.equal(interval.ranges.length, 1);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 12);
      });

      it('should consume/union middle intervals', function() {
        interval.addRange(8, 12);
        interval.addRange(6, 7);
        interval.addRange(3, 4);
        interval.addRange(0, 2);
        interval.fillRange(2, 9);

        assert.equal(interval.ranges.length, 1);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 12);
      });

      it('should union with adjacent interval', function() {
        interval.addRange(8, 12);
        interval.fillRange(0, 8);

        assert.equal(interval.ranges.length, 1);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 12);
      });

      it('should not shorten the range', function() {
        interval.fillRange(0, 10);
        interval.fillRange(0, 6);

        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 10);
      });

      it('should not fill empty range', function() {
        interval.fillRange(10, 10);

        assert.equal(interval.ranges.length, 0);
      });
    });
  });

  describe('uses', function() {
    it('should add use', function() {
      interval.use(3, new Operand('any'));
      interval.use(1, new Operand('any'));
      var use = interval.use(2, new Operand('any'));
      assert.equal(use.pos, 2);

      assert.equal(interval.uses[0].pos, 1);
      assert.equal(interval.uses[1].pos, 2);
      assert.equal(interval.uses[2].pos, 3);
    });

    it('should support firstUseAfter', function() {
      interval.use(3, new Operand('any'));
      interval.use(1, new Operand('any'));
      interval.use(2, new Operand('any'));

      var use = interval.firstUseAfter(1);
      assert.equal(use.pos, 1);

      var use = interval.firstUseAfter(3);
      assert.equal(use.pos, 3);

      var use = interval.firstUseAfter(-1);
      assert.equal(use.pos, 1);

      var use = interval.firstUseAfter(4);
      assert(use === null);
    });

    it('should support filtered firstUseAfter', function() {
      interval.use(1, new Operand('any'));
      interval.use(2, new Operand('register'));
      interval.use(3, new Operand('any'));

      var use = interval.firstUseAfter(1, 'register');
      assert.equal(use.pos, 2);

      var use = interval.firstUseAfter(3, 'register');
      assert(use === null);

      var use = interval.firstUseAfter(-1, 'register');
      assert.equal(use.pos, 2);

      var use = interval.firstUseAfter(4, 'register');
      assert(use === null);
    });
  });

  describe('splitting', function() {
    it('should create proper tree', function() {
      interval.addRange(0, 40);

      var a = interval.split(10);
      var b = a.split(20);
      var c = b.split(30);

      assert(a.parent === interval);
      assert(b.parent === interval);
      assert(c.parent === interval);

      assert.equal(interval.start(), 0);
      assert.equal(interval.end(), 10);
      assert.equal(a.start(), 10);
      assert.equal(a.end(), 20);
      assert.equal(b.start(), 20);
      assert.equal(b.end(), 30);
      assert.equal(c.start(), 30);
      assert.equal(c.end(), 40);
    });

    describe('ranges', function() {
      it('should split not covered ranges', function() {
        interval.addRange(0, 1);
        interval.addRange(2, 3);

        var child = interval.split(1);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 1);

        assert.equal(child.start(), 2);
        assert.equal(child.end(), 3);
      });

      it('should split covered ranges', function() {
        interval.addRange(0, 1);
        interval.addRange(2, 10);
        interval.addRange(12, 13);

        var child = interval.split(5);
        assert.equal(interval.start(), 0);
        assert.equal(interval.end(), 5);

        assert(interval.covers(0));
        assert(!interval.covers(1));
        assert(interval.covers(2));
        assert(!interval.covers(5));

        assert.equal(child.start(), 5);
        assert.equal(child.end(), 13);

        assert(child.covers(5));
        assert(child.covers(9));
        assert(!child.covers(10));
        assert(child.covers(12));
        assert(!child.covers(13));
      });
    });

    describe('uses', function() {
      it('should split uses without match', function() {
        interval.use(1, new Operand('any'));
        interval.use(3, new Operand('any'));
        interval.use(5, new Operand('any'));

        var child = interval.split(2);

        assert.equal(interval.uses.length, 1);
        assert.equal(interval.uses[0].pos, 1);

        assert.equal(child.uses.length, 2);
        assert.equal(child.uses[0].pos, 3);
        assert.equal(child.uses[1].pos, 5);
      });

      it('should split uses with match', function() {
        interval.use(1, new Operand('any'));
        interval.use(2, new Operand('any'));
        interval.use(3, new Operand('any'));

        var child = interval.split(2);

        assert.equal(interval.uses.length, 1);
        assert.equal(interval.uses[0].pos, 1);

        assert.equal(child.uses.length, 2);
        assert.equal(child.uses[0].pos, 2);
        assert.equal(child.uses[1].pos, 3);
      });
    });
  });
});
