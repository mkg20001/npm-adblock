#!/usr/bin/env node

'use strict'

const {
  log,
  err,
  guessNpmLocation
} = require('./util')

const path = require('path')
const fs = require('fs')

const npmLocation = guessNpmLocation()

const hooks = ['postinstall', 'preinstall', 'install']
const selfPath = fs.realpathSync(require.resolve('.'))

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
function patchHook (contents, name) {
  if (contents.indexOf('filterHook') !== -1) return contents // already patched

  return contents
    .replace("strict'", "strict';" + `const {filterHook} = require(${JSON.stringify(selfPath)})`)
    .replace(/lifecycle\(.+\)/gmi, (full) => {
      return `if (filterHook(pkg, ${JSON.stringify(name)})) {${full};} else {next();}`
    })
}

const actionFolder = path.join(npmLocation, 'lib/install/action')
const actions = hooks.map(h => [{
  path: path.join(actionFolder, h + '.js'),
  name: h
}]).map(a => a[0])

console.log(`NPM @ ${npmLocation}\nActions @ ${actionFolder}`)

actions.forEach(({name, path}) => {
  try {
    log(path)

    const contents = fs.readFileSync(path)
    const patchedContents = patchHook(String(contents), name)

    fs.writeFileSync(path, patchedContents)
  } catch (_err) {
    if (_err.code === 'EACCES') {
      err('\n *** Failed patching %s *** \n *** You NEED to run this script as an administrator or otherwise make the file accessible for patching! *** \n', path)
    }

    err('Failed patching %s:\n%s', path, _err.stack)
  }
})

console.log('Installed successfully!')
