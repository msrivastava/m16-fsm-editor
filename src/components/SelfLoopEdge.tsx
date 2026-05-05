import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';

export function SelfLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const loopSize = 72;

  const path = `
    M ${sourceX} ${sourceY}
    C ${sourceX - loopSize} ${sourceY - loopSize},
      ${targetX - loopSize} ${targetY + loopSize},
      ${targetX} ${targetY}
  `;

  const labelX = sourceX - loopSize - 12;
  const labelY = sourceY - 18;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={style}
      />

      <EdgeLabelRenderer>
        <div
          className="selfLoopLabel"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}