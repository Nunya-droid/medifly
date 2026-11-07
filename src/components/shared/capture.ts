import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { PickedFile } from '@/components/ui';

/**
 * Opens the device camera on mobile browsers (via `capture="environment"`); on desktop
 * browsers this falls back to a normal image file chooser.
 */
export function captureWithCamera(): Promise<PickedFile | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return pickFile(['image/jpeg', 'image/png', 'image/webp']);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);
      resolve({ name: file.name || `prescription-${Date.now()}.jpg`, size: file.size, mimeType: file.type || 'image/jpeg', uri: URL.createObjectURL(file), blob: file });
    };
    document.body.appendChild(input);
    input.click();
  });
}

export async function pickFile(types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: false, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { name: a.name, size: a.size ?? a.file?.size ?? 0, mimeType: a.mimeType ?? a.file?.type ?? 'application/octet-stream', uri: a.uri, blob: a.file };
}
