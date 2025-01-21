function evalInScope (s, context) {
    let _result;
    context["_s"] = s
    with (makeScope(context)) {
        if (/^ *\{/.test(_s)) {
            // object literal
            _result = eval("(" + _s + ")")
        } else {
            _result = eval(_s)
        }

        return _result
    }
}

function runInScope(f, context) {
    let _result;
    context["f"] = f
    with (makeScope(context)) {
        _result = f()
        return _result
    }
}

function makeScope (target) {
    return new Proxy(target, {
        has(target, prop) { return true; },
        get(target, prop) { return (prop in target ? target : window)[prop]; }
    });
}

exports["evalInScope"] = evalInScope
exports["makeScope"] = makeScope
exports["runInScope"] = runInScope
