import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const operations = ['search', 'broadSearch', 'extract', 'imageSearch', 'embedding'];
const searchOps = ['search', 'broadSearch'];
const prop = (displayName: string, name: string, description: string, show: string[], defaultValue: string | number = ''): INodeProperties => ({ displayName, name, type: typeof defaultValue === 'number' ? 'number' : 'string', default: defaultValue, description, displayOptions: { show: { operation: show } } });
const options: INodeProperties[] = [
 prop('Include Domains', 'includeDomains', 'Comma-separated domains to include. Use for trusted or primary sources.', [...searchOps, 'imageSearch']),
 prop('Exclude Domains', 'excludeDomains', 'Comma-separated domains to exclude from results.', [...searchOps, 'imageSearch']),
 { displayName: 'Time Range', name: 'timeRange', type: 'options', default: '', description: 'Restrict results to a recent period when freshness matters', displayOptions: { show: { operation: searchOps } }, options: [{ name: 'Any Time', value: '' }, { name: 'Day', value: 'day' }, { name: 'Month', value: 'month' }, { name: 'Week', value: 'week' }, { name: 'Year', value: 'year' }] },
 prop('Start Time', 'startTime', 'Inclusive ISO 8601 start time; takes precedence over relative time range', searchOps),
 prop('End Time', 'endTime', 'Inclusive ISO 8601 end time; takes precedence over relative time range', searchOps),
 prop('Languages', 'languages', 'Comma-separated ISO 639-1 language codes, for example en,id', searchOps),
 { displayName: 'Result Type', name: 'resultType', type: 'options', default: 'standard', description: 'Dynamic returns only relevant results, up to the requested count', displayOptions: { show: { operation: searchOps } }, options: [{ name: 'Standard', value: 'standard' }, { name: 'Dynamic', value: 'dynamic' }] },
 { displayName: 'Full Content', name: 'fullContent', type: 'boolean', default: false, description: 'Whether to return full page content for each result', displayOptions: { show: { operation: searchOps } } },
 { displayName: 'Include Images', name: 'includeImages', type: 'boolean', default: false, description: 'Whether to include image URLs in results', displayOptions: { show: { operation: [...searchOps, 'extract'] } } },
 { displayName: 'Extract Mode', name: 'mode', type: 'options', default: 'standard', description: 'Advanced can reach difficult pages; auto chooses per URL and can take longer', displayOptions: { show: { operation: ['extract'] } }, options: [{ name: 'Standard', value: 'standard' }, { name: 'Advanced', value: 'advanced' }, { name: 'Auto', value: 'auto' }] },
 prop('Focus Query', 'focusQuery', 'Optional research keywords; returns relevant highlights instead of the full page', ['extract']),
 { displayName: 'Format', name: 'format', type: 'options', default: 'markdown', description: 'Format of extracted page content', displayOptions: { show: { operation: ['extract'] } }, options: [{ name: 'Markdown', value: 'markdown' }, { name: 'Text', value: 'text' }] },
 { displayName: 'Input Type', name: 'inputType', type: 'options', default: 'document', description: 'Use query for retrieval queries and document for source content', displayOptions: { show: { operation: ['embedding'] } }, options: [{ name: 'Document', value: 'document' }, { name: 'Query', value: 'query' }] },
 { displayName: 'Model', name: 'model', type: 'options', default: 'octen-embedding-4b', description: 'Embedding model: choose smaller for throughput or larger for accuracy', displayOptions: { show: { operation: ['embedding'] } }, options: [{ name: 'Octen 0.6B', value: 'octen-embedding-0.6b' }, { name: 'Octen 4B', value: 'octen-embedding-4b' }, { name: 'Octen 8B', value: 'octen-embedding-8b' }] },
 prop('Dimensions', 'dimension', 'Optional output vector dimensions, up to the chosen model maximum', ['embedding'], 0),
];
const list = (s: string): string[] => s.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
export class Octen implements INodeType {
 description: INodeTypeDescription = {
  displayName: 'Octen', name: 'octen', icon: { light: 'file:octen.svg', dark: 'file:octen.dark.svg' }, group: ['transform'], version: 1,
  description: 'Research the web, read sources, find images and create embeddings with Octen', subtitle: '={{$parameter.operation}}', defaults: { name: 'Octen' },
  inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main], usableAsTool: true,
  credentials: [{ name: 'octenApi', required: true }],
  properties: [
   { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'search', options: [
    { name: 'Broad Search', value: 'broadSearch', action: 'Research a question from multiple angles', description: 'Generate subqueries and retrieve grouped results for broad research' },
    { name: 'Create Embeddings', value: 'embedding', action: 'Create text embeddings', description: 'Convert text into vectors for semantic retrieval' },
    { name: 'Extract Pages', value: 'extract', action: 'Extract content from pages', description: 'Read one or more source URLs as clean content or focused highlights' },
    { name: 'Search Images', value: 'imageSearch', action: 'Search for images', description: 'Find images using a text description or reference image URL' },
    { name: 'Search Web', value: 'search', action: 'Search the web', description: 'Find current web sources for a focused question' },
   ] },
   { ...prop('Query', 'query', 'A specific question or search query. Include distinctive names or facts; use site: to restrict a domain.', searchOps), required: true },
   { ...prop('URLs', 'urls', 'One to 20 source URLs, separated by commas or newlines. Read promising sources from search results.', ['extract']), required: true, typeOptions: { rows: 3 } },
   { displayName: 'Image Input Type', name: 'imageInputType', type: 'options', default: 'text', description: 'Search using a text description or an image URL', displayOptions: { show: { operation: ['imageSearch'] } }, options: [{ name: 'Text', value: 'text' }, { name: 'Image URL', value: 'image' }] },
   { ...prop('Image Query', 'imageQuery', 'A clear visual description or a publicly accessible reference image URL, according to the selected input type', ['imageSearch']), required: true },
   { ...prop('Texts', 'texts', 'Texts to embed, one per line. Use the same model for documents and queries in a vector index.', ['embedding']), required: true, typeOptions: { rows: 4 } },
   { ...prop('Result Count', 'count', 'Maximum results to return; image search allows 1–10 and web search allows 1–100', ['search', 'imageSearch'], 5), typeOptions: { minValue: 1, maxValue: 100 } },
   { ...prop('Maximum Subqueries', 'maxQueries', 'Maximum number of angles Octen may generate for this research question, from 1 to 30', ['broadSearch'], 5), typeOptions: { minValue: 1, maxValue: 30 } },
   { displayName: 'Additional Options', name: 'additionalOptions', type: 'collection', placeholder: 'Add Option', default: {}, options },
  ],
 };
 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const out: INodeExecutionData[] = [];
  for (let i = 0; i < this.getInputData().length; i++) {
   try {
    const op = this.getNodeParameter('operation', i) as string;
    if (!operations.includes(op)) throw new NodeOperationError(this.getNode(), 'Unknown operation', { itemIndex: i });
    const opts = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;
    const body: IDataObject = {};
    const param = (name: string): string => String(this.getNodeParameter(name, i));
    // POST /search https://docs.octen.ai/api-reference/search
    // POST /broad-search https://docs.octen.ai/api-reference/broad-search
    // POST /extract https://docs.octen.ai/api-reference/extract
    // POST /image-search https://docs.octen.ai/api-reference/image-search
    // POST /embedding https://docs.octen.ai/api-reference/embedding
    const endpoint: Record<string, string> = { search: '/search', broadSearch: '/broad-search', extract: '/extract', imageSearch: '/image-search', embedding: '/embedding' };
    if (searchOps.includes(op)) { body.query = param('query'); if (op === 'search') body.count = Number(param('count')); else body.max_queries = Number(param('maxQueries')); }
    if (op === 'extract') { body.urls = list(param('urls')); if (!(body.urls as string[]).length || (body.urls as string[]).length > 20) throw new NodeOperationError(this.getNode(), 'Provide between 1 and 20 URLs', { itemIndex: i }); }
    if (op === 'imageSearch') { const type = param('imageInputType'); body.inputs = [type === 'image' ? { type, url: param('imageQuery') } : { type: 'text', data: param('imageQuery') }]; body.count = Number(param('count')); if (Number(body.count) > 10) throw new NodeOperationError(this.getNode(), 'Image search count must not exceed 10', { itemIndex: i }); }
    if (op === 'embedding') { body.input = param('texts').split('\n').map((s) => s.trim()).filter(Boolean); if (!(body.input as string[]).length) throw new NodeOperationError(this.getNode(), 'Provide at least one text', { itemIndex: i }); }
    for (const [ui, api] of Object.entries({ includeDomains: 'include_domains', excludeDomains: 'exclude_domains', languages: 'language' })) if (opts[ui]) body[api] = list(String(opts[ui]));
    for (const [ui, api] of Object.entries({ timeRange: 'time_range', startTime: 'start_time', endTime: 'end_time', resultType: 'result_type', includeImages: 'include_images', mode: 'mode', focusQuery: 'query', format: 'format', inputType: 'input_type', model: 'model', dimension: 'dimension' })) if (opts[ui] !== undefined && opts[ui] !== '' && !(ui === 'dimension' && !opts[ui])) body[api] = opts[ui];
    if (opts.fullContent) body.full_content = { enable: true };
    if (op === 'broadSearch') { const searchOptions: IDataObject = {}; for (const key of Object.keys(body)) if (key !== 'query' && key !== 'max_queries') { searchOptions[key] = body[key]; delete body[key]; } if (Object.keys(searchOptions).length) body.search_options = searchOptions; }
    const result = await this.helpers.httpRequestWithAuthentication.call(this, 'octenApi', { method: 'POST', url: `https://api.octen.ai${endpoint[op]}`, body, json: true }) as IDataObject;
    if (typeof result.code === 'number' && result.code !== 0) throw new NodeOperationError(this.getNode(), `Octen error ${result.code}: ${String(result.msg ?? 'Request failed')}`, { itemIndex: i });
    out.push({ json: result, pairedItem: { item: i } });
   } catch (error) { if (!this.continueOnFail()) throw error instanceof NodeOperationError ? error : new NodeOperationError(this.getNode(), error as Error, { itemIndex: i }); out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } }); }
  }
  return [out];
 }
}
