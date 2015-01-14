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
	
	showFile: function( file ) {
		var path = file.path;
		var views = this.state.views;
		var update = {};
		
		if ( ! views[ path ] ) {
			views[ path ] = {
				file: file
			};
			update.views = views;
		}
		
		currentView = views[ path ];
		update.currentView = views[ path ];
		
		this.setState( update );
	},
	
	render: function() {
		if ( this.state.currentView ) {
			return (
				<FileView file={ this.state.currentView.file } />
			);
		} else {
			return (
				<StatusArea type="blank" icon="fa-question">
					Nothing open. Hit cmd-o to open something.
				</StatusArea>
			);
		}
	}
	
} );
