import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import dagre from 'dagre';

import { FsmStateNode } from './components/FsmStateNode';
import { SelfLoopEdge } from './components/SelfLoopEdge';
import { FsmTransitionEdge } from './components/FsmTransitionEdge';

import { example2 } from './fsm/examples';
import { exportGv } from './fsm/gvExport';
import type { FsmModel } from './fsm/model';
import './App.css';

const NODE_WIDTH = 96;
const NODE_HEIGHT = 96;

type Point = { x: number; y: number };
type Side = 'right' | 'left' | 'bottom' | 'top';

type FlowHandleChoice = {
  sourceHandle: string;
  targetHandle: string;
};

function transitionLabel(t: FsmModel['transitions'][number]): string {
  const actions = t.mealyActions?.map((a) => `${a.target}=${a.value}`).join(',') ?? '';
  const aliases = t.actionAliases?.map((a) => `{${a}}`).join(',') ?? '';
  const rhs = [actions, aliases].filter(Boolean).join(',');
  return rhs ? `${t.condition} / ${rhs}` : t.condition;
}

function computeDagreLayout(model: FsmModel): Record<string, Point> {
  const graph = new dagre.graphlib.Graph();

  graph.setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: 'LR',
    nodesep: 80,
    ranksep: 140,
    marginx: 40,
    marginy: 40,
  });

  for (const state of model.states) {
    graph.setNode(state.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  for (const transition of model.transitions) {
    if (transition.from !== transition.to) {
      graph.setEdge(transition.from, transition.to);
    }
  }

  dagre.layout(graph);

  const result: Record<string, Point> = {};

  for (const state of model.states) {
    const node = graph.node(state.id);
    result[state.id] = {
      x: node.x - NODE_WIDTH / 2,
      y: node.y - NODE_HEIGHT / 2,
    };
  }

  return result;
}

function sideBetween(fromPos: Point, toPos: Point): Side {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }

  return dy >= 0 ? 'bottom' : 'top';
}

function oppositeSide(side: Side): Side {
  switch (side) {
    case 'right':
      return 'left';
    case 'left':
      return 'right';
    case 'bottom':
      return 'top';
    case 'top':
      return 'bottom';
  }
}

const sourceHandlesBySide: Record<Side, string[]> = {
  right: ['right-upper-source', 'right-source', 'right-lower-source'],
  left: ['left-upper-source', 'left-source', 'left-lower-source'],
  top: ['top-left-source', 'top-source', 'top-right-source'],
  bottom: ['bottom-left-source', 'bottom-source', 'bottom-right-source'],
};

const targetHandlesBySide: Record<Side, string[]> = {
  right: ['right-upper', 'right', 'right-lower'],
  left: ['left-upper', 'left', 'left-lower'],
  top: ['top-left', 'top', 'top-right'],
  bottom: ['bottom-left', 'bottom', 'bottom-right'],
};

function allocateHandles(
  model: FsmModel,
  layout: Record<string, Point>
): Record<string, FlowHandleChoice> {
  const result: Record<string, FlowHandleChoice> = {};

  // Shared physical occupancy: source and target handles on the same side
  // of the same node compete for the same visual slots.
  const used: Record<string, Set<number>> = {};

  function physicalKey(nodeId: string, side: Side): string {
    return `${nodeId}:${side}`;
  }

  function reserveSlot(nodeId: string, side: Side, preferred: number): number {
    const key = physicalKey(nodeId, side);
    if (!used[key]) used[key] = new Set<number>();

    const order = [preferred, 1, 0, 2];

    for (const candidate of order) {
      if (!used[key].has(candidate)) {
        used[key].add(candidate);
        return candidate;
      }
    }

    // More than three edges on this side: reuse cyclically.
    const fallback = used[key].size % 3;
    used[key].add(fallback);
    return fallback;
  }

  function sourceHandle(side: Side, slot: number): string {
    return sourceHandlesBySide[side][slot];
  }

  function targetHandle(side: Side, slot: number): string {
    return targetHandlesBySide[side][slot];
  }

  function pairKey(a: string, b: string): string {
    return a < b ? `${a}::${b}` : `${b}::${a}`;
  }

  const nonSelfTransitions = model.transitions.filter((t) => t.from !== t.to);

  const pairCounts: Record<string, number> = {};
  for (const t of nonSelfTransitions) {
    const key = pairKey(t.from, t.to);
    pairCounts[key] = (pairCounts[key] ?? 0) + 1;
  }

  const pairSeen: Record<string, number> = {};

  for (const t of nonSelfTransitions) {
    const sourceSide = sideBetween(layout[t.from], layout[t.to]);
    const targetSide = oppositeSide(sourceSide);

    const key = pairKey(t.from, t.to);
    const localIndex = pairSeen[key] ?? 0;
    pairSeen[key] = localIndex + 1;

    // For reverse/bidirectional pairs, deliberately choose different
    // physical slots so the two curves do not sit on top of each other.
    let preferredSlot = 1; // center by default
    if (pairCounts[key] > 1) {
      preferredSlot = localIndex % 2 === 0 ? 0 : 2; // upper/lower or left/right
    }

    const sourceSlot = reserveSlot(t.from, sourceSide, preferredSlot);
    const targetSlot = reserveSlot(t.to, targetSide, preferredSlot);

    result[t.id] = {
      sourceHandle: sourceHandle(sourceSide, sourceSlot),
      targetHandle: targetHandle(targetSide, targetSlot),
    };
  }

  return result;
}

function actionsToText(actions: FsmModel['transitions'][number]['mealyActions']): string {
  return (actions ?? []).map((a) => `${a.target}=${a.value}`).join(',');
}

function parseActionsText(text: string): FsmModel['transitions'][number]['mealyActions'] {
  const trimmed = text.trim();

  if (!trimmed) return [];

  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const pieces = part.split('=').map((x) => x.trim());

      if (pieces.length !== 2) {
        throw new Error(`Invalid action "${part}". Use signal=0 or signal=1.`);
      }

      const [target, rawValue] = pieces;

      if (!target) {
        throw new Error(`Invalid action "${part}". Missing signal name.`);
      }

      if (!['0', '1', 'x', '-', 'd'].includes(rawValue)) {
        throw new Error(`Invalid value "${rawValue}". Use 0, 1, x, -, or d.`);
      }

      return {
        target,
        value: rawValue === '0' || rawValue === '1' ? Number(rawValue) as 0 | 1 : rawValue as 'x' | '-' | 'd',
      };
    });
}

function updateTransition(
  model: FsmModel,
  transitionId: string,
  patch: Partial<FsmModel['transitions'][number]>
): FsmModel {
  return {
    ...model,
    transitions: model.transitions.map((t) =>
      t.id === transitionId ? { ...t, ...patch } : t
    ),
  };
}

function modelToFlow(model: FsmModel): { nodes: Node[]; edges: Edge[] } {
  const layout = computeDagreLayout(model);
  const handleChoices = allocateHandles(model, layout);

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
    const label = transitionLabel(t);

    if (t.from === t.to) {
      return {
        id: t.id,
        source: t.from,
        target: t.to,
        sourceHandle: 'top-source',
        targetHandle: 'top',
        label,
        type: 'selfLoop',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.8 },
      };
    }

    const handles = handleChoices[t.id];

    return {
      id: t.id,
      source: t.from,
      target: t.to,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label,
      type: 'fsmTransition',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        strokeWidth: 1.8,
      },
    };
  });

  return { nodes, edges };
}

export default function App() {
  const [model, setModel] = useState<FsmModel>(example2);

  const gv = useMemo(() => exportGv(model), [model]);
  const initialFlow = useMemo(() => modelToFlow(model), [model]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges);

  useEffect(() => {
    const flow = modelToFlow(model);

    setNodes((currentNodes) =>
      flow.nodes.map((newNode) => {
        const existing = currentNodes.find((n) => n.id === newNode.id);
        return existing
          ? { ...newNode, position: existing.position }
          : newNode;
      })
    );

    setEdges(flow.edges);
  }, [model, setNodes, setEdges]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'node' | 'edge' | null>(null);

  const selectedNode = selectedKind === 'node'
    ? model.states.find((s) => s.id === selectedId)
    : undefined;

  const selectedEdge = selectedKind === 'edge'
    ? model.transitions.find((t) => t.id === selectedId)
    : undefined;

  const [actionEditError, setActionEditError] = useState<string | null>(null);

  const nodeTypes = useMemo(
    () => ({
      fsmState: FsmStateNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      selfLoop: SelfLoopEdge,
      fsmTransition: FsmTransitionEdge,
    }),
    []
  );

  const [actionsDraft, setActionsDraft] = useState('');

  useEffect(() => {
    if (selectedEdge) {
      setActionsDraft(actionsToText(selectedEdge.mealyActions));
      setActionEditError(null);
    }
  }, [selectedEdge?.id]);

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
            onNodeClick={(_, node) => {
              setSelectedKind('node');
              setSelectedId(node.id);
            }}
            onEdgeClick={(_, edge) => {
              setSelectedKind('edge');
              setSelectedId(edge.id);
            }}
            onPaneClick={() => {
              setSelectedKind(null);
              setSelectedId(null);
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </section>

      <section className="panel inspectorPanel">
        <h2>Inspector</h2>

        {!selectedKind && (
          <p className="muted">Click a state or transition to inspect it.</p>
        )}

        {selectedNode && (
          <div className="inspectorGrid">
            <div className="fieldLabel">Type</div>
            <div>State</div>

            <div className="fieldLabel">Name</div>
            <div>{selectedNode.id}</div>

            <div className="fieldLabel">Start state</div>
            <div>{selectedNode.isStart ? 'Yes' : 'No'}</div>

            <div className="fieldLabel">Moore actions</div>
            <div>
              {(selectedNode.mooreActions ?? []).length > 0
                ? selectedNode.mooreActions?.map((a) => `${a.target}=${a.value}`).join(', ')
                : 'None'}
            </div>
          </div>
        )}

        {selectedEdge && (
          <div className="inspectorGrid">
            <div className="fieldLabel">Type</div>
            <div>Transition</div>

            <div className="fieldLabel">From</div>
            <div>{selectedEdge.from}</div>

            <div className="fieldLabel">To</div>
            <div>{selectedEdge.to}</div>

            <label className="fieldLabel" htmlFor="conditionInput">
              Condition
            </label>
            <input
              id="conditionInput"
              className="textInput"
              value={selectedEdge.condition}
              onChange={(e) => {
                setModel((current) =>
                  updateTransition(current, selectedEdge.id, {
                    condition: e.target.value,
                  })
                );
              }}
            />

            <label className="fieldLabel" htmlFor="actionsInput">
              Mealy actions
            </label>
            <input
              id="actionsInput"
              className="textInput"
              value={actionsDraft}
              placeholder="rd=1,ds=0"
              onChange={(e) => {
                const text = e.target.value;
                setActionsDraft(text);

                try {
                  const parsed = parseActionsText(text);
                  setActionEditError(null);
                  setModel((current) =>
                    updateTransition(current, selectedEdge.id, {
                      mealyActions: parsed,
                    })
                  );
                } catch (err) {
                  setActionEditError(err instanceof Error ? err.message : 'Invalid action list.');
                }
              }}
            />

            {actionEditError && (
              <>
                <div />
                <div className="errorText">{actionEditError}</div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Generated .gv</h2>
        <pre>{gv}</pre>
      </section>
    </main>
  );
}