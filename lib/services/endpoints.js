var redis = require('../redis')

const KEY = 'targets'

module.exports = {
  setTarget,
  getAllTargets,
  getTargetById,
  updateTargetById,
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

async function getTargetById (id) {
  try {
    const allTargets = await getAllTargets()
    const reqTarget = allTargets.find(
      (target) => target.id === id )
      if (reqTarget) return reqTarget
    } catch (err) {
      throw new Error('getTargetById', err)
    }
  }

async function updateTargetById (id, newTarget) {
    try {
      const allTargets = await getAllTargets()
      const reqTargetIndex = allTargets.findIndex(
        (target) => target.id === id
      )
      if (reqTargetIndex === -1) return { message: 'Target not found' }
      return new Promise((resolve, reject) => {
        redis.lset( KEY, reqTargetIndex, JSON.stringify(newTarget),
          (err) => {
            if (err) reject(err)
            resolve({ message: 'UPDATED' })
          }
        )
      })
    } catch (error) {
      throw new Error('updateTargetById', err)
    }
  }