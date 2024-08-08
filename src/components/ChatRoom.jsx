import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaMicrophone, FaStop } from 'react-icons/fa';

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const userId = params.get('userId');
  const scrollRef = useRef();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setCurrentUserName(userDoc.data().name);
      }
    };
    fetchCurrentUser();

    if (userId) {
      const fetchUser = async () => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setSelectedUser(userDoc.data());
        } else {
          console.error("User not found");
        }
      };
      fetchUser();

      const q = query(
        collection(db, 'messages'),
        where('receiverId', 'in', [userId, auth.currentUser.uid]),
        where('senderId', 'in', [userId, auth.currentUser.uid]),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs = [];
        querySnapshot.forEach((doc) => {
          msgs.push(doc.data());
        });
        setMessages(msgs);
      });

      return () => unsubscribe();
    }
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const recorder = new MediaRecorder(stream);
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);

        const audioChunks = [];
        recorder.ondataavailable = event => {
          audioChunks.push(event.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
          setAudioBlob(audioBlob);
          setIsRecording(false);
        };
      })
      .catch(err => console.error("Error accessing media devices.", err));
  };

  const stopRecording = async () => {
    if (mediaRecorder) {
      mediaRecorder.stop();

      const audioRef = ref(storage, `voiceNotes/${Date.now()}_${auth.currentUser.uid}.mp3`);
      await uploadBytes(audioRef, audioBlob);

      const audioURL = await getDownloadURL(audioRef);
      await addDoc(collection(db, 'messages'), {
        audio: audioURL,
        receiverId: userId,
        senderId: auth.currentUser.uid,
        timestamp: new Date(),
      });

      setAudioBlob(null);
    }
  };

  const sendMessage = async () => {
    if (message.trim()) {
      await addDoc(collection(db, 'messages'), {
        text: message,
        receiverId: userId,
        senderId: auth.currentUser.uid,
        timestamp: new Date(),
      });
      setMessage('');
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/3 bg-gray-200 p-4 border-r border-gray-300">
        {selectedUser ? (
          <div>
            <h2 className="text-xl font-bold mb-4">Chat with {selectedUser.name}</h2>
            <p className="text-gray-600">Email: {selectedUser.email}</p>
            <button onClick={() => navigate('/')} className="text-blue-500 hover:underline mt-2">
              Back to all users
            </button>
          </div>
        ) : (
          <p className="text-gray-600">Select a user to start chatting.</p>
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 flex ${msg.senderId === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-2 rounded-lg ${msg.senderId === auth.currentUser.uid ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}
                >
                  <p className="font-semibold">
                    {msg.senderId === auth.currentUser.uid ? currentUserName : selectedUser?.name}
                  </p>
                  {msg.text ? (
                    <p>{msg.text}</p>
                  ) : (
                    <audio controls src={msg.audio} />
                  )}
                  <small className="text-xs text-gray-500">{new Date(msg.timestamp.toDate()).toLocaleTimeString()}</small>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No messages yet.</p>
          )}
          <div ref={scrollRef} />
        </div>
        <div className="p-4 border-t border-gray-300 bg-white">
          <div className="flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="Type a message"
            />
            <button onClick={sendMessage} className="bg-blue-500 text-white p-2 rounded-lg ml-2">
              Send
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className="ml-2 p-2 rounded-lg"
            >
              {isRecording ? <FaStop className="text-red-500" /> : <FaMicrophone className="text-green-500" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
