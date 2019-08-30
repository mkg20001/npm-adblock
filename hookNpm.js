#!/usr/bin/env node

'use strict'

const {
  log,
  err,
  guessNpmLocation,
  patchHook
} = require('./util')

const path = require('path')
const fs = require('graceful-fs')
const os = require('os')
const cp = require('child_process')

const npmLocation = guessNpmLocation()

const hooks = ['postinstall', 'preinstall', 'install']

const actionFolder = path.join(npmLocation, 'lib/install/action')
const actions = hooks.map(h => [{
  path: path.join(actionFolder, h + '.js'),
  name: h
}]).map(a => a[0])

console.log(`NPM @ ${npmLocation}\nActions @ ${actionFolder}`)

let tryAgainWithSudo = false
let tryAgainWithUAC = false

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
      if (!process.env.ADBLOCK_SUDO && process.platform === 'linux') {
        tryAgainWithSudo = true
      } else {
        err('\n *** Failed patching %s *** \n *** You NEED to run this script as an administrator or otherwise make the file accessible for patching! *** \n', path)
      }
      return
    } else if (_err.code === 'EPERM') {
      if (!process.env.ADBLOCK_SUDO && process.platform === 'linux') {
        tryAgainWithSudo = true
      } else if (!process.env.ADBLOCK_UAC && process.platform === 'win32') {
        tryAgainWithUAC = true
      } else {
        err('\n *** Failed patching %s *** \n *** You NEED to run this script as an administrator or otherwise make the file accessible for patching! *** \n', path)
      }
      return
    }

    err('\n *** Failed patching %s *** \n%s', path, _err.stack)
  }
})

if (tryAgainWithSudo) {
  console.log('Couldn\'t install. Trying again with sudo...')
  cp.spawn('sudo', process.argv, {env: Object.assign({ADBLOCK_SUDO: '1'}, process.env), stdio: 'inherit'})
} else if (tryAgainWithUAC) {
  console.log('Couldn\'t install. Trying again with UAC...')

  const tmpPath = path.join(os.tmpdir(), String(Math.random()) + '.cmd')
  const tmpOutPath = path.join(os.tmpdir(), String(Math.random()) + '.txt')

  const SCRIPT = `@if (1==1) @if(1==0) @ELSE
@echo off&SETLOCAL ENABLEEXTENSIONS
>nul 2>&1 "%SYSTEMROOT%\\system32\\cacls.exe" "%SYSTEMROOT%\\system32\\config\\system"||(
    cscript //E:JScript //nologo "%~f0"
    @goto :EOF
)
echo.Installing npm-adblock...
setx ADBLOCK_UAC "1"
setx npm_guess ${JSON.stringify(path.dirname(npmLocation))} /M
${process.argv.map(JSON.stringify).join(' ')} >${JSON.stringify(tmpOutPath)}
REM https://stackoverflow.com/a/5969764/3990041
@goto :EOF
@end @ELSE
ShA=new ActiveXObject("Shell.Application")
ShA.ShellExecute("cmd.exe","/c \\""+WScript.ScriptFullName+"\\"","","runas",5);
@end
`

  fs.writeFileSync(tmpPath, SCRIPT)
  cp.execSync(tmpPath)

  fs.unlinkSync(tmpPath)
  console.log(String(fs.readFileSync(tmpOutPath)))
  fs.unlinkSync(tmpOutPath)
} else {
  console.log('Installed successfully!')
}
