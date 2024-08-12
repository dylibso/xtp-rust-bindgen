import ejs from "ejs";
import { getContext, helpers, Property } from "@dylibso/xtp-bindgen";

function toRustType(property: Property): string {
  if (property.$ref) return property.$ref.name;
  switch (property.type) {
    case "string":
      if (property.format === "date-time") {
        return "chrono::DateTime<chrono::Utc>";
      }
      return "String";
    case "number":
      if (property.format === "float") {
        return "f32";
      }
      if (property.format === "double") {
        return "f64";
      }
      return "i64";
    case "integer":
      return "i32";
    case "boolean":
      return "bool";
    case "object":
      return "serde_json::Map";
    case "array":
      if (!property.items) return "Vec<serde_json::Value>";
      // TODO this is not quite right to force cast
      return `Vec<${toRustType(property.items as Property)}>`;
    case "buffer":
      return "Vec<u8>";
    default:
      throw new Error("Can't convert property to Rust type: " + property.type);
  }
}

function jsonWrappedRustType(property: Property): string {
  if (property.$ref) return `Json<${property.$ref.name}>`;
  switch (property.type) {
    case "string":
      if (property.format === "date-time") {
        return "Json<chrono::DateTime<chrono::Utc>>";
      }
      return "String";
    case "number":
      if (property.format === "float") {
        return "Json<f32>";
      }
      if (property.format === "double") {
        return "Json<f64>";
      }
      return "Json<i64>";
    case "integer":
      return "Json<i32>";
    case "boolean":
      return "Json<bool>";
    case "object":
      return "Json<serde_json::Map>";
    case "array":
      if (!property.items) return "Json<Vec<serde_json::Value>>";
      // TODO this is not quite right to force cast
      return `Json<Vec<${toRustType(property.items as Property)}>>`;
    case "buffer":
      return "Vec<u8>";
    default:
      throw new Error("Can't convert property to Rust type: " + property.type);
  }
}

function pointerToRustType(property: Property) {
  const typ = toRustType(property);

  if (typ.startsWith("[]") || typ.startsWith("map[")) {
    return typ;
  }

  return `&${typ}`;
}

function makePublic(s: string) {
  return "pub " + s;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function camelToSnakeCase(s: string) {
  return s.split(/(?=[A-Z])/).join('_').toLowerCase()
}

export function render() {
  const tmpl = Host.inputString();
  const ctx = {
    ...helpers,
    ...getContext(),
    toRustType,
    makePublic,
    jsonWrappedRustType,
    capitalize,
    camelToSnakeCase
  };

  const output = ejs.render(tmpl, ctx);
  Host.outputString(output);
}
