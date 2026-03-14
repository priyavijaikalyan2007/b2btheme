// AGENT: PostCSS configuration for autoprefixer and CSS minification in the enterprise theme build pipeline.
// @config: autoprefixer, cssnano
module.exports = {
    plugins: {
        autoprefixer: {},
        cssnano: {
            preset: ["default", { discardComments: { removeAll: true } }]
        }
    }
};
