// Progress photos and videos attached to a logged workout. Stored as Blobs —
// IndexedDB keeps them as binary, unlike base64 strings which are ~33% larger
// and have to be decoded on every read.
export interface WorkoutMedia {
  id?: number;
  sessionId: number;
  date: string;           // copied from the session so the photo timeline needs no join
  kind: 'photo' | 'video';
  mimeType: string;
  blob: Blob;
  thumbnail?: Blob;       // small JPEG for grids; photos only
  width?: number;
  height?: number;
  createdAt: string;
}
