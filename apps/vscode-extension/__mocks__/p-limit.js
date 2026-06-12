// Mock for p-limit to avoid ESM issues in Jest
module.exports = function pLimit(concurrency) {
  return async function(fn) {
    return fn();
  };
};

module.exports.default = module.exports;
