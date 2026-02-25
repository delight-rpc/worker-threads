import { parentPort } from 'worker_threads'
import { createServer } from '../../lib/server.js'
import { assert } from '@blackglory/errors'
import { delay } from 'extra-promise'

const api = {
  echo(message) {
    return message
  }
, error(message) {
    throw new Error(message)
  }
, async loop(signal) {
    assert(signal)

    while (!signal.aborted) {
      await delay(100)
    }

    throw signal.reason
  }
}

createServer(api, parentPort)

parentPort.postMessage('ready')
