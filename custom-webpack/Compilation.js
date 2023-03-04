/**
 * https://webpack.docschina.org/api/compilation-hooks/
 * 1. Compilation模块会被Compiler模块用来创建新的compilation对象
 * 2. compilation实例可以访问所有的模块和它们的依赖，它会对应用程序的依赖图中所有的模块进行编译。
 * 3. 在编译阶段，模块会被加载、封存、优化、分块、哈希和重新创建。
 * 4. compilation对象代表了一次资源版本的构建，它包含了当前的模块资源、编译生成资源、变化的文件
 * 以及被跟踪依赖的状态信息等，当webpack以开发模式运行时，每检测到一个文件变化就会创建一个新的
 * compilation对象。webpack5之前每次都会重新编译，webpack5提供了缓存机制加快编译。
 * 5. compilation对象也提供了很多事件回调供插件扩展，通过compilation也可以读取到compiler对象，
 */

const path = require("path");
const fs = require("fs");
const parser = require("@babel/parser");
const types = require("@babel/types");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const { normalizePath } = require("./utils");
const baseDir = normalizePath(process.cwd());

class Compilation {
  constructor(compiler) {
    this.compiler = compiler;
    this.options = compiler.options;
    // 本次编译所涉及的所有模块
    this.modules = [];
    // 本次编译所组装出的代码块
    this.chunks = [];
    // 本次编译所产出的文件，key是文件名，值是文件内容
    this.assets = {};
    // 代表本次打包出来的文件
    this.files = [];
    // 本次编译依赖的文件/模块
    this.fileDependencies = [];
  }

  build(callback) {
    /**
     * 5. 从配置的entry找到入口文件开始编译
     */
    let entry = {
      main: "./src/index.js",
    };

    if (typeof this.options.entry === "string") {
      entry.main = this.options.entry;
    } else {
      entry = this.options.entry;
    }

    for (let entryName in entry) {
      // 获取入口文件路径，兼容不同系统
      let entryFilePath = path.posix.join(baseDir, entry[entryName]);
      this.fileDependencies.push(entryFilePath);

      /**
       * 6. 从入口文件出发，调用所有配置的loader对模块进行编译
       */

      let entryModule = this.buildModule(entryName, entryFilePath);
      this.modules.push(entryModule);

      /**
       * 8. 根据入口和模块的依赖关系，组装成包含多个模块的chunk
       */
      let chunk = {
        name: entryName,
        entryModule,
        modules: this.modules.filter((module) =>
          module.names.includes(entryName)
        ),
      };
      this.chunks.push(chunk);
    }

    /**
     * 9. 将chunk转换为一个单独的文件，加入到输出列表
     */
    this.chunks.forEach((chunk) => {
      const filename = this.options.output.filename.replace(
        "[name]",
        chunk.name
      );
      this.assets[filename] = getSource(chunk);
    });

    callback(
      null,
      {
        modules: this.modules,
        files: this.files,
        chunks: this.chunks,
        assets: this.assets,
      },
      this.fileDependencies
    );
  }

  /**
   * 编译模块
   * @param {*} name chunk名称，也就是entry模块的name
   * @param {*} modulePath 模块路径
   */
  buildModule(name, modulePath) {
    // 读取文件内容
    let sourceCode = fs.readFileSync(modulePath, "utf-8");
    // 找到匹配的loader
    const { rules } = this.options.module;
    let loaders = [];
    rules.forEach((rule) => {
      if (modulePath.match(rule.test)) {
        loaders.push(...rule.use);
      }
    });
    // 调用匹配的loader对模块内容进行编译
    sourceCode = loaders.reduceRight((sourceCode, loader) => {
      return require(loader)(sourceCode);
    }, sourceCode);

    /**
     * 7. 找出该模块依赖的模块，递归进行编译
     * 通过ast语法数去查找
     */
    // moduleId是相对于根目录的相对路径，dependencies是此模块依赖的模块
    let moduleId = "./" + path.posix.relative(baseDir, modulePath);
    let module = {
      id: moduleId,
      dependencies: [],
      // 此模块可能属于多个代码块，所以用数组
      names: [name],
    };
    let ast = parser.parse(sourceCode, { sourceType: "module" });
    /* 
      遍历ast语法树 找到require的结点
      https://astexplorer.net/
    */
    traverse(ast, {
      CallExpression: ({ node }) => {
        // 如果是require方法
        if (node.callee.name === "require") {
          // 拿到依赖模块的路径 如./title
          let depModuleName = node.arguments[0].value;
          let depModulePath;
          // .开头的路径我们认为是本地模块
          if (depModuleName.startsWith(".")) {
            const currentDir = path.posix.dirname(modulePath);
            depModulePath = path.posix.join(currentDir, depModuleName);
            // 因为引用js可以不添加后缀，此处需要使用options.resolve.extensions去匹配后缀
            const extensions = this.options.resolve.extensions;
            depModulePath = tryExtensions(depModulePath, extensions);
          } else {
            // 第三方模块, 通过require.resolve方法可以找到绝对路径
            depModulePath = require.resolve(depModuleName);
          }
          this.fileDependencies.push(depModulePath);
          // 获取依赖模块的id，修改语法树，把依赖的模块名换成模块ID
          let depModuleId = "./" + path.posix.relative(baseDir, depModulePath);
          node.arguments[0] = types.stringLiteral(depModuleId);
          module.dependencies.push({
            depModuleId,
            depModulePath,
          });
        }
      },
    });

    let { code } = generator(ast);
    module._source = code;
    // 递归编译所有模块
    module.dependencies.forEach(({ depModuleId, depModulePath }) => {
      // 如果已经被编译过了，那么将chunk的name 加入names
      let existModule = this.modules.find(
        (module) => module.id === depModuleId
      );
      if (existModule) {
        existModule.names.push(name);
      } else {
        let depModule = this.buildModule(name, depModulePath);
        this.modules.push(depModule);
      }
    });

    return module;
  }
}

function tryExtensions(modulePath, extensions) {
  if (fs.existsSync(modulePath)) {
    return modulePath;
  }
  for (let i = 0; i < extensions.length; i++) {
    let filePath = modulePath + extensions[i];
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  throw new Error(`找不到模块: ${modulePath}`);
}

function getSource(chunk) {
  return `
  (() => {
    var __webpack_modules__ = {
      ${chunk.modules
        .map(
          (module) =>
            `
          "${module.id}": module=>{
            ${module._source}
          }
        `
        )
        .join(",\n")}
    };
    var __webpack_module_cache__ = {};
    function __webpack_require__(moduleId) {
      var cachedModule = __webpack_module_cache__[moduleId];
      if (cachedModule !== undefined) {
        return cachedModule.exports;
      }
      var module = __webpack_module_cache__[moduleId] = {
        exports: {}
      };
      __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
      return module.exports;
    }
    var __webpack_exports__ = {};
    (() => {
      ${chunk.entryModule._source.replace("require", "__webpack_require__")}
    })();
  })();
  `;
}

module.exports = Compilation;
