/** A minimal event stream, standing in for Kotlin's SharedFlow. */
export class Emitter<T> {
  private listeners = new Set<(value: T) => void>();

  on(listener: (value: T) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(value: T) {
    this.listeners.forEach((l) => l(value));
  }
}
