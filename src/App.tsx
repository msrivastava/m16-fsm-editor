import { useMemo } from 'react';
import { example2 } from './fsm/examples';
import { exportGv } from './fsm/gvExport';
import './App.css';

export default function App() {
  const gv = useMemo(() => exportGv(example2), []);

  return (
    <main className="page">
      <section className="panel">
        <h1>M16 FSM Editor</h1>
        <p>Static browser editor for generating fsm2logisim-compatible .gv files.</p>

        <button
          onClick={() => {
            const blob = new Blob([gv], { type: 'text/vnd.graphviz' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fsm.gv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download .gv
        </button>
      </section>

      <section className="panel">
        <h2>Generated .gv</h2>
        <pre>{gv}</pre>
      </section>
    </main>
  );
}