var headless = require( './lib/headless.js' );

exports.Editor = {
    
    setUp: function( callback ) {
        headless.openBrowser( callback );
    },
    
    tearDown: function( callback ) {
        headless.closeBrowser();
        callback();
    },
    
    'can run a basic test with the UI loaded': function( test ) {
        test.done();
    },
    
};
