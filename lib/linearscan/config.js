'use strict';

var linearscan = require('../linearscan');
var Opcode = linearscan.Opcode;
var Operand = linearscan.Operand;
var Interval = linearscan.Interval;

function Config(input, options) {
  this.input = input;
  this.options = options || {};
  this.registers = this.options.registers || [];
  this.opcodes = {};

  this.intervals = new Array(this.input.nodes.length);
  for (var i = 0; i < this.intervals.length; i++)
    this.intervals[i] = new Interval(this.input.nodes[i]);

  if (this.options.opcodes) {
    var keys = Object.keys(this.options.opcodes);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      this.defineOpcode(key, this.options.opcodes[key]);
    }
  }
}
module.exports = Config;

Config.create = function create(input, options) {
  return new Config(input, options);
};

Config.prototype.createOperand = function createOperand(options) {
  if (typeof options === 'string')
    return new Operand(options, null);

  return new Operand(options.kind, options.value);
};

Config.prototype.defineOpcode = function defineOpcode(name, options) {
  var opcode = new Opcode(name);

  this.opcodes[opcode.name] = opcode;

  if (options.output)
    opcode.output = this.createOperand(options.output);

  if (options.inputs)
    for (var i = 0; i < options.inputs.length; i++)
      opcode.inputs.push(this.createOperand(options.inputs[i]));

  if (options.scratches)
    for (var i = 0; i < options.scratches; i++)
      opcode.scratches.push(new Operand('register', null));

  if (options.spill)
    for (var i = 0; i < options.spill; i++)
      opcode.scratches.push(new Operand('register', options.spill[i]));

  return opcode;
};