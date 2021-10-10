import { parentPort } from 'worker_threads'
import { createServer } from '../src/server'

const API = {
  echo(message: string): string {
    return message
  }
}

createServer(API, parentPort!)
