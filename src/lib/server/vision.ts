import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize the client with v1p4beta1 API version
export const visionClient = new ImageAnnotatorClient({
  apiEndpoint: 'vision.googleapis.com',
  apiVersion: 'v1p4beta1'
}); 