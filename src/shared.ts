import * as z from "zod";

type BinaryData =
  | Uint8Array
  | ArrayBuffer
  | Blob
  | ReadableStream
  | Response
  | string;

export function bytesToBase64(u8arr: Uint8Array): string {
  return btoa(String.fromCodePoint(...u8arr));
}
  

export async function consumeStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value != null) chunks.push(value);
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  return new Uint8Array(await new Blob(chunks).arrayBuffer());
}

export function isAsyncIterable(
  value: unknown,
): value is AsyncIterable<string> {
  return (
    typeof value === "object" && value != null && Symbol.asyncIterator in value
  );
}

export function isBinaryData(value: unknown): value is BinaryData {
  return (
    value instanceof Uint8Array
    || value instanceof ArrayBuffer
    || value instanceof Blob
    || value instanceof ReadableStream
    || value instanceof Response
    || typeof value === "string"
  );
}

const base64Schema = z.string().base64();

export async function valueToBase64(
  value: BinaryData | null | undefined,
): Promise<string | null> {
  if (value == null) {
    return null;
  } else if (value instanceof Uint8Array) {
    return bytesToBase64(value);
  } else if (value instanceof ArrayBuffer) {
    return bytesToBase64(new Uint8Array(value));
  } else if (value instanceof Response || value instanceof Blob) {
    return bytesToBase64(new Uint8Array(await value.arrayBuffer()));
  } else if (value instanceof ReadableStream) {
    return bytesToBase64(await consumeStream(value));
  } else if (typeof value === "string") {
    return base64Schema.parse(value);
  } else {
    value satisfies never;
    throw new Error(`Unsupported image value type: ${typeof value}`);
  }
}
