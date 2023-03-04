const webpack = require("webpack");
const webpackConfig = require("./webpack.config");
const complier = webpack(webpackConfig);

complier.run((err, stats) => {
  console.log("err", err);
  console.log("stats", stats);
});
