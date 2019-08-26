#!/usr/bin/env node

'use strict'

const {
  log,
  err,
  guessNpmLocation,
  patchHook
} = require('./util')

const path = require('path')
const fs = require('fs')

const npmLocation = guessNpmLocation()

const hooks = ['postinstall', 'preinstall', 'install']

const actionFolder = path.join(npmLocation, 'lib/install/action')
const actions = hooks.map(h => [{
  path: path.join(actionFolder, h + '.js'),
  name: h
}]).map(a => a[0])

console.log(`NPM @ ${npmLocation}\nActions @ ${actionFolder}`)

actions.forEach(({name, path}) => {
  try {
    log(path)

    const contents = String(fs.readFileSync(path))
    const patchedContents = patchHook(contents, name)

    if (contents !== patchedContents) {
      fs.writeFileSync(path, patchedContents)
    }
  } catch (_err) {
    if (_err.code === 'EACCES') {
      err('\n *** Failed patching %s *** \n *** You NEED to run this script as an administrator or otherwise make the file accessible for patching! *** \n', path)
    }

    err('\n *** Failed patching %s:\n *** \n%s', path, _err.stack)
  }
})

console.log('Installed successfully!')
