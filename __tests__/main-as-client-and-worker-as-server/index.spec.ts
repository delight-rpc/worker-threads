import { createClient } from '@src/client'
import { Worker } from 'worker_threads'
import '@blackglory/jest-matchers'
import { IAPI } from './api'
import * as path from 'path'

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

    const result = client.echo('hello')
    const proResult = await result
    close()

    expect(result).toBePromise()
    expect(proResult).toStrictEqual('hello')
  })
})
