'use strict'

const _ = require('lodash')
const rp = require('request-promise-native')
const allSettled = require('promise.allsettled')

module.exports = {
  fetch,
  getSucceed
}

async function fetch (requestArg, attempts) {
  return (async function rec (attempt = 0) {
    try {
      return await rp(requestArg)
    } catch (e) {
      if (attempt >= attempts)
        throw e
      return rec(++attempt, e)
    }
  })()
}

async function getSucceed (promises) {
  return _(await allSettled(promises))
      .filter({status: 'fulfilled'})
      .map('value')
      .value()
}