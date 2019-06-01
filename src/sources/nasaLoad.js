'use strict'

const eventEmitter = new (require('events'))

const _ = require('lodash')
const {times, pick, pickBy, inRange, merge} = _

const {fetch} = require('../utils')
const defaultConfig = require('../../config').sources.nasaLoad

module.exports = async configOverride => {
  let isInit = false
  let lastFetchedId
  let dataRefresherIntervalId
  const data = {}
  const config = merge({}, defaultConfig, configOverride)
  if (config.test) // all requests to API will be performed with no arguments
    config.requestArg.qs = ''

  await init()

  return {
    on: eventEmitter.on.bind(eventEmitter),
    init,
    teardown,
    get: req => get(data, req),
    getEarliestYearWithMass: mass => getEarliestYearWithMass(data, mass),
  }

  async function init () {
    if (isInit)
      return

    fetchNewAndUpdateState()
    dataRefresherIntervalId = setInterval(fetchNewAndUpdateState, config.ttl)
    isInit = true
  }

  function teardown () {
    clearInterval(dataRefresherIntervalId)
    isInit = false
  }

  async function fetchNewAndUpdateState () {
    const newData = await fetchNew(lastFetchedId, config)
    if (!newData.length)
      return

    mergeData(data, newData)
    lastFetchedId = _(newData).map('id').map(Number).max()
    eventEmitter.emit('data', newData)
  }
}

function get (data, req = {}) {
  let res = data

  if (req.year) {
    res = typeof req.year == 'object'
      ? pickBy(res, (records, year) =>
        inRange(+year, +req.year.from || 0, +req.year.to || Infinity)
      )
      : pick(res, req.year)
  }

  res = Object.values(res || {}).flat()

  if (req.mass) {
    res = res.filter(record => typeof req.mass == 'object'
      ? inRange(+record.mass, (+req.mass.from || -1) + 1, (+req.mass.to || Infinity) - 1)
      : record.mass == req.mass
    )
  }

  return res
}

function getEarliestYearWithMass (data, mass) {
  return Object.keys(data).map(Number).sort((a, b) => a - b)
    .find(year => +data[year][0].mass >= mass)
}

async function fetchNew (lastFetchedId, config) {
  const query = lastFetchedId
    // can not use "id > lastFetchedId" because id is a string
    ? `SELECT * WHERE id IN (${times(config.downloadBy, i => `'${i + lastFetchedId + 1}'`).join()})`
    : `SELECT * ORDER BY id ASC LIMIT ${config.initialLoad}`
  const request = merge({qs: {$query: query}}, config.requestArg)
  try {
    return await fetch(request, config.attempts)
  } catch (e) {
    console.error(e)
    return []
  }
}

function mergeData (data, newData) {
  const newDataYears = new Set
  newData.forEach(record => {
    if (!record.year)
      return

    const year = record.year.match(/^(?:0*)(\d+)/)[1] // 0861-01-01T00:00:00.000 -> 861
    newDataYears.add(year)
    data[year] = data[year] || []
    data[year].push(record)
  })
  newDataYears.forEach(year => data[year].sort((rec1, rec2) => rec2.mass - rec1.mass))
}