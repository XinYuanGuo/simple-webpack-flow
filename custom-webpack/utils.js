const path = require("path");

exports.normalizePath = (path) => {
  return path.replace(/\\/g, "/");
};
