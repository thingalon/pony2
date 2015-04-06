var nodeunit = require('nodeunit/lib/nodeunit.js'),
    utils = require('nodeunit/lib/utils.js'),
    fs = require('fs'),
    track = require('nodeunit/lib/track.js'),
    path = require('path'),
    AssertionError = require('nodeunit/lib/assert.js').AssertionError,
    app = require('app');

/**
 * Reporter info string
 */

exports.info = 'PonyEdit custom test reporter. Based on the default, forces Atom-shell to exit at the end.';

/**
 * Run all tests within each module, reporting the results to the command-line.
 *
 * @param {Array} files
 * @api public
 */

exports.run = function (files, options, callback) {
    if (!options) {
        options = {
            "error_prefix": "\u001B[31m",
            "error_suffix": "\u001B[39m",
            "ok_prefix": "\u001B[32m",
            "ok_suffix": "\u001B[39m",
            "bold_prefix": "\u001B[1m",
            "bold_suffix": "\u001B[22m",
            "assertion_prefix": "\u001B[35m",
            "assertion_suffix": "\u001B[39m"
        };
    }

    var error = function (str) {
        return options.error_prefix + str + options.error_suffix;
    };
    var ok    = function (str) {
        return options.ok_prefix + str + options.ok_suffix;
    };
    var bold  = function (str) {
        return options.bold_prefix + str + options.bold_suffix;
    };
    var assertion_message = function (str) {
        return options.assertion_prefix + str + options.assertion_suffix;
    };

    var start = new Date().getTime();
    var tracker = track.createTracker(function (tracker) {
        if (tracker.unfinished()) {
            console.log('');
            console.log(error(bold(
                'FAILURES: Undone tests (or their setups/teardowns): '
            )));
            var names = tracker.names();
            for (var i = 0; i < names.length; i += 1) {
                console.log('- ' + names[i]);
            }
            console.log('');
            console.log('To fix this, make sure all tests call test.done()');
            process.reallyExit(tracker.unfinished());
        }
    });

	var opts = {
	    testspec: options.testspec,
	    testFullSpec: options.testFullSpec,
        moduleStart: function (name) {
            console.log('\n' + bold(name));
        },
        testDone: function (name, assertions) {
            tracker.remove(name);

            if (!assertions.failures()) {
                console.log('✔ ' + name);
            }
            else {
                console.log(error('✖ ' + name) + '\n');
                assertions.forEach(function (a) {
                    if (a.failed()) {
                        a = utils.betterErrors(a);
                        if (a.error instanceof AssertionError && a.message) {
                            console.log(
                                'Assertion Message: ' +
                                assertion_message(a.message)
                            );
                        }
                        console.log(a.error.stack + '\n');
                    }
                });
            }
        },
        done: function (assertions, end) {
            var end = end || new Date().getTime();
            var duration = end - start;
            if (assertions.failures()) {
                console.log(
                    '\n' + bold(error('FAILURES: ')) + assertions.failures() +
                    '/' + assertions.length + ' assertions failed (' +
                    assertions.duration + 'ms)'
                );
            }
            else {
                console.log(
                   '\n' + bold(ok('OK: ')) + assertions.length +
                   ' assertions (' + assertions.duration + 'ms)'
                );
            }
            
            callback = function(err) {
                if (err) {
                    process.exit(1);
                }
                
                app.quit();
            };

            if (callback) callback(assertions.failures() ? new Error('We have got test failures.') : undefined);
        },
        testStart: function(name) {
            tracker.put(name);
        }
    };
	if (files && files.length) {
	    var paths = files.map(function (p) {
	        return path.resolve(p);
	    });
	    nodeunit.runFiles(paths, opts);
	} else {
		nodeunit.runModules(files,opts);
	}
};
