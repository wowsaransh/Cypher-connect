export default function FriendsList({ friends, onSelect }) {
  // Add safety check
  if (!Array.isArray(friends)) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Friends</h2>
        <div className="text-gray-500 text-sm">
          {friends === null ? "Loading friends..." : "No friends yet"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Friends ({friends.length})</h2>
      <div className="space-y-2">
        {friends.length === 0 ? (
          <div className="text-gray-500 text-sm">No friends yet. Add some!</div>
        ) : (
          friends.map(friend => (
            <div 
              key={friend._id} 
              onClick={() => onSelect(friend)}
              className="p-2 rounded cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${friend.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                {friend.username}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
