import { Type, Field, Namespace, Root } from 'protobufjs/light';
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

export function createRootFromQuery(query: string, schema: GraphQLSchema) {
  const { namespace, root } = createRoot('graphql');
  addSimpleReqMsgToNamespace(namespace);
  var RequestMessage = root.lookupType('graphql.Request');
  addQueryResMsgToNamespace(query, schema, namespace);
  var ResponseMessage = root.lookupType('graphql.Response');
  return { root, ResponseMessage, RequestMessage };
}

export function createRootFromBody(body: any, schema: GraphQLSchema) {
  const { namespace, root } = createRoot('graphql');
  addSimpleReqMsgToNamespace(namespace);
  var RequestMessage = root.lookupType('graphql.Request');
  const reqJSON = RequestMessage.decode(body).toJSON();
  const query = reqJSON.query;
  addQueryResMsgToNamespace(query, schema, namespace);
  var ResponseMessage = root.lookupType('graphql.Response');
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
  const ast = parse(query);
  const typeInfo = new TypeInfo(schema);
  let ancestors: Type[] = [];
  const visitor: Visitor<ASTKindToNode> = {
    [Kind.OPERATION_DEFINITION]: node => {
      const ResponseQueryType = new Type(`Response`).add(
        new Field('data', 1, 'Data')
      );
      ns.add(ResponseQueryType);
      const DataType = new Type(`Data`);
      ResponseQueryType.add(DataType);
      ancestors.push(DataType);
    },
    [Kind.FIELD]: {
      enter(node) {
        const parent = last(ancestors)!;
        const fieldName = (node.alias && node.alias.value) || node.name.value;
        const fieldType = typeInfo.getType();
        if (!fieldType) {
          throw new Error('No field type');
        }
        let typeName;
        if (isNamedScalarType(fieldType)) {
          typeName = getScalarTypeName(getNamedType(fieldType).toString());
        } else {
          typeName = `Field_${fieldName}`;
        }
        parent.add(
          new Field(
            fieldName,
            Object.keys(parent.fields).length + 1,
            typeName,
            isListTypeDeep(fieldType) ? 'repeated' : undefined
          )
        );
        if (!isNamedScalarType(fieldType)) {
          const FieldType = new Type(typeName);
          parent.add(FieldType);
          ancestors.push(FieldType);
        }
      },
      leave(node) {
        const fieldType = typeInfo.getType();
        if (!fieldType) {
          throw new Error('No field type');
        }
        if (!isNamedScalarType(fieldType)) {
          ancestors.pop();
        }
      },
    },
  };
  visit(ast, visitWithTypeInfo(typeInfo, visitor));
}

function isNamedScalarType(t: GraphQLType) {
  return isScalarType(getNamedType(t));
}

function isListTypeDeep(t: GraphQLType) {
  /* eslint-enable no-redeclare */
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
      return 'string';
    default:
      throw new Error('unsuported type ' + name);
  }
}
