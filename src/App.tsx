import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FsmStateNode } from './components/FsmStateNode';
import { SelfLoopEdge } from './components/SelfLoopEdge';

import { example2 } from './fsm/examples';
import { exportGv } from './fsm/gvExport';
import type { FsmModel } from './fsm/model';
import './App.css';

function transitionLabel(t: FsmModel['transitions'][number]): string {
  const actions = t.mealyActions?.map((a) => `${a.target}=${a.value}`).join(',') ?? '';
  const aliases = t.actionAliases?.map((a) => `{${a}}`).join(',') ?? '';
  const rhs = [actions, aliases].filter(Boolean).join(',');
  return rhs ? `${t.condition} / ${rhs}` : t.condition;
}

function modelToFlow(model: FsmModel): { nodes: Node[]; edges: Edge[] } {
  const layout: Record<string, { x: number; y: number }> = {
    IDLE: { x: 80, y: 190 },
    READ: { x: 310, y: 70 },
    DLY: { x: 540, y: 190 },
    DONE: { x: 310, y: 330 },
  };

  const nodes: Node[] = model.states.map((s, i) => ({
    id: s.id,
    type: 'fsmState',
    position: layout[s.id] ?? {
      x: 100 + (i % 3) * 240,
      y: 100 + Math.floor(i / 3) * 180,
    },
    data: {
      label: s.id,
      isStart: Boolean(s.isStart),
    },
  }));

  const edges: Edge[] = model.transitions.map((t) => {
    const isSelfLoop = t.from === t.to;
    const label = transitionLabel(t);

    if (isSelfLoop) {
      return {
        id: t.id,
        source: t.from,
        target: t.to,
        sourceHandle: 'top-source',
        targetHandle: 'left',
        label,
        type: 'selfLoop',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.8 },
      };
    }

    if (t.from === 'READ' && t.to === 'DLY') {
      return {
        id: t.id,
        source: t.from,
        target: t.to,
        sourceHandle: 'right-source',
        targetHandle: 'left',
        label,
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 8,
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
        style: { strokeWidth: 1.8 },
      };
    }

    if (t.from === 'DLY' && t.to === 'READ') {
      return {
        id: t.id,
        source: t.from,
        target: t.to,
        sourceHandle: 'bottom-source',
        targetHandle: 'bottom',
        label,
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 8,
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
        style: { strokeWidth: 1.8 },
      };
    }

    if (t.from === 'DLY' && t.to === 'DONE') {
      return {
        id: t.id,
        source: t.from,
        target: t.to,
        sourceHandle: 'bottom-source',
        targetHandle: 'right',
        label,
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 8,
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
        style: { strokeWidth: 1.8 },
      };
    }

    if (t.from === 'DONE' && t.to === 'IDLE') {
      return {
        id: t.id,
        source: t.from,
        target: t.to,
        sourceHandle: 'left-source',
        targetHandle: 'bottom',
        label,
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 8,
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
        style: { strokeWidth: 1.8 },
      };
    }

    return {
      id: t.id,
      source: t.from,
      target: t.to,
      sourceHandle: 'right-source',
      targetHandle: 'left',
      label,
      type: 'default',
      markerEnd: { type: MarkerType.ArrowClosed },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 8,
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
      style: { strokeWidth: 1.8 },
    };
  });

  return { nodes, edges };
}

export default function App() {
  const [model] = useState<FsmModel>(example2);

  const gv = useMemo(() => exportGv(model), [model]);

  const initialFlow = useMemo(() => modelToFlow(model), [model]);

  const [nodes, , onNodesChange] = useNodesState(initialFlow.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initialFlow.edges);
  
  const nodeTypes = {
    fsmState: FsmStateNode,
  };

  const edgeTypes = {
    selfLoop: SelfLoopEdge,
  };

  return (
    <main className="page">
      <section className="panel">
        <h1>M16 FSM Editor</h1>
        <p>Visual editor for generating fsm2logisim-compatible .gv files.</p>

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

      <section className="panel canvasPanel">
        <h2>FSM Canvas</h2>
        <div className="canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </section>

      <section className="panel">
        <h2>Generated .gv</h2>
        <pre>{gv}</pre>
      </section>
    </main>
  );
}