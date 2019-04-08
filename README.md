## Overview

This library uses a graphql query and `protobufjs` to dynamicly create `protobuf` definitions for a query.

It was designed for the following usecase:

1.  client uses the lib to create protobuf for return type of a query.
2.  client sends query as RequestMessage
3.  server uses the lib to create protobuf for return type of the query.
4.  server executes the query and encodes the result using the protobuf
5.  server sends the protobuf encodes result back to client
6.  client decodes the response message using the in step one created protobuf

## Not working yet:
- [ ] GraphQL Mutations
- [ ] GraphQL Subscriptions
- [ ] GraphQL Interfaces
- [ ] GraphQL Union Types
- [ ] GraphQL Fragments
- [ ] GraphQL Enums
- [ ] GraphQL Variables
- [ ] Multiple Queries
- [ ] Multiple Queries in one document


## Benchmark Big Query
```
❯ yarn benchmark
❯ curl -X GET \
    http://localhost:3002/bigQuery \
    -H 'Content-Type: application/json' > ./benchmark/big/json
❯ curl -X GET \
    http://localhost:3002/bigQuery \
    -H 'Content-Type: application/gqlproto' > ./benchmark/big/gqlproto
❯ gzip --keep ./benchmark/big/gqlproto ./benchmark/big/json
```
## Benchmark Small Query
```
❯ yarn benchmark
❯ curl -X GET \
    http://localhost:3002/smallQuery \
    -H 'Content-Type: application/json' > ./benchmark/small/json
❯ curl -X GET \
    http://localhost:3002/smallQuery \
    -H 'Content-Type: application/gqlproto' > ./benchmark/small/gqlproto
❯ gzip --keep ./benchmark/small/gqlproto ./benchmark/small/json
```

```
├── README.md
├── benchmark
│   ├── big
│   │   ├── gqlproto
│   │   ├── gqlproto.gz
│   │   ├── json
│   │   └── json.gz
│   ├── filesize.csv
│   └── small
│       ├── gqlproto
│       ├── gqlproto.gz
│       ├── json
│       └── json.gz
├── fixtures
│   ├── benchmark
│   │   ├── benchmark-instrospectionSchema.json
│   │   ├── benchmark-schema.graphql
│   │   ├── big
│   │   └── small
│   ├── reqbuffer
│   ├── schemaSDL.graphql
│   ├── testQuery.graphql
│   └── testQuery.proto
├── jest.config.js
├── package.json
├── packages
│   ├── protobuf-graphql-benchmark
│   │   └── exampleServer.ts
│   ├── protobuf-graphql-client
│   │   ├── index.ts
│   │   ├── lib.test.ts
│   │   └── lib.ts
│   ├── protobuf-graphql-encoding
│   │   ├── index.ts
│   │   ├── lib.test.ts
│   │   └── lib.ts
│   ├── protobuf-graphql-express
│   │   └── exampleServer.ts
│   └── testUtils
│       ├── fs.ts
│       └── index.ts
├── tsconfig.json
└── yarn.lock
```