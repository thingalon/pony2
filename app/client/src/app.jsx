//
//	App - global state, main object that handles top level stuff.
//

( function( App ) {
	
    App.initialize = function() {
		//	Setup Main Menu
		this.mainMenu = Menu.buildFromTemplate( mainMenuTemplate );
		Menu.setApplicationMenu( App.mainMenu );
		
        //  Setup UI
        this.ui = React.render( <UI />, document.body );
	};

	App.showOpenDialog = function() {
        var path = null;
        var currentView = this.ui.getCurrentView();
        if ( currentView && currentView.getPath )
            path = Tools.folderName( currentView.getPath() );
      
        var onAccept = function( filenames ) {
            this.ui.closeOverlay( overlayKey );
            
            for ( var i = 0; i < filenames.length; i++ )
                this.ui.showFile( filenames[ i ] );
        }.bind( this );
        
        var onCancel = function() {
            this.ui.closeOverlay( overlayKey );
        }.bind( this );
      
        var overlayKey = this.ui.openOverlay( <FileDialog defaultPath={ path } onAccept={ onAccept } onCancel={ onCancel } /> );
	};
    
    App.save = function() {
        var currentView = this.ui.getCurrentView();
        if ( currentView && currentView.save )
            currentView.save();
    };
    
} )( window.App = window.App || {} );
