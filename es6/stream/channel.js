class Channel {
  constructor(initialListeners = []) {
    this._listeners = initialListeners;
  }
  listen(listener) {
    this._listeners = this._listeners.concat(listener);
  }
  ignore(listener) {
    this._listeners = this._listeners.filter(test => test !== listener);
  }
  notify(message) {
    this._listeners.forEach(react => react(message));
  }
}


module.exports = Channel;