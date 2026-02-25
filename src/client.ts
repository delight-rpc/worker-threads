import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { IRequest, IBatchRequest, IResponse, IError, IBatchResponse, IAbort } from '@delight-rpc/protocol'
import { raceAbortSignals, timeoutSignal, withAbortSignal } from 'extra-abort'
import { isntUndefined } from '@blackglory/prelude'

export function createClient<IAPI extends object>(
  port: MessagePort | Worker
, {
    parameterValidators
  , expectedVersion
  , channel
  , timeout
  , postMessage = (port, request) => port.postMessage(request)
  , receiveMessage = message => {
      if (
        DelightRPC.isResult(message) ||
        DelightRPC.isError(message)
      ) {
        return message
      }
    }
  }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: string
    channel?: string
    timeout?: number
    postMessage?: (
      port: MessagePort | Worker
    , message: IRequest<unknown> | IAbort
    ) => void
    receiveMessage?: (message: unknown) =>
    | IResponse<unknown>
    | undefined
  } = {}
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: Map<string, Deferred<IResponse<unknown>>> = new Map()

  port.on('message', handler)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request, signal) {
      const res = new Deferred<IResponse<unknown>>()
      pendings.set(request.id, res)
      try {
        postMessage(port, request)

        const mergedSignal = raceAbortSignals([
          isntUndefined(timeout) && timeoutSignal(timeout)
        , signal
        ])
        mergedSignal.addEventListener('abort', () => {
          const abort = DelightRPC.createAbort(request.id, channel)
          postMessage(port, abort)
        })

        return await withAbortSignal(mergedSignal, () => res)
      } finally {
        pendings.delete(request.id)
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

    for (const [key, deferred] of pendings.entries()) {
      deferred.reject(new ClientClosed())
      pendings.delete(key)
    }
  }

  function handler(message: unknown): void {
    const response = receiveMessage(message)
    if (response) {
      pendings.get(response.id)?.resolve(response)
    }
  }
}

export function createBatchClient<DataType>(
  port: MessagePort | Worker
, {
    expectedVersion
  , channel
  , timeout
  , postMessage = (port, message) => port.postMessage(message)
  , receiveMessage = message => {
      if (
        DelightRPC.isError(message) ||
        DelightRPC.isBatchResponse<DataType>(message)
      ) {
        return message
      }
    }
  }: {
    expectedVersion?: string
    channel?: string
    timeout?: number
    postMessage?: (
      port: MessagePort | Worker
    , message: IBatchRequest<DataType> | IAbort
    ) => void
    receiveMessage?: (message: unknown) =>
    | IError
    | IBatchResponse<DataType>
    | undefined
  } = {}
): [client: DelightRPC.BatchClient<DataType>, close: () => void] {
  const pendings: Map<
    string
  , Deferred<IError | IBatchResponse<DataType>>
  > = new Map()

  port.on('message', handler)

  const client = new DelightRPC.BatchClient<DataType>(
    async function send(request) {
      const res = new Deferred<
      | IError
      | IBatchResponse<DataType>
      >()
      pendings.set(request.id, res)
      try {
        postMessage(port, request)

        const mergedSignal = raceAbortSignals([
          isntUndefined(timeout) && timeoutSignal(timeout)
        ])
        mergedSignal.addEventListener('abort', () => {
          const abort = DelightRPC.createAbort(request.id, channel)
          postMessage(port, abort)
        })

        return await withAbortSignal(mergedSignal, () => res)
      } finally {
        pendings.delete(request.id)
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

    for (const [key, deferred] of pendings.entries()) {
      deferred.reject(new ClientClosed())
      pendings.delete(key)
    }
  }

  function handler(message: unknown): void {
    const response = receiveMessage(message)
    if (response) {
      pendings.get(response.id)?.resolve(response)
    }
  }
}

export class ClientClosed extends CustomError {}
