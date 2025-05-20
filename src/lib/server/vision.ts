import { ImageAnnotatorClient } from '@google-cloud/vision';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const credentialsPath = resolve(__dirname, '../../../cloud-vision-credentials.json');

console.log("Using credentials from:", credentialsPath);

// Initialize the client with v1p4beta1 API version
export const visionClient = new ImageAnnotatorClient({
  apiEndpoint: 'vision.googleapis.com',
  apiVersion: 'v1p4beta1',
  keyFilename: credentialsPath
}); 