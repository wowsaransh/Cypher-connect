import { useEffect, useState } from 'react';

export default function FriendRequests({ loadFriends }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/friends/requests', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load requests');
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (requestId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/friends/requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      await fetchRequests();        // Refresh requests
      loadFriends();                // Refresh friends
    } catch (err) {
      console.error('Accept failed:', err);
    }
  };

  const handleReject = async (requestId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/friends/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      await fetchRequests();        // Refresh requests only
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  if (loading) return <div className="p-4">Loading friend requests...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (requests.length === 0) return <div className="p-4 text-gray-500">No pending requests.</div>;

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {requests.map((req) => (
        <div key={req._id} className="flex justify-between items-center bg-gray-50 border p-3 rounded-lg">
          <span className="font-medium text-gray-800">
            {req?.requester?.username || 'Unknown User'}
          </span>
          <div className="space-x-2">
            <button
              onClick={() => handleAccept(req._id)}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
            >
              Accept
            </button>
            <button
              onClick={() => handleReject(req._id)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
