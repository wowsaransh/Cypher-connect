import { useState } from 'react';

export default function FriendSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUser = localStorage.getItem('username');

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3001/api/users?search=${encodeURIComponent(searchTerm)}&currentUser=${currentUser}`
      );
      
      if (!res.ok) throw new Error('Search failed');
      
      const data = await res.json();
      setResults(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (username) => {
    try {
      // Frontend validation for self-request
      if (currentUser.toLowerCase() === username.toLowerCase()) {
        alert("You can't send a friend request to yourself");
        return;
      }

      const response = await fetch('http://localhost:3001/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          requester: currentUser,
          recipient: username
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send request');
      }

      alert('Friend request sent successfully!');
      setResults(prev => prev.filter(user => user.username !== username));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 border-b">
      <div className="relative">
        <input
          type="text"
          placeholder="Search by username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 pl-4 pr-20 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
        />
        <button 
          onClick={searchUsers}
          disabled={loading}
          className="absolute right-2 top-2 bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      <div className="mt-4 space-y-2">
        {results.length === 0 && !loading && (
          <div className="text-gray-500 text-center">No users found</div>
        )}
        
        {results.map(user => (
          <div 
            key={user._id} 
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium">{user.username}</span>
            <button
              onClick={() => sendFriendRequest(user.username)}
              className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
