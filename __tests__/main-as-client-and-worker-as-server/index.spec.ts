import { createClient } from '@src/client.js'
import { Worker } from 'worker_threads'
import { IAPI } from './contract.js'
import path from 'path'
import { getErrorPromise } from 'return-style'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Main as Client, Worker as Server', () => {
  let worker: Worker
  beforeEach(() => {
    worker = new Worker(path.resolve(__dirname, './worker.ts'))
  })
  afterEach(async () => {
    await worker.terminate()
  })

  test('echo', async () => {
    const [client, close] = createClient<IAPI>(worker)

    const result = await client.echo('hello')
    close()

    expect(result).toBe('hello')
  })

  test('error', async () => {
    const [client, close] = createClient<IAPI>(worker)

    const err = await getErrorPromise(client.error('hello'))
    close()

    expect(err).toBeInstanceOf(Error)
    expect(err!.message).toMatch('hello')
  })
})
