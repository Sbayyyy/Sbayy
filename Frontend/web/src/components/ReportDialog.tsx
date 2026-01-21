import { useEffect, useMemo, useRef, useState } from 'react';
import { X, UploadCloud, Trash2 } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { createReport, type ReportPayload } from '@/lib/api/reports';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

type ReportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportPayload['targetType'];
  targetId: string;
  onSubmitted?: () => void;
};

type EvidenceItem = {
  url: string;
};

const reasons: ReportPayload['reason'][] = [
  'Spam',
  'Harassment',
  'Scam',
  'Inappropriate',
  'Other'
];

export default function ReportDialog({
  isOpen,
  onClose,
  targetType,
  targetId,
  onSubmitted
}: ReportDialogProps) {
  const { t } = useTranslation('common');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [reason, setReason] = useState<ReportPayload['reason']>('Spam');
  const [description, setDescription] = useState('');
  const [blockUser, setBlockUser] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
  }, [isOpen]);

  const title = useMemo(
    () =>
      t('report.title', {
        defaultValue: 'Report'
      }),
    [t]
  );

  if (!isOpen) return null;

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      const response = await api.post<{ urls: string[] }>('/uploads/images', formData);
      const urls = response.data?.urls ?? [];
      if (urls.length === 0) {
        throw new Error('Upload failed');
      }
      setEvidence((prev) => [...prev, ...urls.map((url) => ({ url }))]);
    } catch (err) {
      console.error('Evidence upload failed:', err);
      setError(t('report.errors.upload', { defaultValue: 'Failed to upload evidence.' }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async () => {
    if (!targetId) return;
    if (reason === 'Other' && !description.trim()) {
      setError(t('report.errors.description', { defaultValue: 'Please add details.' }));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createReport({
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
        evidenceUrls: evidence.map((item) => item.url),
        blockUser
      });
      toast.success(t('report.success', { defaultValue: 'Report submitted.' }));
      setDescription('');
      setEvidence([]);
      setBlockUser(false);
      setReason('Spam');
      onClose();
      onSubmitted?.();
    } catch (err) {
      console.error('Report failed:', err);
      setError(t('report.errors.submit', { defaultValue: 'Failed to submit report.' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6"
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('report.fields.reason', { defaultValue: 'Reason' })}
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportPayload['reason'])}
            >
              {reasons.map((option) => (
                <option key={option} value={option}>
                  {t(`report.reasons.${option.toLowerCase()}`, { defaultValue: option })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('report.fields.description', { defaultValue: 'Details (optional)' })}
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[100px]"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('report.fields.descriptionPlaceholder', {
                defaultValue: 'Tell us what happened'
              })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('report.fields.evidence', { defaultValue: 'Evidence (optional)' })}
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleUpload(event.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={uploading}
              >
                <UploadCloud size={16} />
                {uploading
                  ? t('report.actions.uploading', { defaultValue: 'Uploading...' })
                  : t('report.actions.addEvidence', { defaultValue: 'Add images' })}
              </button>
              <span className="text-xs text-gray-500">
                {t('report.fields.evidenceHint', { defaultValue: 'Up to 5 images.' })}
              </span>
            </div>
            {evidence.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {evidence.map((item, index) => (
                  <div key={`${item.url}-${index}`} className="relative">
                    <img src={item.url} alt="evidence" className="w-20 h-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setEvidence((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={blockUser}
              onChange={(event) => setBlockUser(event.target.checked)}
              className="h-4 w-4"
            />
            {t('report.fields.blockUser', {
              defaultValue: 'Block this user after submitting'
            })}
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('report.actions.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-70"
          >
            {submitting
              ? t('report.actions.submitting', { defaultValue: 'Submitting...' })
              : t('report.actions.submit', { defaultValue: 'Submit report' })}
          </button>
        </div>
      </div>
    </div>
  );
}
