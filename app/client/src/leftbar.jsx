//
//	A bar down the LHS. Contains other widgets. For now just an open file tree, hopefully later a drop-target for other things.
//

var LeftBar = React.createClass( {

	render: function() {
		return (
			<ul className="left-bar">
				<OpenFileTree ref="openFileTree" />
			</ul>
		);
	},

} );
