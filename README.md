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

- [ ] GraphQL Interfaces
- [ ] GraphQL Union Types
- [ ] GraphQL Fragments
- [ ] GraphQL Variables
- [ ] Multiple Queries
- [ ] Multiple Queries in one document


## Benchmark
```
❯ curl -X GET -so /dev/null -w '%{size_download}' \
    http://localhost:3001/ \
    -H 'Content-Type: application/json' --compressed
3278 bytes
```