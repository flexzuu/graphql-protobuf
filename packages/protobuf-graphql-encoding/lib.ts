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
  const visitor: Visitor<ASTKindToNode> = {
    [Kind.OPERATION_DEFINITION]: (node, key, parent, path, ancestors) => {
      const typeName = `${getNamedType(typeInfo.getType()!).toString()}_${node.name!.value}`;
      let type = ns.get(typeName) as Type;
      if (!type) {
        type = new Type(typeName);
        ns.add(type);
      }
      ns.add(
        new Type(`Response_${node.name!.value}`).add(
          new Field('data', 1, typeName)
        )
      );
    },
    [Kind.FIELD]: (node, key, parent, path, ancestors) => {
      let parentField: string;
      const ancestor = ancestors[ancestors.length - 2]; // skip selectionset
      if (ReadonlyArray.isArray(ancestor)) {
        throw new Error();
      }
      if (ancestor.kind === Kind.OPERATION_DEFINITION) {
        parentField = ancestor.name!.value;
      } else if (ancestor.kind === Kind.FIELD) {
        parentField =
          (ancestor.alias && ancestor.alias.value) || ancestor.name.value;
      } else {
        console.error("wrong ancestor kind", ancestor);
        throw new Error();
      }

      const fieldName = (node.alias && node.alias.value) || node.name.value;
      let typeName;

      if (isScalarType(typeInfo.getType())) {
        typeName = getScalarTypeName(getNamedType(typeInfo.getType()!).toString());
      } else {
        typeName = `${getNamedType(typeInfo.getType()!).toString()}_${fieldName}`;
      }
      const parentTypeName = `${typeInfo.getParentType()!.name}_${parentField}`;

      //add field
      let parentType = ns.get(parentTypeName) as Type;
      if (parentType) {
        parentType.add(
          new Field(
            fieldName,
            Object.keys(parentType.fields).length + 1,
            typeName
          )
        );
      } else {
        console.error("did not find parentType", parentTypeName, parentType);
        console.log(JSON.stringify(ns.toJSON(), null, 2))
        throw new Error();
      }
      //add field return type
      if (!isScalarType(typeInfo.getType())) {
        let type = ns.get(typeName) as Type;
        if (!type) {
          type = new Type(typeName);
          ns.add(type);
        }
      }
    },
  };
  visit(ast, visitWithTypeInfo(typeInfo, visitor));
}
