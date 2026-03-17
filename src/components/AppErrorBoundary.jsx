import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">Something went wrong</h2>
            <p className="mb-6 text-sm text-muted-foreground">This screen hit an unexpected error. Reload to continue.</p>
            <Button onClick={this.handleReload} className="w-full">
              <RefreshCw className="h-4 w-4" />
              Reload app
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}