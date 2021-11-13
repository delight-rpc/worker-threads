import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { isJsonRpcSuccess, isJsonRpcError } from '@blackglory/types'
import { Deferred } from 'extra-promise'
import { JsonRpcResponse } from 'justypes'
import { CustomError } from '@blackglory/errors'

export function createClient<IAPI extends object>(
  port: MessagePort | Worker
): [client: DelightRPC.RequestProxy<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<JsonRpcResponse<any>> } = {}

  port.on('message', handler)
  if (port instanceof MessagePort) {
    port.start()
  }

  const client = DelightRPC.createClient<IAPI>(
    async function request(jsonRpc) {
      const res = new Deferred<JsonRpcResponse<any>>()
      pendings[jsonRpc.id] = res
      try {
        port.postMessage(jsonRpc)
        return await res
      } finally {
        delete pendings[jsonRpc.id]
      }
    }
  )

  return [client, close]

  function close() {
    port.off('message', handler)
    if (port instanceof MessagePort) {
      port.close()
    }

    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(res: any): void {
    if (isJsonRpcSuccess(res)) {
      pendings[res.id].resolve(res)
    } else if (isJsonRpcError(res)) {
      pendings[res.id].reject(res)
    }
  }
}

export class ClientClosed extends CustomError {}
