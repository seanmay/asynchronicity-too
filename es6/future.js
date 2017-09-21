const Future = (task) => ({
  // map takes function and returns a new Future
  // where the value of the new Future has f applied to it
  map: f => Future((reject, resolve) =>
    task(reject, x => resolve(f(x)))),

  // chain takes a function and returns a Future
  // f is expected to run on the value of the future and return a Future
  // instead of returning a Future of a Future, chain subscribes to the future returned by `f`
  // note that the inner Future is not forked until the outer future is forked - it remains lazy
  // the new Future (the one we care about) is resolved, when the inner Future is resolved
  chain: f => Future((reject, resolve) =>
    task(reject, x =>
      f(x).fork(reject, resolve))),

  // really fork == task; I'm just making the API explicit, here
  fork: (reject, resolve) =>
    task(reject, resolve),
});

Future.of = x => Future((reject, resolve) => resolve(x));
Future.resolve = Future.of;
Future.reject = err => Future(reject => reject(err));