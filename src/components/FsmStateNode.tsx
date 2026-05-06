import { Handle, Position, type NodeProps } from '@xyflow/react';

const handleStyle = {
  opacity: 0,
  width: 14,
  height: 14,
  background: 'transparent',
  border: 'none',
};

export function FsmStateNode({ data }: NodeProps) {
  const isStart = Boolean(data.isStart);
  const isSelected = Boolean(data.selected);
  const mooreActions = String(data.mooreActions ?? '');

  return (
    <div className={`fsmState ${isStart ? 'fsmStateStart' : ''} ${isSelected ? 'fsmStateSelected' : ''}`}>
      {/* Target handles */}
      <Handle id="top" type="target" position={Position.Top} style={{ ...handleStyle, left: '50%' }} />
      <Handle id="top-left" type="target" position={Position.Top} style={{ ...handleStyle, left: '35%' }} />
      <Handle id="top-right" type="target" position={Position.Top} style={{ ...handleStyle, left: '65%' }} />

      <Handle id="bottom" type="target" position={Position.Bottom} style={{ ...handleStyle, left: '50%' }} />
      <Handle id="bottom-left" type="target" position={Position.Bottom} style={{ ...handleStyle, left: '35%' }} />
      <Handle id="bottom-right" type="target" position={Position.Bottom} style={{ ...handleStyle, left: '65%' }} />

      <Handle id="left" type="target" position={Position.Left} style={{ ...handleStyle, top: '50%' }} />
      <Handle id="left-upper" type="target" position={Position.Left} style={{ ...handleStyle, top: '35%' }} />
      <Handle id="left-lower" type="target" position={Position.Left} style={{ ...handleStyle, top: '65%' }} />

      <Handle id="right" type="target" position={Position.Right} style={{ ...handleStyle, top: '50%' }} />
      <Handle id="right-upper" type="target" position={Position.Right} style={{ ...handleStyle, top: '35%' }} />
      <Handle id="right-lower" type="target" position={Position.Right} style={{ ...handleStyle, top: '65%' }} />

      <div className="fsmStateLabel">
        <div>{String(data.label ?? '')}</div>
        {mooreActions && <div className="fsmMooreActions">{mooreActions}</div>}
      </div>

      {/* Source handles */}
      <Handle id="top-source" type="source" position={Position.Top} style={{ ...handleStyle, left: '50%' }} />
      <Handle id="top-left-source" type="source" position={Position.Top} style={{ ...handleStyle, left: '35%' }} />
      <Handle id="top-right-source" type="source" position={Position.Top} style={{ ...handleStyle, left: '65%' }} />

      <Handle id="bottom-source" type="source" position={Position.Bottom} style={{ ...handleStyle, left: '50%' }} />
      <Handle id="bottom-left-source" type="source" position={Position.Bottom} style={{ ...handleStyle, left: '35%' }} />
      <Handle id="bottom-right-source" type="source" position={Position.Bottom} style={{ ...handleStyle, left: '65%' }} />

      <Handle id="left-source" type="source" position={Position.Left} style={{ ...handleStyle, top: '50%' }} />
      <Handle id="left-upper-source" type="source" position={Position.Left} style={{ ...handleStyle, top: '35%' }} />
      <Handle id="left-lower-source" type="source" position={Position.Left} style={{ ...handleStyle, top: '65%' }} />

      <Handle id="right-source" type="source" position={Position.Right} style={{ ...handleStyle, top: '50%' }} />
      <Handle id="right-upper-source" type="source" position={Position.Right} style={{ ...handleStyle, top: '35%' }} />
      <Handle id="right-lower-source" type="source" position={Position.Right} style={{ ...handleStyle, top: '65%' }} />
    </div>
  );
}