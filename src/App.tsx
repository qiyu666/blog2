import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import NewPost from './pages/NewPost';
import EditPost from './pages/EditPost';
import Login from './pages/Login';
import Register from './pages/Register';
import Mailbox from './pages/Mailbox';
import NewMessage from './pages/NewMessage';
import MessageDetail from './pages/MessageDetail';
import Favorites from './pages/Favorites';
import Admin from './pages/Admin';
import Promote from './pages/Promote';
import UserProfile from './pages/UserProfile';
import Settings from './pages/Settings';
import ProtectedRoute from './auth/ProtectedRoute';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:slug" element={<PostDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/new"
          element={
            <ProtectedRoute>
              <NewPost />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <EditPost />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mailbox"
          element={
            <ProtectedRoute>
              <Mailbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mailbox/new"
          element={
            <ProtectedRoute>
              <NewMessage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mailbox/:id"
          element={
            <ProtectedRoute>
              <MessageDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route path="/promote" element={<Promote />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        {/* User profile — must be LAST to avoid shadowing fixed routes */}
        <Route path="/:username" element={<UserProfile />} />
      </Routes>
    </Layout>
  );
}
