/**
 * Fila de Prioridade baseada em Min-Heap Binário.
 * Garante inserção e remoção em complexidade O(log N).
 */

export interface HeapElement<T> {
  priority: number;
  item: T;
  id: number;
}

export class PriorityQueue<T> {
  private heap: Array<HeapElement<T>> = [];
  private counter = 0;

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  enqueue(item: T, priority: number): void {
    const element: HeapElement<T> = {
      priority,
      item,
      id: this.counter++,
    };
    this.heap.push(element);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;

    const root = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }

    return root.item;
  }

  private bubbleUp(index: number): void {
    let idx = index;
    const element = this.heap[idx];

    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.heap[parentIdx];

      if (
        element.priority < parent.priority ||
        (element.priority === parent.priority && element.id < parent.id)
      ) {
        this.heap[idx] = parent;
        this.heap[parentIdx] = element;
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private sinkDown(index: number): void {
    let idx = index;
    const length = this.heap.length;
    const element = this.heap[idx];

    while (true) {
      const leftChildIdx = 2 * idx + 1;
      const rightChildIdx = 2 * idx + 2;
      let swapIdx: number | null = null;

      if (leftChildIdx < length) {
        const leftChild = this.heap[leftChildIdx];
        if (
          leftChild.priority < element.priority ||
          (leftChild.priority === element.priority && leftChild.id < element.id)
        ) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const rightChild = this.heap[rightChildIdx];
        const compareTarget = swapIdx === null ? element : this.heap[swapIdx];
        if (
          rightChild.priority < compareTarget.priority ||
          (rightChild.priority === compareTarget.priority && rightChild.id < compareTarget.id)
        ) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;

      this.heap[idx] = this.heap[swapIdx];
      this.heap[swapIdx] = element;
      idx = swapIdx;
    }
  }

  clear(): void {
    this.heap = [];
    this.counter = 0;
  }
}
