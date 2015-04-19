//
//	OpenFileTreeLeaf - a leaf in the open file tree (eg; a file)
//

var OpenFileTreeLeaf = React.createClass( {

    getInitialState: function() {
        this.props.file.onStateChange( function() {
            this.setState( {
                unsavedChanges: this.props.file.hasUnsavedChanges(),
            } );
        }.bind( this ) );
        
        return {
            unsavedChanges: this.props.file.hasUnsavedChanges(),
        };
    },
    
    onClick: function() {
        if ( this.props.onClick )
            this.props.onClick( this.props.file );
    },

    render: function() {
        var filename = Tools.filename( this.props.file.path );
        
        var cssClass = 'file';
        if ( this.props.isSelected )
            cssClass += ' selected';
        if ( this.state.unsavedChanges )
            cssClass += ' unsaved';
    
        return (
            <li key={ filename } className={ cssClass } onClick={ this.onClick }>
				{ filename }
			</li>
        );
    },

} );
