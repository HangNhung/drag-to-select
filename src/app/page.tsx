'use client';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';

function intersect(rect1: DOMRect, rect2: DOMRect) {
  if (rect1.right < rect2.left || rect2.right < rect1.left) return false;

  if (rect1.bottom < rect2.top || rect2.bottom < rect1.top) return false;

  return true;
}

export default function Home() {
  // DomRect(x, y, width, height)
  // The x và y của DOMRect sẽ thể hiện cho vị trí bắt đầu kéo, height and width mang giá trị không âm, và đại diện cho việc được kéo bao xa. Khi chúng ta kéo lên trên bên trái, chúng ta phải set lại x, y của DomRect vì chúng không thể bị âm. Điều này khiến điểm xuất phát bị set lại.
  // Nguyên nhân chính là height và width là những biểu hiện của độ lớn nhưng không có hướng. Chúng ta cần một dạng datatype có thể thể hiển được dộ lớn và hướng theo hành động của người dùng.
  // This concept of magnitude + direction is called a vector
  // DOMRects are so close to being vector quantities but the names width and height limit your thinking to one quadrant.
  // Let's create our own DOMVector class with x, y, magnitudeX và magnitudeY
  class DOMVector {
    constructor(
      readonly x: number,
      readonly y: number,
      readonly magnitudeX: number,
      readonly magnitudeY: number
    ) {
      this.x = x;
      this.y = y;
      this.magnitudeX = magnitudeX;
      this.magnitudeY = magnitudeY;
    }

    toDOMRect(): DOMRect {
      return new DOMRect(
        Math.min(this.x, this.x + this.magnitudeX),
        Math.min(this.y, this.y + this.magnitudeY),
        Math.abs(this.magnitudeX),
        Math.abs(this.magnitudeY)
      );
    }

    // Lấy độ dài đường chéo
    getDiagonalLength(): number {
      return Math.sqrt(
        Math.pow(this.magnitudeX, 2) + Math.pow(this.magnitudeY, 2)
      );
    }

    add(vector: DOMVector): DOMVector {
      return new DOMVector(
        this.x + vector.x,
        this.y + vector.y,
        this.magnitudeX + vector.magnitudeX,
        this.magnitudeY + vector.magnitudeY
      );
    }

    clamp(vector: DOMRect): DOMVector {
      return new DOMVector(
        this.x,
        this.y,
        Math.min(vector.width - this.x, this.magnitudeX),
        Math.min(vector.height - this.y, this.magnitudeY)
      );
    }

    // Finding the terminal point
    toTerminalPoint(): DOMPoint {
      return new DOMPoint(this.x + this.magnitudeX, this.y + this.magnitudeY);
    }
  }

  const items = Array.from({ length: 300 }, (_, i) => i + '');
  const [dragVector, setDragVector] = useState<DOMVector | null>(null);

  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(
    {}
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSelectedItems = useCallback(function updateSelectedItems(
    dragVector: DOMVector,
    scrollVector: DOMVector
  ) {
    if (containerRef.current == null) return;
    const next: Record<string, boolean> = {};
    const containerRect = containerRef.current.getBoundingClientRect();

    containerRef.current.querySelectorAll('[data-item]').forEach((el) => {
      if (containerRef.current == null || !(el instanceof HTMLElement)) return;

      const itemRect = el.getBoundingClientRect();
      const x = itemRect.x - containerRect.x + containerRef.current.scrollLeft;
      const y = itemRect.y - containerRect.y + containerRef.current.scrollTop;
      const translatedItemRect = new DOMRect(
        x,
        y,
        itemRect.width,
        itemRect.height
      );

      if (
        !intersect(dragVector.add(scrollVector).toDOMRect(), translatedItemRect)
      )
        return;

      if (el.dataset.item && typeof el.dataset.item === 'string') {
        next[el.dataset.item] = true;
      }
    });

    setSelectedItems(next);
  }, []);

  const [isDragging, setIsDragging] = useState(false);

  // Scrolling
  const [scrollVector, setScrollVector] = useState<DOMVector | null>(null);

  // Derive state
  const selectionRect =
    dragVector && scrollVector && isDragging && containerRef.current
      ? dragVector
          .add(scrollVector)
          .clamp(
            new DOMRect(
              0,
              0,
              containerRef.current.scrollWidth,
              containerRef.current.scrollHeight
            )
          )
          .toDOMRect()
      : null;

  useEffect(() => {
    if (!isDragging || containerRef.current == null) return;

    // requestAnimationFrame (RAF) is an API for doing something every time your browser renderes
    let handle = requestAnimationFrame(scrollTheLad);

    return () => cancelAnimationFrame(handle);

    function clamp(num: number, min: number, max: number) {
      return Math.min(Math.max(num, min), max);
    }

    function scrollTheLad() {
      if (containerRef.current == null || dragVector == null) return;

      // Dùng terminal point để quyết định việc có nên cuộn tự động hay không
      const currentPointer = dragVector.toTerminalPoint();
      const containerRect = containerRef.current.getBoundingClientRect();

      const shouldScrollRight = containerRect.width - currentPointer.x < 20;
      const shouldScrollLeft = currentPointer.x < 20;
      const shouldScrollDown = containerRect.height - currentPointer.y < 20;
      const shouldScrollUp = currentPointer.y < 20;

      const left = shouldScrollRight
        ? clamp(20 - containerRect.width + currentPointer.x, 0, 15)
        : shouldScrollLeft
          ? -1 * clamp(20 - currentPointer.x, 0, 15)
          : undefined;

      const top = shouldScrollDown
        ? clamp(20 - containerRect.height + currentPointer.y, 0, 15)
        : shouldScrollUp
          ? -1 * clamp(20 - currentPointer.y, 0, 15)
          : undefined;

      if (top === undefined && left === undefined) {
        handle = requestAnimationFrame(scrollTheLad);
        return;
      }

      containerRef.current.scrollBy({
        left,
        top,
      });

      handle = requestAnimationFrame(scrollTheLad);
    }
  }, [isDragging, dragVector, updateSelectedItems]);

  return (
    <div>
      <div className="flex flex-row justify-between">
        <div className="px-2 border-2 border-black">selectable area</div>
        {Object.keys(selectedItems).length > 0 && (
          <div className="px-2 border-2 border-black">
            count: {Object.keys(selectedItems).length}
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className={clsx(
          'relative max-h-96 overflow-auto z-10 grid grid-cols-[repeat(20,min-content)] gap-4 p-4',
          'border-2 border-black select-none -translate-y-0.5 focus:outline-none focus:border-dashed'
        )}
        onPointerDown={(e) => {
          if (e.button !== 0) return;

          const containerRect = e.currentTarget.getBoundingClientRect();

          setDragVector(
            new DOMVector(
              e.clientX - containerRect.x,
              e.clientY - containerRect.y,
              0,
              0
            )
          );

          setScrollVector(
            new DOMVector(
              e.currentTarget.scrollLeft,
              e.currentTarget.scrollTop,
              0,
              0
            )
          );

          // Preventing pointer events during drag with setPointerCapture
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragVector == null || scrollVector == null) return;

          const containerRect = e.currentTarget.getBoundingClientRect();

          const nextSelectionRect = new DOMVector(
            dragVector.x,
            dragVector.y,
            e.clientX - containerRect.x - dragVector.x,
            e.clientY - containerRect.y - dragVector.y
          );

          // Sẽ không cập nhật drag state cho đến khi độ dài kéo lớn hơn 10px
          if (!isDragging && nextSelectionRect.getDiagonalLength() < 10) return;

          setIsDragging(true);

          containerRef.current?.focus();

          setDragVector(nextSelectionRect);
          updateSelectedItems(nextSelectionRect, scrollVector);
        }}
        onPointerUp={() => {
          if (!isDragging) {
            setSelectedItems({});
            setDragVector(null);
          } else {
            setIsDragging(false);
            setDragVector(null);
          }

          setScrollVector(null);
        }}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setSelectedItems({});
            setDragVector(null);
          }
          setScrollVector(null);
        }}
        onScroll={(e) => {
          if (dragVector == null || scrollVector == null) return;

          const { scrollLeft, scrollTop } = e.currentTarget;

          const nextScrollVector = new DOMVector(
            scrollVector.x,
            scrollVector.y,
            scrollLeft - scrollVector.x,
            scrollTop - scrollVector.y
          );

          setScrollVector(nextScrollVector);
          updateSelectedItems(dragVector, nextScrollVector);
        }}
      >
        {items.map((item) => (
          <div
            data-item={item}
            className={clsx(
              'border-2 size-10 border-black flex justify-center items-center',
              selectedItems[item]
                ? 'bg-black text-white'
                : 'bg-white text-black'
            )}
            key={item}
          >
            {item}
          </div>
        ))}
        {selectionRect && (
          <div
            className="absolute border-black border-2 bg-black/30"
            style={{
              top: selectionRect.y,
              left: selectionRect.x,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
        )}
      </div>
    </div>
  );
}
