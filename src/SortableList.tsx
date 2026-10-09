import { useId } from "react";
import type {
  Dispatch,
  HTMLAttributes,
  ReactNode,
  SetStateAction,
} from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type ListItem = { id: number };

export function SortableList<T extends ListItem>({
  items,
  setItems,
  label,
  className,
  itemLabel,
  rowProps,
  renderItem,
  isDisabled,
}: {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  label: string;
  className: string;
  itemLabel: (item: T) => string;
  rowProps: (item: T) => HTMLAttributes<HTMLDivElement>;
  renderItem: (item: T, dragHandle: ReactNode) => ReactNode;
  isDisabled?: (item: T) => boolean;
}) {
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const describe = (itemId: string | number) => {
    const item = items.find((candidate) => candidate.id === itemId);
    return item ? itemLabel(item) : "条目";
  };
  const position = (itemId: string | number) =>
    items.findIndex((item) => item.id === itemId) + 1;

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "按空格或回车开始排序，按上下方向键移动，再按空格或回车保存，按 Escape 取消。",
        },
        announcements: {
          onDragStart: ({ active }) => `开始移动${describe(active.id)}。`,
          onDragOver: ({ active, over }) =>
            over
              ? `${describe(active.id)}，当前位置第 ${position(over.id)} 项，共 ${items.length} 项。`
              : "已离开列表。",
          onDragEnd: ({ active, over }) =>
            over
              ? `${describe(active.id)}已移到第 ${position(over.id)} 项。`
              : "排序未改变。",
          onDragCancel: () => "已取消排序。",
        },
      }}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        setItems((current) => {
          const from = current.findIndex((item) => item.id === active.id);
          const to = current.findIndex((item) => item.id === over.id);
          return from < 0 || to < 0 ? current : arrayMove(current, from, to);
        });
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className={className} role="list" aria-label={label}>
          {items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              label={itemLabel(item)}
              disabled={isDisabled?.(item)}
              rowProps={rowProps(item)}
            >
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  label,
  disabled,
  rowProps,
  children,
}: {
  id: number;
  label: string;
  disabled?: boolean;
  rowProps: HTMLAttributes<HTMLDivElement>;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    transition: { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  });

  return (
    <div
      role="listitem"
      {...rowProps}
      ref={setNodeRef}
      className={`sortable-row ${rowProps.className ?? ""} ${isDragging ? "is-dragging" : ""}`}
      style={{
        ...rowProps.style,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {children(
        <button
          type="button"
          className="sort-handle"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`拖动排序：${label}`}
          title="拖动调整顺序；也可按空格和上下方向键排序"
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical size={15} aria-hidden="true" />
        </button>,
      )}
    </div>
  );
}
