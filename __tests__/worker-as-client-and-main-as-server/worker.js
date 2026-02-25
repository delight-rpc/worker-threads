import { createServer } from '../../lib/server.js'
import { createClient } from '../../lib/client.js'
import { parentPort } from 'worker_threads'

const [client] = createClient(parentPort)

createServer({
  async eval(code) {
    return await eval(code)
  }
}, parentPort)

parentPort.postMessage('ready')
