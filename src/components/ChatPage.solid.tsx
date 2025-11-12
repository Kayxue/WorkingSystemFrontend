import MessageSkeleton from "./skeleton/MessageSkeleton.solid";
import ConversationSkeleton from "./skeleton/ConversationSkeleton.solid";
import { createSignal, For, Show, createEffect, onMount, onCleanup } from "solid-js"; 
import styles from "../styles/ChatForm.module.css";

// TypeScript interfaces based on API schema
interface Opponent {
  id: string;
  name: string;
  profilePhoto: {
    url: string | null;
    originalName: string;
    type: string;
  } | null;
}

interface Gig {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  city: string;
  district: string;
  address: string;
}

interface Conversation {
  conversationId: string;
  workerId: string;
  employerId:string;
  lastMessageAt: string;
  createdAt: string;
  lastReadAtByWorker: string | null;
  lastReadAtByEmployer: string | null;
  opponent: Opponent;
  unreadCount: number;
  lastMessage: string | null;
}

interface Message {
  messagesId: string;
  conversationId: string;
  senderWorkerId: string | null;
  senderEmployerId: string | null;
  content: string;
  createdAt: string;
  retractedAt: string | null;
  type: 'private_message' | 'gig_message';
  gigId: string | null;
  gig: Gig | null;
  replyToId: string | null;
  replySnippet: {
    messagesId: string;
    content: string;
    createdAt: string;
  } | null;
}

interface ChatPageProps {
  employerId?: string;
  workerId?: string;
  role?: string;
  profilePhotoUrl: string | null;
}

function ChatPage(props: ChatPageProps) {
  const [conversations, setConversations] = createSignal<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = createSignal<Conversation | null>(null);
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [input, setInput] = createSignal("");
  const [showProfilePanel, setShowProfilePanel] = createSignal(window.innerWidth >= 1024);
  const [isLoadingConversations, setIsLoadingConversations] = createSignal(false);
  const [isLoadingMessages, setIsLoadingMessages] = createSignal(false);
  const [conversationsOffset, setConversationsOffset] = createSignal(0);
  const [hasMoreConversations, setHasMoreConversations] = createSignal(true);
  const [error, setError] = createSignal<string>("");
  const [wsConnected, setWsConnected] = createSignal(false);
  const [wsError, setWsError] = createSignal<string>("");
  const [hoveredMessage, setHoveredMessage] = createSignal<string | null>(null);
  const [openMenu, setOpenMenu] = createSignal<string | null>(null);
  const [menuPosition, setMenuPosition] = createSignal<{ top: number; left: number } | null>(null);
  const [replyingTo, setReplyingTo] = createSignal<Message | null>(null);
  const [lastReadByOpponent, setLastReadByOpponent] = createSignal<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = createSignal(false);
  const [dialogAction, setDialogAction] = createSignal<'retract' | 'delete' | 'deleteConversation' | null>(null);
  const [messageToActOn, setMessageToActOn] = createSignal<string | null>(null);
  const [conversationToActOn, setConversationToActOn] = createSignal<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = createSignal(false);
  const [showRetractButton, setShowRetractButton] = createSignal<boolean>(false);
  const [isMd, setIsMd] = createSignal(window.innerWidth < 1024 && window.innerWidth > 700);
  const [isSm, setIsSm] = createSignal(window.innerWidth < 700);

  let chatMessagesRef: HTMLDivElement | undefined;
  let sidebarListRef: HTMLDivElement | undefined;
  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: number | null = null;
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const handleResize = () => {
    const windowWidth = window.innerWidth;
    setIsMd(windowWidth < 1024 && windowWidth > 700);
    setIsSm(windowWidth < 700);
    if (openMenu()) setOpenMenu(null);
    if (!selectedConversation() && conversations().length > 0 && windowWidth > 700) {
      setSelectedConversation(conversations()[0]);
      setShowProfilePanel(windowWidth >= 1024);
    }
  };

  const handleMenuClick = (e: MouseEvent, messageId: string, isOwn: boolean) => {
    e.stopPropagation();
    if (openMenu() === messageId) {
      setOpenMenu(null);
    } else {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      const chatRect = chatMessagesRef?.getBoundingClientRect();
      let heightRetractButton = 0;

      const message = messages().find(m => m.messagesId === messageId);
      if (!message || !isOwnMessage(message)) { 
        setShowRetractButton(false); 
      } else {
        const messageTime = new Date(message.createdAt).getTime();
        const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
        setShowRetractButton(messageTime > threeHoursAgo);
        heightRetractButton = messageTime > threeHoursAgo ? 0 : 40;
      }
      
      if (chatRect) {
        const scrollTop = chatMessagesRef?.scrollTop || 0;
        let top = isOwn 
          ? rect.top - chatRect.top + scrollTop - 120 + heightRetractButton
          : rect.top - chatRect.top + scrollTop - 85;
        let left = isOwn 
          ? rect.left - chatRect.left + rect.width + 5 - 100 
          : rect.left - chatRect.left; // 100 is menu width, 5 for padding
        if (rect.top - 120 < chatRect.top) {
          top = isOwn 
            ? rect.bottom - chatRect.top + scrollTop - heightRetractButton
            : rect.bottom - chatRect.top + scrollTop;
        }
        setMenuPosition({ top, left });
      }
      if(hoveredMessage() === messageId)setOpenMenu(messageId);
      setHoveredMessage(messageId);
    }
  };

  createEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If the click is on a menu button, do nothing.
      if (target.closest('.message-menu-button')) {
        return;
      }

      // if (openMenu() && document.getElementById(`mess

      if (openMenu() && !document.getElementById(`menu-${openMenu()}`)?.contains(target)) {
        setOpenMenu(null);
        setHoveredMessage(null);
      }

    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  });

  // Get current user ID
  const getCurrentUserId = () => {
    return props.employerId || props.workerId || "";
  };

  // Determine if message is own message
  const isOwnMessage = (msg: Message): boolean => {
    const currentUserId = getCurrentUserId();
    if (msg.senderEmployerId !== null) {
      return true;
    }
    return false;
  };

  // Format date to DD/MM/YYYY HH:mm
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const midday = date.getHours() >= 12 ? "PM" : "AM";
    return `${hours}:${minutes} ${midday}`;
  };

  // Format date divider
  const formatDateDivider = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Check if date divider should be shown
  const shouldShowDateDivider = (currentMsg: Message, previousMsg: Message | undefined): boolean => {
    if (!previousMsg) return true;
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const previousDate = new Date(previousMsg.createdAt).toDateString();
    return currentDate !== previousDate;
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (chatMessagesRef) {
      chatMessagesRef.scrollTop = chatMessagesRef.scrollHeight;
    }
  };

  const scrollToMessage = async (messageId: string, snippetCreatedAt: string) => {
    const targetMessage = messages().find(m => m.messagesId === messageId);

    if (targetMessage) {
      const element = document.getElementById(messageId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add(styles.highlighted);
        setTimeout(() => {
          element.classList.remove(styles.highlighted);
        }, 2000);
      }
    } else {
      // Message not loaded, fetch it
      const conversationId = selectedConversation()!.conversationId;
      await fetchMessages(conversationId, 50, snippetCreatedAt);
      
      // After fetching, try to scroll again
      createEffect(() => {
        const element = document.getElementById(messageId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add(styles.highlighted);
          setTimeout(() => {
            element.classList.remove(styles.highlighted);
          }, 2000);
        }
      });
    }
  };

  // Fetch conversations from API
  const fetchConversations = async (offset = 0) => {
    if (isLoadingConversations() || !hasMoreConversations()) return;
    setIsLoadingConversations(true);
    setError("");
    try {
      const response = await fetch(`/api/chat/conversations?limit=20&offset=${offset}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();
      setConversations(prev => [...prev, ...data.conversations]);
      setHasMoreConversations(data.pagination.hasMore);
      setConversationsOffset(offset + data.conversations.length);
      
      // Auto-select first conversation if available and none is selected
      if (data.conversations.length > 0 && offset === 0) {
        const currentSelected = selectedConversation();
        if (!currentSelected || !data.conversations.find(c => c.conversationId === currentSelected.conversationId)) {
          if (window.innerWidth > 700) {
            setSelectedConversation(data.conversations[0]);
            setLastReadByOpponent(data.conversations[0].lastReadAtByWorker);
            updateLastRead(data.conversations[0].conversationId);
          };
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(err instanceof Error ? err.message : "無法載入對話列表");
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string, limit: number = 50, before?: string) => {
    setIsLoadingMessages(true);
    try {
      let url = `/api/chat/conversations/${conversationId}/messages?limit=${limit}`;
      if (before) {
        url += `&before=${encodeURIComponent(before)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const data: Message[] = await response.json();
      
      if (before) {
        // Prepend older messages for pagination and sort
        setMessages(prev => [...data, ...prev].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      } else {
        // Replace messages for new conversation
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err.message : "無法載入訊息");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.statusText}`);
      }

      // Remove from conversations list
      setConversations(prev => prev.filter(c => c.conversationId !== conversationId));
      
      // Clear selected conversation if it was deleted
      if (selectedConversation()?.conversationId === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
      setError(err instanceof Error ? err.message : "無法刪除對話");
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.statusText}`);
      }

      // Remove from messages list
      setMessages(prev => prev.filter(m => m.messagesId !== messageId));
    } catch (err) {
      console.error("Error deleting message:", err);
      setError(err instanceof Error ? err.message : "無法刪除訊息");
    }
  };

  // Build WebSocket URL
  const getWebSocketUrl = (): string => {
    // Construct WebSocket URL from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const hostname = "localhost:3000";
    const hostname = "worknowedu.ddns.net/api";
    const wsUrl = `${protocol}//${hostname}/chat/ws`;
    return wsUrl;
  };

  // Clear reconnect timer
  const clearReconnect = () => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  // Cleanup WebSocket connection
  const cleanupSocket = () => {
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onmessage = null;
      socket.onerror = null;
      try {
        socket.close();
      } catch (e) {
        console.error("Error closing socket:", e);
      }
      socket = null;
    }
    setWsConnected(false);
  };

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setWsError("無法連接到伺服器，請重新整理頁面");
      return;
    }

    clearReconnect();
    const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts), 4000);
    reconnectAttempts++;

    reconnectTimer = window.setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  // Connect WebSocket
  const connectWebSocket = async () => {
    console.log("Connecting WebSocket...");
    cleanupSocket();
    setWsError("");

    try {
      // 1. Fetch the WebSocket token
      const tokenResponse = await fetch('/api/chat/ws-token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to fetch WebSocket token');
      }
      const { token } = await tokenResponse.json();

      // 2. Connect the WebSocket
      const wsUrl = getWebSocketUrl();
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected");
        // 3. Authenticate with the token
        socket?.send(JSON.stringify({ type: 'auth', id: props.employerId, role:"employer", "token": token }));
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "auth_success") {
            console.log("WebSocket authenticated successfully");
            setWsConnected(true);
            reconnectAttempts = 0;
            clearReconnect();
          } else if (data.type === "heartbeat_request") {
            // console.log("Received heartbeat request");
            socket?.send(JSON.stringify({ type: 'heartbeat' }));
          } else if (data.type === "private_message" || data.type === "gig_message") {
            // Handle incoming message
            const newMessage: Message = {
              messagesId: data.messagesId || Date.now().toString(),
              conversationId: data.conversationId,
              senderWorkerId: data.senderWorkerId || null,
              senderEmployerId: data.senderEmployerId || null,
              content: data.content || data.text,
              createdAt: data.createdAt || new Date().toISOString(),
              retractedAt: null,
              type: data.type,
              gigId: data.gigId || null,
              gig: data.gig || null,
              replyToId: data.replyToId || null,
              replySnippet: data.replySnippet || null,
            };  

            // Add message to the appropriate conversation
            if (selectedConversation()?.conversationId === newMessage.conversationId) {
              setMessages(prev => [...prev, newMessage]);
              setTimeout(scrollToBottom, 100);
            }

            // Update conversation list with last message and move to top
            setConversations(prev => {
              const isSelected = selectedConversation()?.conversationId === newMessage.conversationId;
              const updated = prev.map(conv => 
                conv.conversationId === newMessage.conversationId
                  ? { 
                      ...conv, 
                      lastMessage: newMessage.content, 
                      lastMessageAt: newMessage.createdAt,
                      // Increment unread count if this conversation is not selected
                      unreadCount: isSelected ? conv.unreadCount : conv.unreadCount + 1
                    }
                  : conv
              );
              // Move the updated conversation to the top
              const updatedConv = updated.find(c => c.conversationId === newMessage.conversationId);
              if (updatedConv) {
                return [updatedConv, ...updated.filter(c => c.conversationId !== newMessage.conversationId)];
              }
              return updated;
            });
          } else if (data.type === "messages_read") {
            if (data.conversationId === selectedConversation()?.conversationId) {
              setLastReadByOpponent(data.readAt);
            }
          } else if (data.type === "message_retracted") {
            // Handle message retraction
            setMessages(prev =>
              prev.map(msg =>
                msg.messagesId === data.messageId
                  ? { ...msg, retractedAt: new Date().toISOString() }
                  : msg
              )
            );
          } else if (data.type === "error") {
            setWsError(data.message || "發生錯誤");
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setWsError("連線錯誤");
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        setWsConnected(false);
        if (reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      setWsError("無法建立連線");
      scheduleReconnect();
    }
  };

  // Send message via WebSocket
  const sendMessage = () => {
    const text = input().trim();
    if (!text || !selectedConversation() || !wsConnected()) {
      if (!wsConnected()) {
        setError("尚未連接到伺服器，請稍候");
      }
      return;
    }

    const recipientId = selectedConversation()!.opponent.id;
    const message: any = {
      type: "private_message",
      recipientId: recipientId,
      text: text,
    };

    if (replyingTo()) {
      message.replyToId = replyingTo()!.messagesId;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      setInput("");
      setReplyingTo(null);
    } else {
      setError("連線已斷開，請重新整理頁面");
    }
  };

  // Retract message via WebSocket
  const retractMessage = (messageId: string) => {
    if (!selectedConversation() || !wsConnected()) {
      return;
    }

    const recipientId = selectedConversation()!.opponent.id;
    const message = {
      type: "retract_message",
      messageId: messageId,
      recipientId: recipientId,
    };

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  // Update last read timestamp
  const updateLastRead = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to update last read: ${response.statusText}`);
      }

    } catch (err) {
      console.error("Error updating last read:", err);
    }
  }


  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    if (selectedConversation()?.conversationId === conversation.conversationId) {
      return;
    }
    setSelectedConversation(conversation);
    setLastReadByOpponent(conversation.lastReadAtByWorker);
    updateLastRead(conversation.conversationId);
    
    // Reset unread count for selected conversation
    setConversations(prev =>
      prev.map(conv =>
        conv.conversationId === conversation.conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
    
    // The effect will handle fetching messages
  };

  // Effect to scroll when messages change
  createEffect(() => {
    messages();
    setTimeout(scrollToBottom, 0);
  });

  // Effect to fetch messages when conversation changes and adding scroll listener
  createEffect(() => {
    const conv = selectedConversation();
    if (conv) {
      // Reset messages before fetching new ones
      setMessages([]);
      fetchMessages(conv.conversationId);
    } else {
      setMessages([]);
    }

    const chatRef = chatMessagesRef;
    if (chatRef) {
      const handleScroll = () => {
        if (openMenu()) {
          const menuElement = document.getElementById(`menu-${openMenu()}`);
          if (menuElement) {
            const rect = menuElement.getBoundingClientRect();
            const chatRect = chatRef.getBoundingClientRect();
            if (rect.bottom < chatRect.top || rect.top > chatRect.bottom) {
              setOpenMenu(null);
            }
          }
        }
        const isScrolledUp = chatRef.scrollTop + chatRef.clientHeight < chatRef.scrollHeight - 200;
        setShowScrollToBottom(isScrolledUp);
      };
      chatRef.addEventListener("scroll", handleScroll);

      onCleanup(() => {
        chatRef.removeEventListener("scroll", handleScroll);
      });
    }
  });

  // Mount: Fetch conversations and connect WebSocket
  onMount(() => {
    window.addEventListener('resize', handleResize);
    fetchConversations(0);
    connectWebSocket();

    const sidebarRef = sidebarListRef;
    if (sidebarRef) {
      const handleScroll = () => {
        if (sidebarRef.scrollTop + sidebarRef.clientHeight >= sidebarRef.scrollHeight - 5) {
          fetchConversations(conversationsOffset());
        }
      };
      sidebarRef.addEventListener('scroll', handleScroll);
      onCleanup(() => {
        sidebarRef.removeEventListener('scroll', handleScroll);
      });
    }

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      clearReconnect();
      cleanupSocket();
    });
  });

  // Get opponent avatar
  const getOpponentAvatar = (conversation: Conversation): string => {
    return conversation.opponent.profilePhoto?.url || "src/assets/anonymous-profile-photo.png";
  };

  // Get message sender avatar
  const getMessageAvatar = (msg: Message, conversation: Conversation): string => {
    if (isOwnMessage(msg)) {
      // Use current user's avatar (you might want to fetch this from user profile)
      return props.profilePhotoUrl || "src/assets/anonymous-profile-photo.png";
    }
    return getOpponentAvatar(conversation);
  };

  return (
    <div class="flex" style={{ height: "calc(100vh - 72px)" }}>
      {/* Sidebar */}
      <div
        class={styles.sidebar}
        classList={{
          "w-1/4 m-4": !isMd() && !isSm(),
          "w-1/3 m-4": isMd() && !isSm(),
          "w-full": isSm(),
        }}
        hidden={isSm() && (selectedConversation() !== null || showProfilePanel())}
      >
        <div class={styles.sidebarHeader}>
          <span>聊天</span>
        </div>
        <div class={styles.sidebarList} ref={sidebarListRef}>
          <Show when={isLoadingConversations() && conversations().length === 0}>
            <ConversationSkeleton />
          </Show>
          <Show when={!isLoadingConversations() && conversations().length === 0}>
            <div class="p-4 text-center text-gray-500">沒有對話</div>
          </Show>
          <For each={conversations()}>
            {(conversation) => (
              <div
                class={`${styles.userItem} ${selectedConversation()?.conversationId === conversation.conversationId ? styles.activeUser : ""}`}
                onClick={() => handleSelectConversation(conversation)}
              >
                <img
                  src={getOpponentAvatar(conversation)}
                  alt={conversation.opponent.name}
                  class={styles.avatar}
                />
                <div class={styles.userInfo}>
                  <span class={styles.userName}>{conversation.opponent.name}</span>
                </div>
                <Show when={conversation.unreadCount > 0}>
                  <span class="inset-y-0 text-sm bg-blue-500 text-white rounded-full px-2 py-0.5">
                    {conversation.unreadCount}
                  </span>
                </Show>
              </div>
            )}
          </For>
          <Show when={isLoadingConversations() && conversations().length > 0}>
            <ConversationSkeleton />
          </Show>
        </div>
      </div>

      {/* Chat Section */}
      <div
        class={styles.chatSection}
        classList={{
          "w-2/4 m-4": !isMd() && showProfilePanel(),
          "w-2/3 m-4": isMd() && !isSm(),
          "w-full": isSm(),
          "w-full m-4":(!isMd() && !showProfilePanel() && !isSm()),
        }}
        hidden={(isMd() && !isSm() && showProfilePanel()) || (isSm() && (!selectedConversation() || showProfilePanel()))}
      >
        <Show when={selectedConversation()}>
          <div class={styles.chatHeader}>
            <Show when={isSm()}>
              <button onClick={() => setSelectedConversation(null)} class="p-2 rounded-full hover:bg-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </Show>
            <div class="flex-grow text-center">
              <div class={styles.chatUserName}>{selectedConversation()!.opponent.name}</div>
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class={styles.chevronIcon}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <button onClick={() => setShowProfilePanel(!showProfilePanel())} class="p-2 rounded-full hover:bg-gray-200 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" >
                <g id="Warning / Info">
                  <path id="Vector" d="M12 11V16M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21ZM12.0498 8V8.1L11.9502 8.1002V8H12.0498Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </g>
              </svg>
            </button>
          </div>

          <div class={styles.chatMessages} ref={chatMessagesRef} style={{ position: 'relative' }}>
            <Show when={isLoadingMessages()}>
              <MessageSkeleton />
            </Show>
            <Show when={!isLoadingMessages() && messages().length === 0}>
              <div class="p-4 text-center text-gray-500">沒有訊息</div>
            </Show>
            <For each={messages()}>
              {(msg, index) => (
                <>
                  <Show when={shouldShowDateDivider(msg, messages()[index() - 1])}>
                    <div class={styles.dateDivider}>{formatDateDivider(msg.createdAt)}</div>
                  </Show>
                  <div
                    id={msg.messagesId}
                    class={`${styles.messageRow} ${isOwnMessage(msg) ? styles.ownMessage : styles.otherMessage}`}
                    onMouseEnter={() => { 
                      if (isMd() || isSm()) return;
                      setHoveredMessage(msg.messagesId); 
                    }}
                    onMouseLeave={() => {
                      if (openMenu() !== msg.messagesId) {
                        setHoveredMessage(null);
                      }
                    }}
                    onClick={() => {
                      // if (msg.gig) {
                      //   window.location.href = `/job/${msg.gigId}`;
                      //   return;
                      // } 
                      if (openMenu() === msg.messagesId) {
                        setOpenMenu(null);
                        setHoveredMessage(msg.messagesId);
                      } else {
                        setOpenMenu(null);
                        setHoveredMessage(msg.messagesId);
                      }
                    }}
                  >
                    <Show when={!isOwnMessage(msg)}>
                      <img
                        src={getMessageAvatar(msg, selectedConversation()!)}
                        alt={selectedConversation()!.opponent.name}
                        class={styles.msgAvatar}
                      />
                      <Show 
                        when={msg.gig}
                        fallback={
                          <div class={`max-w-60 lg:max-w-72 px-3 py-2 rounded-2xl shadow-sm shadow-black/10 ${styles.otherBubble} ${msg.retractedAt ? 'opacity-50' : ''}`}>
                            <Show when={msg.replySnippet}>
                              <div class="p-2 text-sm bg-gray-100 rounded-lg mb-2 cursor-pointer" onClick={() => scrollToMessage(msg.replySnippet!.messagesId, msg.replySnippet!.createdAt)}>
                                <p class="font-bold">{isOwnMessage(msg) ? selectedConversation()!.opponent.name : "You"}</p>
                                <p class="truncate">{msg.replySnippet!.content}</p>
                              </div>
                            </Show>
                            <Show when={msg.retractedAt} fallback={<p>{msg.content}</p>}>
                              <p class="italic text-gray-500">此訊息已收回</p>
                            </Show>
                            <span class={styles.messageTime}>{formatDateTime(msg.createdAt)}</span>
                          </div>
                        }
                      >
                        <div class="block p-4 bg-white rounded-lg border border-gray-200 shadow-md w-70 md:w-80">
                          <p class="mb-2 text-gray-800">{msg.content}</p>
                          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer" onClick={() => window.location.href = `/job/${msg.gigId}`}>                          
                            <h5 class="mb-2 text-xl font-bold tracking-tight text-gray-900">{msg.gig!.title}</h5>
                            <div class="font-normal text-gray-700">
                              <p>日期: {msg.gig!.dateStart} - {msg.gig!.dateEnd}</p>
                              <p>時間: {msg.gig!.timeStart} - {msg.gig!.timeEnd}</p>
                              <p>地址: {msg.gig!.city}{msg.gig!.district}{msg.gig!.address}</p>
                            </div>
                          </div>

                        </div>
                      </Show>
                      <Show when={(hoveredMessage() === msg.messagesId || openMenu() === msg.messagesId) && !msg.retractedAt}>
                        <button onClick={(e) => handleMenuClick(e, msg.messagesId, false)} class="message-menu-button flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm0 5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm0 5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z" /></svg>
                        </button>
                      </Show>
                    </Show>

                    <Show when={isOwnMessage(msg)}>
                      <Show when={(hoveredMessage() === msg.messagesId || openMenu() === msg.messagesId) && !msg.retractedAt}>
                        <button onClick={(e) => handleMenuClick(e, msg.messagesId, true)} class="message-menu-button flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm0 5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm0 5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z" /></svg>
                        </button>
                      </Show>
                      <div class={`max-w-60 lg:max-w-72 px-3 py-2 rounded-2xl shadow-sm shadow-black/10 ${styles.ownBubble} ${msg.retractedAt ? 'opacity-50' : ''}`}>
                        <Show when={msg.replySnippet}>
                          <div class="p-2 text-sm bg-blue-50 rounded-lg mb-2 cursor-pointer" onClick={() => scrollToMessage(msg.replySnippet!.messagesId, msg.replySnippet!.createdAt)}>
                            <p class="font-bold">{isOwnMessage(msg) ? "You" : selectedConversation()!.opponent.name}</p>
                            <p class="truncate">{msg.replySnippet!.content}</p>
                          </div>
                        </Show>
                        <Show when={msg.retractedAt} fallback={<p>{msg.content}</p>}>
                          <p class="italic text-gray-500">此訊息已收回</p>
                        </Show>
                        <span class={styles.messageTime}>{formatDateTime(msg.createdAt)}</span>
                      </div>
                    </Show>
                  </div>
                </>
              )}
            </For>
            <Show when={showRetractButton()}>
              <div class="text-right text-xs text-gray-500 pr-4">Read</div>
            </Show>
            <Show when={openMenu() && menuPosition()}>
              <div
                id={`menu-${openMenu()}`}
                class="absolute bg-white rounded-md shadow-[0_0_20px_5px_rgba(0,0,0,0.25)] z-50 w-24"
                style={{
                  top: `${menuPosition()!.top}px`,
                  left: `${menuPosition()!.left}px`
                }}
              >
                <ul class="py-1">
                  <li>
                    <a href="#"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        const messageToReply = messages().find(m => m.messagesId === openMenu());
                        if (messageToReply) {
                          setReplyingTo(messageToReply);
                        }
                        setOpenMenu(null);
                      }}
                    >
                      Reply
                    </a>
                  </li>
                  <Show when={(() => {
                    const message = messages().find(m => m.messagesId === openMenu());
                    if (!message || !isOwnMessage(message)) return false;
                    const messageTime = new Date(message.createdAt).getTime();
                    const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
                    return messageTime > threeHoursAgo;
                  })()}>
                    <li>
                      <a href="#"
                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setMessageToActOn(openMenu());
                          setDialogAction('retract');
                          setShowConfirmDialog(true);
                          setOpenMenu(null);
                        }}
                      >
                        撤回
                      </a>
                    </li>
                  </Show>
                  <li>
                    <a href="#"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setMessageToActOn(openMenu());
                        setDialogAction('delete');
                        setShowConfirmDialog(true);
                        setOpenMenu(null);
                      }}
                    >
                      刪除
                    </a>
                  </li>
                </ul>
              </div>
            </Show>
          </div>

          <Show when={showScrollToBottom()}>
            <div
              class={`absolute left-1/2 -translate-x-1/2 bottom-[5.5rem] sm:bottom-24 transition-opacity duration-300 ${
                showScrollToBottom() ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <button 
                onClick={scrollToBottom} 
                class="rounded-full p-2 shadow-md bg-white hover:bg-gray-100 transition "
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                </svg>  
              </button>
            </div>
          </Show>

          <div class={styles.inputContainer}>
            <div class="w-full">
              <Show when={replyingTo()}>
                <div class="p-2 mb-2 bg-gray-200 rounded-lg text-sm">
                  <div class="flex justify-between items-center">
                    <p class="font-bold">Replying to {isOwnMessage(replyingTo()!) ? "You" : selectedConversation()!.opponent.name}</p>
                    <button onClick={() => setReplyingTo(null)} class="font-bold text-lg">×</button>
                  </div>
                  <p class="truncate">{replyingTo()!.content}</p>
                </div>
              </Show>
              <div class="flex">
                <input
                  type="text"
                  value={input()}
                  onInput={(e) => setInput(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="輸入訊息..."
                  class={styles.messageInput}
                  disabled={!wsConnected()}
                />
                <button
                  onClick={sendMessage}
                  class={styles.sendButton}
                  disabled={!wsConnected() || !input().trim()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={!selectedConversation()}>
          <div class="flex items-center justify-center h-full text-gray-500">
            請選擇一個對話
          </div>
        </Show>
      </div>

      {/* Profile Panel */}
      <div
        class={styles.profilePanel}
        classList={{
          "w-1/4 m-4": !isMd() && !isSm(),
          "w-2/3 m-4": isMd() && !isSm(),
          "w-full": isSm(),
        }}
        hidden={!showProfilePanel()}
      >
        <Show when={selectedConversation()}>
          <div class={styles.profilePanelHeader}>
            <Show when={isSm() || isMd()}>
              <button onClick={() => setShowProfilePanel(false)} class="p-2 rounded-full hover:bg-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </Show>
            <span class={styles.profilePanelTitle}> 對話資訊 </span>
          </div>
          <div class={styles.profileHeader}>
            <img
              src={getOpponentAvatar(selectedConversation()!)}
              alt={selectedConversation()!.opponent.name}
              class={styles.profileAvatar}
            />
            <h2 class={styles.profileName}>{selectedConversation()!.opponent.name}</h2>
          </div>
          <div class={styles.profileContent}>
            <div class="flex flex-col item-center justify-center gap-2">
              <button
                onClick={() => {
                  setConversationToActOn(selectedConversation()!.conversationId);
                  setDialogAction('deleteConversation');
                  setShowConfirmDialog(true);
                }}
                class="w-fit self-center rounded-full p-4 text-white bg-gray-200 hover:bg-gray-300 flex items-center justify-center cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="18" height="18" fill="#000000" version="1.1" id="Capa_1" viewBox="0 0 408.483 408.483">
                  <g>
                    <g>
                      <path d="M87.748,388.784c0.461,11.01,9.521,19.699,20.539,19.699h191.911c11.018,0,20.078-8.689,20.539-19.699l13.705-289.316    H74.043L87.748,388.784z M247.655,171.329c0-4.61,3.738-8.349,8.35-8.349h13.355c4.609,0,8.35,3.738,8.35,8.349v165.293    c0,4.611-3.738,8.349-8.35,8.349h-13.355c-4.61,0-8.35-3.736-8.35-8.349V171.329z M189.216,171.329    c0-4.61,3.738-8.349,8.349-8.349h13.355c4.609,0,8.349,3.738,8.349,8.349v165.293c0,4.611-3.737,8.349-8.349,8.349h-13.355    c-4.61,0-8.349-3.736-8.349-8.349V171.329L189.216,171.329z M130.775,171.329c0-4.61,3.738-8.349,8.349-8.349h13.356    c4.61,0,8.349,3.738,8.349,8.349v165.293c0,4.611-3.738,8.349-8.349,8.349h-13.356c-4.61,0-8.349-3.736-8.349-8.349V171.329z"/>
                      <path d="M343.567,21.043h-88.535V4.305c0-2.377-1.927-4.305-4.305-4.305h-92.971c-2.377,0-4.304,1.928-4.304,4.305v16.737H64.916    c-7.125,0-12.9,5.776-12.9,12.901V74.47h304.451V33.944C356.467,26.819,350.692,21.043,343.567,21.043z"/>
                    </g>
                  </g>
                </svg>
              </button>
              <p class="text-base">刪除對話</p>
            </div>
          </div>
        </Show>
      </div>

      {/* Error Display */}
      <Show when={error() || wsError()}>
        <div class="fixed bottom-4 right-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm max-w-md z-50 shadow-lg">
          <div class="flex items-center justify-between gap-4">
            <span>{error() || wsError()}</span>
            <button
              onClick={() => {
                setError("");
                setWsError("");
              }}
              class="text-red-700 hover:text-red-900 font-bold"
              aria-label="關閉錯誤訊息"
            >
              ×
            </button>
          </div>
        </div>
      </Show>

      {/* Confirmation Dialog */}
      <Show when={showConfirmDialog()}>
        <div class="fixed inset-0 bg-gray-50/50 overflow-y-auto h-full w-full z-50 flex justify-center items-center"
             onClick={(e) => {
               if (e.target === e.currentTarget) {
                 setShowConfirmDialog(false);
                 setMessageToActOn(null);
                 setConversationToActOn(null);
                 setDialogAction(null);
               }
             }}>
          <div class="bg-white p-8 rounded-lg shadow-xl relative">

            <div class="flex flex-row place-content-between mb-4">
              <h3 class="text-lg font-bold">
                {dialogAction() === 'retract' && '撤回訊息'}
                {dialogAction() === 'delete' && '刪除訊息'}
                {dialogAction() === 'deleteConversation' && '从你這端移除對話'}
              </h3>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setMessageToActOn(null);
                  setConversationToActOn(null);
                  setDialogAction(null);
                }}
                class="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full hover:bg-gray-400"
              >
                <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M204.24,195.76a6,6,0,1,1-8.48,8.48L128,136.49,60.24,204.24a6,6,0,0,1-8.48-8.48L119.51,128,51.76,60.24a6,6,0,0,1,8.48-8.48L128,119.51l67.76-67.75a6,6,0,0,1,8.48,8.48L136.49,128Z"/>
                </svg>
              </button>
            </div>
            <p class="mb-6">
              {/* 您確定要{dialogAction() === 'retract' ? '撤回' : dialogAction() === 'delete' ? '刪除' : '刪除'}此{dialogAction() === 'deleteConversation' ? '對話（）' : '訊息'}嗎？此操作無法復原。 */}
              {dialogAction() === 'retract' && '您確定要撤回此訊息嗎？收回後，對方和你將無法再查看此訊息。'}
              {dialogAction() === 'delete' && '您確定要刪除此訊息嗎？此操作僅會從您的裝置中刪除訊息，對方仍然可以查看。'}
              {dialogAction() === 'deleteConversation' && '消息將從你的設備端移除，其他聊天成員仍可以看到消息。'}
            </p>
            <div class="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setMessageToActOn(null);
                  setConversationToActOn(null);
                  setDialogAction(null);
                }}
                class="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (dialogAction() === 'retract' && messageToActOn()) {
                    retractMessage(messageToActOn()!);
                  } else if (dialogAction() === 'delete' && messageToActOn()) {
                    deleteMessage(messageToActOn()!);
                  } else if (dialogAction() === 'deleteConversation' && conversationToActOn()) {
                    deleteConversation(conversationToActOn()!);
                  }
                  setShowConfirmDialog(false);
                  setMessageToActOn(null);
                  setConversationToActOn(null);
                  setDialogAction(null);
                }}
                class="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default ChatPage;