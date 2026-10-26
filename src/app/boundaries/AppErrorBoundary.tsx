import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FatalError } from './FatalError';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <FatalError
          title="The app hit an unexpected problem."
          description="The interface could not continue, but no data was changed by this error. Reload the app to try again."
          detail={import.meta.env.DEV ? this.state.error.message : undefined}
        />
      );
    }

    return this.props.children;
  }
}
