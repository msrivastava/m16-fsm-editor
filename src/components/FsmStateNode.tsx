import { Handle, Position, type NodeProps } from '@xyflow/react';

export function FsmStateNode({ data }: NodeProps) {
  const isStart = Boolean(data.isStart);

  return (
    <div className={`fsmState ${isStart ? 'fsmStateStart' : ''}`}>
      <Handle id="top" type="target" position={Position.Top} className="hiddenHandle" />
      <Handle id="left" type="target" position={Position.Left} className="hiddenHandle" />
      <Handle id="right" type="target" position={Position.Right} className="hiddenHandle" />
      <Handle id="bottom" type="target" position={Position.Bottom} className="hiddenHandle" />

      <div className="fsmStateLabel">{String(data.label ?? '')}</div>

      <Handle id="top-source" type="source" position={Position.Top} className="hiddenHandle" />
      <Handle id="left-source" type="source" position={Position.Left} className="hiddenHandle" />
      <Handle id="right-source" type="source" position={Position.Right} className="hiddenHandle" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="hiddenHandle" />
    </div>
  );
}