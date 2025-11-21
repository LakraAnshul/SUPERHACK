import React from 'react';
import { MessageCircle, Mail, Clock } from 'lucide-react';
import { useMessages } from '../hooks/useMessages';

const MessageIndicator = ({ ticketId, ticketNumber, compact = false }) => {
  const { getTicketUnreadCount } = useMessages();

  const unreadCount = getTicketUnreadCount(ticketNumber || ticketId);

  if (compact) {
    // Compact version for table rows
    return (
      <div className="flex items-center space-x-1">
        <MessageCircle className="h-4 w-4 text-gray-400" />
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    );
  }

  // Full version for cards or detailed views
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <MessageCircle className={`h-4 w-4 ${unreadCount > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
        <span className={`text-sm ${unreadCount > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
          Messages
        </span>
      </div>

      {unreadCount > 0 && (
        <div className="flex items-center space-x-1">
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 font-medium">
            {unreadCount > 99 ? '99+' : unreadCount} new
          </span>
        </div>
      )}
    </div>
  );
};

export default MessageIndicator;
