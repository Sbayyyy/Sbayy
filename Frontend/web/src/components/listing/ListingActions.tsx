import { MessageCircle } from 'lucide-react';

interface ListingActionsProps {
  isOwnListing: boolean;
  isAvailable: boolean;
  contactLoading: boolean;
  deleteLoading: boolean;
  onContactSeller: () => void;
  onReport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string, defaultValue?: string) => string;
}

export default function ListingActions({
  isOwnListing,
  isAvailable,
  contactLoading,
  deleteLoading,
  onContactSeller,
  onReport,
  onEdit,
  onDelete,
  t,
}: ListingActionsProps) {
  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      {!isAvailable && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
          {t('listing.availability.unavailable', 'This item is currently unavailable.')}
        </div>
      )}

      {!isOwnListing && (
        <div className="flex flex-col gap-3">
          <button
            onClick={onContactSeller}
            disabled={contactLoading}
            className="btn btn-outline w-full"
          >
            <MessageCircle size={20} />
            {contactLoading
              ? t('listing.actions.openChatLoading', 'Opening chat...')
              : t('listing.actions.contactSeller', 'Message seller')}
          </button>
          <button
            onClick={onReport}
            className="btn btn-outline w-full border-red-200 text-red-700 hover:bg-red-50"
          >
            {t('report.actions.reportListing', 'Report listing')}
          </button>
        </div>
      )}

      {isOwnListing && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-center text-primary-800">
            {t('listing.owner.notice', 'This is your listing.')}
          </div>
          <button
            onClick={onEdit}
            className="btn btn-primary w-full"
          >
            {t('listing.actions.edit', 'Edit listing')}
          </button>
          <button
            onClick={onDelete}
            disabled={deleteLoading}
            className="btn btn-danger w-full"
          >
            {deleteLoading
              ? t('listing.actions.deleteLoading', 'Deleting...')
              : t('listing.actions.delete', 'Delete listing')}
          </button>
        </div>
      )}
    </div>
  );
}
