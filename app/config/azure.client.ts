export const azureConfig = {
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:7071",
  webPubSubUrl: process.env.WEBPUBSUB_URL || "ws://localhost:8080",
};

export function getApiEndpoint(path: string): string {
  return `${azureConfig.apiBaseUrl}/api${path}`;
}
