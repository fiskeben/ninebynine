import { ImageAnnotatorClient } from '@google-cloud/vision';
import { env } from '$env/dynamic/private';

let _visionClient: ImageAnnotatorClient | null = null;

export function getVisionClient(): ImageAnnotatorClient {
  if (!_visionClient) {
    if (!env.GOOGLE_CLOUD_CREDENTIALS) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS environment variable is required');
    }
    _visionClient = new ImageAnnotatorClient({
      credentials: JSON.parse(env.GOOGLE_CLOUD_CREDENTIALS),
      apiEndpoint: 'vision.googleapis.com',
      apiVersion: 'v1p4beta1'
    });
  }
  return _visionClient;
} 