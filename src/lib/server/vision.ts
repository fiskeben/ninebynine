import { ImageAnnotatorClient } from '@google-cloud/vision';
import { GOOGLE_CLOUD_CREDENTIALS } from '$env/static/private';

let _visionClient: ImageAnnotatorClient | null = null;

export function getVisionClient(): ImageAnnotatorClient {
  if (!_visionClient) {
    if (!GOOGLE_CLOUD_CREDENTIALS) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS environment variable is required');
    }
    _visionClient = new ImageAnnotatorClient({
      credentials: JSON.parse(GOOGLE_CLOUD_CREDENTIALS),
      apiEndpoint: 'vision.googleapis.com',
      apiVersion: 'v1p4beta1'
    });
  }
  return _visionClient;
} 