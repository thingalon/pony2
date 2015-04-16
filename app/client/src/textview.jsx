var TextView = React.createClass( {
    
    getInitialState: function() {
        this.conduit = TextConduit.open( this.props.filename );
        this.conduit.onStateChange( this.onConduitStatusChange );
        
        return {
            conduitState: this.conduit.getState(),
            id: this.getNextId(),
        };
    },
    
    getNextId: function() {
        if ( ! TextView.nextId )
            TextView.nextId = 1;
        return 'textview' + ( TextView.nextId++ );
    },
    
    onConduitStatusChange: function( newState ) {
        this.setState( {
            conduitState: this.conduit.getState(),
        } );
    },

    save: function() {
        this.conduit.save();
    },
    
    getPath: function() {
        return this.props.filename;
    },

    render: function() {
        switch ( this.state.conduitState ) {
            case TextConduit.State.closed:
                return <StatusArea type="error" icon="fa-file">
                    File closed.
                </StatusArea>;
        
            case TextConduit.State.opening:
                return <StatusArea type="loading" icon="fa-file">
                    Loading...
                </StatusArea>;
                
            case TextConduit.State.open:
                return <AceEditor name={ this.state.id } conduit={ this.conduit } theme="twilight" />
                
            case TextConduit.State.error:
                return <StatusArea type="error" icon="fa-file">
                    this.conduit.errorMessage;
                </StatusArea>;
        };
    },
    
} );

document.addEventListener( 'DOMContentLoaded', function() {
    FileTypeManager.registerViewType( 'text', {
        name: 'Text',
        componentClass: TextView,
        icon: 'fa-file-code',
    } );
    
    FileTypeManager.registerFileType( 'javascript', {
        name: 'JavaScript',
        view: 'code',
        patterns: [ '\.jsx?$' ],
        iconColor: '#fff185',
    } );
    
    FileTypeManager.registerFileType( 'html', {
        name: 'HTML',
        view: 'code',
        patterns: [ '\.html$' ],
        iconColor: '#ff9875',
    } );
    
    FileTypeManager.registerFileType( 'css', {
        name: 'CSS',
        view: 'code',
        patterns: [ '\.css?$' ],
        iconColor: '#70d4ff',
    } );
} );
