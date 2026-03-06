import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Lightweight SVG-based network diagram replacing @xyflow/react to avoid
 * d3-selection ESM subpath resolution failures in Vite.
 */
const NODE_W = 140;
const NODE_H = 50;
const H_GAP = 60;
const V_GAP = 80;

function autoLayout(nodes) {
  // Simple layered layout: group by y-position hint or spread evenly
  return nodes.map((n, i) => ({
    ...n,
    id: n.id || `node-${i}`,
    x: n.position?.x ?? i * (NODE_W + H_GAP),
    y: n.position?.y ?? 0,
  }));
}

export default function NetworkDiagram({ nodes = [], edges = [], title = null }) {
  const laid = useMemo(() => autoLayout(nodes), [nodes]);

  const nodeMap = useMemo(() => {
    const m = {};
    laid.forEach(n => { m[n.id] = n; });
    return m;
  }, [laid]);

  // Compute SVG viewport
  const maxX = laid.reduce((m, n) => Math.max(m, n.x + NODE_W), 400);
  const maxY = laid.reduce((m, n) => Math.max(m, n.y + NODE_H), 200);
  const svgW = maxX + H_GAP;
  const svgH = maxY + V_GAP;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full rounded-lg border border-slate-700/50 overflow-auto bg-slate-900/50 relative"
    >
      {title && (
        <div className="absolute top-4 left-4 z-10 text-white font-semibold text-lg pointer-events-none">
          {title}
        </div>
      )}
      <svg width={svgW} height={svgH} className="w-full h-full">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const src = nodeMap[e.source];
          const tgt = nodeMap[e.target];
          if (!src || !tgt) return null;
          const x1 = src.x + NODE_W / 2;
          const y1 = src.y + NODE_H;
          const x2 = tgt.x + NODE_W / 2;
          const y2 = tgt.y;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          return (
            <g key={e.id || `edge-${i}`}>
              <path
                d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                stroke="#3b82f6"
                strokeWidth={2}
                fill="none"
                strokeDasharray={e.animated ? '6 3' : undefined}
                markerEnd="url(#arrowhead)"
                opacity={0.8}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {laid.map((n) => (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              ry={8}
              fill="url(#nodeGrad)"
              stroke="#60a5fa"
              strokeWidth={1.5}
            />
            <defs>
              <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <text
              x={NODE_W / 2}
              y={n.data?.description ? 18 : NODE_H / 2 + 5}
              textAnchor="middle"
              fill="white"
              fontSize={12}
              fontWeight="600"
            >
              {n.data?.label || n.id}
            </text>
            {n.data?.description && (
              <text
                x={NODE_W / 2}
                y={34}
                textAnchor="middle"
                fill="#bfdbfe"
                fontSize={9}
              >
                {n.data.description}
              </text>
            )}
          </g>
        ))}
      </svg>
    </motion.div>
  );
}