class Run1Plugin {
  apply(complier) {
    complier.hooks.run.tap("RunPlugin1", () => {
      console.log("run1 编译");
    });
  }
}

module.exports = Run1Plugin;
