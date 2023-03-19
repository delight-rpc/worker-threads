import { createClient } from '@src/client.js'
import { createServer } from '@src/server.js'
import { Worker } from 'worker_threads'
import { IAPI } from './contract.js'
import * as path from 'path'
import { getErrorPromise } from 'return-style'
import { fileURLToPath } from 'url'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const filename = path.resolve(__dirname, './worker.js')

describe('Worker as Client, Main as Server', () => {
  test('echo', async () => {
    const worker: Worker = new Worker(filename)
    const cancelServer = createServer(api, worker)

    const [client, close] = createClient<{
      eval: (code: string) => any
    }>(worker)
    try {
      const result = await client.eval('client.echo("hello")')
      close()
      expect(result).toBe('hello')
    } finally {
      cancelServer()
      worker.terminate()
    }
  })

  test('error', async () => {
    const worker: Worker = new Worker(filename)
    const cancelServer = createServer(api, worker)

    const [client, close] = createClient<{
      eval: (code: string) => any
    }>(worker)
    try {
      const err = await getErrorPromise(client.eval('client.error("hello")'))
      close()
      expect(err).toBeInstanceOf(Error)
      expect(err!.message).toMatch('hello')
    } finally {
      cancelServer()
      worker.terminate()
    }
  })
})
