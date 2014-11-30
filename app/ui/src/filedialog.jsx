//
//	FileDialog; dialog for selecting files to open or specifying paths to save.
//

var FileDialog = React.createClass( {
	getInitialState: function() {
		var path = Settings.get( 'homeDirectory' );
		return {
			path: path,
			pathInputValue: path,
		};
	},
	
	onPathKeyDown: function( event ) {
	    if( event.which == 13 )
	    	this.setState( { path: this.state.pathInputValue } );
	},
	
	onFaveClicked: function( path ) {
		this.setState( {
			path: path,
			pathInputValue: path 
		} );
	},
	
	onPathInputChange: function( event ) {
		this.setState( {
			pathInputValue: event.target.value,
		} );
	},
	
	onAccept: function() {
		var selected = this.refs.filetable.getSelected();
		if ( this.props.onAccept )
			this.props.onAccept( selected );
	},
	
	render: function() {
		return (
			<div className="dialog file-dialog">
				<span className="title">
					Open File
				</span>
				<div className="content">
					<div className="top-bar">
						<input className="path" type="text" value={ this.state.pathInputValue } onChange={ this.onPathInputChange } onKeyDown={ this.onPathKeyDown } />
						<button className="up fa fa-level-up" title="Parent Directory"></button>
						<button className="refresh fa fa-refresh" title="Refresh"></button>
					</div>
					<div className="columns">
						<div className="folders">
							<ul>
								<li><FavoritePathsList currentPath={ this.state.path } onClickFave={ this.onFaveClicked } /></li>
							</ul>
						</div>
						<div className="files">
							<FileTable path={ this.state.path } onChoose={ this.onAccept } ref="filetable" />
						</div>
					</div>
					<div className="button-bar">
						<button className="cancel">Cancel</button>
						<button className="ok" onClick={ this.onAccept }>OK</button>
					</div>
				</div>
			</div>
		);
	}
} );