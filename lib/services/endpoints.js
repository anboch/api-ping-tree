var redis = require('../redis')

const KEY = 'targets'

module.exports = {
  setTarget,
  getAllTargets,
  getTargetById,
  updateTargetById,
  routeVisitors
}

async function setTarget (newTarget) {
  if (await getTargetById(newTarget.id)) return
    return new Promise((resolve, reject) => {
      redis.lpush(KEY, JSON.stringify(newTarget), (err, targets) => {
        if (err) {
          reject(err)
        }
        resolve({ message: 'SUCCESS' })
      })
    })
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
      (target) => target.id === id)
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
      redis.lset(KEY, reqTargetIndex, JSON.stringify(newTarget),
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

async function routeVisitors (visitor) {
  const allTargets = await getAllTargets()
  const filteredTargetsByCriteria = filterTargetsByCriteria(allTargets, visitor)
  if (filteredTargetsByCriteria) return await filterTargetsByRemainAccepts(filteredTargetsByCriteria, visitor)
}

function filterTargetsByCriteria (targets, visitor) {
  let visitorHour = new Date(visitor.timestamp).getUTCHours()
  visitor.hour = ('0' + visitorHour).slice(-2)
  const filteredTargets = targets.filter((target) => {
    for (let [key, acceptRules] of Object.entries(target.accept)) {
      if (!acceptRules['$in'].includes(visitor[key])) return false
    } 
    return true
  })
  if (filteredTargets.length) return filteredTargets
}

async function filterTargetsByRemainAccepts (targets, visitor) {
  try {
    targets.sort((a, b) => b.value - a.value)
    for (const target of targets) {
      if (!datesAreOnSameDay(new Date(), new Date(target.lastAcceptDate))) {
        target.lastAcceptDate = new Date().toISOString()
        target.remainAcceptsPerDay = target.maxAcceptsPerDay - 1
        await updateTargetById(target.id, target)
        return target
      }
      if (!target.remainAcceptsPerDay > 0) continue
      target.lastAcceptDate = new Date().toISOString()
      target.remainAcceptsPerDay -= 1
      await updateTargetById(target.id, target)
      return target
    }
  } catch (err) {
    throw new Error('filterTargetsByRemainAccepts', err)
  }
}

function datesAreOnSameDay (first, second) {
  return first.getUTCFullYear() === second.getUTCFullYear() &&
  first.getUTCMonth() === second.getUTCMonth() &&
  first.getUTCDate() === second.getUTCDate()
}
