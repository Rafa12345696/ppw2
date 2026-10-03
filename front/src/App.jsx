import { useStore } from './store';
import Home from './components/Home';
import CategoriaView from './components/CategoriaView';
import ProductoView from './components/ProductoView';
import Carrito from './components/Carrito';
import Checkout from './components/Checkout';

export default function App() {
  const pantalla = useStore((state) => state.pantalla);

  return (
    <>
      {pantalla === 'home' && <Home />}
      {pantalla === 'categoria' && <CategoriaView />}
      {pantalla === 'producto' && <ProductoView />}
      {pantalla === 'carrito' && <Carrito />}
      {pantalla === 'checkout' && <Checkout />}
    </>
  );
}