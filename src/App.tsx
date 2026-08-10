import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Search from './pages/Search'
import NotFound from './pages/NotFound'
import ProtectedRoute from './auth/ProtectedRoute'
import PageFallback from './components/PageFallback'

// 路由级代码分割：非首屏页面按需加载，显著减小首屏 JS 体积
const NewPost = lazy(() => import('./pages/NewPost'))
const EditPost = lazy(() => import('./pages/EditPost'))
const Mailbox = lazy(() => import('./pages/Mailbox'))
const NewMessage = lazy(() => import('./pages/NewMessage'))
const MessageDetail = lazy(() => import('./pages/MessageDetail'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Admin = lazy(() => import('./pages/Admin'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Drafts = lazy(() => import('./pages/Drafts'))
const Promote = lazy(() => import('./pages/Promote'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const Settings = lazy(() => import('./pages/Settings'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Security = lazy(() => import('./pages/Security'))
const GithubCallback = lazy(() => import('./pages/GithubCallback'))
const OAuthSetup = lazy(() => import('./pages/OAuthSetup'))
const BugReport = lazy(() => import('./pages/BugReport'))
const Customize = lazy(() => import('./pages/Customize'))
const Archives = lazy(() => import('./pages/Archives'))
const TagPage = lazy(() => import('./pages/Tag'))
const History = lazy(() => import('./pages/History'))
const SeriesList = lazy(() => import('./pages/SeriesList'))
const SeriesDetail = lazy(() => import('./pages/SeriesDetail'))
const SeriesManage = lazy(() => import('./pages/SeriesManage'))
const Links = lazy(() => import('./pages/Links'))
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'))
const SharedPost = lazy(() => import('./pages/SharedPost'))
const FollowingFeed = lazy(() => import('./pages/FollowingFeed'))

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:slug" element={<PostDetail />} />
          <Route path="/share/:token" element={<SharedPost />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<Search />} />
          <Route path="/archives" element={<Archives />} />
          <Route path="/tag/:tag" element={<TagPage />} />
          <Route path="/history" element={<History />} />
          <Route path="/series" element={<SeriesList />} />
          <Route path="/series/:slug" element={<SeriesDetail />} />
          <Route
            path="/series/manage"
            element={
              <ProtectedRoute>
                <SeriesManage />
              </ProtectedRoute>
            }
          />
          <Route path="/links" element={<Links />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
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
          <Route
            path="/drafts"
            element={
              <ProtectedRoute>
                <Drafts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <Security />
              </ProtectedRoute>
            }
          />
          <Route
            path="/following"
            element={
              <ProtectedRoute>
                <FollowingFeed />
              </ProtectedRoute>
            }
          />
          <Route path="/promote" element={<Promote />} />
          <Route path="/bug-report" element={<BugReport />} />
          <Route path="/github-callback" element={<GithubCallback />} />
          <Route
            path="/oauth-setup"
            element={
              <ProtectedRoute>
                <OAuthSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customize"
            element={
              <ProtectedRoute>
                <Customize />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute requireRole="admin">
                <Analytics />
              </ProtectedRoute>
            }
          />
          {/* User profile — must be LAST to avoid shadowing fixed routes */}
          <Route path="/:username" element={<UserProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
