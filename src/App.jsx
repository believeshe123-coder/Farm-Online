import HudBar from './ui/HudBar';
import FarmGrid from './ui/FarmGrid';
import ShopPanel from './ui/ShopPanel';
import InventoryPanel from './ui/InventoryPanel';

export default function App() {
  return (
    <div className="app-shell">
      <HudBar />
      <main className="main-layout">
        <FarmGrid />
        <aside className="side-panels">
          <ShopPanel />
          <InventoryPanel />
        </aside>
      </main>
    </div>
  );
}
