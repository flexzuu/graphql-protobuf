import {
  addQueryResMsgToNamespace,
  addReqMsgToNamespace,
  createRoot,
  createRootWithQueries
} from "./lib";
import { buildSchema, execute, parse } from "graphql";
import { loadSync } from "protobufjs";
import { cloneDeepWith } from "lodash";
import { writeFileSync, readFileSync } from "fs";
import { readFixtureSync } from "../testUtils";
const converter = require("protobufjs/cli/targets/proto3.js");

const schemaSDL = readFixtureSync("schemaSDL.graphql");
const query = readFixtureSync("testQuery.graphql");

const root = loadSync("fixtures/testQuery.proto");

const schema = buildSchema(schemaSDL);

fit("constructs the correct protobuf", () => {
  const { namespace: ns } = createRoot();
  addReqMsgToNamespace(ns);
  addQueryResMsgToNamespace(query, schema, ns);
  expect(ns.toJSON()).toEqual(root.get("graphql")!.toJSON());
});

it("constructs the correct protobuf createRootWithQueries", () => {
  const { namespace } = createRootWithQueries([query], schema);
  expect(namespace.toJSON()).toEqual(root.get("graphql")!.toJSON());
});

it("constructs the correct protobuf benchmark example", () => {
  const q = readFixtureSync("benchmark/benchmark-query-nofragments.graphql");
  const s = buildSchema(readFixtureSync("benchmark/benchmark-schema.graphql"));

  const { namespace } = createRootWithQueries([q], s);
  let data: string;
  converter(namespace, {}, (error: any, d: any) => {
    data = d;
    expect(data).toMatchInlineSnapshot(`
"syntax = \\"proto3\\";

message Request {

    string query = 1;
}

message Response_testQuery {

    Data data = 1;

    message Data {
    }
}"
`);
  });
});

it("serializes the data", () => {
  const { namespace: ns, root: actualRoot } = createRoot();
  addReqMsgToNamespace(ns);
  addQueryResMsgToNamespace(query, schema, ns);
  var ResponseMessage = actualRoot.lookupType("graphql.Response_testQuery");
  const payload = {
    data: {
      both: {
        string: "foo",
        number: 42
      },
      test: null,
      x: null,
      testReq: {
        string: "req string"
      },
      testb: {
        test: {
          string: "foo"
        }
      }
    }
  };

  // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
  const errMsg = ResponseMessage.verify(payload);
  if (errMsg) throw Error(errMsg);

  // Create a new message
  const message = ResponseMessage.create(payload); // or use .fromObject if conversion is necessary

  // Encode a message to an Uint8Array (browser) or Buffer (node)
  const buffer = ResponseMessage.encode(message).finish();
  // ... do something with buffer

  // Decode an Uint8Array (browser) or Buffer (node) to a message
  const response = ResponseMessage.decode(buffer);
  // ... do something with message
  expect(response.toJSON().data.both).toEqual(payload.data.both);
  expect(response.toJSON().data.test).toBeUndefined();
  expect(response.toJSON().data.x).toBeUndefined();

  // ... do something with message

  expect(response.toJSON().data.both).toEqual(payload.data.both);
  expect(response.toJSON().data.test).toBeUndefined();
  expect(response.toJSON().data.x).toBeUndefined();
});

it("full round trip", () => {
  const { namespace: ns, root: actualRoot } = createRoot();
  addReqMsgToNamespace(ns);
  addQueryResMsgToNamespace(query, schema, ns);
  var ResponseMessage = actualRoot.lookupType("graphql.Response_testQuery");
  var RequestMessage = actualRoot.lookupType("graphql.Request");
  const req = {
    query
  };
  // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
  let errMsg = RequestMessage.verify(req);
  if (errMsg) throw Error(errMsg);

  // Create a new message
  const reqMsg = RequestMessage.create(req); // or use .fromObject if conversion is necessary

  // Encode a message to an Uint8Array (browser) or Buffer (node)
  const bufferReq = RequestMessage.encode(reqMsg).finish();
  writeFileSync("./fixtures/reqbuffer", bufferReq);
  // send over the wire

  //gqlServer
  const reqJSON = RequestMessage.decode(bufferReq).toJSON();
  const res = cloneDeepWith(
    execute(schema, parse(reqJSON.query), {
      test: {
        string: "foo",
        number: 42
      },
      testReq: {
        string: "req string"
      },
      testb: {
        test: {
          string: "foo"
        }
      }
    })
  );

  errMsg = ResponseMessage.verify(res);
  if (errMsg) throw Error(errMsg);

  const resMsg = ResponseMessage.create(res);
  const bufferRes = ResponseMessage.encode(resMsg).finish();

  const resJSON = ResponseMessage.decode(bufferRes).toJSON();
  expect(JSON.stringify(resJSON, null, 2)).toMatchInlineSnapshot(`
"{
  \\"data\\": {
    \\"test\\": {
      \\"string\\": \\"foo\\"
    },
    \\"x\\": {
      \\"number\\": 42
    },
    \\"both\\": {
      \\"number\\": 42,
      \\"string\\": \\"foo\\",
      \\"alias\\": 42
    },
    \\"testReq\\": {
      \\"string\\": \\"req string\\"
    }
  }
}"
`);
});
