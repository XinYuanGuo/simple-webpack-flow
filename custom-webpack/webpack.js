// 自己手写的webpack

const Compiler = require("./Compiler");

/**
 *
 * @param {*} options 读取webpack.config.js传来的参数
 */
function webpack(options) {
  /**
   * 1. 初始化参数
   * 原版是通过yargs去获取命令行参数
   * 此处进行简化，通过process.argv获取
   * shell参数格式如: --mode=development,
   * 正常情况下还可能会有没有写值表示参数为true 如--open表示打开浏览器
   * 以及可能会有简写的情况，此处不处理简写的情况
   */

  const cmdOptions = process.argv.slice(2);
  const shellOptions = cmdOptions.reduce((totalOptions, curOptions) => {
    const [key, value] = curOptions.split("=");
    totalOptions[key.slice(2)] = value ? value : true;
    return totalOptions;
  }, {});

  const finalOptions = {
    ...options,
    // shell参数优先
    ...shellOptions,
  };

  /**
   * 2. 通过合并的初始化参数初始化Compiler对象
   */
  const compiler = new Compiler(finalOptions);

  /**
   * 3. 加载配置中的所有插件
   */
  const { plugins } = finalOptions;
  for (let plugin of plugins) {
    plugin.apply(compiler);
  }

  return compiler;
}

module.exports = webpack;
