import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Anonymous gameplay never forwards a saved Base44 user token.
export const base44 = createClient({
  appId,
  functionsVersion,
  serverUrl: '',
  appBaseUrl
});
