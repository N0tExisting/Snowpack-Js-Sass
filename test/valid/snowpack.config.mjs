/** @type {import("snowpack").SnowpackUserConfig } */
export default  {
	mount: {
		www: '/'
	},
	plugins: [
		[
			'../../plugin.js',
			{
				verbose: true,
				sourceMap: true,
			}
		],
		'@snowpack/plugin-postcss',
	],
}