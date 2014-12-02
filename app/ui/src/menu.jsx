var remote = require('remote');
var Menu = remote.require('menu');
var MenuItem = remote.require('menu-item');
var ipc = require( 'ipc' );

var mainMenuTemplate = [ 
	{
		label: 'PonyEdit 2',
		submenu: [
			{
				label: 'Quit',
				accelerator: 'Command+Q',
				click: function() {
					remote.require( 'app' ).quit();
				}
			},
			{
				label: 'Show Developer Console',
				accelerator: 'Alt+Command+I',
				click: function() {
					require( 'ipc' ).send( 'show-console' );
				}
			},
		],
	}, {
		label: 'File',
		submenu: [
			{
				label: 'Open File',
				accelerator: 'Command+O',
				click: function() {
					App.showOpenDialog();
				},
			},
			{
				label: 'Save',
				accelerator: 'Command+S',
				click: function() {
					if ( ! window.file ) {
						alert( "Open something first." );
						return;
					}
					
					window.file.save( window.editor.getChecksum() );
				},
			},
			{ label: 'Do other stuff' },
		],
	}, {
		label: 'Edit',
		submenu: [
      		{
        		label: 'Cut',
        		accelerator: 'Command+X',
        		selector: 'cut:'
      		},
      		{
        		label: 'Copy',
        		accelerator: 'Command+C',
        		selector: 'copy:'
      		},
      		{
        		label: 'Paste',
        		accelerator: 'Command+V',
        		selector: 'paste:'
      		},
		],
	},
];

