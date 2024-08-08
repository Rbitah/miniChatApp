import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase'; 
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { MicrophoneIcon, StopIcon, PaperAirplaneIcon, MusicalNoteIcon } from '@heroicons/react/24/outline'; // Corrected icon import

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const userId = params.get('userId');
  const scrollRef = useRef();
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setCurrentUserName(userDoc.data().name);
        }
      } catch (error) {
        console.error("Error fetching current user: ", error);
      }
    };
    fetchCurrentUser();

    if (userId) {
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setSelectedUser(userDoc.data());
          } else {
            console.error("User not found");
          }
        } catch (error) {
          console.error("Error fetching selected user: ", error);
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

  const sendMessage = async (text = '', audioURL = '') => {
    if (text.trim() || audioURL) {
      try {
        await addDoc(collection(db, 'messages'), {
          text,
          audioURL,
          receiverId: userId,
          senderId: auth.currentUser.uid,
          timestamp: new Date(),
        });
        setMessage('');
      } catch (error) {
        console.error("Error sending message: ", error);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();

      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAndSendAudio = async () => {
    if (audioBlob) {
      try {
        const audioRef = ref(storage, `audioMessages/${new Date().toISOString()}.webm`);
        await uploadBytes(audioRef, audioBlob);
        const audioURL = await getDownloadURL(audioRef);

        await sendMessage('', audioURL); 
        setAudioBlob(null);
      } catch (error) {
        console.error("Error uploading audio: ", error);
      }
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
                  {msg.text && <p>{msg.text}</p>}
                  {msg.audioURL && (
                    <audio controls>
                      <source src={msg.audioURL} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
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
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="Type a message"
          />
          <div className="flex space-x-2 items-center">
            <button onClick={() => sendMessage(message)} className="bg-blue-500 text-white p-2 rounded-lg mt-2 flex items-center">
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
            {isRecording ? (
              <button onClick={stopRecording} className="bg-red-500 text-white p-2 rounded-lg mt-2 flex items-center">
                <StopIcon className="h-5 w-5" />
              </button>
            ) : (
              <button onClick={startRecording} className="bg-green-500 text-white p-2 rounded-lg mt-2 flex items-center">
                <MicrophoneIcon className="h-5 w-5" />
              </button>
            )}
            {audioBlob && !isRecording && (
              <button onClick={uploadAndSendAudio} className="bg-yellow-500 text-white p-2 rounded-lg mt-2 flex items-center">
                <MusicalNoteIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
