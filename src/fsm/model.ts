export type BitValue = 0 | 1 | 'x' | '-' | 'd';

export type Signal = {
  name: string;
  width: number;
};

export type Assignment = {
  target: string;     // e.g. "rd" or "y[0]"
  value: BitValue;
};

export type Alias = {
  name: string;
  value: string;
};

export type State = {
  id: string;
  isStart?: boolean;
  mooreActions?: Assignment[];
};

export type Transition = {
  id: string;
  from: string;
  to: string;
  condition: string;
  mealyActions?: Assignment[];
  actionAliases?: string[];
};

export type FsmModel = {
  name: string;
  inputs: Signal[];
  outputs: Signal[];
  states: State[];
  transitions: Transition[];
  aliases?: Alias[];
};