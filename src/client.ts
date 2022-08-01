import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { IRequest, IBatchRequest, IResponse, IError, IBatchResponse } from '@delight-rpc/protocol'

export function createClient<IAPI extends object>(
  port: MessagePort | Worker
, {
    parameterValidators
  , expectedVersion
  , channel
  , postMessage = (port, request) => port.postMessage(request)
  , receiveMessage = message => {
      if (DelightRPC.isResult(message) || DelightRPC.isError(message)) {
        return message
      }
    }
  }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: `${number}.${number}.${number}`
    channel?: string
    postMessage?: (port: MessagePort | Worker, request: IRequest<unknown>) => void
    receiveMessage?: (message: unknown) =>
    | IResponse<unknown>
    | undefined
  } = {}
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<IResponse<unknown>> } = {}

  port.on('message', handler)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request) {
      const res = new Deferred<IResponse<unknown>>()
      pendings[request.id] = res
      try {
        postMessage(port, request)
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , {
      parameterValidators
    , expectedVersion
    , channel
    }
  )

  return [client, close]

  function close() {
    port.off('message', handler)

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(message: unknown): void {
    const response = receiveMessage(message)
    if (response) {
      pendings[response.id].resolve(response)
    }
  }
}

export function createBatchClient(
  port: MessagePort | Worker
, {
    expectedVersion
  , channel
  , postMessage = (port, request) => port.postMessage(request)
  , receiveMessage = message => {
      if (DelightRPC.isError(message) || DelightRPC.isBatchResponse(message)) {
        return message
      }
    }
  }: {
    expectedVersion?: `${number}.${number}.${number}`
    channel?: string
    postMessage?: (
      port: MessagePort | Worker
    , request: IBatchRequest<unknown>
    ) => void
    receiveMessage?: (message: unknown) =>
    | IError
    | IBatchResponse<unknown>
    | undefined
  } = {}
): [client: DelightRPC.BatchClient, close: () => void] {
  const pendings: {
    [id: string]: Deferred<
    | IError
    | IBatchResponse<unknown>
    >
  } = {}

  port.on('message', handler)

  const client = new DelightRPC.BatchClient(
    async function send(request) {
      const res = new Deferred<
      | IError
      | IBatchResponse<unknown>
      >()
      pendings[request.id] = res
      try {
        postMessage(port, request)
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , {
      expectedVersion
    , channel
    }
  )

  return [client, close]

  function close() {
    port.off('message', handler)

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(message: unknown): void {
    const response = receiveMessage(message)
    if (response) {
      pendings[response.id].resolve(response)
    }
  }
}

export class ClientClosed extends CustomError {}
