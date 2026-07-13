export function App() {
  const dynamicColor = 'danger';
  return (
    <div className="bg-brand-500 text-white">
      <span className={`bg-${dynamicColor}-500`}>dynamic, should NOT be detected</span>
      <button className="border-gray-300 hover:bg-brand-700">Click</button>
    </div>
  );
}
