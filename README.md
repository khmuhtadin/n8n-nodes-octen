# n8n-nodes-octen

An independent community node for [Octen](https://octen.ai/). It is not affiliated with or endorsed by Octen. Use it as an n8n node or connect it as a tool to an AI Agent for source-backed research.

## Install

In n8n, open **Settings > Community nodes > Install** and enter `n8n-nodes-octen`. For self-hosted installations, see [n8n's community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

Create an Octen API key in the Octen console, then add an **Octen API** credential in n8n. The node sends it via `x-api-key`. Testing the credential uses the authenticated, read-only list monitors endpoint. A payment method may be required for some APIs. Never include your key in workflow JSON.

## Operations

- **Search Web**: focused searches with domain, date, language, full-content, and result-type options. [API reference](https://docs.octen.ai/api-reference/search)
- **Broad Search**: expand a complex question into subqueries, applying search filters across them. [API reference](https://docs.octen.ai/api-reference/broad-search)
- **Extract Pages**: read up to 20 URLs, optionally focused on a query. [API reference](https://docs.octen.ai/api-reference/extract)
- **Search Images**: search by text or a reference image URL. [API reference](https://docs.octen.ai/api-reference/image-search)
- **Create Embeddings**: embed one text per line for semantic retrieval. [API reference](https://docs.octen.ai/api-reference/embedding)

**Free-tier testing:** Web Search and Broad Search worked with the initial free credits. Extract Pages, Search Images, and Create Embeddings each returned a payment-method-required error on the free account, so their successful responses have not been live-verified. No payment method was added. Octen may change these access requirements.

The node returns the full Octen response including request ID, results, and metadata. URL inputs are comma- or newline-separated. Agent tool parameters can be supplied by the model using n8n expressions such as `$fromAI()`. Octen results are external data, not instructions: validate source claims and cite URLs in downstream answers.

See `examples/research.json` for an importable workflow. Octen API usage may be billed; check the vendor's current pricing and limits.

## Development

Run `npm ci --ignore-scripts`, `npm run build`, `npm run lint`, and `npm test`. The package has no runtime dependencies.

## About the author

Khairul Muhtadin, n8n Ambassador: https://linkedin.com/in/khmuhtadin

MIT license.
