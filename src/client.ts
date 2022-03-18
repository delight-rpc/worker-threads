import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'

export function createClient<IAPI extends object>(
  port: MessagePort | Worker
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<DelightRPC.IResponse<unknown>> } = {}

  port.on('message', handler)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request) {
      const res = new Deferred<DelightRPC.IResponse<unknown>>()
      pendings[request.id] = res
      try {
        port.postMessage(request)
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , parameterValidators
  , expectedVersion
  )

  return [client, close]

  function close() {
    port.off('message', handler)

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(res: any): void {
    if (DelightRPC.isResult(res) || DelightRPC.isError(res)) {
      pendings[res.id].resolve(res)
    }
  }
}

export function createBatchClient(
  port: MessagePort | Worker
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.BatchClient, close: () => void] {
  const pendings: {
    [id: string]: Deferred<
    | DelightRPC.IError
    | DelightRPC.IBatchResponse<unknown>
    >
  } = {}

  port.on('message', handler)

  const client = new DelightRPC.BatchClient(
    async function send(request) {
      const res = new Deferred<
      | DelightRPC.IError
      | DelightRPC.IBatchResponse<unknown>
      >()
      pendings[request.id] = res
      try {
        port.postMessage(request)
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , expectedVersion
  )

  return [client, close]

  function close() {
    port.off('message', handler)

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(res: any): void {
    if (DelightRPC.isError(res) || DelightRPC.isBatchResponse(res)) {
      pendings[res.id].resolve(res)
    }
  }
}

export class ClientClosed extends CustomError {}
