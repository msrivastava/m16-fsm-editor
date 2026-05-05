import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';

export function SelfLoopEdge({
  id,
  sourceX,
  sourceY,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const r = 52;

  const path = `
    M ${sourceX} ${sourceY}
    C ${sourceX - r} ${sourceY - r},
      ${sourceX - r} ${sourceY - 2 * r},
      ${sourceX} ${sourceY - 2 * r}
    C ${sourceX + r} ${sourceY - 2 * r},
      ${sourceX + r} ${sourceY - r},
      ${sourceX} ${sourceY}
  `;

  const labelX = sourceX;
  const labelY = sourceY - 2 * r - 14;

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