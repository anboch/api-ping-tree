var redis = require('../redis')

const KEY = 'targets'

module.exports = {
  setTarget,
}

async function setTarget (newTarget) {
  if (!await getTargetById(newTarget.id)) {
    return new Promise((resolve, reject) => {
      redis.lpush(KEY, JSON.stringify(newTarget), (err, targets) => {
        if (err) {
          reject(err)
        }
        resolve({ message: 'SUCCESS' })
      })
    })
  }
}

function getAllTargets () {
  return new Promise((resolve, reject) => {
    redis.lrange(KEY, 0, -1, (err, targets) => {
      if (err) {
        reject(err)
      }
      resolve(targets.map((target) => JSON.parse(target)))
    })
  })
}

