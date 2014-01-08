/*
 * GUDA.JS
 *
 */

var __GUDA__ = {
    toCamelCase: function toCamelCase(string) {
        // http://stackoverflow.com/questions/10425287/convert-string-to-camelcase-with-regular-expression
        return string.toLowerCase().replace(/-(.)/g, function(match, group1) {
            return group1.toUpperCase();
        });
    },
    replaceAll: function replaceAll(str, replace, replaceWith) {
        return str.split(replace).join(replaceWith);
    },
    fileType: function fileType(str) {
        return str.substr(str.lastIndexOf(".")+1);
    },
    
    defaultSettings: {
        parseOnDone: true
    },
    setSettings: function(settings) {
        for(var k in __GUDA__.defaultSettings) {
            if(!settings[k]) settings[k] = __GUDA__.defaultSettings[k];
        }
        return settings;
    },
    
    // Parse raw html to guda template format
    parseRawHtml: function parseRawHtml(data) {
        var timestamp = new Date().getTime(),
            rawContainer = new DOMParser() || document.createElement("guda-raw-"+timestamp),
            templateParts,
            template = {
                children: {}
            };
        
        function addChildrens(parentDOM, addTo) {            
            for(var i=0, l=parentDOM.children.length; i<l; ++i) {
                var childDOM = parentDOM.children[i],
                    tagName = childDOM.tagName;
                
                if(tagName.charAt(0) !== "G") continue;
                
                var child = {
                    DOM: childDOM,
                    innerHTML: childDOM.innerHTML,
                    name: __GUDA__.toCamelCase(tagName.substr(2)),
                    children: []
                }
                template.children[child.name] = child;
                if(addTo) addTo.children.push(template.children[child.name]);
                addChildrens(template.children[child.name].DOM, template.children[child.name]);
            }
        }
        
        // Parse html
        if(rawContainer.tagName) rawContainer.innerHTML = data;
        else rawContainer = rawContainer.parseFromString(data, "text/html");
        
        // Find template parts
        templateParts = rawContainer.getElementsByTagName("guda-template");
        for(var i=0, l=templateParts.length; i<l; ++i) {
            addChildrens(templateParts[i]);
        }
        
        return template;
    },
    // Check if both template and components is set
    isDone: function isDone(guda) {
        if(guda.getTemplate() && guda.getComponents()) {
            if(guda.getSettings().parseOnDone) guda.parse();
            return true;
        }
        return false;
    },
    // Set template or components
    set: function set(data, type, done) {
        if(data.href) {
            __GUDA__.load(data.href, type).done = function(parsedData) {
                done && done(parsedData);
            }
        }
        else {
            done && done(type === "components" ? {children: data} : data);
        }
    },
    // Ini guda with given data
    init: function init(data) {
        if(!data.target || !data.template || !data.components) throw "Invalid data";
        this.setTarget(data.target);
        this.setTemplate(data.template);
        this.setComponents(data.components);
        return this;
    },
    // Load template or components file
    load: function load(url, type) {
        var _return = {
            done: undefined
        };
        getAjax(url).done = function(data) {
            var returnData,
                fileType = __GUDA__.fileType(url);
            
            if(type === "components") {
                if(fileType === "html") returnData = __GUDA__.parseRawHtml(data);
                if(fileType === "json") returnData = {children: JSON.parse(data)};
            }
            else returnData = data;
            _return.done && _return.done(returnData);
        }
        return _return;
    },
    findCommand: function findCommand(s, template) {
        var i = s.indexOf("::");
        if(i === -1) return false;
        
        var end = s.indexOf("::", i+1) + 2,
            command = s.substring(i, end);
        
        // Found forLoop
        if(command.indexOf("::for(") !== -1) {
            var close = s.indexOf("::/for::", end);
            if(close !== -1) {
                return [
                    i,
                    close +8,
                    // forLoop( command, loop body );
                    __GUDA__.parseForLoop(command, s.substring(end, close), template)
                ]
            }
        }
        
        else {
            return [i, end, __GUDA__.parseVariable(command, template)];
        }
    },
    parseForLoop: function parseForLoop(command, s, template) {
        command = command.substring(6, command.length - 3);
        var forInIndex = command.indexOf(" in ");
        if(forInIndex !== -1) {
            // for( v in from )
            var v = command.substring(0, forInIndex),
                from = command.substr(forInIndex+4),
                result = "";
            if(template.children[from]) 
            for(var i=0, l=template.children[from].children.length; i<l; ++i) {
                result += __GUDA__.parseRawString(template, __GUDA__.replaceAll(s, "["+v+"]", "["+i+"]"));
            }
            return result;
        }
    },
    getNthChild: function getNthChild(variableString, map) {
        variableString.split(".");
    },
    parseVariable: function parseVariable(command, parent) {
        var cparts = command.substring(2, command.length-2).split(".");
        
        function getIndex(v) {
            var bl = v.indexOf("[");
            if(bl === -1) return [-1, v];
            var br = v.indexOf("]");
            return [parseInt(v.substring(bl+1, br) ), v.substring(0, bl)];
        }
        
        function findChild(from, childName) {
            log(from);
            if(from.children[childName]) return from.children[childName];
            for(var i=0, l=from.children.length; i<l; ++i) {
                if(from.children[i].name === childName) return from.children[i];
            }
        }
        
        function getChild(from, childName) {
            if(!from) return undefined;
            var gi = getIndex(childName);
            if(gi[0] !== -1) return getChild(findChild(from, gi[1]), [gi[0]]);
            else return findChild(from, gi[1]);
        }
        
        var child = parent;
        for(var i=0, l=cparts.length; i<l; ++i) {
           child = getChild(child, cparts[i]);
        }
        
        return child ? (child.innerHTML || child) : command;
    },
    parseRawString: function(template, string) {
        var stringBuilder = "";
        
        while(string.length > 0) {
            var replacement = __GUDA__.findCommand(string, template);
            
            if(!replacement) {
                stringBuilder += string;
                break;
            }
            stringBuilder += string.substring(0, replacement[0]) + replacement[2] + string.charAt(replacement[1]);
            string = string.substr(replacement[1]+1);
        }
        return stringBuilder;
    },
    parse: function parse(components, template, target) {
        document.getElementById(target).innerHTML = __GUDA__.parseRawString(components, template);
    }
}

/*
 * initJSON = {
 *      template: html template || {href: link to template file},
 *      components: { guda component json } || {href: link to components file}
 */
var Guda = function(settings) {
    var _this = this,
        settings = __GUDA__.setSettings(settings || {}),
        target,
        template,
        componentsRaw,
        components,
        _return = {
            done: undefined,
            getSettings: function() { return settings; },
            parse: function() { __GUDA__.parse(components, template, target); },
            set: __GUDA__.init,
            setTarget: function(id) { target = id; },
            getTarget: function() { return target; },
            setTemplate: setTemplate,
            getTemplate: function() { return template; },
            setComponents: setComponents,
            getComponents: function() { return components; }
        }
    
    function setTemplate(data) {
        var _this = this;
        __GUDA__.set(data, "template", function(parsedData) {
            template = parsedData;
            if(__GUDA__.isDone(_this)) _return.done && _return.done();
        });
    }
    
    function setComponents(data) {
        var _this = this;
        __GUDA__.set(data, "components", function(parsedData) {log(parsedData);
            components = parsedData;
            if(__GUDA__.isDone(_this)) _return.done && _return.done();
        });
    }
    
    return _return;
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
			_return.done && _return.done(xmlhttp.responseText);
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
