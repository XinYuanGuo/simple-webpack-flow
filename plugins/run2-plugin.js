class Run2Plugin {
  apply(complier) {
    complier.hooks.run.tap("RunPlugin2", () => {
      console.log("run2 编译");
    });
  }
}

module.exports = Run2Plugin;
