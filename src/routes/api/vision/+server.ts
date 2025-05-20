import { json } from '@sveltejs/kit';
import { visionClient } from '$lib/server/vision';

interface Detection {
  text: string;
  vertices: Array<{x: number; y: number}>;
}

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');
    
    if (!imageFile || !(imageFile instanceof Blob)) {
      return json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    // Perform document text detection
    const [result] = await visionClient.documentTextDetection({
      image: {
        content: base64Image
      }
    });

    const fullTextAnnotation = result.fullTextAnnotation;
    if (!fullTextAnnotation || !fullTextAnnotation.pages || fullTextAnnotation.pages.length === 0) {
      return json({ error: 'No text detected in image' }, { status: 400 });
    }

    const page = fullTextAnnotation.pages[0];
    if (!page.width || !page.height) {
      return json({ error: 'Invalid page dimensions' }, { status: 400 });
    }

    const width = page.width;
    const height = page.height;

    // Process blocks to find individual digits
    const processedDetections: Detection[] = [];
    
    for (const block of page.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const word of paragraph.words || []) {
          const text = word.symbols?.map(s => s.text).join('') || '';
          const vertices = word.boundingBox?.vertices;
          
          if (!text || !vertices || vertices.length !== 4) continue;

          // If it's a multi-digit number, split it and estimate positions
          if (text.length > 1) {
            const charWidth = (vertices[1].x! - vertices[0].x!) / text.length;
            text.split('').forEach((digit, index) => {
              if (/^[1-9]$/.test(digit)) {
                const offsetX = charWidth * index;
                const digitVertices = vertices.map(v => ({
                  x: (v.x || 0) + offsetX,
                  y: v.y || 0
                }));
                processedDetections.push({ text: digit, vertices: digitVertices });
              }
            });
          } else if (/^[1-9]$/.test(text)) {
            const mappedVertices = vertices.map(v => ({
              x: v.x || 0,
              y: v.y || 0
            }));
            processedDetections.push({ text, vertices: mappedVertices });
          }
        }
      }
    }

    // Calculate grid dimensions with margin
    const margin = width * 0.02; // 2% margin
    const gridWidth = width - (2 * margin);
    const gridHeight = height - (2 * margin);
    const cellWidth = gridWidth / 9;
    const cellHeight = gridHeight / 9;

    console.log('\nGrid Dimensions:', {
      width, height,
      margin,
      gridWidth, gridHeight,
      cellWidth, cellHeight
    });

    // Extract detected text and organize into 9x9 grid
    const grid: string[][] = Array(9).fill(null).map(() => Array(9).fill(''));
    
    for (const detection of processedDetections) {
      const { text, vertices } = detection;

      // Calculate center point of the bounding box
      const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / 4;
      const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / 4;

      // Adjust for margin
      const adjustedX = centerX - margin;
      const adjustedY = centerY - margin;

      // Calculate grid position
      const col = Math.floor(adjustedX / cellWidth);
      const row = Math.floor(adjustedY / cellHeight);

      console.log(`Text "${text}":
        Center: (${centerX}, ${centerY})
        Adjusted: (${adjustedX}, ${adjustedY})
        Cell Size: ${cellWidth} x ${cellHeight}
        Grid Position: [${row}, ${col}]`);

      if (row >= 0 && row < 9 && col >= 0 && col < 9) {
        grid[row][col] = text;
      } else {
        console.log(`Skipping text "${text}" - position out of bounds`);
      }
    }

    console.log('\nFinal Grid:');
    grid.forEach((row, i) => {
      console.log(`Row ${i}:`, row.join(' '));
    });

    return json({ grid });
  } catch (error) {
    console.error('Error processing image:', error);
    return json({ error: 'Error processing image' }, { status: 500 });
  }
} 