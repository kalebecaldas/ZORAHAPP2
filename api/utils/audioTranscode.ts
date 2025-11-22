import path from 'path'
import { spawn } from 'child_process'

export async function transcodeToMp3(inputPath: string): Promise<{ outputPath: string }> {
  const ffmpegPath = (await import('ffmpeg-static')).default as string
  const base = path.basename(inputPath, path.extname(inputPath))
  const dir = path.dirname(inputPath)
  const outputPath = path.join(dir, `${base}.mp3`)

  await new Promise<void>((resolve, reject) => {
    const args = ['-y', '-i', inputPath, '-vn', '-ar', '44100', '-ac', '1', '-b:a', '64k', outputPath]
    const proc = spawn(ffmpegPath, args)
    proc.on('error', reject)
    proc.stderr.on('data', () => { })
    proc.stdout.on('data', () => { })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
  })

  return { outputPath }
}

export async function transcodeToOggOpus(inputPath: string): Promise<{ outputPath: string }> {
  const ffmpegPath = (await import('ffmpeg-static')).default as string
  const base = path.basename(inputPath, path.extname(inputPath))
  const dir = path.dirname(inputPath)
  const outputPath = path.join(dir, `${base}.ogg`)

  await new Promise<void>((resolve, reject) => {
    const args = ['-y', '-i', inputPath, '-vn', '-c:a', 'libopus', '-b:a', '16k', '-ar', '16000', '-ac', '1', '-vbr', 'on', '-application', 'voip', '-frame_duration', '20', '-f', 'ogg', outputPath]
    const proc = spawn(ffmpegPath, args)
    proc.on('error', reject)
    proc.stderr.on('data', () => { })
    proc.stdout.on('data', () => { })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
  })

  return { outputPath }
}

export async function transcodeToAacM4a(inputPath: string): Promise<{ outputPath: string }> {
  const ffmpegPath = (await import('ffmpeg-static')).default as string
  const base = path.basename(inputPath, path.extname(inputPath))
  const dir = path.dirname(inputPath)
  const outputPath = path.join(dir, `${base}.m4a`)

  await new Promise<void>((resolve, reject) => {
    const args = ['-y', '-i', inputPath, '-vn', '-c:a', 'aac', '-b:a', '64k', '-ar', '48000', '-ac', '1', outputPath]
    const proc = spawn(ffmpegPath, args)
    proc.on('error', reject)
    proc.stderr.on('data', () => { })
    proc.stdout.on('data', () => { })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
  })

  return { outputPath }
}
