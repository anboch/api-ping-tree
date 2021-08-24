process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')

var server = require('../lib/server')
var redis = require('../lib/redis')

let testData = {}

test.beforeEach(function (t) {
  testData.visitor1 = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T14:28:59.513Z'
  }
  testData.visitor2 = {
    geoState: 'ny',
    publisher: 'abc',
    timestamp: '2018-07-19T10:28:59.513Z'
  }
  testData.target1 = {
    id: '1',
    url: 'http://exampleUrl1.com',
    value: '0.50',
    maxAcceptsPerDay: '2',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['12', '13', '14']
      }
    }
  }
  testData.target2 = {
    id: '2',
    url: 'http://exampleUrl2.com',
    value: '0.60',
    maxAcceptsPerDay: '5',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['10', '11', '12']
      }
    }
  }
})

test.afterEach.always.cb(function (t) {
  redis.flushdb(function (err) {
    t.falsy(err)
    t.end()
  })
  testData = {}
})

test.serial.cb('POST /api/targets: can post a target', function (t) {
  const url = '/api/targets'
  servertest(server(), url, { encoding: 'json', method: 'POST' }, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.message, 'SUCCESS', 'message is SUCCESS')
    t.end()
  }).end(JSON.stringify(testData.target1))
})

test.serial.cb('POST /api/targets: can not post a target with the same id', function (t) {
  const url = '/api/targets'
  servertest(server(), url, { encoding: 'json', method: 'POST' }, function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), url, { encoding: 'json', method: 'POST' }, function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 403, 'correct statusCode')
      t.is(res.body.message, 'Target already exists', 'correct message')
      t.end()
    }).end(JSON.stringify(testData.target1))
  }).end(JSON.stringify(testData.target1))
})

test.serial.cb('GET /api/targets: get alltargets', function (t) {
  const url = '/api/targets'
  servertest(server(), url, { encoding: 'json', method: 'POST' }, function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(res.body[0].id, testData.target1.id, 'correct target Id')
      t.end()
    })
  }).end(JSON.stringify(testData.target1))
})


test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})
