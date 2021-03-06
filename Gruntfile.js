module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	grunt.loadNpmTasks('grunt-contrib-sass');	
	
	var fs	 = require('fs')
		, path = require('path')
		, dir	= 'binaries';
 
	grunt.initConfig({
		'download-atom-shell': {
			version: '0.19.5',
			outputDir: dir
		},
		'sass': {
			'dist': {
				'options': {
					'style': 'expanded'
				},
				'files': {
					'app/client/style/main.gen.css': 'app/client/style/main.scss'
				}
			}
		},
		'shell': {
			'mac': {
				command: dir + '/Atom.app/Contents/MacOS/Atom app'
			},
			'linux': {
				command: 'chmod +x ' + dir + '/atom && ' + dir + '/atom app'
			},
			'win': {
				command: dir + '\\atom.exe app'
			},
            'test': {
                command: dir + '/Atom.app/Contents/MacOS/Atom test/lib/nodeunit-wrap.js 2> /dev/null'
            },
		},
		'react': {
			'dynamic_mappings': {
				'files': [ {
					'expand': true,
					'cwd': 'app/client/src',
					'src': [ '*.jsx' ],
					'dest': 'app/client/js',
					'ext': '.gen.js'
				} ]
			}
 		}
	} );
 
	grunt.registerTask( 'default', [
		'install',
		'sass',
		'react',
		'run'
	] );
	
	grunt.registerTask('init', 'initialize project', function() {
		var cwd		 = process.cwd()
			, appPath = path.join(cwd, 'app')
			, gitPath = path.join(cwd, '.git')
 
		if (grunt.file.exists(appPath))
			return;
		
		fs.readdirSync(cwd).forEach(function(file) {
			if (file.charAt(0) !== '_') return;
			
			var src = path.join(cwd, file);
			var dst = path.join(appPath, file.slice(1))
			grunt.file.copy(src, dst);
			grunt.file.delete(src)
		});
		grunt.file.delete(gitPath);
	})
	
	grunt.registerTask('install', [
		'init',
		'download-atom-shell'
	]);
    
    grunt.registerTask('test', function() {
        grunt.task.run('shell:test');
    });
	
	grunt.registerTask('run', function() {
		if (process.platform === 'darwin')
			grunt.task.run('shell:mac');
		else if (process.platform === 'win32')
			grunt.task.run('shell:win')
		else
			grunt.task.run('shell:linux')
	});
}
