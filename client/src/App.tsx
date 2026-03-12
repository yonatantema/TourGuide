import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import GalleryPage from "./pages/GalleryPage";
import ArtworkDetailPage from "./pages/ArtworkDetailPage";
import AddArtworkPage from "./pages/AddArtworkPage";
import EditArtworkPage from "./pages/EditArtworkPage";
import GuidelinesPage from "./pages/GuidelinesPage";

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
        <Route path="/guidelines" element={<GuidelinesPage />} />
      </Routes>
    </BrowserRouter>
  );
}
