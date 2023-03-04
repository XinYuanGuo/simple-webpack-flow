class DonePlugin {
  apply(complier) {
    complier.hooks.done.tap("DonePlugin", () => {
      console.log("done 编译完成");
    });
  }
}

module.exports = DonePlugin;
