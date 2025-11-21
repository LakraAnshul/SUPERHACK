import React, { useState, useEffect, useRef } from "react";
import { messageApi } from "../services/messageApi";
import { useAuth } from "../contexts/AuthContext";
import {
  Send,
  Mail,
  MailOpen,
  Clock,
  User,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Loader,
  Paperclip,
  Eye,
  EyeOff,
  Inbox,
  Reply,
  AtSign,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const MessagePanel = ({ ticket, isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && ticket?._id) {
      fetchMessages();
    }
  }, [isOpen, ticket?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!ticket?._id) return;

    setLoading(true);
    try {
      const result = await messageApi.getTicketMessages(ticket._id);
      if (result.success) {
        setMessages(result.messages);

        // Mark unread messages as read
        const unreadMessages = result.messages
          .filter((msg) => !msg.isRead && msg.to.email === user.email)
          .map((msg) => msg._id);

        if (unreadMessages.length > 0) {
          await messageApi.markAsRead(unreadMessages);
        }
      } else {
        toast.error(result.error || "Failed to load messages");
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!ticket?._id) {
      toast.error("No ticket selected");
      return;
    }

    setSending(true);
    try {
      const result = await messageApi.sendMessage({
        ticketId: ticket._id,
        content: newMessage.trim(),
        isInternal,
      });

      if (result.success) {
        setNewMessage("");
        setIsInternal(false);
        await fetchMessages(); // Refresh messages
        toast.success(
          isInternal ? "Internal note added" : "Message sent to customer",
        );
      } else {
        toast.error(result.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSendMessage(e);
    }
  };

  const getMessageIcon = (message) => {
    if (message.from.type === "customer") {
      return message.isFromEmail ? (
        <Inbox className="h-4 w-4 text-blue-600" />
      ) : (
        <User className="h-4 w-4 text-blue-600" />
      );
    }
    return message.isFromEmail ? (
      <Mail className="h-4 w-4 text-green-600" />
    ) : (
      <MessageCircle className="h-4 w-4 text-gray-600" />
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return null;
    }
  };

  const filteredMessages = showUnreadOnly
    ? messages.filter((msg) => !msg.isRead && msg.to.email === user.email)
    : messages;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Messages - {ticket?.ticketId}
              </h3>
              <p className="text-xs text-gray-500">
                {ticket?.clientName} ({ticket?.clientEmail})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Filter Controls */}
        <div className="mt-2 flex items-center space-x-3">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showUnreadOnly
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {showUnreadOnly ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            {showUnreadOnly ? "All Messages" : "Unread Only"}
          </button>
          <span className="text-xs text-gray-500">
            {filteredMessages.length} message
            {filteredMessages.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading messages...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm">
              {showUnreadOnly ? "No unread messages" : "No messages yet"}
            </p>
            <p className="text-xs mt-1">
              {!showUnreadOnly &&
                "Create a ticket to start email communication"}
            </p>
          </div>
        ) : (
          filteredMessages.map((message, index) => {
            const isFromTechnician = message.from.type === "technician";
            const showDate =
              index === 0 ||
              new Date(message.createdAt).toDateString() !==
                new Date(filteredMessages[index - 1].createdAt).toDateString();

            return (
              <div key={message._id} className="space-y-2">
                {/* Date Separator */}
                {showDate && (
                  <div className="text-center">
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                      {format(new Date(message.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`flex space-x-3 ${
                    isFromTechnician ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isFromTechnician && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        {getMessageIcon(message)}
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-xs lg:max-w-sm xl:max-w-md ${
                      isFromTechnician ? "order-1" : "order-2"
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        isFromTechnician
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      {/* Message Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs font-medium ${
                              isFromTechnician
                                ? "text-blue-100"
                                : "text-gray-600"
                            }`}
                          >
                            {message.from.name}
                          </span>
                          {message.isFromEmail && (
                            <div
                              className={`flex items-center space-x-1 ${
                                isFromTechnician
                                  ? "text-blue-200"
                                  : "text-green-600"
                              }`}
                            >
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">Email</span>
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-xs ${
                            isFromTechnician ? "text-blue-200" : "text-gray-500"
                          }`}
                        >
                          {format(new Date(message.createdAt), "HH:mm")}
                        </span>
                      </div>

                      {/* Message Subject (for emails) */}
                      {message.isFromEmail && message.subject && (
                        <div
                          className={`text-xs mb-2 font-medium ${
                            isFromTechnician ? "text-blue-100" : "text-gray-700"
                          }`}
                        >
                          <AtSign className="h-3 w-3 inline mr-1" />
                          {message.subject.replace(/^(Re:|Fwd:)\s*/i, "")}
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      {/* Message Footer */}
                      <div className="flex items-center justify-between mt-3 pt-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(message.status)}
                          {message.status === "sent" && message.isFromEmail && (
                            <span
                              className={`text-xs ${
                                isFromTechnician
                                  ? "text-blue-200"
                                  : "text-gray-500"
                              }`}
                            >
                              via Email
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          {!message.isRead &&
                            message.to.email === user.email && (
                              <div
                                className="h-2 w-2 bg-red-500 rounded-full"
                                title="Unread"
                              ></div>
                            )}
                          {message.isFromEmail && (
                            <Reply
                              className={`h-3 w-3 ${
                                isFromTechnician
                                  ? "text-blue-200"
                                  : "text-gray-400"
                              }`}
                              title="Email thread"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isFromTechnician && (
                    <div className="flex-shrink-0 mt-1 order-2">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Internal Note Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isInternal"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isInternal" className="text-xs text-gray-600">
              Internal note (won't email customer)
            </label>
          </div>

          {/* Message Input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isInternal ? "Add internal note..." : "Type your message..."
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />
            <div className="absolute bottom-2 right-2 flex items-center space-x-1">
              <span className="text-xs text-gray-400">Ctrl+Enter to send</span>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {isInternal ? (
                <div className="flex items-center text-orange-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Internal note - customer won't receive email
                </div>
              ) : (
                <div className="flex items-center text-blue-600">
                  <Mail className="h-3 w-3 mr-1" />
                  Will send email to {ticket?.clientEmail}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className={`inline-flex items-center px-3 py-2 border border-transparent rounded-lg font-medium text-white transition-colors ${
                isInternal
                  ? "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm`}
            >
              {sending ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-1" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  {isInternal ? "Add Note" : "Send"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessagePanel;
