'use strict'

const log = (...a) => process.env.DEBUG ? console.log(...a) : ''
const err = (...a) => {
  console.error(...a)
  process.exit(0)
}
const errB = (msg, ...a) => {
  err(`\n *** ${msg} *** \n`, ...a)
}

const fs = require('fs')
const path = require('path')

/* Patches this:

'use strict'
var lifecycle = require('../../utils/lifecycle.js')
var packageId = require('../../utils/package-id.js')
const fs = require('fs')

module.exports = function (staging, pkg, log, next) {
  log.silly('postinstall', packageId(pkg))
  lifecycle(pkg.package, 'postinstall', pkg.path, next)
}
*/

const selfPath = fs.realpathSync(require.resolve('.'))

function patchHook (contents, name) {
  if (contents.indexOf('filterHook') !== -1) return contents // already patched

  return contents
    .replace("strict'", "strict';" + `const {filterHook} = require(${JSON.stringify(selfPath)})`)
    .replace(/lifecycle\(.+\)/gmi, (full) => {
      return `if (filterHook(pkg, ${JSON.stringify(name)})) {${full};} else {next();}`
    })
}

function guessNpmLocation () {
  let guesses = []

  // take it from env
  if (process.env.npm_execpath) {
    guesses.push(path.dirname(path.dirname(path.dirname(process.env.npm_execpath))))
  }
  if (process.env.npm_guess) {
    guesses.push(process.env.npm_guess)
  }

  // take it from our installation location
  guesses.push(path.dirname(path.dirname(require.resolve('.'))))

  guesses = guesses.concat(module.paths)

  log('found %s guesses', guesses.length)

  const validGuesses = guesses.map(p => path.join(p, 'npm/lib/install/action/postinstall.js')).filter(p => fs.existsSync(p)).map(p => fs.realpathSync(p))

  log('%s were valid', validGuesses.length)

  let _u = {}
  const validGuess = validGuesses.filter(p => {
    if (_u[p]) return false
    return (_u[p] = true)
  })

  if (!validGuess.length) {
    errB('Did not find any valid node paths. Please supply it via the environement variable npm_guess or as a cli argument')
  }

  if (validGuess.length !== 1) {
    errB('Found multiple valid guesses: %s. Please report!', validGuess.join(', '))
  }

  return path.dirname(path.dirname(path.dirname(path.dirname(validGuess[0]))))
}

module.exports = {
  log,
  err,
  guessNpmLocation,
  patchHook
}
