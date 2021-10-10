# @delight-rpc/worker-threads

## Install

```sh
npm install --save @delight-rpc/worker-threads
# or
yarn add @delight-rpc/worker-threads
```

## API

### createClient

```ts
function createClient<IAPI extends object>(
  port: MessagePort | Worker
): DelightRPC.RequestProxy<IAPI>
```

### createServer

```ts
function createServer<IAPI extends object>(
  api: IAPI
, port: MessagePort | Worker
): () => void
```
