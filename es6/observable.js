const noop = () => {};

const Observable = subscribe => {
  let ended = false; // this is the gate to announce this link in the stream is done
  let cleanup = noop; // this is a function returned from subscribe, to do clean-up

  // check to see if the stream is done, before running the function
  const callIfNotEnded = f => x => {
    if (!ended) f(x);
  };

  // close the stream if the function is called
  const endIfCalled = f => x => {
    ended = true;
    f(x);
    cleanup();
  };

  // the Observable returned to the user
  const observable = {
    // returns a new Observable, which when subscribed to, will trigger subscription to this observable
    map: f =>
      Observable(
        observer =>
          observable.subscribe(
            x => observer.next(f(x)), // map over the value before moving downstream
            observer.error,
            observer.complete
          ).unsubscribe // give the next link the previous unsubscribe, to tell it when to stop running
      ),

    // returns a new observable, and f is expected to return new observables
    chain: f =>
      Observable(
        observer =>
          observable.subscribe(
            // call f(x) and subscribe to the observable that comes out
            // does not tie completion to any one observable, because many might be created
            // ensuring that all of the upstreams are cleaned up would be a *great* idea
            // but that would take the focus off of the intent of chain, in this example lib
            x => {
              f(x).subscribe(observer.next, observer.error);
            },
            observer.error,
            observer.complete
          ).unsubscribe
      ),

    // triggers the provided `subscribe` to be run: lazy invocation
    subscribe: (onNext = noop, onError = noop, onComplete = noop) => {
      // wrap the given functions, to follow internal behaviour
      const next = callIfNotEnded(onNext);
      const error = callIfNotEnded(endIfCalled(onError));
      const complete = callIfNotEnded(endIfCalled(onComplete));

      // create an observer that is given to the initial subscription function
      const observer = { next, error, complete };

      // call the Observable(subscribe) function, passing in the Observer
      // the subscription can return a cleanup function, which should be cached
      const subscriberCleanup = subscribe(observer);
      cleanup =
        typeof subscriberCleanup === "function" ? subscriberCleanup : noop;
      // create a subscription with an unsubscribe
      const subscription = { unsubscribe: complete };
      return subscription;
    }
  };

  if (Observable.extend) {
    Observable.extend(observable);
  }
  return observable;
};

Observable.of = (...args) =>
  Observable(observer => {
    args.forEach(observer.next);
    observer.complete();
  });

// The rest of this file is add-ons and bonus features that might make the API more extensible for different environments, and usecases

// convert from an array/iterable to an observable
Observable.from = iterable => Observable.of(...iterable);

// convert from a promise to an observable
Observable.fromPromise = promise =>
  Observable(observer => {
    promise.then(
      x => {
        observer.next(x);
        observer.complete();
      },
      err => observer.error(err)
    );
  });

// convert observable stream to a promise of an array of data
Observable.toPromise = observable =>
  new Promise((resolve, reject) => {
    const results = [];
    observable.subscribe(x => results.push(x), reject, () => resolve(results));
  });

// subscribe to, and unsubscribe from, DOM events
Observable.fromEvent = (type, el) =>
  Observable(observer => {
    el.addEventListener(type, observer.next);
    return () => {
      console.log("Unbinding");
      el.removeEventListener(type, observer.next);
    };
  });

// examples of how to extend observables with all of the helper methods found in Rx or Bacon
Observable.extend = observable => {
  for (let key in Observable.extensions) {
    observable[key] = Observable.extensions[key](observable);
  }
};

// a place for storing extensions to register observables with
// note, these are all "Bonus" or opt-in behaviours. "Rx" is "Reactive Extensions", as it were
// to be useful as near-monads, Observables really just need map and chain
Observable.extensions = {

  // subscribes with a mutation to run for each "next" call; returns a promise that resolves or rejects with the stream
  forEach: observable => mutate =>
    new Promise((resolve, reject) =>
      observable.subscribe(mutate, reject, resolve)
    ),

  // exactly like map, but instead of transforming, only passes values through if they pass the predicate
  filter: observable => predicate =>
    Observable(
      observer =>
        observable.subscribe(
          x => {
            if (predicate(x)) {
              observer.next(x);
            }
          },
          observer.error,
          observer.complete
        ).unsubscribe
    ),

  // a straight passthrough (`map(x => x)`) but will close the stream after n items pass through
  take: observable => remaining =>
    Observable(
      observer =>
        observable.subscribe(
          x => {
            if (remaining) {
              observer.next(x);
              remaining -= 1;
            } else {
              observer.complete();
            }
          },
          observer.error,
          observer.complete
        ).unsubscribe
    ),

  // like take, but will take while a predicate is truthy
  takeWhile: observable => predicate =>
    Observable(
      observer =>
        observable.subscribe(
          x => {
            if (predicate(x)) {
              observer.next(x);
            } else {
              observer.complete();
            }
          },
          observer.error,
          observer.complete
        ).unsubscribe
    ),

  // like take, but will take until a predicate is truthy
  takeUntil: observable => predicate =>
    Observable(
      observer =>
        observable.subscribe(x => {
          if (predicate(x)) {
            observer.complete();
          } else {
            observer.next(x);
          }
        }).unsubscribe
    )
};
