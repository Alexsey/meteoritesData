'use strict'

const fiveMinutes = 5 * 60 * 1000

const sources = {
  nasaLoad: {
    name: 'nasaLoad',
    requestArg: {
      url: 'https://data.nasa.gov/resource/y77d-th95.json',
      json: true,
      gzip: true,
    },
    attempts: 3,
    ttl: fiveMinutes,
    initialLoad: 50000,
    downloadBy: 100,
  },
}

module.exports = {sources}