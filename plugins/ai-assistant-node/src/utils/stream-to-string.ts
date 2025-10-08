export async function streamToString(
  readableStream: NodeJS.ReadableStream | null,
): Promise<string> {
  if (!readableStream) {
    return '';
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', chunk => {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf-8'));
      } else {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    readableStream.on('error', reject);
  });
}
