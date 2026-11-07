export type PrescriptionStatus = 'pending' | 'approved' | 'rejected' | 'info-requested';

export interface Prescription {
  id: string;
  customerId: string;
  pharmacyId: string;
  orderId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Key into the browser file store (IndexedDB) for uploaded previews. */
  fileKey?: string;
  /** Seeded records render a generated fictional preview. */
  isSampleDocument: boolean;
  patientName: string;
  customerNote?: string;
  status: PrescriptionStatus;
  pharmacistNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
}
