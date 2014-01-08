var GudaLoader = {
    settings: {
        /* htmlType: template | html */
        htmlType: "template",
        /* where elements will be added, undefined=body */
        parentId: undefined,
        debug: false
    },
    done: undefined,
    resCount: undefined,
    urlParentMap: {},
    addRes: function addRes(data, url) {
        var innerHTML = data.url || data,
            type = url.substr(url.lastIndexOf(".")+1),
            el,
            parent = GudaLoader.urlParentMap[url] ? (document.getElementById(GudaLoader.urlParentMap[url]) || document.body) : 
                    (GudaLoader.settings.parentId ? 
                    (document.getElementById(GudaLoader.settings.parentId) || document.body) : 
                    document.body);
                                                
        switch(type) {
            case "js":
                el = document.createElement("script");
                el.type = "text/javascript";
                break;
            case "json":
                case "js":
                el = document.createElement("script");
                el.type = "text/x-json";
                break;
            case "html":
                if(GudaLoader.settings.htmlType === "template") {
                    el = document.createElement("script");
                    el.type = "text/x-guda-template";
                }
                else if(GudaLoader.settings.htmlType === "html") {
                    el = document.createElement("div");
                    el.className = "guda-template";
                }
                break;
            case "css":
                el = document.createElement("style");
                el.type = "text/css";
                break;
        }
        
        el.innerHTML = innerHTML;
        parent.appendChild(el);
        localStorage[url] = innerHTML;
        GudaLoader[url] = innerHTML;
        GudaLoader.resCount--;
        
        if(GudaLoader.resCount <= 0 && GudaLoader.done) GudaLoader.done();
    },
    load: function load(array) {
        GudaLoader.resCount = array.length;
        for(var i=0, l=array.length; i<l; ++i) {
            var url = array[i].url || array[i],
                parent = array[i].parent;
            GudaLoader.urlParentMap[url] = parent;
            if(!GudaLoader.settings.debug && localStorage[url]) {
                GudaLoader.addRes(localStorage[url], url);
                continue;
            }
            getAjax(url).done = GudaLoader.addRes;
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
