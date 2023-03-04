const webpack = require("./custom-webpack/webpack");
const webpackConfig = require("./webpack.config");
const compiler = webpack(webpackConfig);

/**
 * 4. 执行compiler的run方法开始编译
 */
compiler.run((err, stats) => {
  console.log("stats", stats.toJson());
});
