/**
 * Compiler模块  https://webpack.docschina.org/api/compiler-hooks/
 * 1. Compiler模块是webpack的主要引擎，它通过配置的参数创建出一个Compilation实例。
 * 2. Compiler扩展自tapable类，用来注册和调用插件。
 * 3. compiler对象包含了webpack环境所有的配置信息，它在webpack初始化时被创建，它是全局唯一的。
 */

const { SyncHook } = require("tapable");
const Compilation = require("./Compilation");
const fs = require("fs");
const path = require("path");

class Compiler {
  constructor(options) {
    this.options = options;
    // 注册tapable钩子
    this.hooks = {
      run: new SyncHook(),
      done: new SyncHook(),
    };
  }

  run(callback) {
    this.hooks.run.call();
    // 参数为错误对象、统计结果、文件依赖，在编译的过程中会收集所有依赖的模块/文件
    const onCompiled = (err, stats, fileDependencies) => {
      /**
       * 10. 确定输出内容后，根据配置确定输出的路径和文件名，把文件写入文件系统
       */

      for (let filename in stats.assets) {
        let filePath = path.join(this.options.output.path, filename);
        let content = stats.assets[filename];
        fs.writeFileSync(filePath, content, "utf-8");
      }

      fileDependencies.forEach((fileDependency) => {
        // 监听文件变化，如果有变化则开始一次新的编译
        fs.watch(fileDependency, () => this.compile(onCompiled));
      });

      // 返回编译的结果
      callback(err, {
        toJson: () => stats,
      });
    };
    this.compile(onCompiled);

    this.hooks.done.call();
  }

  compile(callback) {
    // 每次编译都会创建一个Compilation
    let compilation = new Compilation(this);
    compilation.build(callback);
  }
}

module.exports = Compiler;
