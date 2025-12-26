import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import CreatePaste from './components/CreatePaste';
import ViewPaste from './components/ViewPaste';
import Privacy from './components/Privacy';
import './index.css';

// Wrapper to get ID from params
function ViewPasteWrapper() {
  const { id } = useParams<{ id: string }>();
  return id ? <ViewPaste id={id} /> : <CreatePaste />;
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CreatePaste />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/:id" element={<ViewPasteWrapper />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;