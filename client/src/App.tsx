import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import SetupPage from "./pages/SetupPage";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import GalleryPage from "./pages/GalleryPage";
import ArtworkDetailPage from "./pages/ArtworkDetailPage";
import AddArtworkPage from "./pages/AddArtworkPage";
import EditArtworkPage from "./pages/EditArtworkPage";
import GuidelinesPage from "./pages/GuidelinesPage";
import AddGuidePage from "./pages/AddGuidePage";
import GuideDetailPage from "./pages/GuideDetailPage";
import EditGuidePage from "./pages/EditGuidePage";
import ChooseGuidePage from "./pages/ChooseGuidePage";
import GuideTourPage from "./pages/GuideTourPage";
import PublicArtworkPage from "./pages/PublicArtworkPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Setup (authenticated but no org yet) */}
          <Route path="/setup" element={<SetupPage />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
          <Route path="/gallery/add" element={<ProtectedRoute><AddArtworkPage /></ProtectedRoute>} />
          <Route path="/gallery/:id" element={<ProtectedRoute><ArtworkDetailPage /></ProtectedRoute>} />
          <Route path="/gallery/:id/edit" element={<ProtectedRoute><EditArtworkPage /></ProtectedRoute>} />
          <Route path="/guides" element={<ProtectedRoute><ChooseGuidePage /></ProtectedRoute>} />
          <Route path="/guides/:id" element={<ProtectedRoute><GuideTourPage /></ProtectedRoute>} />
          <Route path="/artwork/:id" element={<ProtectedRoute><PublicArtworkPage /></ProtectedRoute>} />
          <Route path="/guidelines" element={<ProtectedRoute><GuidelinesPage /></ProtectedRoute>} />
          <Route path="/guidelines/add" element={<ProtectedRoute><AddGuidePage /></ProtectedRoute>} />
          <Route path="/guidelines/:id" element={<ProtectedRoute><GuideDetailPage /></ProtectedRoute>} />
          <Route path="/guidelines/:id/edit" element={<ProtectedRoute><EditGuidePage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
