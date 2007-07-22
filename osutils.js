/* Copyright 2007 by Oliver Steele.  All rights reserved. */

var gHostPrefix = 'http://styleandshare.com';
var gStaticHostPrefix = 'http://images.styleandshare.com';

if (LzBrowser.getLoadURL().indexOf(':8080') >= 0 || LzBrowser.getLoadURL().indexOf('zardoz.dev') >= 0) {
    gHost = 'zardoz.dev';
    gHostPrefix = 'http://' + gHost;
    gStaticHostPrefix = gHostPrefix;
} else if (LzBrowser.getLoadURL().indexOf('staging.styleandshare.com') >= 0) {
    gHostPrefix = 'http://staging.styleandshare.com';
}

LzLoadQueue.maxOpen = 10000;
//LzLoadQueue.__LZmonitorState = true;


/*
 * Image processing
 */

var Image = {};

Image.removeBackground = function(bitmap) {
    var l = 30;
    var w = bitmap.width - 1;
    var h = bitmap.height - 1;
    for (var x = 0; x < w+l; x += l) {
        x = Math.min(w, x);
        for (var y = 0; y < h+l; y += l) {
            y = Math.min(h, y);
            if (bitmap.getPixel(x, y) == 0xffffff)
                bitmap.floodFill(x, y, 0);
        }
    }
}

LzView.prototype.removeBitmapBackground = function() {
    var mc = this.getMCRef();
    var bitmap = this.bitmap = new flash.display.BitmapData(mc._width, mc._height, true, 0x80FFFFFF);
    bitmap.draw(mc);
    Image.removeBackground(bitmap);
    mc.attachBitmap(bitmap, mc.getNextHighestDepth(), 'always', true);
}


function animateRect(sourceView, targetView) {
    return;
    function getGlobalBounds(view) {
        function get(aname) {
            return view.getAttributeRelative(aname, canvas);
        }
        return {x: get('x'), y: get('y'), width: get('width'), height: get('height')};
    }
    var sourceRect = getGlobalBounds(sourceView);
    var targetRect = getGlobalBounds(targetView);
    var view = new ZoomRect(canvas, sourceRect);
    targetRect.vanish = 1;
    view.animators(targetRect, 500);
}


/*
 * Misc.
 */

var Template = {};

Template.expand = function(text, table) {
    var spans = [];
    for (var i = 0; i < text.length; ) {
        var i0 = text.indexOf('#{', i);
        if (i0 < 0) break;
        var i1 = text.indexOf('}', i0);
        if (i1 < 0) break;
        i0 > i && spans.push(text.slice(i, i0));
        var key = text.slice(i0+2, i1);
        spans.push(table[key]);
        i = i1+1;
    }
    text.length > 0 && spans.push(text.slice(i));
    return spans.join('');
}

Number.prototype.toCardinal = function(max) {
    var cardinals = arguments.callee.cardinals = arguments.callee['cardinals'] || ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    return this <= (max || Infinity) && cardinals[this] || String(this);
}

String.prototype.toCapitalized = function() {
    return this.slice(0, 1).toUpperCase() + this.slice(1);
}

var Size = function(width, height) {
    this.width = width;
    this.height = height;
}

Size.prototype.maxSizeTo = function(maxWidth, maxHeight) {
    arguments.length < 1 && (maxHeight = maxWidth);
    var width = Math.min(this.width, maxWidth);
    var height = Math.min(this.height, maxHeight);
    var ratio = this.width / this.height;
    if (width / height > ratio)
        width = height * ratio;
    else
        height = width / ratio;
    return new Size(width, height);
}

// requires that start tags are of the form '<a ' (the tagname is
// a space, not another form of whitespace), and that end tags are
// exactly '</a>'.  Doesn't deal with nested links.
String.prototype.colorizeLinks = function() {
    return (this
            .replace('<a ', '<font color="#0000ff"><a ')
            .replace('</a>', '</a></font>'));
}

LzBrowser.makeHTMLCallback = function(fname, arg) {
    return ['asfunction:_root.', fname, ',', arg].join('');
}


/*
 * Dragger
 */

Dragger = {}

Dragger.start = function(view) {
    var state = Dragger.state = {
        view: view,
        start: {x: canvas.getMouse('x'), y: canvas.getMouse('y')},
        last: {x: canvas.getMouse('x'), y: canvas.getMouse('y')},
        resizing: false
    };
    if (view['resizeHandle'] && view.resizeHandle.containsMouse()) {
        state.resizing = true;
        state.ratio = view.width / view.height;
        state.startSize = {width: view.width, height: view.height};
    }
}

Dragger.stop = function() {}

Dragger.handleMouseMove = function(view, x, y) {
    var state = Dragger.state;
    var dx = x - state.last.x;
    var dy = y - state.last.y;
    if (dx == 0 && dy == 0) return;
    if (view != state.view) return;
    if (state.resizing) {
        var width = w = Math.max(40, state.startSize.width + canvas.getMouse('x') - state.start.x);
        var height = h = Math.max(40, state.startSize.height + canvas.getMouse('y') - state.start.y);
        var ratio = width / height;
        if (ratio < state.ratio)
            width = height * state.ratio;
        else
            height = width / state.ratio;
        //info(w, h, ratio, width, height, width/height, state.ratio)
        view.setWidth(width);
        view.setHeight(height);
    } else {
        view.setX(view.x + dx);
        view.setY(view.y + dy);
    }
    state.last = {x: x, y: y};
}


/*
 * AJAX
 */


// AJAX w/ JSON
function ajax(url, onsuccess, onerror) {
    if (url.indexOf('http') < 0) url = gHostPrefix + url;
    var responseHolder = [];
    Debug.write('XHR', url);
    var req = new XMLHttpRequest();
    req.onreadystatechange = handleReadyStateChange;
    req.open("GET", url, true);
    req.send(null);
    if (typeof onsuccess == 'undefined') onsuccess = null;
    if (typeof onerror == 'undefined') onerror = null;
    function handleReadyStateChange(request) {
        if (request.readyState == 4) {
            if (request.status == 200) {
                var result = ajax.lastResult = JSON.parse(request.responseText);
                responseHolder.push(result);
                if (typeof result == 'string') {
                    error(result);
                    return;
                }
                onsuccess && onsuccess(result);
            } else {
                onerror ? onerror(result) : Debug.error(request);
            }
        }
    }
}

// JQuery compatability
function $() {}

$.get = function(url, params, options) {
    $.post(url, params, options);
}

// actually does GET
$.post = function(url, params, options) {
    if (url.indexOf('http') < 0) url = gHostPrefix + url;
    var query = Hash.toQueryString(params);
    if (query.length) {
        if (url.indexOf('?') < 0) url += '?';
        url += query;
    }
    var onsuccess = options = options || {};
    if (typeof options == 'function')
        options = {};
    else
        onsuccess = options['onsuccess'];
    ajax(url, onsuccess, options['onerror']);
}


/*
 * JS Bridge
 */

var FlashBridge = function() {
    this.callbacks = {};
    this.nextId = 0;
//     flash.external.ExternalInterface.addCallback("info", null, function(){
//         info.apply(null, arguments);
//     });
    flash.external.ExternalInterface.addCallback("handleCallback",
                                                 this, this.handleCallback);
    this.register('info', function() {info.apply(null,  arguments)});
}

FlashBridge.prototype.register = function(name, fn) {
    flash.external.ExternalInterface.addCallback(name, null, fn);
}

FlashBridge.prototype.call = function(fn) {
    var args = [];
    for (var i = 1; i < arguments.length; i++)
        args.push(arguments[i]);
    var callback = null;
    var callbackId = 0;
    if (callback) {
        callbackId = ++this.nextId;
        this.callbacks[id] = callback;
    }
    var expr = ['FlashBridge.handle("', fn, '",', JSON.stringify(args), ')'].join('');
    info(expr);
    LzBrowser.loadJS(expr);
}

FlashBridge.prototype.handleCallback = function(callbackId, result) {
    var handler = this.callbacks[callbackId];
    delete this.callbacks[callbackId];
    handler && handler(result)
}

FlashBridge = new FlashBridge();