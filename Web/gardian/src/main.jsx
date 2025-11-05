import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import Login from "./components/Login.jsx";
import { UserProvider } from "./context/UserContext.jsx";
import "./assets/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <Routes>
          {/* Auth Pages */}
          <Route path="/login" element={<Login />} />

          {/* All app routes */}
          <Route path="/*" element={<App />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);