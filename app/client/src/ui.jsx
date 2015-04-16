var UI = React.createClass( {

    nextOverlayKey: 1,

    getInitialState: function() {
        return {
            currentFile: null,
            openFiles: [],
            overlays: {},
        };
    },
    
    messageBox: function( style, title, body ) {
        var overlayKey = this.openOverlay( <MessageBox style={ style } title={ title } body={ body } onAccept={
            function() {
                App.ui.closeOverlay( overlayKey );
            }
        } /> );
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
    
    showOpenDialog: function() {
        if ( UI.showingOpenDialog )
            return;
        UI.showingOpenDialog = true;
      
        var path = null;
        var currentView = this.getCurrentView();
        if ( currentView && currentView.getPath )
            path = Tools.folderName( currentView.getPath() );
      
        var onAccept = function( filenames ) {
            this.closeOverlay( overlayKey );
            UI.showingOpenDialog = false;
            
            for ( var i = 0; i < filenames.length; i++ )
                this.showFile( filenames[ i ] );
        }.bind( this );
        
        var onCancel = function() {
            this.closeOverlay( overlayKey );
            UI.showingOpenDialog = false;
        }.bind( this );
      
        var overlayKey = this.openOverlay( <FileDialog defaultPath={ path } onAccept={ onAccept } onCancel={ onCancel } /> );
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
