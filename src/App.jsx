import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import Header from './components/Header/Header';
import NavBar from './components/NavBar/NavBar';
import PrivateRoute from './routes/PrivateRoute';

import Login from './pages/Login/Login';
import NovoFechamento from './pages/NovoFechamento/NovoFechamento';
import Historico from './pages/Historico/Historico';
import Deposito from './pages/Deposito/Deposito';

/**
 * Layout das telas autenticadas: Header + NavBar fixos e conteúdo.
 * A `key` no <main> reinicia a animação de entrada a cada troca de rota.
 */
function AppLayout() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <div className="app-top">
        <Header />
        <NavBar />
      </div>
      <main key={location.pathname} className="app-main page-enter">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas */}
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/fechamento" element={<NovoFechamento />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/deposito" element={<Deposito />} />
      </Route>

      {/* Redirecionamento padrão */}
      <Route path="*" element={<Navigate to="/fechamento" replace />} />
    </Routes>
  );
}
