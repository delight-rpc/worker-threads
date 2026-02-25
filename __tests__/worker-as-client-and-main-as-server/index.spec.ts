import { describe, test, expect, afterEach, beforeEach } from 'vitest'
import { ImplementationOf } from 'delight-rpc'
import { createClient } from '@src/client.js'
import { createServer } from '@src/server.js'
import { Worker } from 'worker_threads'
import { IAPI } from './contract.js'
import * as path from 'path'
import { getErrorPromise } from 'return-style'
import { fileURLToPath } from 'url'
import { assert } from '@blackglory/errors'
import { delay } from 'extra-promise'
import { AbortError } from 'extra-abort'
import { waitForEventEmitter } from '@blackglory/wait-for'

const api: ImplementationOf<IAPI> = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
, async loop(signal?: AbortSignal): Promise<never> {
    assert(signal)

    while (!signal.aborted) {
      await delay(100)
    }

    throw signal.reason
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const filename = path.resolve(__dirname, './worker.js')

describe('Worker as Client, Main as Server', () => {
  let worker: Worker
  beforeEach(async () => {
    worker = new Worker(filename)
    await waitForEventEmitter(worker, 'message')
  })
  afterEach(async () => {
    await worker.terminate()
  })

  test('result', async () => {
    const cancelServer = createServer(api, worker)

    const [client, close] = createClient<{
      eval: (code: string) => any
    }>(worker)
    try {
      const result = await client.eval(`
        client.echo('hello')
      `)

      expect(result).toBe('hello')
    } finally {
      close()
      cancelServer()
    }
  })

  test('error', async () => {
    const cancelServer = createServer(api, worker)

    const [client, close] = createClient<{
      eval: (code: string) => any
    }>(worker)
    try {
      const err = await getErrorPromise(client.eval(`
        client.error('hello')
      `))

      expect(err).toBeInstanceOf(Error)
      expect(err!.message).toMatch('hello')
    } finally {
      close()
      cancelServer()
    }
  })

  test('abort', async () => {
    const cancelServer = createServer(api, worker)

    const [client, close] = createClient<{
      eval: (code: string) => any
    }>(worker)
    try {
      const err = await getErrorPromise(client.eval(`
        const controller = new AbortController()
        const promise = client.loop(controller.signal)
        controller.abort()
        promise
      `))

      expect(err).toBeInstanceOf(AbortError)
    } finally {
      close()
      cancelServer()
    }
  })
})
