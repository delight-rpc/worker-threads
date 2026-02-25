import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { isntNull } from '@blackglory/prelude'
import { IRequest, IBatchRequest, IResponse, IBatchResponse, IAbort } from '@delight-rpc/protocol'

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
      if (
        DelightRPC.isRequest(message) ||
        DelightRPC.isBatchRequest(message) ||
        DelightRPC.isAbort(message)
      ) {
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
    | IAbort
    | undefined
  } = {}
): () => void {
  const idToController: Map<string, AbortController> = new Map()

  port.on('message', handler)
  port.on('close', () => {
    for (const controller of idToController.values()) {
      controller.abort()
    }

    idToController.clear()
  })
  return () => port.off('message', handler)

  async function handler(payload: unknown): Promise<void> {
    const message = receiveMessage(payload)
    if (message) {
      if (DelightRPC.isAbort(message)) {
        if (DelightRPC.matchChannel(message, channel)) {
          idToController.get(message.id)?.abort()
          idToController.delete(message.id)
        }
      } else {
        const controller = new AbortController()
        idToController.set(message.id, controller)

        try {
          const result = await DelightRPC.createResponse(
            api
          , message
          , {
              parameterValidators
            , version
            , channel
            , ownPropsOnly
            , signal: controller.signal
            }
          )

          if (isntNull(result)) {
            postMessage(port, result)
          }
        } finally {
          idToController.delete(message.id)
        }
      }
    }
  }
}
