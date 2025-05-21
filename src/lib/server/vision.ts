import { ImageAnnotatorClient } from '@google-cloud/vision';
import { env } from '$env/dynamic/private';

// Initialize the client with credentials from environment
export const visionClient = new ImageAnnotatorClient({
  credentials: JSON.parse(env.GOOGLE_CLOUD_CREDENTIALS),
  apiEndpoint: 'vision.googleapis.com',
  apiVersion: 'v1p4beta1'
}); 