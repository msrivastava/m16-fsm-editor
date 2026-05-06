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
  const actions = actionsToText(t.mealyActions, t.friendlyMealyActions);
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

function actionsToText(
  actions: FsmModel['transitions'][number]['mealyActions'],
  friendlyText?: string
): string {
  return friendlyText ?? (actions ?? []).map((a) => `${a.target}=${a.value}`).join(',');
}

function findSignalWidth(model: FsmModel, signalName: string): number | undefined {
  const signal = [...model.inputs, ...model.outputs].find((s) => s.name === signalName);
  return signal?.width;
}

function parseConstant(raw: string, width?: number): number {
  const text = raw.trim().replaceAll('_', '');

  let value: number;

  const sizedBinary = text.match(/^(\d+)'b([01]+)$/i);
  const sizedHex = text.match(/^(\d+)'h([0-9a-f]+)$/i);

  if (sizedBinary) {
    value = parseInt(sizedBinary[2], 2);
  } else if (sizedHex) {
    value = parseInt(sizedHex[2], 16);
  } else if (/^0b[01]+$/i.test(text)) {
    value = parseInt(text.slice(2), 2);
  } else if (/^0x[0-9a-f]+$/i.test(text)) {
    value = parseInt(text.slice(2), 16);
  } else if (/^\d+$/.test(text)) {
    value = parseInt(text, 10);
  } else {
    throw new Error(`Invalid constant "${raw}".`);
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid constant "${raw}".`);
  }

  if (width !== undefined && value >= 2 ** width) {
    throw new Error(`Constant "${raw}" does not fit in ${width} bit(s).`);
  }

  return value;
}

function expandCondition(condition: string, model: FsmModel): string {
  const comparisonRegex =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*((?:\d+'[bBhH][0-9a-fA-F_]+)|(?:0b[01_]+)|(?:0x[0-9a-fA-F_]+)|(?:\d+))/g;

  return condition.replace(comparisonRegex, (_match, name, op, rawConst) => {
    const width = findSignalWidth(model, name);

    if (!width || width === 1) {
      throw new Error(`Signal "${name}" is not declared as multibit.`);
    }

    const value = parseConstant(rawConst, width);

    const bitTerms: string[] = [];

    for (let i = 0; i < width; i += 1) {
      const bit = (value >> i) & 1;
      bitTerms.push(bit ? `${name}[${i}]` : `~${name}[${i}]`);
    }

    const equality = bitTerms.length === 1
      ? bitTerms[0]
      : `(${bitTerms.join('&')})`;

    return op === '==' ? equality : `~${equality}`;
  });
}

function parseActionsText(
  text: string,
  model?: FsmModel
): FsmModel['transitions'][number]['mealyActions'] {
  const trimmed = text.trim();

  if (!trimmed) return [];

  const actions: FsmModel['transitions'][number]['mealyActions'] = [];

  for (const part of trimmed.split(',').map((x) => x.trim()).filter(Boolean)) {
    const pieces = part.split('=').map((x) => x.trim());

    if (pieces.length !== 2) {
      throw new Error(`Invalid action "${part}". Use signal=0 or signal=1.`);
    }

    const [target, rawValue] = pieces;

    const targetMatch = target.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?$/);
    if (!targetMatch) {
      throw new Error(`Invalid action target "${target}".`);
    }

    const baseName = targetMatch[1];
    const bitIndexText = targetMatch[2];

    if (bitIndexText !== undefined) {
      if (!['0', '1', 'x', '-', 'd'].includes(rawValue)) {
        throw new Error(`Invalid bit value "${rawValue}". Use 0, 1, x, -, or d.`);
      }

      actions.push({
        target,
        value: rawValue === '0' || rawValue === '1'
          ? Number(rawValue) as 0 | 1
          : rawValue as 'x' | '-' | 'd',
      });

      continue;
    }

    if (['0', '1', 'x', '-', 'd'].includes(rawValue)) {
      actions.push({
        target,
        value: rawValue === '0' || rawValue === '1'
          ? Number(rawValue) as 0 | 1
          : rawValue as 'x' | '-' | 'd',
      });

      continue;
    }

    if (!model) {
      throw new Error(`Multibit assignment "${part}" needs signal declarations.`);
    }

    const width = findSignalWidth(model, baseName);

    if (!width || width === 1) {
      throw new Error(`Signal "${baseName}" is not declared as multibit.`);
    }

    const value = parseConstant(rawValue, width);

    for (let i = 0; i < width; i += 1) {
      actions.push({
        target: `${baseName}[${i}]`,
        value: ((value >> i) & 1) as 0 | 1,
      });
    }
  }

  return actions;
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

function updateState(
  model: FsmModel,
  stateId: string,
  patch: Partial<FsmModel['states'][number]>
): FsmModel {
  return {
    ...model,
    states: model.states.map((s) =>
      s.id === stateId ? { ...s, ...patch } : s
    ),
  };
}

function renameState(model: FsmModel, oldId: string, newId: string): FsmModel {
  const clean = newId.trim();

  if (!clean || clean === oldId) return model;

  if (model.states.some((s) => s.id === clean)) {
    throw new Error(`State "${clean}" already exists.`);
  }

  return {
    ...model,
    states: model.states.map((s) =>
      s.id === oldId ? { ...s, id: clean } : s
    ),
    transitions: model.transitions.map((t) => ({
      ...t,
      from: t.from === oldId ? clean : t.from,
      to: t.to === oldId ? clean : t.to,
    })),
  };
}

function setStartState(model: FsmModel, stateId: string): FsmModel {
  return {
    ...model,
    states: model.states.map((s) => ({
      ...s,
      isStart: s.id === stateId,
    })),
  };
}

function nextUniqueStateId(model: FsmModel): string {
  let i = model.states.length;
  while (model.states.some((s) => s.id === `S${i}`)) i += 1;
  return `S${i}`;
}

function nextUniqueTransitionId(model: FsmModel): string {
  let i = model.transitions.length;
  while (model.transitions.some((t) => t.id === `t${i}`)) i += 1;
  return `t${i}`;
}

function addState(model: FsmModel): FsmModel {
  const id = nextUniqueStateId(model);

  return {
    ...model,
    states: [
      ...model.states,
      {
        id,
        isStart: model.states.length === 0,
        mooreActions: [],
      },
    ],
  };
}

function deleteState(model: FsmModel, stateId: string): FsmModel {
  if (model.states.length <= 1) {
    throw new Error('FSM must have at least one state.');
  }

  const deleted = model.states.find((s) => s.id === stateId);
  const remaining = model.states.filter((s) => s.id !== stateId);

  if (deleted?.isStart && remaining.length > 0) {
    remaining[0] = { ...remaining[0], isStart: true };
  }

  return {
    ...model,
    states: remaining,
    transitions: model.transitions.filter(
      (t) => t.from !== stateId && t.to !== stateId
    ),
  };
}

function addTransition(model: FsmModel, from: string, to: string): FsmModel {
  const id = nextUniqueTransitionId(model);

  return {
    ...model,
    transitions: [
      ...model.transitions,
      {
        id,
        from,
        to,
        condition: '*',
        mealyActions: [],
      },
    ],
  };
}

function deleteTransition(model: FsmModel, transitionId: string): FsmModel {
  return {
    ...model,
    transitions: model.transitions.filter((t) => t.id !== transitionId),
  };
}

function signalToText(signals: FsmModel['inputs']): string {
  return signals.map((s) => (s.width === 1 ? s.name : `${s.name}[${s.width}]`)).join(',');
}

function parseSignalsText(text: string): FsmModel['inputs'] {
  return text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?$/);
      if (!match) {
        throw new Error(`Invalid signal declaration "${part}". Use x or x[4].`);
      }

      const width = match[2] ? Number(match[2]) : 1;

      if (!Number.isInteger(width) || width < 1) {
        throw new Error(`Invalid width in "${part}".`);
      }

      return {
        name: match[1],
        width,
      };
    });
}

function updateSignals(
  model: FsmModel,
  kind: 'inputs' | 'outputs',
  signals: FsmModel['inputs']
): FsmModel {
  return {
    ...model,
    [kind]: signals,
  };
}

function modelToFlow(
  model: FsmModel,
  selectedKind?: 'node' | 'edge' | null,
  selectedId?: string | null
): { nodes: Node[]; edges: Edge[] } {
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
      mooreActions: actionsToText(s.mooreActions, s.friendlyMooreActions),
      selected: selectedKind === 'node' && selectedId === s.id,
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
        style: {
          strokeWidth: selectedKind === 'edge' && selectedId === t.id ? 3.2 : 1.8,
          stroke: selectedKind === 'edge' && selectedId === t.id ? '#007aff' : undefined,
        },
        selected: selectedKind === 'edge' && selectedId === t.id,
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
        strokeWidth: selectedKind === 'edge' && selectedId === t.id ? 3.2 : 1.8,
        stroke: selectedKind === 'edge' && selectedId === t.id ? '#007aff' : undefined,
      },
      selected: selectedKind === 'edge' && selectedId === t.id,
    };
  });

  return { nodes, edges };
}

export default function App() {
  const [model, setModelRaw] = useState<FsmModel>(example2);
  const [undoModel, setUndoModel] = useState<FsmModel | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'node' | 'edge' | null>(null);

  function commitModel(update: FsmModel | ((current: FsmModel) => FsmModel)) {
    setModelRaw((current) => {
      const next = typeof update === 'function'
        ? (update as (current: FsmModel) => FsmModel)(current)
        : update;

      setUndoModel(current);
      return next;
    });
  }

  function modelForGvExport(model: FsmModel): FsmModel {
    return {
      ...model,
      states: model.states.map((s) => ({
        ...s,
        mooreActions: s.friendlyMooreActions !== undefined
          ? parseActionsText(s.friendlyMooreActions, model)
          : s.mooreActions,
        friendlyMooreActions: undefined,
      })),
      transitions: model.transitions.map((t) => ({
        ...t,
        condition: expandCondition(t.condition, model),
        mealyActions: t.friendlyMealyActions !== undefined
          ? parseActionsText(t.friendlyMealyActions, model)
          : t.mealyActions,
        friendlyMealyActions: undefined,
      })),
    };
  }

  const gv = useMemo(() => exportGv(modelForGvExport(model)), [model]);

  const initialFlow = useMemo(
    () => modelToFlow(model, selectedKind, selectedId),
    [model, selectedKind, selectedId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges);

  useEffect(() => {
    const flow = modelToFlow(model, selectedKind, selectedId);

    setNodes((currentNodes) =>
      flow.nodes.map((newNode) => {
        const existing = currentNodes.find((n) => n.id === newNode.id);
        return existing
          ? { ...newNode, position: existing.position }
          : newNode;
      })
    );

    setEdges(flow.edges);
  }, [model, selectedKind, selectedId, setNodes, setEdges]);

  const selectedNode = selectedKind === 'node'
    ? model.states.find((s) => s.id === selectedId)
    : undefined;

  const selectedEdge = selectedKind === 'edge'
    ? model.transitions.find((t) => t.id === selectedId)
    : undefined;

  const [actionEditError, setActionEditError] = useState<string | null>(null);
  const [actionsDraft, setActionsDraft] = useState('');

  useEffect(() => {
    if (selectedEdge) {
      setActionsDraft(actionsToText(selectedEdge.mealyActions, selectedEdge.friendlyMealyActions));
      setActionEditError(null);
    }
  }, [selectedEdge?.id]);

  const [stateNameDraft, setStateNameDraft] = useState('');
  const [stateMooreDraft, setStateMooreDraft] = useState('');
  const [stateEditError, setStateEditError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedNode) {
      setStateNameDraft(selectedNode.id);
      setStateMooreDraft(actionsToText(selectedNode.mooreActions, selectedNode.friendlyMooreActions));
      setStateEditError(null);
    }
  }, [selectedNode?.id]);

  const [inputsDraft, setInputsDraft] = useState(signalToText(model.inputs));
  const [outputsDraft, setOutputsDraft] = useState(signalToText(model.outputs));
  const [signalEditError, setSignalEditError] = useState<string | null>(null);

  useEffect(() => {
    setInputsDraft(signalToText(model.inputs));
    setOutputsDraft(signalToText(model.outputs));
  }, [model.inputs, model.outputs]);

  const [newTransitionFrom, setNewTransitionFrom] = useState('');
  const [newTransitionTo, setNewTransitionTo] = useState('');
  const [structureEditError, setStructureEditError] = useState<string | null>(null);

  useEffect(() => {
    if (model.states.length > 0) {
      setNewTransitionFrom((current) => current || model.states[0].id);
      setNewTransitionTo((current) => current || model.states[0].id);
    }
  }, [model.states]);

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

  return (
    <main className="page">
      <section className="panel">
        <h1>M16 FSM Editor</h1>
        <p>Visual editor for generating fsm2logisim-compatible .gv files.</p>

        <div className="structureRow">
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

          <button
            disabled={!undoModel}
            onClick={() => {
              if (!undoModel) return;
              setModelRaw(undoModel);
              setUndoModel(null);
              setSelectedKind(null);
              setSelectedId(null);
            }}
          >
            Undo
          </button>
        </div>
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

      <section className="panel signalPanel">
        <h2>Signals</h2>

        <div className="inspectorGrid">
          <label className="fieldLabel" htmlFor="inputsInput">
            Inputs
          </label>
          <input
            id="inputsInput"
            className="textInput"
            value={inputsDraft}
            placeholder="go,ws,x[2]"
            onChange={(e) => {
              setInputsDraft(e.target.value);
              setSignalEditError(null);
            }}
            onBlur={() => {
              try {
                const parsed = parseSignalsText(inputsDraft);
                setSignalEditError(null);
                commitModel((current) => updateSignals(current, 'inputs', parsed));
              } catch (err) {
                setSignalEditError(err instanceof Error ? err.message : 'Invalid input list.');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
          />
          <label className="fieldLabel" htmlFor="outputsInput">
            Outputs
          </label>
          <input
            id="outputsInput"
            className="textInput"
            value={outputsDraft}
            placeholder="rd,ds,y[2]"
            onChange={(e) => {
              setOutputsDraft(e.target.value);
              setSignalEditError(null);
            }}
            onBlur={() => {
              try {
                const parsed = parseSignalsText(outputsDraft);
                setSignalEditError(null);
                commitModel((current) => updateSignals(current, 'outputs', parsed));
              } catch (err) {
                setSignalEditError(err instanceof Error ? err.message : 'Invalid output list.');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
          />

          {signalEditError && (
            <>
              <div />
              <div className="errorText">{signalEditError}</div>
            </>
          )}
        </div>
      </section>

      <section className="panel structurePanel">
        <h2>Structure</h2>

        <div className="structureRow">
          <button
            onClick={() => {
              commitModel((current) => addState(current));
              setStructureEditError(null);
            }}
          >
            Add state
          </button>

          {selectedNode && (
            <button
              className="dangerButton"
              onClick={() => {
                try {
                  commitModel((current) => deleteState(current, selectedNode.id));
                  setSelectedKind(null);
                  setSelectedId(null);
                  setStructureEditError(null);
                } catch (err) {
                  setStructureEditError(err instanceof Error ? err.message : 'Could not delete state.');
                }
              }}
            >
              Delete selected state
            </button>
          )}

          {selectedEdge && (
            <button
              className="dangerButton"
              onClick={() => {
                commitModel((current) => deleteTransition(current, selectedEdge.id));
                setSelectedKind(null);
                setSelectedId(null);
                setStructureEditError(null);
              }}
            >
              Delete selected transition
            </button>
          )}
        </div>

        <div className="addTransitionRow">
          <label>
            From
            <select
              className="selectInput"
              value={newTransitionFrom}
              onChange={(e) => setNewTransitionFrom(e.target.value)}
            >
              {model.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            To
            <select
              className="selectInput"
              value={newTransitionTo}
              onChange={(e) => setNewTransitionTo(e.target.value)}
            >
              {model.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => {
              if (!newTransitionFrom || !newTransitionTo) {
                setStructureEditError('Choose both source and destination states.');
                return;
              }

              commitModel((current) => addTransition(current, newTransitionFrom, newTransitionTo));
              setStructureEditError(null);
            }}
          >
            Add transition
          </button>
        </div>

        {structureEditError && <p className="errorText">{structureEditError}</p>}
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

            <label className="fieldLabel" htmlFor="stateNameInput">
              Name
            </label>
            <input
              id="stateNameInput"
              className="textInput"
              value={stateNameDraft}
              onChange={(e) => {
                const raw = e.target.value;
                const next = raw.trim();
                const oldId = selectedNode.id;

                setStateNameDraft(raw);

                if (!next) {
                  setStateEditError('State name cannot be empty.');
                  return;
                }

                if (next !== oldId && model.states.some((s) => s.id === next)) {
                  setStateEditError(`State "${next}" already exists.`);
                  return;
                }

                commitModel((current) => renameState(current, oldId, next));
                setSelectedId(next);
                setStateEditError(null);
              }}
            />

            <div className="fieldLabel">Start state</div>
            <label className="checkboxRow">
              <input
                type="checkbox"
                checked={Boolean(selectedNode.isStart)}
                disabled={Boolean(selectedNode.isStart)}
                onChange={() => {
                  commitModel((current) => setStartState(current, selectedNode.id));
                }}
              />
              This is the start state
            </label>

            <label className="fieldLabel" htmlFor="mooreActionsInput">
              Moore actions
            </label>
            <input
              id="mooreActionsInput"
              className="textInput"
              value={stateMooreDraft}
              placeholder="rd=1,ds=0"
              onChange={(e) => {
                const text = e.target.value;
                setStateMooreDraft(text);

                try {
                  const parsed = parseActionsText(text, model);
                  setStateEditError(null);
                  commitModel((current) =>
                    updateState(current, selectedNode.id, {
                      mooreActions: parsed,
                      friendlyMooreActions: text,
                    })
                  );
                } catch (err) {
                  setStateEditError(err instanceof Error ? err.message : 'Invalid Moore action list.');
                }
              }}
            />

            {stateEditError && (
              <>
                <div />
                <div className="errorText">{stateEditError}</div>
              </>
            )}
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
                commitModel((current) =>
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
                  const parsed = parseActionsText(text, model);
                  setActionEditError(null);
                  commitModel((current) =>
                    updateTransition(current, selectedEdge.id, {
                      mealyActions: parsed,
                      friendlyMealyActions: text,
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