import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { isntNull } from '@blackglory/prelude'
import { IRequest, IBatchRequest, IResponse, IBatchResponse } from '@delight-rpc/protocol'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: MessagePort | Worker
, {
    parameterValidators
  , version
  , channel
  , ownPropsOnly
  , postMessage = (port, response) => port.postMessage(response)
  , receiveMessage = message => {
      if (DelightRPC.isRequest(message) || DelightRPC.isBatchRequest(message)) {
        return message
      }
    }
  }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
    ownPropsOnly?: boolean
    postMessage?: (
      port: MessagePort | Worker
    , response: IResponse<unknown> | IBatchResponse<unknown>
    ) => void
    receiveMessage?: (data: unknown) =>
    | IRequest<unknown>
    | IBatchRequest<unknown>
    | undefined
  } = {}
): () => void {
  port.on('message', handler)
  return () => port.off('message', handler)

  async function handler(message: unknown): Promise<void> {
    const request = receiveMessage(message)
    if (request) {
      const result = await DelightRPC.createResponse(
        api
      , request
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
