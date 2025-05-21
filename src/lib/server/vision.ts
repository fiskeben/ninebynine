import { ImageAnnotatorClient } from '@google-cloud/vision';
import { GOOGLE_CLOUD_CREDENTIALS } from '$env/static/private';

// Initialize the client with credentials from environment
export const visionClient = new ImageAnnotatorClient({
  credentials: JSON.parse(GOOGLE_CLOUD_CREDENTIALS),
  apiEndpoint: 'vision.googleapis.com',
  apiVersion: 'v1p4beta1'
}); 