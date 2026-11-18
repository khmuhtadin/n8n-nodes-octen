import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class OctenApi implements ICredentialType {
 name = 'octenApi';
 displayName = 'Octen API';
 icon = { light: 'file:../nodes/Octen/octen.svg', dark: 'file:../nodes/Octen/octen.dark.svg' } as const;
 documentationUrl = 'https://docs.octen.ai/api-reference/search';
 properties: INodeProperties[] = [{ displayName: 'API Key', name: 'apiKey', type: 'string', typeOptions: { password: true }, default: '', required: true }];
 authenticate: IAuthenticateGeneric = { type: 'generic', properties: { headers: { 'x-api-key': '={{$credentials.apiKey}}' } } };
 // POST /search requires authentication: https://docs.octen.ai/api-reference/search
 // This is a real search and may incur usage charges.
 test: ICredentialTestRequest = { request: { baseURL: 'https://api.octen.ai', url: '/search', method: 'POST', body: { query: 'Octen', count: 1 }, json: true } };
}
