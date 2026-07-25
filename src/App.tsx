import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import NewPost from './pages/NewPost'
import EditPost from './pages/EditPost'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:slug" element={<PostDetail />} />
        <Route path="/new" element={<NewPost />} />
        <Route path="/edit/:id" element={<EditPost />} />
      </Routes>
    </Layout>
  )
}
