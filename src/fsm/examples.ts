import type { FsmModel } from './model';

export const simpleExample: FsmModel = {
  name: 'simple',
  inputs: [{ name: 'X', width: 1 }],
  outputs: [{ name: 'Z', width: 1 }],
  states: [
    {
      id: 'A',
      isStart: true,
      mooreActions: [],
    },
    {
      id: 'B',
      isStart: false,
      mooreActions: [],
    },
  ],
  transitions: [
    {
      id: 't0',
      from: 'A',
      to: 'A',
      condition: '~X',
      mealyActions: [{ target: 'Z', value: 0 }],
    },
    {
      id: 't1',
      from: 'A',
      to: 'B',
      condition: 'X',
      mealyActions: [{ target: 'Z', value: 0 }],
    },
    {
      id: 't2',
      from: 'B',
      to: 'A',
      condition: '~X',
      mealyActions: [{ target: 'Z', value: 1 }],
    },
    {
      id: 't3',
      from: 'B',
      to: 'B',
      condition: 'X',
      mealyActions: [{ target: 'Z', value: 1 }],
    },
  ],
  aliases: [],
};