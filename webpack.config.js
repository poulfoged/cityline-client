module.exports = {
    name: "testing",
    entry: {
        page: ["./source/CitylineClient.ts"] //"es6-promise/auto", "whatwg-fetch", 
    },
    output: {
        path: __dirname + "/dist",
        filename: "CitylineClient.js",
        chunkFilename: "[hash].[name].bundle.js",
        publicPath: "/",
        library: 'CitylineClient',
        libraryTarget: 'umd'
    },
    devtool: "source-map",
    resolve: {
        unsafeCache: false,
        extensions: [".webpack.js", ".web.js", ".ts", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader"
            }
        ]
    }
};
