import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from '@xyflow/react';

function outwardVector(position: Position): { x: number; y: number } {
  switch (position) {
    case Position.Top:
      return { x: 0, y: -1 };
    case Position.Bottom:
      return { x: 0, y: 1 };
    case Position.Left:
      return { x: -1, y: 0 };
    case Position.Right:
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: -1 };
  }
}

export function SelfLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const r = 54;

  const v = outwardVector(sourcePosition ?? Position.Top);

  // Perpendicular vector to make the loop have width.
  const p = { x: -v.y, y: v.x };

  const start = { x: sourceX, y: sourceY };
  const end = { x: targetX, y: targetY };

  const c1 = {
    x: start.x + v.x * r + p.x * r,
    y: start.y + v.y * r + p.y * r,
  };

  const c2 = {
    x: start.x + v.x * 2 * r + p.x * r,
    y: start.y + v.y * 2 * r + p.y * r,
  };

  const mid = {
    x: start.x + v.x * 2 * r,
    y: start.y + v.y * 2 * r,
  };

  const c3 = {
    x: end.x + v.x * 2 * r - p.x * r,
    y: end.y + v.y * 2 * r - p.y * r,
  };

  const c4 = {
    x: end.x + v.x * r - p.x * r,
    y: end.y + v.y * r - p.y * r,
  };

  const path = `
    M ${start.x} ${start.y}
    C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${mid.x} ${mid.y}
    C ${c3.x} ${c3.y}, ${c4.x} ${c4.y}, ${end.x} ${end.y}
  `;

  const labelX = mid.x;
  const labelY = mid.y;

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