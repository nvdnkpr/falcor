var jsong = require("../bin/Falcor");
var Model = jsong.Model;
var inspect = require("util").inspect;
var chai = require("chai");
var expect = chai.expect;
var Cache = require("./data/Cache");
var LocalDataSource = require("./data/LocalDataSource");
var _ = require("lodash");
var noOp = function() {};

module.exports = {
    validateData: validateData,
    validateOperation: validateOperation,
    transformData: function(data) {
        var keys = Object.keys(data);
        var prefixesAndSuffixes = keys.reduce(function(acc, curr) {
            if (~curr.indexOf("As")) {
                acc[1].push(curr);
            } else if (~curr.indexOf("get") || ~curr.indexOf("set")) {
                acc[0].push(curr);
            } else {
                // optimizedPaths, missing paths, etc.
                acc[2].push(curr);
            }
            return acc;
        }, [[], [], []]);
        var universalExpectedValues = prefixesAndSuffixes.pop().reduce(function(acc, k) {
            acc[k] = data[k];
            return acc;
        }, {});
        return {
            prefixesAndSuffixes: prefixesAndSuffixes,
            universalExpectedValues: universalExpectedValues
        }
    },
    convertIntegers: traverseAndConvert,
    clean: clean,
    compare: function(expected, actual, message) {
        expect(clean(actual), message).to.deep.equals(clean(expected));
    },
    getModel: function(dataSource, cache, errorSelector) {
        dataSource = dataSource || dataSource !== null && new LocalDataSource(Cache(), {errorSelector: errorSelector});
        cache = cache || Cache();
        return new Model({
            source: dataSource,
            cache: cache || {},
            errorSelector: errorSelector
        });
    },
    get: function(model, query, output) {
        var obs;
        if (output === 'selector') {
            obs = model.get(query, noOp);
        } else {
            obs = model.get(query)[output]();
        }

        return obs;
    },
    set: function(model, query, output) {
        var obs;
        if (output === 'selector') {
            obs = model.set(query, noOp);
        } else {
            obs = model.set(query)[output]();
        }

        return obs;
    },
    jsongBindException: 'It is not legal to use the JSON Graph format from a bound Model. JSON Graph format can only be used from a root model.'
};
function clean(item) {
    traverseAndConvert(item);
    strip(item, "__generation", "pathSetIndex");
    return item;
}

function validateData(expected, actual) {
    expect(actual, "actual").to.be.ok;
    if(actual.values) {
        expect(actual.values, "actual.values").to.be.ok;
    }
    expect(actual.errors, "actual.errors").to.be.ok;
    expect(actual.requestedMissingPaths, "actual.requestedMissingPaths").to.be.ok;
    expect(actual.optimizedMissingPaths, "actual.optimizedMissingPaths").to.be.ok;
    expect(Object.keys(expected).length, "expected.keys.length > 0").to.be.ok;
}

function validateOperation(name, expected, actual, messageSuffix) {
    expected = _.cloneDeep(expected);

    // Removes all 5 !== "5" errors when it comes to pathValues.
    traverseAndConvert(actual);
    traverseAndConvert(expected);
    strip(expected, "$type", "__generation", "__key");
    strip(actual, "$type", "__generation", "__key", "pathSetIndex");

    if (expected.values) {
        expect(actual.values, name + ".values " + messageSuffix).
            to.deep.equals(expected.values);
    }
    if (expected.errors) {
        expect(actual.errors, name + ".errors " + messageSuffix).
            to.deep.equals(expected.errors);
    }
    if (expected.optimizedPaths) {
        expect(actual.optimizedPaths, name + ".optimizedPaths " + messageSuffix).
            to.deep.equals(expected.optimizedPaths);
    }
    if (expected.requestedMissingPaths) {
        expect(actual.requestedMissingPaths, name + ".requestedMissingPaths " + messageSuffix).
            to.deep.equals(expected.requestedMissingPaths);
    }
    if (expected.optimizedMissingPaths) {
        expect(actual.optimizedMissingPaths, name + ".optimizedMissingPaths " + messageSuffix).
            to.deep.equals(expected.optimizedMissingPaths);
    }
}

function traverseAndConvert(obj) {
    if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            if (typeof obj[i] === "object") {
                traverseAndConvert(obj[i]);
            } else if (typeof obj[i] === "number") {
                obj[i] = obj[i] + "";
            } else if(typeof obj[i] === "undefined") {
                obj[i] = null;
            }
        }
    } else if (obj != null && typeof obj === "object") {
        Object.keys(obj).forEach(function(k) {
            if (typeof obj[k] === "object") {
                traverseAndConvert(obj[k]);
            } else if (typeof obj[k] === "number") {
                obj[k] = obj[k] + "";
            } else if(typeof obj[k] === "undefined") {
                obj[k] = null;
            }
        });
    }
    return obj;
}

function strip(obj, key) {
    var keys = Array.prototype.slice.call(arguments, 1);
    var args = [0].concat(keys);
    if (obj != null && typeof obj === "object") {
        Object.keys(obj).forEach(function(k) {
            if (~keys.indexOf(k)) {
                delete obj[k];
            } else if ((args[0] = obj[k]) != null && typeof obj[k] === "object") {
                strip.apply(null, args);
            }
        });
    }
}
