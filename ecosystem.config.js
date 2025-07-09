module.exports = {
	apps: [
	  {
		name: 'open-wabot',
		script: './index.js',
		watch: true,
		watch_options: {
		  followSymlinks: false,
		},
		ignore_watch: [
			'.git',
			'.gitignore',
			'.npmrc',
			'data',
			'README*',
			'node_modules',
			'package-lock.json'
		],
	  },
	],
  };
