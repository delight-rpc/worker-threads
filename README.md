# @delight-rpc/worker-threads
## Install
```sh
npm install --save @delight-rpc/worker-threads
# or
yarn add @delight-rpc/worker-threads
```

## Usage
### Main as Client, Worker as Server
```ts
// api.d.ts
interface IAPI {
  echo(message: string): string
}

// worker.ts
import { parentPort } from 'worker_threads'
import { createServer } from '@delight-rpc/worker-threads'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
}

createServer(api, parentPort!)

// main.ts
import { Worker } from 'worker_threads'
import { createClient } from '@delight-rpc/worker-threads'

const worker = new Worker('./worker.js')
const [client] = createClient<IAPI>(worker)

await client.echo('hello world')
```

### Worker as Client, Main as Server
```ts
// api.d.ts
interface IAPI {
  echo(message: string): string
}

// main.ts
import { Worker } from 'worker_threads'
import { createServer } from '@delight-rpc/worker-threads'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
}

const worker = new Worker('./worker.js')
createServer(api, worker)

// worker.ts
import { parentPort } from 'worker_threads'
import { createClient } from '@delight-rpc/worker-threads'

const [client] = createClient<IAPI>(parentPort!)
await client.echo('hello world')
```

## API
### createClient
```ts
function createClient<IAPI extends object>(
  port: MessagePort | Worker
, options?: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: string
    channel?: string
    timeout?: number

    postMessage?: (
      port: MessagePort | Worker
    , message: IRequest<unknown> | IAbort
    ) => void
    = (port, message) => port.postMessage(message)

    receiveMessage?: (message: unknown) =>
    | IResponse<unknown>
    | undefined
    = message => {
      if (
        DelightRPC.isResult(message) ||
        DelightRPC.isError(message)
      ) {
        return message
      }
    }
  }
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createBatchClient
```ts
function createBatchClient<DataType>(
  port: MessagePort | Worker
, options?: {
    expectedVersion?: string
    channel?: string
    timeout?: number

    postMessage?: (
      port: MessagePort | Worker
    , message: IBatchRequest<DataType> | IAbort
    ) => void
    = (port, message) => port.postMessage(message)

    receiveMessage?: (message: unknown) =>
    | IError
    | IBatchResponse<DataType>
    | undefined
    = message => {
      if (
        DelightRPC.isError(message) ||
        DelightRPC.isBatchResponse(message)
      ) {
        return message
      }
    }
  }
): [client: DelightRPC.BatchClient<DataType>, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: MessagePort | Worker
, options?: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string | RegExp | AnyChannel
    ownPropsOnly?: boolean

    postMessage?: (
      port: MessagePort | Worker
    , message: IResponse<unknown> | IBatchResponse<unknown> | IAbort
    ) => void
    = (port, message) => port.postMessage(message)

    receiveMessage?: (message: unknown) =>
    | IRequest<unknown>
    | IBatchRequest<unknown>
    | IAbort
    | undefined
    = message => {
      if (
        DelightRPC.isRequest(message) ||
        DelightRPC.isBatchRequest(message) ||
        DelightRPC.isAbort(message)
      ) {
        return message
      }
    }
  }
): () => void
```
