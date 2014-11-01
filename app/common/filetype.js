//
//	FileType; detects and describes file types
//

var isNode = ( typeof exports !== 'undefined' );

( function( FileType ) {

	FileType.guessFromPath = function( path ) {
		init();
		
		//	Can it be guessed by suffix?
		var suffixStart = path.lastIndexOf( '.' );
		if ( suffixStart > -1 ) {
			var suffix = path.substr( suffixStart );
			if ( typesBySuffix[ suffix ] ) {
				return typesBySuffix[ suffix ];
			}
		}
		
		return null;
	}
	
	function init() {
		//	Build a convenient type lookup by file suffix.
		if ( ! typesBySuffix ) {
			typesBySuffix = {};
			for ( var i = 0; i < types.length; i++ ) {
				var type = types[ i ];
				for ( var j = 0; j < type.suffix.length; j++ ) {
					typesBySuffix[ type.suffix[ j ] ] = type;
				}
			}
		}
	}

	var typesBySuffix;
	var types = [
		{
			name: 'CSS',
			suffix: [ '.css' ],
			syntax: 'css',
		},
		{
			name: 'JavaScript',
			suffix: [ '.js' ],
			syntax: 'javascript',
		},
		{
			name: 'JSON',
			suffix: [ '.json' ],
			syntax: 'json',
		},
		{
			name: 'Perl',
			suffix: [ '.pl' ],
			syntax: 'perl',
		},
		{
			name: 'PHP',
			suffix: [ '.php' ],
			syntax: 'php',
		},
		{
			name: 'Ruby',
			suffix: [ '.rb' ],
			syntax: 'ruby',
		},
		{
			name: 'Sass (scss)',
			suffix: [ '.scss' ],
			syntax: 'scss',
		},
		{
			name: 'Shellscript',
			suffix: [ '.sh' ],
			syntax: 'sh',
		},
	];
	
} ( isNode ? exports : this.FileType = {} ) );

