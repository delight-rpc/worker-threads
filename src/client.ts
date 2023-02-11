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
    expectedVersion?: string
    channel?: string
    postMessage?: (port: MessagePort | Worker, request: IRequest<unknown>) => void
    receiveMessage?: (message: unknown) =>
    | IResponse<unknown>
    | undefined
  } = {}
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: Record<string, Deferred<IResponse<unknown>> | undefined> = {}

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
      deferred!.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(message: unknown): void {
    const response = receiveMessage(message)
    if (response) {
      pendings[response.id]?.resolve(response)
    }
  }
}

export function createBatchClient<DataType>(
  port: MessagePort | Worker
, {
    expectedVersion
  , channel
  , postMessage = (port, request) => port.postMessage(request)
  , receiveMessage = message => {
      if (DelightRPC.isError(message) || DelightRPC.isBatchResponse<DataType>(message)) {
        return message
      }
    }
  }: {
    expectedVersion?: string
    channel?: string
    postMessage?: (
      port: MessagePort | Worker
    , request: IBatchRequest<DataType>
    ) => void
    receiveMessage?: (message: unknown) =>
    | IError
    | IBatchResponse<DataType>
    | undefined
  } = {}
): [client: DelightRPC.BatchClient<DataType>, close: () => void] {
  const pendings: Record<
    string
  , | Deferred<IError | IBatchResponse<DataType>>
    | undefined
  > = {}

  port.on('message', handler)

  const client = new DelightRPC.BatchClient<DataType>(
    async function send(request) {
      const res = new Deferred<
      | IError
      | IBatchResponse<DataType>
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
      deferred!.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(message: unknown): void {
    const response = receiveMessage(message)
    if (response) {
      pendings[response.id]?.resolve(response)
    }
  }
}

export class ClientClosed extends CustomError {}
