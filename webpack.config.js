const path = require('path');

module.exports = {
    entry: path.join(__dirname, '/src/main.js'),
    output: {
        filename: 'main.js',
        path: path.join(__dirname, '/public/dist')
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                include: path.join(__dirname, '/src'),
                // exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            }
        ]
    }
};