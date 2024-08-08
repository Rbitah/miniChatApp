import { createBrowserRouter } from "react-router-dom";
import Home from "./components/Home";
import ChatRoom from "./components/ChatRoom";
import Signin from "./components/Signin";
import Signup from "./components/Signup";

const router = createBrowserRouter([{
    path: "/home",
    element: <Home />,
  },
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/chat",
    element: <ChatRoom />,
  },
  {
    path: "/signin",
    element: <Signin />,
  },
  {
    path: "/signup",
    element: <Signup />,
  }, {
    path: "*",
    element: <Signin/>
  },
]);

export default router;
