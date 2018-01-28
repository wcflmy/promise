var PENDING = 0
var FULFILLED = 1
var REJECTED = 2

function Promise(fn) {
  // store state which can be PENDING, FULFILLED or REJECTED
  var state = PENDING

  // store value once FULFILLED or REJECTED
  var value = null

  // store sucess & failure handlers
  var handlers = []

  var self = this

  function fulfill(result) {
    state = FULFILLED
    value = result
    handlers.forEach(handle)
    handlers = null
  }

  function reject(error) {
    state = REJECTED
    value = error
    handlers.forEach(handle)
    handlers = null
  }

  function resolve(result) {
    if(result === self) {
      fulfill(new TypeError('Chaining cycle detected for promise #<Promise>'))
    }
    try {
      var then = getThen(result)
      if (then) {
        doResolve(then.bind(result), resolve, reject)
        return
      }
      fulfill(result)
    } catch (e) {
      reject(e)
    }
  }

  /**
 * Check if a value is a Promise and, if it is,
 * return the `then` method of that promise.
 *
 * @param {Promise|Any} value
 * @return {Function|Null}
 */
  function getThen(value) {
    var t = typeof value
    if (value && (t === 'object' || t === 'function')) {
      var then = value.then
      if (typeof then === 'function') {
        return then
      }
    }
    return null
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   *
   * @param {Function} fn A resolver function that may not be trusted
   * @param {Function} onFulfilled
   * @param {Function} onRejected
   */
  function doResolve(fn, onFulfilled, onRejected) {
    var done = false
    try {
      fn(function (value) {
        if (done) return
        done = true
        onFulfilled(value)
      }, function (reason) {
        if (done) return
        done = true
        onRejected(reason)
      })
    } catch (ex) {
      if (done) return
      done = true
      onRejected(ex)
    }
  }

  function handle(handler) {
    if (state === PENDING) {
      handlers.push(handler)
    } else {
      if (state === FULFILLED &&
        typeof handler.onFulfilled === 'function') {
        handler.onFulfilled(value)
      }
      if (state === REJECTED &&
        typeof handler.onRejected === 'function') {
        handler.onRejected(value)
      }
    }
  }

  this._handle = function (onFulfilled, onRejected) {
    // ensure we are always asynchronous
    setTimeout(function () {
      handle({
        onFulfilled: onFulfilled,
        onRejected: onRejected
      })
    }, 0)
  }

  doResolve(fn, resolve, reject)
}

Promise.prototype.then = function then(onFulfilled, onRejected) {
  var self = this
  return new Promise(function (resolve, reject) {
    self._handle(function (result) {
      if (typeof onFulfilled === 'function') {
        try {
          resolve(onFulfilled(result))
        } catch (ex) {
          reject(ex)
        }
      } else {
        resolve(result)
      }
    }, function (error) {
      if (typeof onRejected === 'function') {
        try {
          resolve(onRejected(error))
        } catch (ex) {
          reject(ex)
        }
      } else {
        reject(error)
      }
    })
  })
}

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}

Promise.prototype.done = function (onFulfilled, onRejected) {
  this.then(onFulfilled, onRejected).catch(function (error) {
    setTimeout(function () {
      throw error
    })
  })
}

Promise.prototype.finally = function (callback) {
  this.then(callback, callback)
}


Promise.resolve = function (r) {
  return new Promise(function (resolve, reject) {
    resolve(r)
  })
}

Promise.reject = function (r) {
  return new Promise(function (resolve, reject) {
    reject(r)
  })
}

Promise.all = function (values) {
  var results = Array.prototype.slice.call(values)
  var remain = results.length
  return new Promise(function (resolve, reject) {
    if (results.length === 0) {
      resolve(values)
    }
    results.forEach(function (value, i) {
      Promise.resolve(value).then(function (r) {
        results[i] = r
        if (--remain === 0) {
          resolve(results)
        }
      }, reject)
    })
  })
}

Promise.race = function (values) {
  var arrs = Array.prototype.slice.call(values)
  return new Promise(function (resolve, reject) {
    if (values.length === 0) {
      resovle(values)
    }
    arrs.forEach(function (value) {
      Promise.resolve(value).then(resolve, reject)
    })
  })
}

module.exports = Promise