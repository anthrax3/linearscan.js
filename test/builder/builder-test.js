'use strict';

var assertText = require('assert-text');
assertText.options.trim = true;

var fixtures = require('../fixtures');

function check(b, expected) {
  var out = '';
  for (var i = 0; i < b.intervals.length; i++) {
    var interval = b.intervals[i];
    out += interval.node.index + '. ' + interval.node.opcode + ' ';

    var ranges = interval.ranges.map(function(range) {
      return '[' + range.start + ';' + range.end + ')';
    }).join(', ');

    out += ranges + '\n';
  }

  assertText.equal(out, fixtures.fn2str(expected));
}

describe('Interval Builder', function() {
  it('should work on branch', function() {
    var b = fixtures.createBuilder(function() {/*
      pipeline {
        b0 {
          i0 = literal 3
          i1 = branch
        }
        b0 -> b1, b2

        b1 {
          i2 = literal 1
        }
        b1 -> b3

        b2 {
          i3 = literal 2
        }
        b2 -> b3

        b3 {
          i4 = ssa:phi i2, i3
          i5 = add i0, i4
          i6 = return i5
        }
      }
    */});

    b.buildIntervals();

    check(b, function() {/*
      0. start [4;6)
      1. region [6;7)
      2. region [7;8)
      3. region [8;11)

      4. literal [4;9)
      5. branch [5;6)
      6. literal [6;7)
      7. literal [7;8)
      8. ssa:phi [8;9)
      9. add [9;10)
      10. return [10;11)
    */});
  });

  it('should work on loops', function() {
    var b = fixtures.createBuilder(function() {/*
      pipeline {
        b0 {
          i0 = literal 0
          i1 = jump
        }
        b0 -> b1

        b1 {
          i2 = ssa:phi i0, i5
          i3 = branch
        }
        b1 -> b2, b3

        b2 {
          i4 = literal 1
          i5 = add i2, i4
          i6 = jump
        }
        b2 -> b1

        b3 {
          i7 = return i2
        }
      }
    */});

    b.buildIntervals();

    check(b, function() {/*
      0. start [4;6)
      1. region [6;8)
      2. region [8;11)
      3. region [11;12)
      4. literal [4;6)
      5. jump [5;6)
      6. ssa:phi [6;9), [11;11)
      7. branch [7;8)
      8. literal [8;9)
      9. add [9;11)
      10. jump [10;11)
      11. return [11;12)
    */});
  });
});
