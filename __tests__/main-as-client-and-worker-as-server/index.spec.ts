import { createBatchClient, createClient } from '@src/client.js'
import { Worker } from 'worker_threads'
import { IAPI } from './contract.js'
import path from 'path'
import { getErrorPromise } from 'return-style'
import { fileURLToPath } from 'url'
import { createBatchProxy } from 'delight-rpc'

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

  test('echo (batch)', async () => {
    const [client, close] = createBatchClient(worker)
    const proxy = createBatchProxy<IAPI>()

    const result = await client.parallel(proxy.echo('hello'))
    close()

    expect(result.length).toBe(1)
    expect(result[0].unwrap()).toBe('hello')
  })

  test('error', async () => {
    const [client, close] = createClient<IAPI>(worker)

    const err = await getErrorPromise(client.error('hello'))
    close()

    expect(err).toBeInstanceOf(Error)
    expect(err!.message).toMatch('hello')
  })

  test('error (batch)', async () => {
    const [client, close] = createBatchClient(worker)
    const proxy = createBatchProxy<IAPI>()

    const result = await client.parallel(proxy.error('hello'))
    close()

    expect(result.length).toBe(1)
    const err = result[0].unwrapErr()
    expect(err).toBeInstanceOf(Error)
    expect(err!.message).toMatch('hello')
  })
})
