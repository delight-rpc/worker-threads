import { isJsonRpcRequest } from '@blackglory/types'
import { createResponse } from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'

export function createServer<IAPI extends object>(
  api: IAPI
, port: MessagePort | Worker
): () => void {
  port.on('message', handler)
  return () => port.off('message', handler)

  async function handler(req: any): Promise<void> {
    if (isJsonRpcRequest(req)) {
      const result = await createResponse(api, req)

      port.postMessage(result)
    }
  }
}
