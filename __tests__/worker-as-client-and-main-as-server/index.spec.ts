import { createClient } from '@src/client'
import { createServer } from '@src/server'
import { Worker } from 'worker_threads'
import '@blackglory/jest-matchers'
import { IAPI } from './api'
import * as path from 'path'
import { getErrorPromise } from 'return-style'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
}

describe('Worker as Client, Main as Server', () => {
  it('echo', async () => {
    const worker: Worker = new Worker(path.resolve(__dirname, './worker.js'))
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

  it('error', async () => {
    const worker: Worker = new Worker(path.resolve(__dirname, './worker.js'))
    const cancelServer = createServer(api, worker)

    const [client, close] = createClient<{
      eval: (code: string) => any
    }>(worker)
    try {
      const err = await getErrorPromise(client.eval('client.error("hello")'))
      close()
      expect(err).toBeInstanceOf(Error)
      expect(err!.message).toMatch('Error: hello')
    } finally {
      cancelServer()
      worker.terminate()
    }
  })
})
