import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: MessagePort | Worker
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
): () => void {
  port.on('message', handler)
  return () => port.off('message', handler)

  async function handler(req: any): Promise<void> {
    if (DelightRPC.isRequest(req)) {
      const result = await DelightRPC.createResponse(api, req, parameterValidators)

      port.postMessage(result)
    }
  }
}
