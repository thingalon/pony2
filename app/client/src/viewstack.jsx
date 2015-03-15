//
//	ViewStack - an area in which one or more file views can be stacked / lined up side-by-side / etc
//

var ViewStack = React.createClass( {
	
    getInitialState: function() {
		return {
			views: {},
			currentView: null,
		};
	},
    
    getNextViewKey: function() {
        if ( ! ViewStack.nextViewKey )
            ViewStack.nextViewKey = 1;
        
        return ViewStack.nextViewKey++;
    },
	
	show: function( filename, viewType ) {
        //  Is there already a view open for this filename / viewType combo?
        if ( this.state.views[ filename ] && this.state.views[ filename ][ viewType ] ) {
            this.setState( {
                currentView: this.state.views[ filename ][ viewType ]
            } );
            return;
        }
        
        this.open( filename, viewType );
    },
    
    open: function( filename, viewType ) {
        var viewKey = this.getNextViewKey();
        
        var views = this.state.views
        if ( ! views[ filename ] )
            views[ filename ] = {};
        views[ filename ][ viewType ] = viewKey;
        
        this.setState( {
            views: views,
            currentView: viewKey,
        } );
    },
    
    getCurrentView: function() {
        return this.refs[ this.state.currentView ];
    },
    
	render: function() {
        var views = [];
        for ( var filename in this.state.views ) {
            for ( var viewType in this.state.views[ filename ] ) {
                var viewKey = this.state.views[ filename ][ viewType ];
                
                var componentClass = FileTypeManager.getComponentClassForViewType( viewType );
                var cssClass = ( this.state.currentView == viewKey ? 'view visible' : 'view invisible' );
                
                views.push( <div className={ cssClass } key={ viewKey } >
                    { React.createElement( componentClass, {
                        ref: viewKey,
                        className: cssClass,
                        filename: filename
                    } ) }
                </div> );
            }
        }
        
        if ( views.length == 0 ) {
            return (
				<StatusArea type="blank" icon="fa-question">
					Nothing open. Hit cmd-o to open something.
				</StatusArea>
			);
        } else {
            return <div className="view-stack"> { views } </div>;
        }
	}
	
} );
