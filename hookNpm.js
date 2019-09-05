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

console.log('Installing npm patches for npm-adblock...')

log('npm %o', npmLocation)
log('actions %o', actionFolder)

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

const escape = require('shell-escape')

if (tryAgainWithSudo) {
  console.log('Couldn\'t install. Trying again with sudo/su...')

  const userInfo = (user) => {
    console.log('(If promted for a password, it is the one of the user %o)', user)
    console.log('(If you have never set a password for that user, simply press enter - it may fail, though)')
  }

  const trySudo = () => {
    userInfo(os.userInfo().username)
    return cp.spawn('sudo', process.argv, {env: Object.assign({ADBLOCK_SUDO: '1'}, process.env), stdio: 'inherit'})
  }
  const trySu = () => {
    userInfo('root')
    return cp.spawn('su', ['root', '-s', '/bin/sh', '-c', escape(['sh', '-c', escape(process.argv)])], {env: Object.assign({ADBLOCK_SUDO: '1'}, process.env), stdio: 'inherit'})
  }

  let t
  if (os.userInfo().username === 'nobody') {
    t = [trySu, trySudo]
  } else {
    t = [trySudo, trySu]
  }

  function tryMethod () { // eslint-disable-line no-inner-declarations
    let method = t.shift()

    if (!method) {
      err('\n *** Failed getting root privileges *** \n *** You NEED to run this script as an administrator or otherwise make the file accessible for patching! *** \n')
    } else {
      method().once('close', (code, sig) => {
        if (code || sig) {
          console.log('Failed with %o! Trying different method...', (code || sig))
          tryMethod()
        }
      })
    }
  }

  tryMethod()
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
  const out = cp.execSync(tmpPath)
  console.log(String(out))

  setTimeout(() => {
    fs.unlinkSync(tmpPath)
    console.log(String(fs.readFileSync(tmpOutPath)))
    fs.unlinkSync(tmpOutPath)
  }, 5 * 1000)
} else {
  console.log('Installed successfully!')
}
