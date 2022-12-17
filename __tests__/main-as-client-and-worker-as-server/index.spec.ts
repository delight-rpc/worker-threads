import { createClient } from '@src/client'
import { Worker } from 'worker_threads'
import { IAPI } from './api'
import * as path from 'path'
import { getErrorPromise } from 'return-style'

describe('Main as Client, Worker as Server', () => {
  let worker: Worker
  beforeEach(() => {
    worker = new Worker(path.resolve(__dirname, './worker.js'))
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
