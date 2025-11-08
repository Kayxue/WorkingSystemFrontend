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

interface Conversation {
  conversationId: string;
  workerId: string;
  employerId: string;
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
  const [showProfilePanel, setShowProfilePanel] = createSignal(window.innerWidth > 768);
  const [isLoadingConversations, setIsLoadingConversations] = createSignal(false);
  const [isLoadingMessages, setIsLoadingMessages] = createSignal(false);
  const [error, setError] = createSignal<string>("");
  const [wsConnected, setWsConnected] = createSignal(false);
  const [wsError, setWsError] = createSignal<string>("");
  const [hoveredMessage, setHoveredMessage] = createSignal<string | null>(null);
  const [openMenu, setOpenMenu] = createSignal<string | null>(null);
  const [menuPosition, setMenuPosition] = createSignal<{ top: number; left: number } | null>(null);
  const [isMd, setIsMd] = createSignal(window.innerWidth <= 768 && window.innerWidth > 700);
  const [isSm, setIsSm] = createSignal(window.innerWidth < 700);

  let chatMessagesRef: HTMLDivElement | undefined;
  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: number | null = null;
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const handleResize = () => {
    setIsMd(window.innerWidth <= 768 && window.innerWidth > 700);
    setIsSm(window.innerWidth < 700);
  };

  const handleMenuClick = (e: MouseEvent, messageId: string, isOwn: boolean) => {
    e.stopPropagation();
    console.log("isOwn:", isOwn);
    if (openMenu() === messageId) {
      setOpenMenu(null);
    } else {
      const button = e.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      const chatRect = chatMessagesRef?.getBoundingClientRect();

      if (chatRect) {
        const scrollTop = chatMessagesRef?.scrollTop || 0;
        let top = isOwn 
          ? rect.top - chatRect.top + scrollTop - 85
          : rect.top - chatRect.top + scrollTop - 50;
        let left = isOwn 
          ? rect.left - chatRect.left + rect.width + 5 - 100 
          : rect.left - chatRect.left; // 100 is menu width, 5 for padding
        if (rect.top - 80 < chatRect.top) {
          top = isOwn 
            ? rect.bottom - chatRect.top + scrollTop
            : rect.bottom - chatRect.top + scrollTop - 85;
        }
        setMenuPosition({ top, left });
      }
      setOpenMenu(messageId);
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

  // Fetch conversations from API
  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    setError("");
    try {
      const response = await fetch("/api/chat/conversations", {
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

      const data: Conversation[] = await response.json();
      setConversations(data);
      
      // Auto-select first conversation if available and none is selected
      if (data.length > 0) {
        const currentSelected = selectedConversation();
        if (!currentSelected || !data.find(c => c.conversationId === currentSelected.conversationId)) {
          setSelectedConversation(data[0]);
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
        // Prepend older messages for pagination
        setMessages(prev => [...prev, ...data]);
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
    // For development: use localhost:3000
    // For production: use the same hostname with port 3000
    // const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const protocol = 'http:';
    const hostname = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'localhost' 
      : '100.118.254.105'; // Default backend hostname
    const port = '3000';
    const wsUrl = `${protocol}//${hostname}:${port}/chat/ws/chat`;
    console.log("WebSocket URL:", wsUrl);
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
  const connectWebSocket = () => {
    console.log("Connecting WebSocket...");
    cleanupSocket();
    setWsError("");

    try {
      const wsUrl = getWebSocketUrl();
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected");
        setWsConnected(true);
        reconnectAttempts = 0;
        clearReconnect();
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "connection_success") {
            console.log("WebSocket connection confirmed");
          } else if (data.type === "private_message") {
            // Handle incoming message
            const newMessage: Message = {
              messagesId: data.messagesId || Date.now().toString(),
              conversationId: data.conversationId,
              senderWorkerId: data.senderWorkerId || null,
              senderEmployerId: data.senderEmployerId || null,
              content: data.content || data.text,
              createdAt: data.createdAt || new Date().toISOString(),
              retractedAt: null,
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
    const message = {
      type: "private_message",
      recipientId: recipientId,
      text: text,
    };

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      setInput("");
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

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    if (selectedConversation()?.conversationId === conversation.conversationId) {
      return;
    }
    setSelectedConversation(conversation);
    
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

  // Effect to fetch messages when conversation changes
  createEffect(() => {
    const conv = selectedConversation();
    if (conv) {
      // Reset messages before fetching new ones
      setMessages([]);
      fetchMessages(conv.conversationId);
    } else {
      setMessages([]);
    }
  });

  // Mount: Fetch conversations and connect WebSocket
  onMount(() => {
    window.addEventListener('resize', handleResize);
    fetchConversations();
    connectWebSocket();

    const handleScroll = () => {
      if (openMenu()) {
        const menuElement = document.getElementById(`menu-${openMenu()}`);
        if (menuElement) {
          const rect = menuElement.getBoundingClientRect();
          const chatRect = chatMessagesRef?.getBoundingClientRect();
          if (chatRect && (rect.bottom < chatRect.top || rect.top > chatRect.bottom)) {
            setOpenMenu(null);
          }
        }
      }
    };

    const chatRef = chatMessagesRef;
    chatRef?.addEventListener("scroll", handleScroll);

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      chatRef?.removeEventListener("scroll", handleScroll);
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
          "w-1/4": !isMd(),
          "w-1/3": isMd() && !isSm(),
          "w-full": isSm(),
        }}
        hidden={isSm() && (selectedConversation() !== null || showProfilePanel())}
      >
        <div class={styles.sidebarHeader}>
          <span>聊天</span>
        </div>
        <div class={styles.sidebarList}>
          <Show when={isLoadingConversations()}>
            <div class="p-4 text-center text-gray-500">載入中...</div>
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
        </div>
      </div>

      {/* Chat Section */}
      <div
        class={styles.chatSection}
        classList={{
          "w-2/4 m-4": !isMd() && showProfilePanel(),
          "w-2/3": isMd() && !isSm(),
          "w-full m-4": isSm() || (!isMd() && !showProfilePanel()) ,
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
              <div class="p-4 text-center text-gray-500">載入訊息中...</div>
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
                    class={`${styles.messageRow} ${isOwnMessage(msg) ? styles.ownMessage : styles.otherMessage}`}
                    onMouseEnter={() => setHoveredMessage(msg.messagesId)}
                    onMouseLeave={() => {
                      if (openMenu() !== msg.messagesId) {
                        setHoveredMessage(null);
                      }
                    }}
                    onClick={() => {
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
                      <div class={`${styles.messageBubble} ${styles.otherBubble} ${msg.retractedAt ? 'opacity-50' : ''}`}>
                        <Show when={msg.retractedAt} fallback={<p>{msg.content}</p>}>
                          <p class="italic text-gray-500">此訊息已收回</p>
                        </Show>
                        <span class={styles.messageTime}>{formatDateTime(msg.createdAt)}</span>
                      </div>
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
                      <div class={`${styles.messageBubble} ${styles.ownBubble} ${msg.retractedAt ? 'opacity-50' : ''}`}>
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
                  <Show when={(() => {
                    const message = messages().find(m => m.messagesId === openMenu());
                    return message && isOwnMessage(message);
                  })()}>
                    <li>
                      <a href="#"
                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => { retractMessage(openMenu()!); setOpenMenu(null); }}
                      >
                        撤回
                      </a>
                    </li>
                  </Show>
                  <li>
                    <a href="#"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => { deleteMessage(openMenu()!); setOpenMenu(null); }}
                    >
                      刪除
                    </a>
                  </li>
                </ul>
              </div>
            </Show>
          </div>

          <div class={styles.inputContainer}>
            <Show when={!wsConnected()}>
              <div class="text-xs text-red-500 mb-2">連線中...</div>
            </Show>
            <input
              type="text"
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Message..."
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
          "w-1/4": !isMd(),
          "w-2/3": isMd() && !isSm(),
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
            <span class={styles.profilePanelTitle}>Profile</span>
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
            <button
              onClick={() => deleteConversation(selectedConversation()!.conversationId)}
              class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              刪除對話
            </button>
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
    </div>
  );
}

export default ChatPage;