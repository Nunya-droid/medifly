import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { ExternalLink, FileText } from '@/components/ui/icons';
import { colors, radius, space } from '@/theme';
import type { Prescription } from '@/types';
import { fileStore } from '@/services/fileStore';
import { useDb } from '@/hooks/useDb';
import { formatFileSize } from '@/utils/format';
import { Button, Text } from '@/components/ui';
import { SamplePrescription } from '@/components/illustrations';

/** Shows an uploaded demo file from browser storage, or the generated sample for seeded records. */
export function PrescriptionPreview({ rx, height = 280 }: { rx: Prescription; height?: number }) {
  // Keyed by file so loading state starts fresh for each document.
  return <PreviewInner key={`${rx.id}:${rx.fileKey ?? 'sample'}`} rx={rx} height={height} />;
}

function PreviewInner({ rx, height }: { rx: Prescription; height: number }) {
  const db = useDb();
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const pharmacy = db.pharmacies.find((p) => p.id === rx.pharmacyId)?.name ?? '';

  useEffect(() => {
    let revoke: string | null = null;
    let alive = true;
    if (!rx.fileKey) return;
    fileStore.get(rx.fileKey).then((blob) => {
      if (!alive) return;
      if (!blob) return setMissing(true);
      if (Platform.OS === 'web' && typeof URL !== 'undefined') {
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      }
    });
    return () => {
      alive = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [rx.fileKey]);

  if (!rx.fileKey || missing) {
    return (
      <View style={{ gap: space[2] }}>
        <SamplePrescription patient={rx.patientName} pharmacy={pharmacy} height={height} />
        {missing ? (
          <Text variant="caption" tone="muted">
            The uploaded preview is no longer in this browser’s storage, so a sample is shown.
          </Text>
        ) : null}
      </View>
    );
  }

  if (rx.mimeType.startsWith('image/') && url) {
    return <Image source={{ uri: url }} style={{ width: '100%', height, borderRadius: radius.md, backgroundColor: colors.surfaceSunken }} resizeMode="contain" accessibilityLabel={`Prescription ${rx.fileName}`} />;
  }

  return (
    <View style={{ height: Math.min(height, 200), borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center', gap: space[2], padding: space[4] }}>
      <FileText size={32} color={colors.blue} />
      <Text variant="bodySm" weight="semibold" align="center">
        {rx.fileName}
      </Text>
      <Text variant="caption" tone="secondary">
        {formatFileSize(rx.fileSize)} · PDF
      </Text>
      {url ? <Button label="Open preview" icon={ExternalLink} size="sm" variant="outline" onPress={() => typeof window !== 'undefined' && window.open(url, '_blank', 'noopener')} /> : null}
    </View>
  );
}
