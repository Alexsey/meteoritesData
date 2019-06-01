'use strict'

const eventEmitter = new (require('events'))

const _ = require('lodash')
const {values, invokeMap, isFunction, isArray, isPlainObject} = _
const allSettled = require('promise.allsettled')

const {getSucceed} = require('./utils')

module.exports = async sourcesProviders => {
  if (isPlainObject(sourcesProviders)) { // all sources passed required
    sourcesProviders = values(sourcesProviders)
  } else if (!isArray(sourcesProviders)) { // single source
    sourcesProviders = [sourcesProviders]
  }

  let sources = await getSucceed(sourcesProviders.map(sourcesProvider =>
    isFunction(sourcesProvider) ? sourcesProvider : sourcesProvider
  ))
  sources.forEach(source => source.on('data', data => eventEmitter.emit('data', source.name, data)))
  return {
    on: eventEmitter.on.bind(eventEmitter),
    init: async () => allSettled(sources.map(source => source.init())),
    teardown: async () => allSettled(sources.map(source => source.teardown())),
    get: async req => _(await invokeMap(sources, 'get', req))
      .flatten()
      .compact()
      .uniqBy('id')
      .value(),
    getEarliestYearWithMass: async mass =>
      _(await invokeMap(sources, 'getEarliestYearWithMass', mass)).compact().min(),
  }
}