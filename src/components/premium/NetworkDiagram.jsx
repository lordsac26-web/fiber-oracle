import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';

const CustomNode = ({ data }) => (
  <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white border-2 border-blue-400 shadow-lg">
    <div className="font-semibold text-sm">{data.label}</div>
    {data.description && (
      <div className="text-xs text-blue-100 mt-1">{data.description}</div>
    )}
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const nodeTypes = {
  custom: CustomNode,
};

export default function NetworkDiagram({ nodes = [], edges = [], title = null }) {
  const [flowNodes, setNodes, onNodesChange] = useNodesState(
    nodes.map((n, i) => ({
      ...n,
      id: n.id || `node-${i}`,
      type: n.type || 'custom',
      position: n.position || { x: i * 150, y: 0 },
    }))
  );

  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(
    edges.map((e, i) => ({
      ...e,
      id: e.id || `edge-${i}`,
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
    }))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full rounded-lg border border-slate-700/50 overflow-hidden bg-slate-900/50"
    >
      {title && (
        <div className="absolute top-4 left-4 z-10 text-white font-semibold text-lg">
          {title}
        </div>
      )}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#334155" gap={16} />
        <Controls />
      </ReactFlow>
    </motion.div>
  );
}