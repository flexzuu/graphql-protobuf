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

it("constructs the correct protobuf", () => {
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

        Field_viewer viewer = 1;

        message Field_viewer {

            string id = 1;
            Field_project project = 2;
            string __typename = 3;

            message Field_project {

                string id = 1;
                Field_quotas quotas = 2;
                Field_subscription subscription = 3;
                Field_role role = 4;
                repeated Field_existingRoles existing_roles = 5;
                repeated Field_members members = 6;
                repeated Field_invites invites = 7;
                string __typename = 8;

                message Field_quotas {

                    Field_seats seats = 1;
                    string __typename = 2;

                    message Field_seats {

                        float current = 1;
                        float estimate = 2;
                        float max = 3;
                        float percent = 4;
                        string __typename = 5;
                    }
                }

                message Field_subscription {

                    string id = 1;
                    Field_plan plan = 2;
                    string __typename = 3;

                    message Field_plan {

                        string id = 1;
                        bool is_free = 2;
                        string __typename = 3;
                    }
                }

                message Field_role {

                    string id = 1;
                    string name = 2;
                    repeated Field_permissions permissions = 3;
                    string __typename = 4;

                    message Field_permissions {

                        string id = 1;
                        string description = 2;
                        string __typename = 3;
                    }
                }

                message Field_existingRoles {

                    string id = 1;
                    string name = 2;
                    repeated Field_permissions permissions = 3;
                    string __typename = 4;

                    message Field_permissions {

                        string id = 1;
                        string description = 2;
                        string __typename = 3;
                    }
                }

                message Field_members {

                    string id = 1;
                    Field_profile profile = 2;
                    Field_role role = 3;
                    string __typename = 4;

                    message Field_profile {

                        string email = 1;
                        string name = 2;
                        string picture = 3;
                        string __typename = 4;
                    }

                    message Field_role {

                        string id = 1;
                        string name = 2;
                        repeated Field_permissions permissions = 3;
                        string __typename = 4;

                        message Field_permissions {

                            string id = 1;
                            string description = 2;
                            string __typename = 3;
                        }
                    }
                }

                message Field_invites {

                    string id = 1;
                    string email = 2;
                    string expiration_date = 3;
                    string code = 4;
                    Field_role role = 5;
                    string __typename = 6;

                    message Field_role {

                        string id = 1;
                        string name = 2;
                        string __typename = 3;
                    }
                }
            }
        }
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
      },
      testc: [
        {
          test: ["a", "b", "c"]
        }
      ]
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
      },
      testc: [
        {
          test: ["a", "b", "c"]
        }
      ]
    })
  );

  errMsg = ResponseMessage.verify(res);
  if (errMsg) {
    console.error(res)
    throw Error(errMsg);
  }

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
    },
    \\"testb\\": {
      \\"test\\": {
        \\"string\\": \\"foo\\"
      }
    },
    \\"testc\\": [
      {
        \\"test\\": [
          \\"a\\",
          \\"b\\",
          \\"c\\"
        ]
      }
    ]
  }
}"
`);
});
