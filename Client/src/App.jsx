import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Login from "./pages/Login";
import CryptoJS from "crypto-js";
import FriendSearch from "./components/Friendsearch";
import FriendsList from "./components/FriendsList";
import FriendRequests from "./components/FriendRequests";

const socket = io("http://127.0.0.1:3001", {
  transports: ['websocket', 'polling']
});
const SECRET_KEY = "supersecretkey123";

const encryptMessage = (message) => CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
const decryptMessage = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

function App() {
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMessages, setPrivateMessages] = useState({});
  const [friends, setFriends] = useState([]);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const [loadingFriends, setLoadingFriends] = useState(false);

  // ✅ Moved loadFriends outside useEffect
  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const res = await fetch('http://localhost:3001/api/friends', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const friendsData = await res.json();
      setFriends(Array.isArray(friendsData) ? friendsData : []);
    } catch (err) {
      console.error('Friend load error:', err);
      setFriends([]);
    }
    setLoadingFriends(false);
  };

  useEffect(() => {
    socket.on('online-users', setOnlineUsers);
    
    socket.on('message', (msg) => {
      setMessages(prev => [...prev, { ...msg, text: decryptMessage(msg.text) }]);
    });

    socket.on('private-message', (msg) => {
      const decrypted = { ...msg, text: decryptMessage(msg.text) };
      const otherUser = msg.username === username ? msg.to : msg.username;
      
      setPrivateMessages(prev => ({
        ...prev,
        [otherUser]: [...(prev[otherUser] || []), decrypted]
      }));
    });

    return () => {
      socket.off('online-users');
      socket.off('message');
      socket.off('private-message');
    };
  }, [username]);

  useEffect(() => {
    if (username) {
      socket.emit('set-online', username);

      socket.emit('get-initial-messages', (msgs) => {
        setMessages(msgs?.map(msg => ({
          ...msg,
          text: decryptMessage(msg.text)
        })) || []);
      });

      socket.emit('get-private-messages', null, (msgs) => {
        const organized = (msgs || []).reduce((acc, msg) => {
          const otherUser = msg.username === username ? msg.to : msg.username;
          return {
            ...acc,
            [otherUser]: [
              ...(acc[otherUser] || []), 
              { ...msg, text: decryptMessage(msg.text) }
            ]
          };
        }, {});
        setPrivateMessages(organized);
      });

      loadFriends(); 
    }
  }, [username]);

  const startPrivateChat = (user) => {
    setSelectedUser(user);
    socket.emit('get-private-messages', user, (msgs) => {
      setPrivateMessages(prev => ({
        ...prev,
        [user]: (msgs || []).map(msg => ({
          ...msg,
          text: decryptMessage(msg.text)
        }))
      }));
    });
  };

  const sendMessage = () => {
    if (input.trim() === "") return;
    const encrypted = encryptMessage(input);

    if (selectedUser) {
      socket.emit('private-message', { to: selectedUser, text: encrypted });
    } else {
      socket.emit("message", { text: encrypted, username });
    }

    setInput("");
  };

  const handleLogout = () => {
    localStorage.clear();
    setUsername("");
    setSelectedUser(null);
    setMessages([]);
    setPrivateMessages({});
    setFriends([]);
  };

  if (!username) {
    return <Login onLogin={setUsername} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex">
      <div className="w-64 bg-white shadow-xl border-r border-gray-200 flex flex-col">
        <div className="flex">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 p-2 text-sm ${activeTab === 'friends' ? 'bg-indigo-100 font-semibold' : 'bg-gray-50'}`}
          >
            Friends
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 p-2 text-sm ${activeTab === 'requests' ? 'bg-indigo-100 font-semibold' : 'bg-gray-50'}`}
          >
            Requests
          </button>
        </div>

        {activeTab === 'friends' ? (
          <>
            <button 
              onClick={() => setShowFriendSearch(!showFriendSearch)}
              className="p-2 bg-indigo-100 hover:bg-indigo-200 text-sm"
            >
              {showFriendSearch ? 'Hide Search' : 'Add Friends'}
            </button>
            {showFriendSearch ? (
              <FriendSearch />
            ) : (
              <FriendsList 
                friends={friends} 
                onSelect={(friend) => startPrivateChat(friend.username)}
                loading={loadingFriends}
              />
            )}
          </>
        ) : (
          
          <FriendRequests loadFriends={loadFriends} />
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white shadow-xl rounded-xl w-full max-w-2xl p-6 flex flex-col h-[90vh]">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-indigo-700">
              {selectedUser ? `🔒 Private Chat with ${selectedUser}` : "Group Chat"}
            </h1>
            {selectedUser && (
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Back to Group
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mb-4 space-y-2">
            {(selectedUser ? privateMessages[selectedUser] || [] : messages).map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.username === username ? "justify-end" : "justify-start"}`}
              >
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                  msg.username === username 
                    ? "bg-indigo-100 text-indigo-900" 
                    : "bg-gray-100 text-gray-900"
                }`}>
                  <div className="font-semibold">{msg.username}</div>
                  <div>{msg.text}</div>
                  <div className="text-xs text-gray-500 text-right mt-1">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${selectedUser || 'group'}...`}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Send
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
