import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { isntNull } from '@blackglory/prelude'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: MessagePort | Worker
, { parameterValidators, version, channel, ownPropsOnly }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string
    ownPropsOnly?: boolean
  } = {}
): () => void {
  port.on('message', handler)
  return () => port.off('message', handler)

  async function handler(req: any): Promise<void> {
    if (DelightRPC.isRequest(req) || DelightRPC.isBatchRequest(req)) {
      const result = await DelightRPC.createResponse(
        api
      , req
      , {
          parameterValidators
        , version
        , channel
        , ownPropsOnly
        }
      )

      if (isntNull(result)) {
        port.postMessage(result)
      }
    }
  }
}
