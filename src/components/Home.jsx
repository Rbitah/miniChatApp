import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

const Home = () => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, "users");
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      const allUsers = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(allUsers.filter((user) => user.id !== auth.currentUser.uid));
    };

    fetchUsers();
  }, []);

  const handleSignOut = () => {
    signOut(auth).then(() => {
      navigate("/signin");
    });
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/3 bg-gray-100 p-4 border-r border-gray-300">
        <h1 className="text-2xl font-bold mb-4">Users</h1>
        <ul>
          {users.map((user) => (
            <li key={user.id} className="mb-2">
              <button
                onClick={() => navigate(`/chat?userId=${user.id}`)}
                className="text-blue-500 hover:underline"
              >
                {user.name}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={handleSignOut} className="text-red-500 mt-4">
          Sign Out
        </button>
      </div>
      <div className="flex-1 p-4">
        <p className="text-gray-600">Select a user to start chatting.</p>
      </div>
    </div>
  );
};

export default Home;
