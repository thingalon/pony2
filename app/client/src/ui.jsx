var UI = React.createClass( {

    nextOverlayKey: 1,

    getInitialState: function() {
        return {
            currentFile: null,
            openFiles: [],
            overlays: {},
        };
    },
    
    openOverlay: function( overlay ) {
        var key = 'k' + this.nextOverlayKey++;
        this.state.overlays[ key ] = React.addons.cloneWithProps( overlay, { key: key } );
        this.setState( { overlays: this.state.overlays } );
        return key;
    },
    
    closeOverlay: function( overlayKey ) {
        delete( this.state.overlays[ overlayKey ] );
        this.setState( { overlays: this.state.overlays } );
    },
    
    showFile: function( filename, viewType ) {
        //  If no viewType has been specificed, guess one.
        if ( ! viewType ) {
            //  TODO.
        }
        
        //  If no viewType has been found, fall back to 'text' by default.
        viewType = viewType || 'text';
        
        //  Open a view (if not already open)
        this.refs.viewStack.show( filename, viewType );
        this.setState( {
            currentFile: filename,
        } );
	},
    
    getCurrentView: function() {
        return this.refs.viewStack.getCurrentView();
    },
        
    registerOpenFile: function( conduit ) {
        this.state.openFiles.push( conduit );
        this.setState( { openFiles: this.state.openFiles } );
    },
    
    render: function() {
        return <div className="main-wrap">
            <div className="overlay-layer">
                { this.state.overlays }
            </div>
            
            <div className="main-layout">
                <LeftBar openFiles={ this.state.openFiles } currentFile={ this.state.currentFile } />
                <ViewStack ref="viewStack" />
            </div>
        </div>;
    },

} );
