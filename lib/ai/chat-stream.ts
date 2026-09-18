/** Read OpenAI-compatible SSE, including events split across transport chunks. */
export async function* readChatStream(
  chunks: AsyncIterable<string | Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of chunks) {
    buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true })
    if (buffer.length > 1_000_000) throw new Error('The provider returned an oversized stream event.')
    let newline
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      const event = JSON.parse(data) as {
        error?: unknown
        choices?: { delta?: { content?: string; refusal?: string }; finish_reason?: string }[]
      }
      if (event.error) throw new Error('The AI provider reported a streaming error.')
      const choice = event.choices?.[0]
      if (choice?.delta?.refusal || choice?.finish_reason === 'content_filter') {
        throw new Error('The model declined this request.')
      }
      if (choice?.delta?.content) yield choice.delta.content
      // Wait for [DONE] so truncated streams never get saved as complete resumes.
    }
  }
  throw new Error('The AI provider connection ended before generation finished. Please try again.')
}
