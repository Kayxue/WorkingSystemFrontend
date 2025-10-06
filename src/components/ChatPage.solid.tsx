import { createSignal, For, Show, createEffect, onMount } from "solid-js";
import styles from "../styles/ChatForm.module.css";

interface Message {
  id: string;
  sender: string;
  content: string;
  time: string;
  isOwn: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  avatar: string;
}

function ChatPage() {
  const [users] = createSignal<ChatUser[]>([
    { id: "1", name: "meow", avatar: "https://i.pravatar.cc/40?img=32" },
    { id: "2", name: "pcy", avatar: "https://i.pravatar.cc/40?img=12" },
    { id: "3", name: "wonu", avatar: "https://i.pravatar.cc/40?img=18" },
  ]);

  const [selectedUser, setSelectedUser] = createSignal<ChatUser | null>(users()[0]);

  const [messages, setMessages] = createSignal<Message[]>([
    { id: "1", sender: "meow", content: "test", time: "28/09/2025 12:35", isOwn: false },
    { id: "2", sender: "boss", content: "okok", time: "28/09/2025 15:17", isOwn: true },
    { id: "3", sender: "boss", content: "abcd", time: "04/10/2025 22:08", isOwn: true },
    { id: "4", sender: "meow", content: "the lazy dog\nhaha", time: "04/10/2025 22:50", isOwn: false },
    { id: "5", sender: "boss", content: "yes!", time: "04/10/2025 23:03", isOwn: true },
    { id: "6", sender: "meow", content: ":)", time: "04/10/2025 23:14", isOwn: false },
    { id: "6", sender: "meow", content: "1234", time: "05/10/2025 21:45", isOwn: false },
    { id: "6", sender: "meow", content: "hi", time: "06/10/2025 01:14", isOwn: false },
  ]);

  const [input, setInput] = createSignal("");
  const [showProfilePanel, setShowProfilePanel] = createSignal(false);
  
  // Reference to the chat messages container
  let chatMessagesRef: HTMLDivElement | undefined;

  const scrollToBottom = () => {
    if (chatMessagesRef) {
      chatMessagesRef.scrollTop = chatMessagesRef.scrollHeight;
    }
  };

  createEffect(() => {
    messages();
    setTimeout(scrollToBottom, 0);
  });

  onMount(() => {
    scrollToBottom();
  });

  const formatDateDivider = (dateString: string) => {
    const [day, month, year] = dateString.split(' ')[0].split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const shouldShowDateDivider = (currentMsg: Message, previousMsg: Message | undefined) => {
    if (!previousMsg) return true;
    const currentDate = currentMsg.time.split(' ')[0];
    const previousDate = previousMsg.time.split(' ')[0];
    return currentDate !== previousDate;
  };

  const sendMessage = () => {
    if (!input().trim()) return;
    const now = new Date();
    setMessages([
      ...messages(),
      {
        id: Date.now().toString(),
        sender: "vinnie",
        content: input(),
        time: now.toLocaleString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }).replace(',', ''),
        isOwn: true,
      },
    ]);
    setInput("");
  };

  return (
    <div class={styles.chatContainer}>
      {/* Sidebar */}
      <div class={styles.sidebar}>
        <div class={styles.sidebarHeader}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
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
          <span>Messages</span>
        </div>
        <div class={styles.sidebarList}>
          <For each={users()}>
            {(user) => (
              <div
                class={`${styles.userItem} ${selectedUser()?.id === user.id ? styles.activeUser : ""}`}
                onClick={() => setSelectedUser(user)}
              >
                <img src={user.avatar} alt={user.name} class={styles.avatar} />
                <div class={styles.userInfo}>
                  <span class={styles.userName}>{user.name}</span>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Chat Section */}
      <div class={styles.chatSection}>
        <div class={styles.chatHeader} onClick={() => setShowProfilePanel(!showProfilePanel())}>
          <div class={styles.chatUserName}>{selectedUser()?.name}</div>
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
        </div>

        <div class={styles.chatMessages} ref={chatMessagesRef}>
          <For each={messages()}>
            {(msg, index) => (
              <>
                <Show when={shouldShowDateDivider(msg, messages()[index() - 1])}>
                  <div class={styles.dateDivider}>{formatDateDivider(msg.time)}</div>
                </Show>
                <div class={`${styles.messageRow} ${msg.isOwn ? styles.ownMessage : styles.otherMessage}`}>
                  <Show when={!msg.isOwn}>
                    <img src="https://i.pravatar.cc/40?img=32" alt={msg.sender} class={styles.msgAvatar} />
                  </Show>
                  <div class={`${styles.messageBubble} ${msg.isOwn ? styles.ownBubble : styles.otherBubble}`}>
                    <p>{msg.content}</p>
                    <span class={styles.messageTime}>{msg.time}</span>
                  </div>
                  <Show when={msg.isOwn}>
                    <img src="https://i.pravatar.cc/40?img=10" alt="vinnie" class={styles.msgAvatar} />
                  </Show>
                </div>
              </>
            )}
          </For>
        </div>

        <div class={styles.inputContainer}>
          <input
            type="text"
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message..."
            class={styles.messageInput}
          />
          <button onClick={sendMessage} class={styles.sendButton}>
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

      {/* Profile Panel */}
      <div class={`${styles.profilePanel} ${showProfilePanel() ? styles.showProfile : ""}`}>
        <div class={styles.profilePanelHeader}>
          <button class={styles.closeButton} onClick={() => setShowProfilePanel(false)}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span class={styles.profilePanelTitle}>Profile</span>
        </div>
        <div class={styles.profileHeader}>
          <img src={selectedUser()?.avatar} alt={selectedUser()?.name} class={styles.profileAvatar} />
          <h2 class={styles.profileName}>{selectedUser()?.name}</h2>
          <p class={styles.profileBio}>Rating 4.5</p>
        </div>
        <div class={styles.profileContent}>
          <p class={styles.sectionValue}>Job Title</p>
          <p class={styles.sectionLabel}>Date: dd/mm/yyyy - dd/mm/yyyy</p>
          <p class={styles.sectionLabel}>Time: hh:mm - hh:mm</p>
          <p class={styles.sectionLabel}>Status: pending</p>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;