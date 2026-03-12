import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/gallery/add" element={<AddArtworkPage />} />
        <Route path="/gallery/:id" element={<ArtworkDetailPage />} />
        <Route path="/gallery/:id/edit" element={<EditArtworkPage />} />
        <Route path="/guides" element={<ChooseGuidePage />} />
        <Route path="/guides/:id" element={<GuideTourPage />} />
        <Route path="/guidelines" element={<GuidelinesPage />} />
        <Route path="/guidelines/add" element={<AddGuidePage />} />
        <Route path="/guidelines/:id" element={<GuideDetailPage />} />
        <Route path="/guidelines/:id/edit" element={<EditGuidePage />} />
      </Routes>
    </BrowserRouter>
  );
}
