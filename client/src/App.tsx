import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GalleryPage from "./pages/GalleryPage";
import ArtworkDetailPage from "./pages/ArtworkDetailPage";
import AddArtworkPage from "./pages/AddArtworkPage";
import EditArtworkPage from "./pages/EditArtworkPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/gallery/add" element={<AddArtworkPage />} />
        <Route path="/gallery/:id" element={<ArtworkDetailPage />} />
        <Route path="/gallery/:id/edit" element={<EditArtworkPage />} />
      </Routes>
    </BrowserRouter>
  );
}
