#!/usr/bin/env node
/**
 * Convert a still image to video using xAI Video Generation API (via curl).
 * Docs: https://docs.x.ai/developers/model-capabilities/video/generation
 *
 * Usage:
 *   # New task (default image + default prompt):
 *   XAI_API_KEY=your_key node scripts/image-to-video.mjs
 *
 *   # New task with custom image and optional message (prompt):
 *   XAI_API_KEY=your_key node scripts/image-to-video.mjs [image_path] ["custom prompt"]
 *
 *   # Resume polling by request_id:
 *   XAI_API_KEY=your_key node scripts/image-to-video.mjs <request_id>
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_INPUT_DIR = path.join(__dirname, 'input')
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'output')

const API_BASE = 'https://api.x.ai/v1'
const CURL_PROXY = '-x http://127.0.0.1:7890'
const POLL_INTERVAL_MS = 5000
const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

function err(msg) {
  console.error('❌', msg)
  process.exit(1)
}

function log(msg) {
  console.log('ℹ️', msg)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function main() {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) err('Set XAI_API_KEY in the environment.')

  const firstArg = process.argv[2]
  const resumeById = firstArg && UUID_RE.test(firstArg)
  let requestId

  if (resumeById) {
    requestId = firstArg
    log(`Resuming poll for Request ID: ${requestId}`)
  } else {
    const imagePath = firstArg
      ? path.resolve(process.cwd(), firstArg)
      : path.join(DEFAULT_INPUT_DIR, 'image.jpg')
    if (!fs.existsSync(imagePath)) err(`Image not found: ${imagePath}`)

    const imageBuffer = fs.readFileSync(imagePath)
    const base64Image = imageBuffer.toString('base64')
    const ext = path.extname(imagePath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
    const imageDataUri = `data:${mime};base64,${base64Image}`

    const defaultPrompt =
      'Animate subtly: gentle movement of hair, soft expression change, and slight shimmer on skin and fabric. Keep the composition and pose unchanged.'
    const prompt = process.argv[3] ?? defaultPrompt

    const body = JSON.stringify({
      model: 'grok-imagine-video',
      prompt,
      image: { url: imageDataUri },
      duration: 10,
      resolution: '720p',
    })

    const bodyFile = path.join(os.tmpdir(), `xai-video-${Date.now()}.json`)
    fs.writeFileSync(bodyFile, body, 'utf8')
    try {
      log('Starting video generation (image-to-video)...')
      let startResp
      try {
        const out = execSync(
          `curl -s ${CURL_PROXY} -X POST "${API_BASE}/videos/generations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${apiKey}" \
  -d @${bodyFile}`,
          { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 },
        )
        startResp = JSON.parse(out)
      } catch (e) {
        if (e.stdout) console.error(e.stdout)
        if (e.stderr) console.error(e.stderr)
        err('Failed to start generation: ' + (e.message || e))
      }
      requestId = startResp.request_id
      if (!requestId) err('No request_id in response: ' + JSON.stringify(startResp))
      log(`Request ID: ${requestId}`)
    } finally {
      try {
        fs.unlinkSync(bodyFile)
      } catch (_) {}
    }
  }

  log('Polling for result (this may take several minutes)...')

  let exitCode = 1
  const startTime = Date.now()
  for (;;) {
    if (Date.now() - startTime > TIMEOUT_MS) err('Timed out waiting for video.')

    let pollResp
    try {
      const pollOut = execSync(
        `curl -s ${CURL_PROXY} -X GET "${API_BASE}/videos/${requestId}" \
  -H "Authorization: Bearer ${apiKey}"`,
        { encoding: 'utf-8' },
      )
      pollResp = JSON.parse(pollOut)
    } catch (e) {
      if (e.stdout) console.error(e.stdout)
      if (e.stderr) console.error(e.stderr)
      err('Poll request failed: ' + (e.message || e))
    }

    // API returns { video: { url, duration, respect_moderation }, model } when done; no top-level "status"
    const url = pollResp.video?.url
    const respectModeration = pollResp.video?.respect_moderation

    if (url) {
      if (respectModeration === false) {
        log('Request was filtered by content moderation (no video URL returned).')
        break
      }
      console.log('')
      console.log('Video URL (temporary, download soon):')
      console.log(url)
      if (pollResp.video?.duration != null) {
        console.log(`Duration: ${pollResp.video.duration}s`)
      }
      exitCode = 0
      break
    }

    // Done but filtered: video object without url or with respect_moderation false
    if (pollResp.video && respectModeration === false) {
      log('Request was filtered by content moderation.')
      break
    }

    // Explicit failure from API (error object or status)
    if (pollResp.error) {
      err('Request failed: ' + (pollResp.error.message || JSON.stringify(pollResp.error)))
    }
    const status = pollResp.status
    if (status && status !== 'pending') {
      err(`Request ended with status: ${status}`)
    }

    log('In progress (pending)...')
    execSync(`sleep ${POLL_INTERVAL_MS / 1000}`, { stdio: 'inherit' })
  }
  process.exit(exitCode)
}

main()
