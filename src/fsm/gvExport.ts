import type { Assignment, FsmModel, Signal, Transition } from './model';

function fmtSignal(s: Signal): string {
  return s.width === 1 ? s.name : `${s.name}[${s.width}]`;
}

function fmtAssignment(a: Assignment): string {
  return `${a.target}=${a.value}`;
}

function wrapLabel(label: string): string {
  return label.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function fmtActions(actions: Assignment[] = []): string {
  return actions.map(fmtAssignment).join(',');
}

function fmtEdgeLabel(t: Transition): string {
  const condition = t.condition.trim() || '*';
  const actions = fmtActions(t.mealyActions ?? []);
  const aliases = (t.actionAliases ?? []).map(a => `{${a}}`);

  const rhs = [actions, ...aliases].filter(Boolean).join(',\\n');

  return rhs ? `${condition} / ${rhs}` : condition;
}

export function exportGv(model: FsmModel): string {
  const startStates = model.states.filter(s => s.isStart);

  if (startStates.length !== 1) {
    throw new Error('FSM must have exactly one start state.');
  }

  const lines: string[] = [];

  lines.push(`digraph ${model.name || 'fsm'} {`);
  lines.push('\trankdir=LR;');
  lines.push('\tsize="8,5"');
  lines.push('');
  lines.push(`\tinputs="${model.inputs.map(fmtSignal).join(',')}";`);
  lines.push(`\toutputs="${model.outputs.map(fmtSignal).join(',')}";`);
  lines.push(`\tstates="${model.states.map(s => s.id).join(',')}";`);

  if (model.aliases && model.aliases.length > 0) {
    const aliasText = model.aliases.map(a => `${a.name}:${a.value}`).join(';');
    lines.push(`\taliases="${wrapLabel(aliasText)}";`);
  }

  lines.push('');
  lines.push(`\tnode [shape = doublecircle]; ${startStates[0].id};`);
  lines.push('\tnode [shape = circle];');
  lines.push('');

  for (const s of model.states) {
    const actions = s.mooreActions ?? [];
    if (actions.length > 0) {
      lines.push(`\t${s.id} [label = "\\N\\n${wrapLabel(fmtActions(actions))}"];`);
    }
  }

  if (model.states.some(s => (s.mooreActions ?? []).length > 0)) {
    lines.push('');
  }

  for (const t of model.transitions) {
    lines.push(`\t${t.from} -> ${t.to} [ label = "${wrapLabel(fmtEdgeLabel(t))}" ];`);
  }

  lines.push('}');
  return lines.join('\n');
}