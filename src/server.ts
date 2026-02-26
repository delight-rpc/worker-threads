import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { isntNull } from '@blackglory/prelude'
import { IRequest, IBatchRequest, IResponse, IBatchResponse, IAbort } from '@delight-rpc/protocol'
import { HashMap } from '@blackglory/structures'
import { SyncDestructor } from 'extra-defer'

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
  const destructor = new SyncDestructor()

  const channelIdToController: HashMap<
    {
      channel?: string
    , id: string
    }
  , AbortController
  > = new HashMap(({ channel, id }) => JSON.stringify([channel, id]))
  destructor.defer(abortAllPendings)

  port.on('message', receive)
  destructor.defer(() => port.off('message', receive))

  if (port instanceof Worker) {
    port.on('exit', close)
    destructor.defer(() => port.off('exit', close))
  } else {
    port.on('close', close)
    destructor.defer(() => port.off('close', close))
  }

  return close

  function close(): void {
    destructor.execute()
  }

  function abortAllPendings(): void {
    for (const controller of channelIdToController.values()) {
      controller.abort()
    }

    channelIdToController.clear()
  }

  async function receive(payload: unknown): Promise<void> {
    const message = receiveMessage(payload)
    if (message) {
      if (DelightRPC.isAbort(message)) {
        if (DelightRPC.matchChannel(message, channel)) {
          channelIdToController.get(message)?.abort()
          channelIdToController.delete(message)
        }
      } else {
        const destructor = new SyncDestructor()

        const controller = new AbortController()
        channelIdToController.set(message, controller)
        destructor.defer(() => channelIdToController.delete(message))

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
          destructor.execute()
        }
      }
    }
  }
}
