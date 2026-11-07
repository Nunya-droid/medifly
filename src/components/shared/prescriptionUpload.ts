import type { PickedFile } from '@/components/ui';
import { fileStore } from '@/services/fileStore';
import { prescriptionService } from '@/services/prescriptionService';
import { createId } from '@/utils/id';

/** Stores the demo file preview in IndexedDB, then submits the prescription record for review. */
export async function submitPrescriptionFile(pharmacyId: string, file: PickedFile, patientName: string, note?: string) {
  let fileKey: string | undefined;
  if (file.blob) {
    fileKey = createId('file');
    await fileStore.put(fileKey, file.blob);
  }
  return prescriptionService.submit({ pharmacyId, fileName: file.name, fileSize: file.size, mimeType: file.mimeType, fileKey, patientName, customerNote: note });
}

export async function resubmitPrescriptionFile(prescriptionId: string, file: PickedFile, note?: string) {
  let fileKey: string | undefined;
  if (file.blob) {
    fileKey = createId('file');
    await fileStore.put(fileKey, file.blob);
  }
  return prescriptionService.resubmit(prescriptionId, { fileName: file.name, fileSize: file.size, mimeType: file.mimeType, fileKey }, note);
}
