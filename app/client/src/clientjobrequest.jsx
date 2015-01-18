//
//	ClientJobRequest - Represents a single job request sent to a worker script from the client layer.
//

var ipc = window.ipc || require( 'ipc' );
var browserRequests = {};

function ClientJobRequest( params ) {
    this.job = params.job;
    this.args = params.args;
    this.onSuccess = params.onSuccess;
    this.onFailure = params.onFailure;

    //  Create a browser-side job request.
    this.id = ipc.sendSync( 'BrowserJobRequest.create', {
        job: this.job,
        args: this.args,
    } );
    browserRequests[ this.id ] = this;
}

ClientJobRequest.prototype.handleFailure = function() {
    console.log( this.job + ' job failed with error: ' + this.errorCode + ' - ' + this.errorMessage );
    if ( this.onFailure )
        this.onFailure( this, this.errorCode, this.errorMessage );
    
    delete browserRequests[ this.id ];
}

ClientJobRequest.prototype.handleSuccess = function() {
    if ( this.onSuccess )
        this.onSuccess( this, this.result );
    
    delete browserRequests[ this.id ];
}

//
//	ClientJobRequest IPC stuff; handles status updates and finish notifications from the browser layer.
//

ipc.on( 'BrowserJobRequest.update', function( details ) {
    var request = browserRequests[ details.id ];
    if ( request ) {
        for ( var i in details )
            request[ i ] = details[ i ];
        
        if ( request.state == 'failed' )
            request.handleFailure();
        else if ( request.state == 'succeeded' )
            request.handleSuccess();
    }
} );
