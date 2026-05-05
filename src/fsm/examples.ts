import type { FsmModel } from './model';

export const example2: FsmModel = {
  name: 'fsm',
  inputs: [
    { name: 'go', width: 1 },
    { name: 'ws', width: 1 },
  ],
  outputs: [
    { name: 'rd', width: 1 },
    { name: 'ds', width: 1 },
  ],
  states: [
    { id: 'IDLE', isStart: true },
    { id: 'READ' },
    { id: 'DLY' },
    { id: 'DONE' },
  ],
  transitions: [
    { id: 't1', from: 'IDLE', to: 'IDLE', condition: '~go', mealyActions: [{ target: 'rd', value: 0 }, { target: 'ds', value: 0 }] },
    { id: 't2', from: 'IDLE', to: 'READ', condition: 'go', mealyActions: [{ target: 'rd', value: 0 }, { target: 'ds', value: 0 }] },
    { id: 't3', from: 'READ', to: 'DLY', condition: '*', mealyActions: [{ target: 'rd', value: 1 }, { target: 'ds', value: 0 }] },
    { id: 't4', from: 'DLY', to: 'READ', condition: 'ws', mealyActions: [{ target: 'rd', value: 1 }, { target: 'ds', value: 0 }] },
    { id: 't5', from: 'DLY', to: 'DONE', condition: '~ws', mealyActions: [{ target: 'rd', value: 1 }, { target: 'ds', value: 0 }] },
    { id: 't6', from: 'DONE', to: 'IDLE', condition: '1', mealyActions: [{ target: 'rd', value: 0 }, { target: 'ds', value: 1 }] },
  ],
};