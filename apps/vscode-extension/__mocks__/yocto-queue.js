// Mock for yocto-queue to avoid ESM issues in Jest
class Queue {
  constructor() {
    this._queue = [];
  }

  enqueue(item) {
    this._queue.push(item);
  }

  dequeue() {
    return this._queue.shift();
  }

  get size() {
    return this._queue.length;
  }
}

module.exports = Queue;
module.exports.default = Queue;
