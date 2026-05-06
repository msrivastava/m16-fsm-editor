import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

export function FsmTransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const offset = 0;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const nx = (-dy / len) * offset;
  const ny = (dx / len) * offset;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sourceX + nx,
    sourceY: sourceY + ny,
    targetX: targetX + nx,
    targetY: targetY + ny,
    sourcePosition,
    targetPosition,
    curvature: 0.35,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />

      <EdgeLabelRenderer>
        <div
          className="fsmEdgeLabel"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX + nx}px, ${labelY + ny}px)`,
            pointerEvents: 'all',
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}