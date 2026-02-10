const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const extractZip = require('extract-zip')

const root = path.resolve(__dirname, '..')
const toolsDir = path.join(root, 'tools')
const downloadsDir = path.join(toolsDir, 'downloads')

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }) } catch {}
}

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(targetPath))
    const file = fs.createWriteStream(targetPath)
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(() => {})
        fs.unlink(targetPath, () => {})
        return downloadFile(res.headers.location, targetPath).then(resolve, reject)
      }
      if ((res.statusCode || 0) >= 400) {
        file.close(() => {})
        return reject(new Error('Download failed: ' + res.statusCode))
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve(true)))
    })
    req.on('error', err => { try { file.close() } catch {}; reject(err) })
  })
}

async function fetchTemurinJdk() {
  const jdkOut = path.join(toolsDir, 'jdk')
  ensureDir(jdkOut)
  const zipPath = path.join(downloadsDir, 'temurin21.zip')
  let url = ''
  // Try API first
  try {
    const apiUrl = 'https://api.github.com/repos/adoptium/temurin21-binaries/releases/latest'
    console.log('Fetching Temurin JDK API...', apiUrl)
    const json = await new Promise((resolve, reject) => {
      https.get(apiUrl, { headers: { 'User-Agent': 'NoteCode/0.1 (fetch-tools)' } }, res => {
        let data = ''
        res.on('data', d => data += d)
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
      }).on('error', reject)
    })
    const asset = (json.assets || []).find(a => /jdk_x64_windows_hotspot.*\.zip$/i.test(a.name || ''))
    if (asset && asset.browser_download_url) url = asset.browser_download_url
  } catch {}
  // Fallback to stable latest link
  if (!url) url = 'https://github.com/adoptium/temurin21-binaries/releases/latest/download/OpenJDK21U-jdk_x64_windows_hotspot.zip'
  console.log('Downloading Temurin JDK...', url)
  await downloadFile(url, zipPath)
  console.log('Extracting JDK...')
  await extractZip(zipPath, { dir: jdkOut })
  try { fs.unlinkSync(zipPath) } catch {}
}

async function fetchWinLibsGcc() {
  const gccOut = path.join(toolsDir, 'winlibs')
  ensureDir(gccOut)
  const apiUrl = 'https://api.github.com/repos/brechtsanders/winlibs_mingw/releases/latest'
  console.log('Fetching WinLibs release API...', apiUrl)
  const json = await new Promise((resolve, reject) => {
    https.get(apiUrl, { headers: { 'User-Agent': 'NoteCode/0.1 (fetch-tools)' } }, res => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
  const asset = (json.assets || []).find(a => /winlibs-x86_64-.*gcc.*\.zip$/i.test(a.name || ''))
  if (!asset || !asset.browser_download_url) throw new Error('WinLibs asset not found')
  const zipPath = path.join(downloadsDir, 'winlibs-gcc.zip')
  console.log('Downloading WinLibs...', asset.browser_download_url)
  await downloadFile(asset.browser_download_url, zipPath)
  console.log('Extracting WinLibs...')
  await extractZip(zipPath, { dir: gccOut })
  try { fs.unlinkSync(zipPath) } catch {}
}

(async () => {
  try {
    ensureDir(toolsDir)
    ensureDir(downloadsDir)
    await fetchTemurinJdk()
    await fetchWinLibsGcc()
    console.log('Tools fetched into', toolsDir)
    process.exit(0)
  } catch (e) {
    console.error('Failed to fetch tools:', e)
    process.exit(1)
  }
})()
