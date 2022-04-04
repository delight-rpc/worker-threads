import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: MessagePort | Worker
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
, version?: `${number}.${number}.${number}`
): () => void {
  port.on('message', handler)
  return () => port.off('message', handler)

  async function handler(req: any): Promise<void> {
    if (DelightRPC.isRequest(req) || DelightRPC.isBatchRequest(req)) {
      const result = await DelightRPC.createResponse(
        api
      , req
      , parameterValidators
      , version
      )

      port.postMessage(result)
    }
  }
}
