import { IAPI } from './api'
import { createServer } from '../../src/server'
import { createClient } from '../../src/client'
import { parentPort } from 'worker_threads'

const client = createClient<IAPI>(parentPort!)

createServer({
  async eval(code: string): Promise<unknown> {
    return await eval(code)
  }
}, parentPort!)
