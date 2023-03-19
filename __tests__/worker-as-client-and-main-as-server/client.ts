import { IAPI } from './contract.js'
import { createServer } from '@src/server.js'
import { createClient } from '@src/client.js'
import { parentPort } from 'worker_threads'

const [client] = createClient<IAPI>(parentPort!)

createServer({
  async eval(code: string): Promise<unknown> {
    return await eval(code)
  }
}, parentPort!)
