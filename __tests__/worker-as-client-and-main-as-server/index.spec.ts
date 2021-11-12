import { createClient } from '@src/client'
import { createServer } from '@src/server'
import { Worker } from 'worker_threads'
import '@blackglory/jest-matchers'
import { IAPI } from './api'
import * as path from 'path'

describe('Worker as Client, Main as Server', () => {
  it('echo', async () => {
    const api: IAPI = {
      echo(message: string): string {
        return message
      }
    }
    const worker: Worker = new Worker(path.resolve(__dirname, './worker.js'))
    const cancelServer = createServer(api, worker)

    const [client, close] = createClient<{
      eval: (code: string) => any
    }>(worker)
    try {
      const result = await client.eval('client.echo("hello")')
      close()
      expect(result).toEqual('hello')
    } finally {
      cancelServer()
      worker.terminate()
    }
  })
})
