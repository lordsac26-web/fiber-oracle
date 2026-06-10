/**
 * CertificateLayoutEditor
 *
 * Drag-and-drop panel for reordering ONT birth certificate sections.
 * Order is persisted to localStorage and passed to the PDF generator.
 */

import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'ont_cert_section_order';

export const DEFAULT_SECTIONS = [
  { id: 'subscriber',    label: 'Subscriber Information',                     description: 'Name, account, service address' },
  { id: 'device',        label: 'Device ID & Network Location',               description: 'Serial, ONT ID, OLT, port, model, LCP, splitter' },
  { id: 'optical',       label: 'Optical Readings',                           description: 'ONT Rx, OLT Rx, ONT Tx power tiles' },
  { id: 'errors',        label: 'Error Metrics',                              description: 'BIP, FEC, GEM HEC, missed bursts grid' },
  { id: 'dates',         label: 'Installation Dates',                         description: 'First seen + fill-in actual install date' },
  { id: 'signoff',       label: 'Authorization & Sign-Off',                   description: 'Technician, supervisor signatures, notes' },
];

export function loadSectionOrder() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SECTIONS.map(s => s.id);
    const parsed = JSON.parse(stored);
    // Ensure any new sections added in DEFAULT_SECTIONS are appended
    const allIds = DEFAULT_SECTIONS.map(s => s.id);
    const filtered = parsed.filter(id => allIds.includes(id));
    const missing = allIds.filter(id => !filtered.includes(id));
    return [...filtered, ...missing];
  } catch {
    return DEFAULT_SECTIONS.map(s => s.id);
  }
}

export function saveSectionOrder(order) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {}
}

export default function CertificateLayoutEditor({ order, onChange }) {
  const sectionMap = Object.fromEntries(DEFAULT_SECTIONS.map(s => [s.id, s]));

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = Array.from(order);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    onChange(newOrder);
    saveSectionOrder(newOrder);
  };

  const handleReset = () => {
    const defaultOrder = DEFAULT_SECTIONS.map(s => s.id);
    onChange(defaultOrder);
    saveSectionOrder(defaultOrder);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">Drag sections to reorder them in the PDF output.</p>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-500" onClick={handleReset}>
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="cert-sections">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-1.5"
            >
              {order.map((id, index) => {
                const section = sectionMap[id];
                if (!section) return null;
                return (
                  <Draggable key={id} draggableId={id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-shadow ${
                          snapshot.isDragging
                            ? 'bg-amber-50 border-amber-300 shadow-md'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 text-xs leading-tight">{section.label}</p>
                            <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">{section.description}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}