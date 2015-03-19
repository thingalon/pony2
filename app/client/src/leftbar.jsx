//
//	A bar down the LHS. Contains other widgets. For now just an open file tree, hopefully later a drop-target for other things.
//

var LeftBar = React.createClass( {

	render: function() {
		return (
			<div className="left-bar">
                <ul className="left-bar">
				    <OpenFileTree ref="openFileTree" openFiles={ this.props.openFiles } currentFile={ this.props.currentFile } />
                </ul>
            </div>
		);
	},

} );
