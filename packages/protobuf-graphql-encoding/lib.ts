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
  DocumentNode,
  getNamedType,
} from 'graphql';
import { ReadonlyArray } from '../readOnlyArray';
import { last } from 'lodash';

function getScalarTypeName(name: string) {
  switch (name) {
    case 'String':
      return 'string';
    case 'Int':
      return 'int32';
    case 'Float':
      return 'float';
    default:
      throw new Error('unsuported type ' + name);
  }
}

export function createRoot(pkgName: string = 'graphql') {
  const root = new Root();
  return { namespace: root.define(pkgName), root };
}
export function createRootWithQueries(
  queries: string[],
  schema: GraphQLSchema
) {
  const { namespace, root } = createRoot();
  addReqMsgToNamespace(namespace);
  for (const query of queries) {
    addQueryResMsgToNamespace(query, schema, namespace);
  }
  return { namespace, root };
}
export function addReqMsgToNamespace(ns: Namespace) {
  //add Request Type
  const req = new Type('Request');
  req.add(new Field('query', 1, 'string'));
  ns.add(req);
}

export function addQueryResMsgToNamespace(
  query: string,
  schema: GraphQLSchema,
  ns: Namespace
) {
  const ast = parse(query);
  return addDocumentNodeResMsgToNamespace(ast, schema, ns);
}

export function addDocumentNodeResMsgToNamespace(
  ast: DocumentNode,
  schema: GraphQLSchema,
  ns: Namespace
) {
  const typeInfo = new TypeInfo(schema);
  let parentTypes: Type[] = [];
  const visitor: Visitor<ASTKindToNode> = {
    [Kind.OPERATION_DEFINITION]: (node, key, parent, path, ancestors) => {
      const ResponseQueryType = new Type(`Response_${node.name!.value}`).add(
        new Field('data', 1, 'Data')
      );
      ns.add(ResponseQueryType);
      const DataType = new Type(`Data`);
      ResponseQueryType.add(DataType);
      parentTypes.push(DataType);

    },
    [Kind.FIELD]: {
      enter(node, key, parent, path, ancestors) {
        const p = last(parentTypes)!;
          const fieldName = (node.alias && node.alias.value) || node.name.value;
          let typeName;
          if (isScalarType(typeInfo.getType())) {
            typeName = getScalarTypeName(
              getNamedType(typeInfo.getType()!).toString()
            );
          } else {
            typeName = `Field_${fieldName}`;
          }
          p.add(
                new Field(
                  fieldName,
                  Object.keys(p.fields).length + 1,
                  typeName
                )
              );
          if (!isScalarType(typeInfo.getType())) {
              const FieldType = new Type(typeName);
              p.add(FieldType)
              parentTypes.push(FieldType)
            }
      },
      leave(node, key, parent, path, ancestors) {
        if (!isScalarType(typeInfo.getType())) {
          parentTypes.pop()
        }
      },
    },
  };
  visit(ast, visitWithTypeInfo(typeInfo, visitor));
}
