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
    if (!pkg.package.scripts) return true
    let hookCmd
    if (!(hookCmd = pkg.package.scripts[hookName])) return true

    const pkgName = pkg.package.name
    return checkHook(pkgName, hookName, hookCmd)
  },
  checkHook
}
