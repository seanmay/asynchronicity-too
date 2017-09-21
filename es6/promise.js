const PENDING = "pending";
const RESOLVED = "resolved";
const REJECTED = "rejected";

function Promise(initialize) {
  if (!(this instanceof Promise)) {
    throw new TypeError(
      "This is a bad requirement, but I'm doing it for accuracy."
    );
  }
  if (typeof initialize !== "function") {
    throw new ReferenceError(
      `A Promise must be provided a function; got ${typeof initialize}`
    );
  }

  let state = PENDING; // PENDING | RESOLVED | REJECTED
  let value = null; // the value or the error that comes back

  let listeners = []; // the list of all callers of `then` *before* the promise is settled

  // this gets passed into initialize `new Promise((onResolve) => ...)`
  const onResolve = result => {
    if (state !== PENDING) return; // only fire once
    let then = getThen(result); // get then, if result is a promise
    if (then) {
      // resolve the internal state, based on the result promise resolving
      then.call(result, resolvePromise, rejectPromise);
    } else {
      // resolve the internal state
      resolvePromise(result);
    }
  };

  // this gets passed into initialize `new Promise((_, onReject) => ...)`
  // I'm not sure why it doesn't resolve promises... but that's how it works
  const onReject = err => {
    if (state !== PENDING) return; // only fire once
    rejectPromise(err); // resolve the internal state with the error
  };

  // this is a helper function, to return `.then` if result is a promise
  // if result has magic getters, this is to get the value once and cache it
  const getThen = result => {
    const then = result && result.then; // checking that result exists, first
    if (typeof then === "function") {
      return then; // only return `then` if it's a function
    }
  };

  // this is what sets the internal state and finalizes the promise
  // and triggers the promise chain
  const resolvePromise = result => {
    if (state !== PENDING) return; // only fire once
    state = RESOLVED;
    value = result;
    notifyListeners();
  };

  // this is what sets the internal state and finalizes the promise
  // and triggers the promise chain
  const rejectPromise = err => {
    if (state !== PENDING) return; // only fire once
    state = REJECTED;
    value = err;
    notifyListeners();
  };

  // this will trigger the resolution of chained promises
  const notifyListener = listener => {
    if (state === RESOLVED) {
      listener.resolve(value);
    } else if (state === REJECTED) {
      listener.reject(value);
    }
  };

  const notifyListeners = () => {
    setTimeout(() => {
      listeners.forEach(notifyListener);
      listeners = []; // flush the listeners for GC purposes
    }, 0);
  };

  // this contains the Promise/A+ compliant behaviour for running `.then(onSuccess)`
  // and resolving/rejecting the next promise in the chain with the result
  const handleSuccessChain = (value, onSuccess, resolveNext, rejectNext) => {
    if (!onSuccess) {
      // handles the case of `.then(null, err => ...)`
      resolveNext(value); // just pass the value on to the subscriber
    } else {
      try {
        const result = onSuccess(value); // run `.then(onSuccess)`
        const then = getThen(result); // dereference `.then` (it might be a getter, so cache it)
        if (then) {
          // if result is "Thenable"
          // the `.then` the user called will subscribe to the promise we just got back
          // `.then` has `call` applied, to solve the `this` problem
          then.call(result, resolveNext, rejectNext);
        } else {
          // if the result is not "Thenable", pass it to the `.then(onSuccess)` that was called
          resolveNext(result);
        }
      } catch (err) {
        // if anything above goes wrong, throw into the `.then(null, onError)` that was called
        rejectNext(err);
      }
    }
  };

  // this contains the Promise/A+ compliant behaviour for running `.then(null, onError)`
  // and resolving/rejecting the next promise in the chain with the result
  const handleErrorChain = (value, onError, resolveNext, rejectNext) => {
    if (!onError) {
      // handles the case of `.then(onSuccess)`
      rejectNext(value); // just pass the value on to the subscriber
    } else {
      try {
        const result = onError(value); // run `.then(null, onError)`
        resolveNext(result);
      } catch (err) {
        // if anything above goes wrong, throw into the `.then(null, onError)` that was called
        rejectNext(err);
      }
    }
  };

  // Note that the two functions above could be simplified in a pretty straightforward way, and lower the LoC and mental overhead
  // but there are subtle differences between the two paths, because of how error handling works; I wanted to make sure people could follow that

  // a "Listener" is almost like an inverted promise (like `q.deferred`)
  // this is an implementation-specific thing, no end user sees, but is how
  // I chose to keep track of managing the complex `onSuccess`/`onError` handling
  // instead of keeping it all inside of the `then`
  const makeListener = (onSuccess, onError, resolveNext, rejectNext) => ({
    // this resolve represents the success path for a promise
    resolve: value =>
      handleSuccessChain(value, onSuccess, resolveNext, rejectNext),
    // this resolve represents the failure path for a promise
    reject: err => handleErrorChain(value, onError, resolveNext, rejectNext)
  });

  // this is the "Thenable" given to the end user
  const thenable = {
    then: (onSuccess, onError) => {
      // immediately return a new promise, to keep the chain going
      return new Promise((resolveNext, rejectNext) => {
        // this listener will manage resolving this new promise, when the outer promise resolves
        // again, the listener is implementation-specific, but the resolution is compliant
        const listener = makeListener(
          onSuccess,
          onError,
          resolveNext,
          rejectNext
        );
        if (state === "pending") {
          // we're still waiting
          listeners.push(listener); // add to the list of waiting listeners
        } else {
          // set a timout (always async, as per spec) and run the resolver
          setTimeout(() => notifyListener(listener), 0);
        }
      });
    },
    // `.catch` is just a shorthand
    catch: onError => thenable.then(null, onError)
  };

  // now that we've defined all of the state and all of the resolution for the promise...
  // IMMEDIATELY AND SYNCHRONOUSLY fire the function that you were given
  // and pass in the functions that will set the state and value, and trigger the listeners
  try {
    initialize(onResolve, onReject);
  } catch (err) {
    // if anything throws inside of the initial function,
    // immediately throw into the `.then(null, onError)`
    onReject(err);
  }

  return thenable; // et voilà!
}

Promise.resolve = value => new Promise(resolve => resolve(value));

Promise.reject = err => new Promise((_, reject) => reject(err));

// takes an array of promises and returns one promise, resolved with the results,
// or rejected with the first error to fire
Promise.all = promises => {
  let remaining = promises.length;
  let results = Array.from({ length: promises.length }); // empty array as long as the list

  return new Promise((resolve, reject) => {
    promises.forEach((value, i) => {
      Promise.resolve(value) // resolve in case it's not a promise
        .then(
          result => {
            results[i] = result; // fill the same slot in the array with the result
            remaining -= 1;
            if (!remaining) {
              // if we're done, return the new list
              resolve(results);
            }
          },
          // trigger a rejection of the whole outer promise, if any fail
          reject
        );
    });
  });
};

// takes an array of promises and resolves or rejects with the first value to come back
Promise.race = promises =>
  new Promise((resolve, reject) =>
    promises.forEach(value => Promise.resolve(value).then(resolve, reject))
  );
