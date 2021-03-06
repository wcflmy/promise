var PENDING = 0
var FULFILLED = 1
var REJECTED = 2

function Promise(fn) {
  // store state which can be PENDING, FULFILLED or REJECTED
  // var state = PENDING
  this.state = PENDING

  // store value once FULFILLED or REJECTED
  var value = null

  // store sucess & failure handlers
  var handlers = []

  var self = this

  function fulfill(result) {
    // add setTimeout for passing 2.2.2.2
    setTimeout(function () {
      self.state = FULFILLED
      value = result
      handlers.forEach(handle)
      handlers = null
    }, 0)
  }

  function reject(error) {
    // add setTimeout for passing 2.2.3.2
    setTimeout(function () {
      self.state = REJECTED
      value = error
      handlers.forEach(handle)
      handlers = null
    }, 0)
  }

  function resolve(result) {
    if (result === self) {
      reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
      return
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
    if (self.state === PENDING) {
      handlers.push(handler)
    } else {
      if (self.state === FULFILLED &&
        typeof handler.onFulfilled === 'function') {
        handler.onFulfilled(value)
      }
      if (self.state === REJECTED &&
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

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected)
}

Promise.prototype.done = function (onFulfilled, onRejected) {
  this.then(onFulfilled, onRejected).catch(function (error) {
    setTimeout(function () {
      throw error
    }, 0)
  })
}

Promise.prototype['finally'] = Promise.prototype.always = function (callback) {
  return this.then(function(r) {
    return callback(r), r
  }, function(e) {
    throw callback(e), e
  })
}

Promise.prototype.wait = function (delay) {
  return this.then(function (r) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve(r)
      }, delay)
    })
  }, function (r) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        reject(r)
      }, delay)
    })
  })
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
      resolve(values)
    }
    arrs.forEach(function (value) {
      Promise.resolve(value).then(resolve, reject)
    })
  })
}

Promise.sequence = function (values) {
  values = Array.prototype.slice.call(values)
  return values.reduce(function (promise, next) {
    return promise.then(next).then(function (res) {
      return res
    })
  }, Promise.resolve())
}

Promise.stop = function () {
  return new Promise()
}

Promise.timeout = function (promise, timeout) {
  return Promise.race([promise, Promise.reject().wait(timeout)])
}

Promise.deferred = Promise.defer = function () {
  var defer = {}
  defer.promise = new Promise(function (resolve, reject) {
    defer.resolve = resolve
    defer.reject = reject
  })
  return defer
}

module.exports = Promise