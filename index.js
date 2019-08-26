'use strict'

function checkHook (pkgName, hookName, hookCmd) {
  if (pkgName === 'funding') {
    return false
  }

  if (hookName === 'postinstall') {

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
