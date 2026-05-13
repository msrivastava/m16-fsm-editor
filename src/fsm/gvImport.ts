import type { Assignment, FsmModel } from './model';

function stripComments(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .join('\n');
}

function getGraphName(text: string): string {
  const match = text.match(/\bdigraph\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match?.[1] ?? 'imported_fsm';
}

function getQuotedAttr(text: string, name: string): string | undefined {
  const regex = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'm');
  return text.match(regex)?.[1];
}

function parseSignals(text: string): FsmModel['inputs'] {
  return text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?$/);
      if (!match) {
        throw new Error(`Invalid signal declaration "${part}".`);
      }

      return {
        name: match[1],
        width: match[2] ? Number(match[2]) : 1,
      };
    });
}

function parseStateNames(text: string): string[] {
  return text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseAliases(text: string | undefined): FsmModel['aliases'] {
  if (!text) return [];

  return text
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf(':');
      if (idx < 0) {
        throw new Error(`Invalid alias declaration "${entry}".`);
      }

      return {
        name: entry.slice(0, idx).trim(),
        value: entry.slice(idx + 1).trim(),
      };
    });
}

function unescapeLabel(label: string): string {
  return label
    .replaceAll('\\n', '\n')
    .replaceAll('\\"', '"')
    .trim();
}

function parseAssignments(text: string): Assignment[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !/^\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(x))
    .map((part) => {
      const pieces = part.split('=').map((x) => x.trim());

      if (pieces.length !== 2) {
        throw new Error(`Invalid assignment "${part}".`);
      }

      const [target, valueText] = pieces;

      if (!['0', '1', 'x', '-', 'd'].includes(valueText)) {
        throw new Error(`Invalid assignment value "${valueText}".`);
      }

      return {
        target,
        value:
          valueText === '0' || valueText === '1'
            ? (Number(valueText) as 0 | 1)
            : (valueText as 'x' | '-' | 'd'),
      };
    });
}

function parseActionAliases(text: string): string[] {
  return text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => /^\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(x))
    .map((x) => x.slice(1, -1));
}

function parseStartStates(text: string): string[] {
  const starts: string[] = [];

  const doubleCircleBlocks =
    [...text.matchAll(/node\s*\[\s*shape\s*=\s*doublecircle\s*\]\s*;([^;]+);/g)];

  for (const block of doubleCircleBlocks) {
    const body = block[1];

    for (const part of body.split(',')) {
      const maybe = part.trim().replace(/;$/, '');
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(maybe)) {
        starts.push(maybe);
      }
    }
  }

  return starts;
}

function parseMooreLabels(text: string): Record<string, Assignment[]> {
  const result: Record<string, Assignment[]> = {};

  const regex =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*label\s*=\s*"((?:\\"|[^"])*)"\s*\]/g;

  for (const match of text.matchAll(regex)) {
    const stateId = match[1];
    const label = unescapeLabel(match[2]);

    const pieces = label.split('\n');
    const actionText = pieces.slice(1).join('').trim();

    if (actionText) {
      result[stateId] = parseAssignments(actionText);
    }
  }

  return result;
}

function parseTransitions(text: string): FsmModel['transitions'] {
  const transitions: FsmModel['transitions'] = [];

  const regex =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*->\s*([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*label\s*=\s*"((?:\\"|[^"])*)"\s*\]/g;

  let index = 0;

  for (const match of text.matchAll(regex)) {
    const from = match[1];
    const to = match[2];
    const rawLabel = unescapeLabel(match[3]);

    const slashIndex = rawLabel.indexOf('/');

    const condition =
      slashIndex >= 0 ? rawLabel.slice(0, slashIndex).trim() : rawLabel.trim();

    const actionText =
      slashIndex >= 0 ? rawLabel.slice(slashIndex + 1).trim() : '';

    transitions.push({
      id: `t${index}`,
      from,
      to,
      condition,
      mealyActions: parseAssignments(actionText),
      actionAliases: parseActionAliases(actionText),
      friendlyMealyActions: actionText || undefined,
    });

    index += 1;
  }

  return transitions;
}

export function importGv(text: string): FsmModel {
  const cleaned = stripComments(text);

  const inputsText = getQuotedAttr(cleaned, 'inputs') ?? '';
  const outputsText = getQuotedAttr(cleaned, 'outputs') ?? '';
  const statesText = getQuotedAttr(cleaned, 'states');

  if (!statesText) {
    throw new Error('Missing required states="..." declaration.');
  }

  const stateNames = parseStateNames(statesText);
  const startStates = parseStartStates(cleaned);
  const mooreLabels = parseMooreLabels(cleaned);

  const states = stateNames.map((id) => ({
    id,
    isStart: startStates.includes(id),
    mooreActions: mooreLabels[id] ?? [],
    friendlyMooreActions:
      mooreLabels[id] && mooreLabels[id].length > 0
        ? mooreLabels[id].map((a) => `${a.target}=${a.value}`).join(',')
        : undefined,
  }));

  if (states.length > 0 && states.every((s) => !s.isStart)) {
    states[0] = {
      ...states[0],
      isStart: true,
    };
  }

  return {
    name: getGraphName(cleaned),
    inputs: parseSignals(inputsText),
    outputs: parseSignals(outputsText),
    states,
    transitions: parseTransitions(cleaned),
    aliases: parseAliases(getQuotedAttr(cleaned, 'aliases')),
  };
}