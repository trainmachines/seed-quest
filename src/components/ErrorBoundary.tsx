import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : 'The save could not be shown.' };
  }

  render() {
    if (this.state.message) {
      return (
        <main className="title-screen">
          <h1>This save hit a snag</h1>
          <p>{this.state.message}</p>
          <p>Reset the slot in this browser and start again. Nothing was sent anywhere.</p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              try {
                localStorage.removeItem('seed-quest.saves.v1');
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          >
            Reset saves and reload
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
