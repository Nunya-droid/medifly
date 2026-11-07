import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, RefreshCw, Trash2, UploadCloud } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import { formatFileSize } from '@/utils/format';
import { Text } from './Text';
import { Button } from './Button';
import type { ViewRef } from './refs';

export interface PickedFile {
  name: string;
  size: number;
  mimeType: string;
  uri: string;
  blob?: Blob;
}

interface FileUploadProps {
  value: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  accept?: string[];
  maxBytes?: number;
  error?: string;
  onError?: (message: string) => void;
}

function validate(f: { name: string; size: number; mimeType: string }, accept: string[], maxBytes: number) {
  if (!accept.includes(f.mimeType)) return 'Unsupported file type. Use JPG, PNG, WEBP or PDF.';
  if (f.size > maxBytes) return `File is too large (max ${formatFileSize(maxBytes)}).`;
  return null;
}

/** Drag-and-drop on desktop web; file picker everywhere. Previews images inline, PDFs as a file card. */
export function FileUpload({ value, onChange, accept = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], maxBytes = 5 * 1024 * 1024, error, onError }: FileUploadProps) {
  const zoneRef = useRef<ViewRef>(null);
  const [dragging, setDragging] = useState(false);

  const accept_ = (f: PickedFile) => {
    const err = validate(f, accept, maxBytes);
    if (err) {
      onError?.(err);
      return;
    }
    onChange(f);
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = zoneRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    const over = (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    };
    const leave = () => setDragging(false);
    const drop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) accept_({ name: file.name, size: file.size, mimeType: file.type, uri: URL.createObjectURL(file), blob: file });
    };
    node.addEventListener('dragover', over);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    return () => {
      node.removeEventListener('dragover', over);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: accept, copyToCacheDirectory: false, multiple: false });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    accept_({ name: a.name, size: a.size ?? a.file?.size ?? 0, mimeType: a.mimeType ?? a.file?.type ?? 'application/octet-stream', uri: a.uri, blob: a.file });
  };

  if (value) {
    const isImage = value.mimeType.startsWith('image/');
    return (
      <View style={[styles.preview, !!error && { borderColor: colors.danger }]}>
        {isImage ? (
          <Image source={{ uri: value.uri }} style={styles.thumb} resizeMode="cover" accessibilityLabel={`Preview of ${value.name}`} />
        ) : (
          <View style={[styles.thumb, styles.pdf]}>
            <FileText size={28} color={colors.blue} />
            <Text variant="caption" weight="semibold" tone="primary">
              PDF
            </Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 160, gap: 4 }}>
          <Text variant="title" numberOfLines={1}>
            {value.name}
          </Text>
          <Text variant="caption" tone="secondary">
            {formatFileSize(value.size)} · {value.mimeType}
          </Text>
          <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[2], flexWrap: 'wrap' }}>
            <Button label="Replace" icon={RefreshCw} variant="outline" size="sm" onPress={pick} />
            <Button label="Remove" icon={Trash2} variant="ghost" size="sm" onPress={() => onChange(null)} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        ref={zoneRef}
        onPress={pick}
        accessibilityRole="button"
        accessibilityLabel="Upload a prescription file"
        style={(state) => {
          const { hovered } = state as typeof state & { hovered?: boolean };
          return [styles.zone, (hovered || dragging) && styles.zoneActive, !!error && { borderColor: colors.danger }];
        }}
      >
        <View style={styles.zoneIcon}>
          <UploadCloud size={26} color={colors.blue} />
        </View>
        <Text variant="title" align="center">
          {Platform.OS === 'web' ? 'Drag and drop your file here' : 'Choose a file'}
        </Text>
        <Text variant="bodySm" tone="secondary" align="center">
          or <Text variant="bodySm" tone="primary" weight="semibold">browse your device</Text> · JPG, PNG, WEBP or PDF up to {formatFileSize(maxBytes)}
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger" style={{ marginTop: 6 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { alignItems: 'center', justifyContent: 'center', gap: space[2], paddingVertical: space[8], paddingHorizontal: space[5], borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surfaceMuted, cursor: 'pointer' } as ViewStyle,
  zoneActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  zoneIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center', marginBottom: space[1] },
  preview: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4], padding: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  thumb: { width: 88, height: 112, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  pdf: { alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.blueTint },
});
