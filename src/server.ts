import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { isntNull } from '@blackglory/prelude'
import { IResponse, IBatchResponse } from '@delight-rpc/protocol'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: MessagePort | Worker
, {
    parameterValidators
  , version
  , channel
  , ownPropsOnly
  , postMessage = (port, response) => port.postMessage(response)
  }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
    ownPropsOnly?: boolean
    postMessage?: (
      port: MessagePort | Worker
    , response: IResponse<unknown> | IBatchResponse<unknown>
    ) => void
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
        postMessage(port, result)
      }
    }
  }
}
