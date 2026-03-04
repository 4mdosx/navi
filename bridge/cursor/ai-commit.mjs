#!/usr/bin/env node

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const os = require('os')

// Config
const AGENT = 'cursor-agent'
const MAX_DIFF_LINES = 800
const LANG = 'en' // en | zh
const EDITOR_CMD = process.env.EDITOR || process.env.VISUAL || 'vi'

// Helpers
function error(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function info(message) {
  console.log(`ℹ️  ${message}`)
}

// Check staged diff
let diff
try {
  diff = execSync('git diff --staged', { encoding: 'utf-8' })
} catch (err) {
  error('Failed to get git diff. Make sure you are in a git repository.')
}

if (!diff || diff.trim().length === 0) {
  error("No staged changes found. Run 'git add' first.")
}

// Trim very large diff
const diffLines = diff.split('\n').length

if (diffLines > MAX_DIFF_LINES) {
  info(`Diff is large (${diffLines} lines), truncating to first ${MAX_DIFF_LINES} lines.`)
  diff = diff.split('\n').slice(0, MAX_DIFF_LINES).join('\n')
}

// Guess scope from paths
let scope
try {
  const stagedFiles = execSync('git diff --staged --name-only', { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(Boolean)

  const scopes = new Set()
  stagedFiles.forEach((file) => {
    const firstPart = file.split('/')[0]
    if (firstPart) {
      scopes.add(firstPart)
    }
  })

  scope = Array.from(scopes).sort().join(',')
} catch (err) {
  scope = 'core'
}

if (!scope || scope.length === 0) {
  scope = 'core'
}

// Prompt
const prompt = `You are a senior software engineer.

Given the following git diff, please:

1. Summarize what was changed (1 sentence).
2. Infer the motivation if possible.
3. Generate 3 commit message candidates following Conventional Commits:
   - Format: type(scope): subject
   - Use present tense, imperative mood
   - Scope: ${scope}
4. Mark the best one with: ✅ RECOMMENDED

Output format:

Summary:
- ...

Motivation:
- ...

Commit Messages:
1. ...
2. ✅ RECOMMENDED ...
3. ...

Do NOT explain the prompt itself.`

// Main async function
;(async () => {
  // Run agent
  info('Generating commit message suggestions...')

  let result
  try {
    const agentProcess = spawn(AGENT, [prompt], {
      stdio: ['pipe', 'pipe', 'inherit'],
    })

    agentProcess.stdin.write(diff)
    agentProcess.stdin.end()

    let output = ''
    agentProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    await new Promise((resolve, reject) => {
      agentProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`cursor-agent exited with code ${code}`))
        } else {
          resolve()
        }
      })
      agentProcess.on('error', reject)
    })

    result = output
  } catch (err) {
    error(`cursor-agent failed: ${err.message}`)
  }

  console.log()
  console.log('======================================')
  console.log(result)
  console.log('======================================')
  console.log()

  // Extract recommended commit
  const recommendedMatch = result.match(/^2\.\s*✅\s*RECOMMENDED\s+(.+)$/m)
  let recommended

  if (recommendedMatch) {
    recommended = recommendedMatch[1].trim()
  } else {
    // Try alternative pattern
    const altMatch = result.match(/✅\s*RECOMMENDED\s+(.+)$/m)
    if (altMatch) {
      recommended = altMatch[1].trim()
    }
  }

  if (!recommended) {
    error('Failed to extract recommended commit message.')
  }

  console.log('👉 Recommended commit message:')
  console.log('--------------------------------------')
  console.log(recommended)
  console.log('--------------------------------------')
  console.log()

  // User confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.question('Commit with this message? (y = yes / e = edit / n = cancel): ', (action) => {
    rl.close()

    const normalizedAction = action.trim().toLowerCase()

    if (normalizedAction === 'y' || normalizedAction === 'yes') {
      try {
        // Use -m flag with proper escaping
        execSync(['git', 'commit', '-m', recommended], { stdio: 'inherit' })
        info('Commit successful!')
      } catch (err) {
        error(`Failed to commit: ${err.message}`)
      }
    } else if (normalizedAction === 'e' || normalizedAction === 'edit') {
      const tmpFile = path.join(os.tmpdir(), `commit-msg-${Date.now()}.txt`)

      try {
        fs.writeFileSync(tmpFile, recommended, 'utf-8')

        // Open editor
        const editorProcess = spawn(EDITOR_CMD, [tmpFile], {
          stdio: 'inherit',
          shell: true,
        })

        editorProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const editedMessage = fs.readFileSync(tmpFile, 'utf-8').trim()
              if (editedMessage) {
                execSync(['git', 'commit', '-F', tmpFile], { stdio: 'inherit' })
                info('Commit successful!')
              } else {
                error('Commit message is empty.')
              }
            } catch (err) {
              error(`Failed to commit: ${err.message}`)
            }
          }

          // Clean up
          try {
            fs.unlinkSync(tmpFile)
          } catch (err) {
            // Ignore cleanup errors
          }
        })
      } catch (err) {
        error(`Failed to create temporary file: ${err.message}`)
      }
    } else {
      info('Commit canceled.')
      process.exit(0)
    }
  })
})()
