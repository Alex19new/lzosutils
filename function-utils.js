/* Copyright 2007 by Oliver Steele.  All rights reserved. */

Function.I = function(x) {return x};
Function.K = function(x) {return function(){return x}};

Function.prototype.bind = function(thisObject) {
    var fn = this,
        args = [].slice.call(arguments, 1);
    return function() {
        return fn.apply(thisObject, args.concat([].slice.apply(arguments, 1)));
    }
}

Function.prototype.compose = function(other) {
    var fn = this,
        args = [].slice.call(arguments, 1);
    return function() {
        var v = other.apply(this, arguments);
        return fn.call(this, v);
    }
}

Function.prototype.each = function(sequence, thisObject) {
    for (var i = 0; i < sequence.length; i++)
        this.call(thisObject, sequence[i]);
}

Function.prototype.map = function(sequence, thisObject) {
    var results = new Array(sequence.length);
    for (var i = 0; i < sequence.length; i++)
        results[i] = this.call(thisObject, sequence[i]);
}

function isInstanceOf(klass) {
    return function(object) {
        return object instanceof klass;
    }
}

// Returns a projection \x -> \x[name](args...)
function invoke(name, args) {
    args = [].slice.call(args, 0);
    return function(object) {
        return object[name].apply(object, args.concat([].slice.call(arguments, 0)));
    }
}

// Returns a projection \x -> x[name]
function pluck(name) {
    return function(object) {
        return object[name];
    }
}