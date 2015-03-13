var ignores = [];

process.on('uncaughtException', function( err ) {
    if ( ignores.indexOf( err.message ) == -1 )
        console.error( err.stack );
} );

var ErrorHandler = {

    ignore: function( message ) {
        ignores.push( message );
    },
    
    clearIgnores: function() {
        ignores = [];
    },

};
module.exports = ErrorHandler;
