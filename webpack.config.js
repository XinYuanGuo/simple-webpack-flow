const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const DonePlugin = require("./plugins/done-plugin");
const Run1Plugin = require("./plugins/run1-plugin");
const Run2Plugin = require("./plugins/run2-plugin");
/** @type {import('webpack').Configuration} */
module.exports = {
  mode: "development",
  devtool: false,
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  module: {
    rules: [],
  },
  plugins: [
    // new HtmlWebpackPlugin({
    //   template: "./src/index.html",
    // }),
    new Run1Plugin(),
    new Run2Plugin(),
    new DonePlugin(),
  ],
};
