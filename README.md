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
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
, expectedVersion?: `${number}.${number}.${number}`
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: MessagePort | Worker
, parameterValidators?: DelightRPC.ParameterValidators<IAPI>
, version?: `${number}.${number}.${number}`
): () => void
```
