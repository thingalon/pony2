var AceEditor = React.createClass( {
    
    componentDidMount: function() {
        this.editor = ace.edit( this.props.name );
        this.session = ace.createEditSession( this.props.conduit.document, this.props.conduit.syntax.mode );
        this.session.setUndoManager( this.props.conduit.undoManager );
        this.editor.setSession( this.session );
        
        this.editor.setTheme( 'ace/theme/' + this.props.theme );
    },

    render: function() {
        return <div className="ace" id={ this.props.name } />;
    },
    
} );
