export async function processImage(imageFile: File): Promise<string[][]> {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch('/api/vision', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error processing image');
    }

    const { grid } = await response.json();
    return grid;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
} 