import { Vly } from "@vly-ai/integrations";

export const vly = new Vly({
  apiKey: process.env.VLY_INTEGRATION_KEY,
});