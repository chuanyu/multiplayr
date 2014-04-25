var Multiplayr = (function() {
    var Multiplayr = {
        extendRule: ExtendRule,
        host: Host,
        join: Join,
        createDataType: CreateDataType,
        PrimitiveType: CreateDataType(_primitiveType),

        setGamerulesPath: SetGamerulesPath,
        getGamerulesPath: GetGamerulesPath,
        loadRule: LoadRule
    };

    var _gamerulesPath = '';

    /**
     * Modular gamerules functions
     */
    function SetGamerulesPath(path) {
        _gamerulesPath = path;
    }
    function GetGamerulesPath() {
        return _gamerulesPath;
    }
    function LoadRule(rule, cb) {
        function src(rule) {
            return _gamerulesPath + rule + '/' + rule + '.js';
        }
        if (typeof rule === 'string') {
            loadJs(src(rule), cb);
        } else if (isArray(rule)) {
            // load them sequentially
            var cnt = rule.length;

            function loadNum(ruleInd) {
                loadJs(src(rule[ruleInd]), function() {
                    if (ruleInd + 1 === cnt && isFunction(cb)) {
                        cb();
                    } else if (ruleInd + 1 < cnt) {
                        loadNum(ruleInd + 1);
                    }
                });
            }
            loadNum(0);

        }
    }
    function LoadRuleCss(ruleName, css, cb) {
        function src(cssName) {
            return _gamerulesPath + ruleName + '/' + cssName;
        }
        if (typeof css === 'string') {
            loadJs(src(css), cb);
        } else if (isArray(css)) {
            var cnt = css.length;
            for (var i=0;i<css.length;++i) {
                loadCss(src(css[i]), function() {
                    --cnt;
                    if (cnt === 0 && isFunction(cb)) {
                        cb();
                    }
                });
            }
        }
    }


    function loadJs(src, cb) {
        var scr = document.createElement('script');
        scr.setAttribute('src', src);
        scr.onload = cb;
        document.body.appendChild(scr);
    }
    function loadCss(src, cb) {
        var lnk = document.createElement('link');
        lnk.setAttribute('rel', 'stylesheet');
        lnk.setAttribute('type', 'text/css');
        lnk.setAttribute('href', src);
        lnk.onload = cb;
        document.body.appendChild(lnk);
    }

    /**
     * Multiplayr class creation function
     */
    function CreateDataType(classDef) {
        return classDef;
    }
    var _primitiveType = {
        constructor: function(v) {
            this.value = v;
        },
        setter: function(v) {
            this.value = v;
        },
        getter: function() {
            return this.value
        }
    };

    function LoadRuleCssDeep(rule) {
        LoadRuleCss(rule.name, rule.css);
        for (var plugin in rule.plugins) {
            if (rule.plugins.hasOwnProperty(plugin)) {
                LoadRuleCssDeep(rule.plugins[plugin]);
            }
        }
    }

    function Host(rule, container, io, uri, cb) {
        var comm = new MPProtocol(io, uri);

        // Create a new room
        comm.create(function(err, data) {
            if (err) {
                if (isFunction(cb)) {
                    cb(err, false);
                } else {
                    throw new Error(err);
                }
            }

            LoadRuleCssDeep(rule);

            var gameObj = new MPGameObject(rule,
                                           comm,
                                           data.roomId,
                                           data.clientId,
                                           true,
                                           container);

            if (isFunction(cb)) {
                cb(null, gameObj);
            }
        });
    }

    function Join(roomId, rule, container, io, uri, cb) {
        var comm = new MPProtocol(io, uri);

        // Join a room
        comm.join(roomId, function(err, data) {
            if (err) {
                if (isFunction(cb)) {
                    cb(err, false);
                } else {
                    throw new Error(err);
                }
            }

            LoadRuleCssDeep(rule);

            var gameObj = new MPGameObject(rule,
                                           comm,
                                           roomId,
                                           data.clientId,
                                           false,
                                           container);

            if (isFunction(cb)) {
                cb(null, gameObj);
            }
        });
    }

    function setUpMethods(gameObj, methods) {
        function methodWrapper(exec) {
            return function() {
                exec.apply(gameObj, arguments);
            };
        }
        for (var method in methods) {
            gameObj[method] = methodWrapper(methods[method]);
        }
    }

    // Extends given baseRule with another rule. Note that this method mutates the given baseRule
    // returns the extended baseRule
    function ExtendRule(baseRule, extendedRule, namespace) {
        // if we are given a namespace, variables  will be prefixed with [namespace].variableName
        var prefix = namespace ? namespace + '.' : '';

        function checkConflict(baseObj, extendedObj, prefix) {
            for (var key in extendedObj) {
                var prefixedKey = prefix + key;
                if (extendedObj.hasOwnProperty(key)) {
                    if (baseObj.hasOwnProperty(prefixedKey)) {
                        throw("Conflicting key: " + prefixedKey);
                    }
                    // temp
                    baseObj[prefixedKey] = extendedObj[key];
                }
            }
        }

        ['methods', 'globalData', 'playerData', 'views'].forEach(function(key) {
            try {
                checkConflict(baseRule[key], extendedRule[key], prefix);
            } catch(e) {
                throw(new Error("ExtendRule['+key+'] - " + e));
            }
        });

        baseRule.plugins = baseRule.plugins || [];
        baseRule.plugins.push(extendedRule);

        return baseRule;
    }

    return Multiplayr;
})();
