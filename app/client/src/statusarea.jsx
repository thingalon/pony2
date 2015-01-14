//
//	Flat-colored area with some centered text and big-ass icon. Handy for loading areas.
//

var StatusArea = React.createClass( {

	render: function() {
		var statusIcon = '';
		if ( this.props.icon ) {
			statusIcon = (
				<div className="bg-icon">
					<i className={ 'fa ' + this.props.icon } />
				</div>
			);
		}
	
		return (
			<div className={ 'status-area ' + this.props.type }>
				{ statusIcon }
				<span className="message">
					{ this.props.children }
				</span>
			</div>
		);
	}

} );
