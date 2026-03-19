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
    <div className="border-t pt-6 mt-6">
      {!isAvailable && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">
          {t('listing.availability.unavailable', 'This item is currently unavailable.')}
        </div>
      )}

      {!isOwnListing && (
        <div className="flex flex-col gap-3">
          <button
            onClick={onContactSeller}
            disabled={contactLoading}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-70"
          >
            <MessageCircle size={20} />
            {contactLoading
              ? t('listing.actions.openChatLoading', 'Opening chat...')
              : t('listing.actions.contactSeller', 'Message seller')}
          </button>
          <button
            onClick={onReport}
            className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-700 px-6 py-3 rounded-lg hover:bg-red-50 font-medium transition-colors"
          >
            {t('report.actions.reportListing', 'Report listing')}
          </button>
        </div>
      )}

      {isOwnListing && (
        <div className="flex flex-col gap-3">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-center">
            {t('listing.owner.notice', 'This is your listing.')}
          </div>
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium transition-colors"
          >
            {t('listing.actions.edit', 'Edit listing')}
          </button>
          <button
            onClick={onDelete}
            disabled={deleteLoading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-70"
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
