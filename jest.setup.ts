import '@testing-library/jest-dom';

// jsdom has no canvas; code that draws (confetti) bails on a null context.
// Plain function, not jest.fn(): `resetMocks` would wipe a mock's implementation.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
