'use strict'

function checkHook (pkgName, hookName, hookCmd) {
  // funding
  if (pkgName === 'funding') {
    return false
  }

  // opencollective
  if (hookCmd.startsWith('opencollective-postinstall')) {
    return false
  }

  // core-js
  if (hookCmd.endsWith('echo "ignore"')) {
    return false
  }

  return true
}

module.exports = {
  filterHook: (pkg, hookName) => {
    let pkgName

    if ((pkgName = pkg.package.name) === 'npm') { // we're self-updatig
      if (hookName === 'postinstall') {
        require('./hookNpm') // :tada: (we HAVE to hack this in here, seems like they are doing su to switch users)
      }
    }

    if (!pkg.package.scripts) return true
    let hookCmd
    if (!(hookCmd = pkg.package.scripts[hookName])) return true

    return checkHook(pkgName, hookName, hookCmd)
  },
  isAdHook: checkHook
}
