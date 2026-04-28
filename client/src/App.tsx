import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PlatformProtectedRoute from "./components/PlatformProtectedRoute";
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
import PlatformPage from "./pages/PlatformPage";
import PlatformPromptsPage from "./pages/PlatformPromptsPage";
import PlatformModelsPage from "./pages/PlatformModelsPage";
import PlatformLimitsPage from "./pages/PlatformLimitsPage";
import PlatformDefaultsPage from "./pages/PlatformDefaultsPage";
import PlatformSeedContentPage from "./pages/PlatformSeedContentPage";
import PlatformAdminsPage from "./pages/PlatformAdminsPage";

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

          {/* Platform admin routes (TEMA Creative employees only) */}
          <Route path="/platform" element={<PlatformProtectedRoute><PlatformPage /></PlatformProtectedRoute>} />
          <Route path="/platform/prompts" element={<PlatformProtectedRoute><PlatformPromptsPage /></PlatformProtectedRoute>} />
          <Route path="/platform/models" element={<PlatformProtectedRoute><PlatformModelsPage /></PlatformProtectedRoute>} />
          <Route path="/platform/limits" element={<PlatformProtectedRoute><PlatformLimitsPage /></PlatformProtectedRoute>} />
          <Route path="/platform/defaults" element={<PlatformProtectedRoute><PlatformDefaultsPage /></PlatformProtectedRoute>} />
          <Route path="/platform/seed-content" element={<PlatformProtectedRoute><PlatformSeedContentPage /></PlatformProtectedRoute>} />
          <Route path="/platform/admins" element={<PlatformProtectedRoute><PlatformAdminsPage /></PlatformProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
