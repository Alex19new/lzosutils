/* Copyright 2007 by Oliver Steele.  Available under the MIT License. */


/*
 * AJAX
 */

function ajax(options) {
    ajax.setup && ajax.setup(options);
    if (options.proxied)
        return ajax.proxied(options);
    var url = options.url,
        onsuccess = options.success,
        onerror = options.error,
        loader = new LoadVars,
        post = options.type.toUpperCase()=='POST';
    if (post) {
        var sender = new LoadVars;
        for (var name in options.data)
            sender[name] = options.data[name];
    } else {
        if (options.data) {
            var queryString = Hash.toQueryString(options.data);
            if (queryString.length)
                url = [url, url.indexOf('?') >= 0 ? '&' : '?', queryString
                      ].join('');
        }
        // add timestamp
        if (!options.cache)
            url = [url, url.indexOf('?') >= 0 ? '&' : '?',
                   '_ts=', (new Date).getTime()].join('');
    }
    loader.onLoad = function(success) {
        if (!success)
            onerror ? onerror() : console.error(url);
    }
    loader.onData = function(data) {
        data = data && data.strip();
        var json = data && JSON.parse(data);
        ajax.lastResult = {url:url, json:json, data:data};
        if ((data && !json) || data == undefined)
            return onerror ? onerror() : console.error(url);
        onsuccess && onsuccess(json);
    };
    ajax.trace && console.info(post ? 'POST' : 'GET', url);
    post
        ? sender.sendAndLoad(url, loader, 'POST')
        : loader.load(url);
}

ajax.proxied = function(options) {
    var url = options.url;
    if (!options.cache)
        url = [url, url.indexOf('?') >= 0 ? '&' : '?',
               '_ts=', (new Date).getTime()].join('');
    var handlers = {
        url: url,               // for debugging
        success: options.success,
        failure: options.error
    };
    var options = {
        url: options.url,
        cache: options.cache || false,
        data: options.data,
        dataType: 'json',
        type: options.type
    };
    // get the defaults
    if (!options.data) delete options.data;
    if (!options.type) delete options.type;
    FlashBridge.call('ajaxProxy', options).
    onreturn(function(record) {
        ajax.handleProxiedResponse(handlers, record.method, record.data);
    });
}

ajax.handleProxiedResponse = function(record, method, data) {
    var callback = record[method];
    // special cases
    switch (method) {
    case 'success':
        // collect it for debugging
        ajax.lastResult = data;
        break;
    case 'error':
        // report an error if the caller isn't going to
        callback || console.error(record.url);
        break;
    }
    callback && callback(data);
}

ajax.get = function(url, params, onsuccess, onerror) {
    if (typeof params == 'function') {
        onerror = onsuccess;
        onsuccess = params;
        params = {};
    }
    ajax({url:url, data:params, success:onsuccess, error:onerror});
}

ajax.post = function(url, params, onsuccess, onerror) {
    if (typeof params == 'function') {
        onerror = onsuccess;
        onsuccess = params;
        params = {};
    }
    ajax({url:url, data:params, success:onsuccess, error:onerror, type:'POST'});
}
