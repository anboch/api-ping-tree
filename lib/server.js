var URL = require('url')
var http = require('http')
var cuid = require('cuid')
var Corsify = require('corsify')
var sendJson = require('send-data/json')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')
var HttpHashRouter = require('http-hash-router')

var redis = require('./redis')
var version = require('../package.json').version
var endpoints = require('./services/endpoints')

var router = HttpHashRouter()
var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, redis.healthCheck)
var cors = Corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, accept, content-type'
})

router.set('/favicon.ico', empty)

module.exports = function createServer () {
  return http.createServer(cors(handler))
}

function handler (req, res) {
  if (req.url === '/health') return health(req, res)
  req.id = cuid()
  logger(req, res, { requestId: req.id }, function (info) {
    info.authEmail = (req.auth || {}).email
    console.log(info)
  })
  router(req, res, { query: getQuery(req.url) }, onError.bind(null, req, res))
}

router.set('/api/targets', {
  GET: (req, res) => {
    endpoints.getAllTargets().then(
      targets => {
        if (targets.length) sendJson(req,res,targets)
        else {
          res.statusCode = 404
          sendJson(req,res, { message:'Targets not found' })
        }
      },
      err => onError(req, res, err)
    )
  },
  POST: (req, res) => {
    endpoints.setTarget(req.body).then(
      resolve => {
        if (resolve) sendJson(req,res, resolve)
        else {
          res.statusCode = 403
          sendJson(req, res, { message: 'Target already exists' })
        }
      },
      err =>onError(req, res,err)
    )
  }
})

router.set('/api/target/:id', {
  GET: (req, res, opt) => {
    endpoints.getTargetById(opt.params.id).then(
      target => {
        if (target) sendJson(req, res, target)
        else {
          res.statusCode = 404
          sendJson(req, res, { message: 'Target not found' })
        }
      },
      err => onError(req,res,err)
    )
  },
  POST: (req, res, opt) => {
    endpoints.updateTargetById(opt.params.id, req.body).then(
      resolve => sendJson(req, res, resolve), 
      err => onError(req,res,err)
    )
  }
})

function onError (req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

function logError (req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  var logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

function empty (req, res) {
  res.writeHead(204)
  res.end()
}

function getQuery (url) {
  return URL.parse(url, true).query // eslint-disable-line
}
