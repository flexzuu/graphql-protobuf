import { DocumentNode, GraphQLSchema, print } from 'graphql';
import fetch, { RequestInit } from 'node-fetch';
import {
  createRoot,
  addDocumentNodeResMsgToNamespace,
  addReqMsgToNamespace,
} from '../protobuf-graphql-encoding';
interface ResponseWrapper<T> {
  errors: [];
  data: T;
}

export class Client {
  private url: string;
  private schema: GraphQLSchema;
  private conf: RequestInit = {
    method: 'POST',
    headers: {
      'content-type': 'application/gqlproto',
    },
  };
  constructor(url: string, schema: GraphQLSchema) {
    this.url = url;
    this.schema = schema;
  }
  public async query<T>(document: DocumentNode): Promise<ResponseWrapper<T>> {
    const { namespace: ns, root: actualRoot } = createRoot();
    addReqMsgToNamespace(ns);
    addDocumentNodeResMsgToNamespace(document, this.schema, ns);
    var ResponseMessage = actualRoot.lookupType('graphql.Response');
    var RequestMessage = actualRoot.lookupType('graphql.Request');
    const req = {
      query: print(document),
    };
    // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
    let errMsg = RequestMessage.verify(req);
    if (errMsg) throw Error(errMsg);

    // Create a new message
    const reqMsg = RequestMessage.create(req); // or use .fromObject if conversion is necessary

    // Encode a message to an Uint8Array (browser) or Buffer (node)
    const bufferReq = RequestMessage.encode(reqMsg).finish();

    const response = await fetch(this.url, {
      ...this.conf,
      body: bufferReq,
    });
    const bufferRes = await response.buffer();
    const resJSON = ResponseMessage.decode(bufferRes).toJSON();
    return resJSON as ResponseWrapper<T>;
  }
}
