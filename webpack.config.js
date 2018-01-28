var path = require('path')

module.exports = {
  entry: path.join(__dirname, 'src/index.js'),

  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'lib/'),
    libraryTarget: 'umd'
  }
}