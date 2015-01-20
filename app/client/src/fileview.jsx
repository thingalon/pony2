//
//	FileView - one view of a file, including load status, etc.
//

var FileView = React.createClass( {

	getInitialState: function() {
		this.file = this.props.file;
		this.file.onStateChange( this.onStateChange.bind( this ) );
	
		return {
			file: this.props.file,
			fileState: this.file.state,
		};	
	},
	
	onStateChange: function() {
		this.setState( {
			fileState: this.file.state,
		} );
	},

	render: function() {
		switch ( this.state.fileState ) {
			case RemoteFile.State.closed:
				return (
					<StatusArea type="error" icon="fa-warning">
						File closed.
					</StatusArea>
				);
			
			case RemoteFile.State.opening:
				return (
					<StatusArea type="loading" icon="fa-cloud-download">
						Loading...
					</StatusArea>
				);
			
			case RemoteFile.State.open:
				return (
					<Editor file={ this.file } key={ this.file.path }/>
				);
			
			case RemoteFile.State.error:
				return (
					<StatusArea type="error" icon="fa-warning">
						Error: { this.file.errorMessage }
					</StatusArea>
				);
		}
	},

} );
