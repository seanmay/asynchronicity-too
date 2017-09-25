const Channel = require("./channel");


const addChannel = (obj, key) => {
  const channel = new Channel();
  obj[key] = channel;
  return channel;
};

const getChannel = (obj, key) => {
  const channel = obj[key] || addChannel(obj, key);
  return channel;
};

const addChannels = (obj, keys) =>
  keys.reduce((obj, key) => {
    addChannel(obj, key);
    return obj;
  }, obj);

class Emitter {
  constructor (...initialEvents) {
    this._channels = addChannels({}, initialEvents);
  }
  on (event, listener) {
    getChannel(this._channels).listen(listener);
  }
  off (event, listener) {
    getChannel(this._channels).ignore(listener);
  }
  emit (message) {
    getChannel(this._channels).notify(message);
  }
}


module.exports = Emitter;