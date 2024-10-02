import ejs from "ejs";
import { getContext, helpers, Property } from "@dylibso/xtp-bindgen";

function toRustType(property: Property): string {
  if (property.$ref) return `types::${helpers.capitalize(property.$ref.name)}`;
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
      return "std::collections::HashMap<String, serde_json::Value>";
    case "array":
      if (!property.items) return "Vec<serde_json::Value>";
      return `Vec<${toRustType(property.items as Property)}>`;
    case "buffer":
      return "Vec<u8>";
    default:
      throw new Error("Can't convert property to Rust type: " + property.type);
  }
}

function jsonWrappedRustType(property: Property): string {
  if (property.$ref) return `Json<types::${helpers.capitalize(property.$ref.name)}>`;
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
      return "Json<std::collections::HashMap<String, serde_json::Value>>";
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

function makePublic(s: string) {
  return "pub " + s;
}

export function render() {
  const tmpl = Host.inputString();
  const ctx = {
    ...helpers,
    ...getContext(),
    toRustType,
    makePublic,
    jsonWrappedRustType,
  };

  const output = ejs.render(tmpl, ctx);
  Host.outputString(output);
}
