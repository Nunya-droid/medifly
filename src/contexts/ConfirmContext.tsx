import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextArea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { space } from '@/theme';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger' | 'teal';
  /** Ask for a free-text reason (required unless optional is set). */
  reason?: { label: string; placeholder?: string; optional?: boolean; presets?: string[] };
}

interface ConfirmResult {
  confirmed: boolean;
  reason: string;
}

const Ctx = createContext<((o: ConfirmOptions) => Promise<ConfirmResult>) | null>(null);

/** Promise-based confirmation dialogs, optionally collecting a reason. Replaces browser confirm(). */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState('');
  const [preset, setPreset] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const resolver = useRef<((r: ConfirmResult) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    setReason('');
    setPreset('');
    setTouched(false);
    return new Promise<ConfirmResult>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (confirmed: boolean) => {
    const text = preset && preset !== 'Other' ? (reason.trim() ? `${preset} — ${reason.trim()}` : preset) : reason.trim();
    if (confirmed && opts?.reason && !opts.reason.optional && !text) {
      setTouched(true);
      return;
    }
    resolver.current?.({ confirmed, reason: text });
    resolver.current = null;
    setOpts(null);
  };

  const missing = touched && !!opts?.reason && !opts.reason.optional && !(preset && preset !== 'Other') && !reason.trim();

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal
        visible={!!opts}
        onClose={() => finish(false)}
        title={opts?.title}
        width={460}
        footer={
          <>
            <Button label={opts?.cancelLabel ?? 'Cancel'} variant="outline" onPress={() => finish(false)} />
            <Button label={opts?.confirmLabel ?? 'Confirm'} variant={opts?.tone === 'danger' ? 'danger' : opts?.tone === 'teal' ? 'teal' : 'primary'} onPress={() => finish(true)} />
          </>
        }
      >
        <View style={{ gap: space[4] }}>
          {opts?.message ? (
            <Text variant="body" tone="secondary">
              {opts.message}
            </Text>
          ) : null}
          {opts?.reason?.presets ? (
            <Select
              label="Reason"
              value={preset || undefined}
              onChange={setPreset}
              placeholder="Choose a reason"
              options={[...opts.reason.presets, 'Other'].map((p) => ({ value: p, label: p }))}
              width={360}
            />
          ) : null}
          {opts?.reason ? (
            <TextArea
              label={opts.reason.presets ? 'Additional detail' : opts.reason.label}
              placeholder={opts.reason.placeholder}
              value={reason}
              onChangeText={setReason}
              required={!opts.reason.optional && !opts.reason.presets}
              error={missing ? 'Please provide a reason.' : undefined}
            />
          ) : null}
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConfirm must be used inside ConfirmProvider');
  return c;
}
