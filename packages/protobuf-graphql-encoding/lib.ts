import { Type, Field, Namespace, Root, Reader } from 'protobufjs/light';
import {
  parse,
  TypeInfo,
  Kind,
  visit,
  visitWithTypeInfo,
  GraphQLSchema,
  Visitor,
  ASTKindToNode,
  isScalarType,
  getNamedType,
  GraphQLType,
  isListType,
  isWrappingType,
} from 'graphql';
import { last } from 'lodash';

// creates a protocol buffer definition with Request and Response messages
export function createRootFromQuery(query: string, schema: GraphQLSchema) {
  const { namespace, root } = createRoot('graphql');
  addSimpleReqMsgToNamespace(namespace);
  var RequestMessage = root.lookupType('graphql.Request');
  addQueryResMsgToNamespace(query, schema, namespace);
  var ResponseMessage = root.lookupType('graphql.Response');
  return { root, ResponseMessage, RequestMessage };
}

// creates a protocol buffer definition with Request and Response messages
// Assumes the Reader holds a protobuf encoded Request with a query
export function createRootFromBody(
  reader: Reader | Uint8Array,
  schema: GraphQLSchema
) {
  const { namespace, root } = createRoot('graphql');
  addSimpleReqMsgToNamespace(namespace);
  var RequestMessage = root.lookupType('graphql.Request');
  const reqJSON = RequestMessage.decode(reader).toJSON();
  const query = reqJSON.query;
  // TODO: Add handling of parameters.
  // As we got the query here we can now use something similar to addQueryResMsgToNamespace.
  // addVariablesToReqMsg it needs to do:
  // - update the Request message add field that holds the variables
  // - add message type for the variables to the Request message following the same structure addQueryResMsgToNamespace uses.
  addQueryResMsgToNamespace(query, schema, namespace);
  var ResponseMessage = root.lookupType('graphql.Response');
  // TODO: return variables here
  return { root, ResponseMessage, RequestMessage, query };
}

function createRoot(pkgName: string = 'graphql') {
  const root = new Root();
  return { namespace: root.define(pkgName), root };
}

function addSimpleReqMsgToNamespace(ns: Namespace) {
  //add Request Type
  const req = new Type('Request');
  req.add(new Field('query', 1, 'string'));
  ns.add(req);
}

function addQueryResMsgToNamespace(
  query: string,
  schema: GraphQLSchema,
  ns: Namespace
) {
  const queryAST = parse(query);
  const graphQLTypeInfo = new TypeInfo(schema);

  // Keep track of the ancestor protobuf message types
  let ancestorMsgTypes: Type[] = [];
  // A visitor for the graphql built-in visit function
  // visit() will walk through an AST using a depth first traversal, calling
  // the visitor's enter function at each node in the traversal, and calling the
  //  leave function after visiting that node and all of its child nodes.
  const visitor: Visitor<ASTKindToNode> = {
    [Kind.OPERATION_DEFINITION]: node => {
      //Note: We currently assume there can be only one Operation definition per document
      //Note: Because of this assumption this should be called only once for now.
      //TODO: Update to allow multiple operations per document
      const ResponseQueryType = new Type(`Response`).add(
        new Field('data', 1, 'Data')
      );
      ns.add(ResponseQueryType);
      const DataType = new Type(`Data`);
      ResponseQueryType.add(DataType);
      ancestorMsgTypes.push(DataType);
    },
    // Summery:
    // For every field enter and leave will get called
    // On enter a new field is added to the parent type
    // If the return type of the field is a scalar we can assume we don't go deeper and the return type is already created.
    // If the return type is not scalar we create a type that can hold the fields that will be created in the next traversal step.
    // To be able to connect the fields to the correct type we create it here and update the ancestors with it.
    // on leaving fields with non scalar return types we pop the last ancestors to keep them consistent with the tree traversal.
    [Kind.FIELD]: {
      enter(node) {
        const parentMsgType = last(ancestorMsgTypes)!;
        const graphQLFieldName =
          (node.alias && node.alias.value) || node.name.value;
        const graphQLReturnType = graphQLTypeInfo.getType();
        if (!graphQLReturnType) {
          throw new Error('invariant: field has no return type');
        }
        // Set Return Type Name depending on if its scalar or a custom type
        let returnTypeName;
        if (isNamedScalarType(graphQLReturnType)) {
          returnTypeName = getScalarTypeName(
            getNamedType(graphQLReturnType).toString()
          );
        } else {
          // Create a unique name for the return type of the field
          returnTypeName = `Field_${graphQLFieldName}`;
        }
        // Add the field to the parent
        parentMsgType.add(
          new Field(
            graphQLFieldName,
            // set increasing ids
            Object.keys(parentMsgType.fields).length + 1,
            returnTypeName,
            // Set list to be represented as repeated
            isListTypeDeep(graphQLReturnType) ? 'repeated' : undefined
          )
        );

        // Create special message type for non scalar
        if (!isNamedScalarType(graphQLReturnType)) {
          //TODO: Add special handling for Enumerations, Interfaces and Unions
          const returnMsgType = new Type(returnTypeName);
          // Attach not to the root but the parent to
          // follow the tree structure of the query
          // and avoid name collisions
          parentMsgType.add(returnMsgType);
          // keep the ancestors updated
          ancestorMsgTypes.push(returnMsgType);
        }
      },
      leave(node) {
        const graphQLReturnType = graphQLTypeInfo.getType();
        if (!graphQLReturnType) {
          throw new Error('invariant: field has no return type');
        }
        if (!isNamedScalarType(graphQLReturnType)) {
          // keep the ancestors updated
          ancestorMsgTypes.pop();
        }
      },
    },
  };
  // Decorate visitor so that it keeps graphQLTypeInfo updated with the current nodes type information.
  const decoratedVisitor = visitWithTypeInfo(graphQLTypeInfo, visitor);
  // execute the visitor on the queryAST using graphQLs visit functionality
  visit(queryAST, decoratedVisitor);
}

// checks if a the fully unwrapped version of type is scalar a scalar type
function isNamedScalarType(t: GraphQLType) {
  return isScalarType(getNamedType(t));
}

// deeply check if a type is a List Type.
function isListTypeDeep(t: GraphQLType) {
  if (t) {
    let unwrappedType = t;
    while (
      isWrappingType(unwrappedType) &&
      (!isListType(unwrappedType) as boolean)
    ) {
      unwrappedType = unwrappedType.ofType;
    }
    return isListType(unwrappedType);
  }
}

// map GraphQL Scalars to protobuf scalars
function getScalarTypeName(name: string) {
  switch (name) {
    case 'String':
      return 'string';
    case 'Int':
      return 'int32';
    case 'Float':
      return 'float';
    case 'ID':
      return 'string';
    case 'Boolean':
      return 'bool';
    case 'DateTime':
      // We currently use a string for representing DateTime because thats what JSON uses.
      return 'string';
    default:
      throw new Error(`invariant: unsupported scalar type: "${name}"`);
  }
}
