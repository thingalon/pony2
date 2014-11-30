//
//	A stack of font-awesome icons, which allows a filled icon with an outline
//

var FilledIcon = React.createClass( {

	render: function() {
		var fillClass = 'fa fa-stack-1x ' + this.props.icon;
		var outlineClass = fillClass + '-o';

		return (
			<span className="fa-stack">
				<i className={ fillClass } style={ { color: this.props.color } } />
				<i className={ outlineClass } style={ { color: 'black' } } />
			</span>
		);
	}

} );
