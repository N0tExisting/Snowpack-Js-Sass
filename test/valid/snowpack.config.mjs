/** @type {import("snowpack").SnowpackUserConfig } */
const __Snowpack_Config__ = {
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
export default __Snowpack_Config__