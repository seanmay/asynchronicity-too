const EventEmitter = require("./emitter");

const noop = () => {};

class ReadableStream extends EventEmitter {
  constructor({
    objectMode = false,
    highWaterMark = objectMode ? 16 : 16 * 1024,
    read: _read,
    destroy: _destroy = noop
  }) {
    super("data", "end");
    this._readableState = {
      buffer: null,
      flowing: null,
      objectMode,
      highWaterMark,
    };
    this._read = _read;
    this._destroy = _destroy;
  }

  push(chunk, encoding = "utf8") {
    const {
      _readableState: state,
      _readableState: { highWaterMark, objectMode }
    } = this;
    if (chunk === null) {
      // we need to end the stream, because it's done
    } else if (chunk !== undefined) {
      if (objectMode) {
        state.buffer = [...state.buffer || [], chunk];
      } else {
        let buffer = state.buffer || Buffer.alloc(0);
        const content = Buffer.from(chunk, encoding);
        const totalLength = buffer.length + content.length;
        state.buffer = Buffer.concat([buffer, content], totalLength);
      }
    }
    return state.buffer.length < highWaterMark;
  }

  read(bytes = this._readableState.highWaterMark) {
    const { _readableState: state } = this;
    console.log(state.highWaterMark);
    this._read(state.highWaterMark);
    return state.buffer;
  }

  pipe(stream) {
    
  }
}

const { Readable } = require("stream");

function* TextIterator(str, window = 1024) {
  let offset = 0;
  while (offset < str.length) {
    yield {
      text: str.substr(offset, window),
      offset
    };
    offset += window;
  }
  return { text: null };
}

const text = TextIterator("X".repeat(64 * 1024));
const readable = new ReadableStream({
  // highWaterMark: 64 * 1024,
  read(bytes) {
    console.log(`write these bytes: ${bytes}`)
    let writable = true;
    // while (writable) {
      const content = text.next().value;
      writable = this.push(content.text);
      console.log(content.offset);
      // writable = this.push(null);
    // }
    console.log(`not writable`);
  }
});

readable.read(8).length; /*?*/
readable.read(8).length; /*?*/
readable.read(8).length; /*?*/
readable.read(8).length; /*?*/
readable.read(8).length; /*?*/
// readable.read().length; /*?*/
// readable.read().length; /*?*/
// readable.read().length; /*?*/
// readable.read().length; /*?*/
