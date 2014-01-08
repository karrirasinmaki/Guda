var GudaLoader = {
    done: undefined,
    resCount: undefined,
    addRes: function addRes(data, url) {
        var type = url.substr(url.lastIndexOf(".")+1);
        
        switch(type) {
            case "js":
                el = document.createElement("script");
                el.type = "text/ecmascript";
                break;
            case "json":
                case "js":
                el = document.createElement("script");
                el.type = "text/x-json";
                break;
            case "html":
                el = document.createElement("script");
                el.type = "text/x-guda-template";
                break;
            case "css":
                el = document.createElement("style");
                el.type = "text/css";
                break;
        }
        
        el.innerHTML = data;
        document.body.appendChild(el);
        localStorage[url] = data;
        GudaLoader[url] = data;
        GudaLoader.resCount--;
        
        if(GudaLoader.resCount <= 0 && GudaLoader.done) GudaLoader.done();
    },
    load: function load() {
        GudaLoader.resCount = arguments.length;
        for(var i=0, l=arguments.length; i<l; ++i) {
            if(localStorage[arguments[i]] && false) {
                GudaLoader.addRes(localStorage[arguments[i]], arguments[i]);
                continue;
            }
            getAjax(arguments[i]).done = GudaLoader.addRes;
        }
    }
};

/* UTILS */
var log = console.log.bind(console);

var ajax = function(type, url, params) {
    var _return = {
        done: undefined
    };

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if(xmlhttp.readyState === 4) {
			_return.done && _return.done(xmlhttp.responseText, url, xmlhttp);
		}
	}
	xmlhttp.open(type, url, true);
    if(type === "post") xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xmlhttp.send(params || "");
    
    return _return;
}
var getAjax = function(url) { return ajax("get", url); }
var postAjax = function(url) {
    var strings = url.split("?");
    return ajax("post", strings[0], strings[1]);
}
