# Asynchronicity-Too

A repo of toy implementations of concurrency helpers.
I tried to simplify code where possible, and there is way more English in these examples than I'm typically comfortable with; but they're toy examples, explanation is the whole point.

I may consider adding less-commented, more succinct, or Typed examples, as well.

### Concurrency models under consideration:
- [x] Futures
- [x] Promises
- [x] Observables
- [-] Streams (Node-like)
- [-] Fibers

### NOTE:
This is not remotely intended for production. Not even a little. These aren't meant for performance or production. I feel that the abject aversion to closure in a lot of codebases is *crazy*, especially with the huge lengths developers will go to implement simple things using a more OO fashion (really, how many objects and proxy dispatches does it take to make up for a couple of closures?). But with all of that said, these are not performance tested, nor battle-hardened, and shall likely never be.

If you decide to use them, knowing this:
- caveat emptor
- bon chance
- this repo is an idea graveyard, which might see some flowers once in a while, but is otherwise eternally-still