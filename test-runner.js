const { spawn } = require('node:child_process')

const child = spawn(process.execPath, ['--test', 'tests/**/*.test.js'], {
  stdio: 'inherit',
  cwd: process.cwd()
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
