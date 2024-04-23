/* global ReadableStream, TransformStream, WritableStream */
import { MultihashIndexSortedReader, MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 * @param {Array<{ cid: import('multiformats').UnknownLink, offset: number }>} items
 */
export const encode = async items => {
  const { writable, readable } = new TransformStream()
  const writer = MultihashIndexSortedWriter.createWriter({ writer: writable.getWriter() })
  for (const item of items) {
    writer.add(item.cid, item.offset)
  }
  writer.close()

  const chunks = []
  await readable.pipeTo(new WritableStream({ write: chunk => { chunks.push(chunk) } }))

  const bytes = Buffer.concat(chunks)
  const digest = await sha256.digest(bytes)
  return { cid: Link.create(MultihashIndexSortedWriter.codec, digest), bytes }
}

/**
 * @param {Uint8Array} bytes
 */
export const decode = async bytes => {
  const readable = new ReadableStream({
    pull (controller) {
      controller.enqueue(bytes)
      controller.close()
    }
  })
  const reader = MultihashIndexSortedReader.createReader({ reader: readable.getReader() })

  const items = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    items.push(value)
  }
  return items
}
