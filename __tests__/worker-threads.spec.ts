import { createClient } from '@src/client'
import { Worker } from 'worker_threads'
import '@blackglory/jest-matchers'
import * as path from 'path'

interface API {
  echo(message: string): string
}

describe('createClient, createServer', () => {
  let worker: Worker
  beforeEach(() => {
    worker = new Worker(path.resolve(__dirname, './server.js'))
  })
  afterEach(async () => {
    await worker.terminate()
  })

  test('echo', async () => {
    const client = createClient<API>(worker)

    const result = client.echo('hello')
    const proResult = await result

    expect(result).toBePromise()
    expect(proResult).toStrictEqual('hello')
  })
})
