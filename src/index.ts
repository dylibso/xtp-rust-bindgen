import ejs from 'ejs';
import { ArrayType, EnumType, getContext, helpers, MapType, ObjectType, Property, XtpNormalizedType, XtpTyped } from '@dylibso/xtp-bindgen';

// keywords via https://doc.rust-lang.org/reference/keywords.html
let KEYWORDS: Set<string> = new Set(['as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while', 'async', 'await', 'dyn', 'abstract', 'become', 'box', 'do', 'final', 'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield', 'try', 'macro_rules', 'union', 'dyn'])

function formatExternIdentifier(ident: string) {
  if (KEYWORDS.has(ident)) {
    return `r#${ident}`
  }
  return ident
}

function formatIdentifier(ident: string): string {
  if (KEYWORDS.has(ident)) {
    return `r#${ident}`
  }

  return helpers.camelToSnakeCase(ident)
}

function toRustTypeX(type: XtpNormalizedType): string {
  // turn into reference pointer if needed
  const optionalize = (t: string) => {
    return type.nullable ? `Option<${t}>` : t
  }

  switch (type.kind) {
    case 'string':
      return optionalize('String')
    case 'int32':
      return optionalize('i32')
    case 'float':
      return optionalize('f32')
    case 'double':
      return optionalize('f64')
    case 'byte':
      return optionalize('byte')
    case 'date-time':
      return optionalize('chrono::DateTime<chrono::Utc>')
    case 'boolean':
      return optionalize('bool')
    case 'array':
      const arrayType = type as ArrayType
      return optionalize(`Vec<${toRustTypeX(arrayType.elementType)}>`)
    case 'buffer':
      return optionalize('Vec<u8>')
    case 'object':
      const oType = (type as ObjectType)
      if (oType.properties?.length > 0) {
        return optionalize(`types::${helpers.capitalize(oType.name)}`)
      } else {
        // we're just exposing the serde values directly for backwards compat
        return optionalize('serde_json::Map<String, serde_json::Value>')
      }
    case 'enum':
      return optionalize(`types::${helpers.capitalize((type as EnumType).name)}`)
    case 'map':
      const { keyType, valueType } = type as MapType
      return optionalize(`serde_json::Map<${toRustTypeX(keyType)}, ${toRustTypeX(valueType)}>`)
    default:
      throw new Error(`Can't convert XTP type to Rust type: "${type}"`)
  }
}

function isOptional(type: String): boolean {
  return type.startsWith('Option<')
}

function toRustType(property: XtpTyped, required?: boolean): string {
  const t = toRustTypeX(property.xtpType)

  // if required is unset, just return what we get back
  if (required === undefined) return t

  // if it's set and true, just return what we get back
  if (required) return t

  // otherwise it's false, assuming it's not already,
  // wrap it in an Option
  if (t.startsWith('Option<')) return t
  return `Option<${t}>`
}

function jsonWrappedRustType(property: Property): string {
  return `Json<${toRustType(property)}>`
}

export function render() {
  const tmpl = Host.inputString();
  const ctx = {
    ...helpers,
    ...getContext(),
    formatIdentifier,
    formatExternIdentifier,
    toRustType,
    isOptional,
    jsonWrappedRustType,
  };

  const output = ejs.render(tmpl, ctx);
  Host.outputString(output);
}
