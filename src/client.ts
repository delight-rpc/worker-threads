import * as DelightRPC from 'delight-rpc'
import { MessagePort, Worker } from 'worker_threads'
import { isJsonRpcSuccess, isJsonRpcError } from '@blackglory/types'
import { Deferred } from 'extra-promise'
import { JsonRpcResponse } from 'justypes'

export function createClient<IAPI extends object>(
  port: MessagePort | Worker
): DelightRPC.RequestProxy<IAPI> {
  const pendings: { [id: string]: Deferred<JsonRpcResponse<any>> } = {}

  port.on('message', handler)

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

  return client

  function handler(res: any): void {
    if (isJsonRpcSuccess(res)) {
      pendings[res.id].resolve(res)
    } else if (isJsonRpcError(res)) {
      pendings[res.id].reject(res)
    }
  }
}
