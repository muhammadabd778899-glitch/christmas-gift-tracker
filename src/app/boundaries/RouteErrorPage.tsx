import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { FatalError } from './FatalError';

export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <FatalError
        title={error.status === 404 ? 'This page could not be found.' : 'This page could not load.'}
        description={
          error.status === 404
            ? 'The route does not exist in this preview. Return to the dashboard to continue.'
            : 'The router returned an error while loading this page. No data was changed. Reload the app or return to the dashboard.'
        }
        detail={import.meta.env.DEV ? `${error.status} ${error.statusText}` : undefined}
      />
    );
  }

  return (
    <FatalError
      title="This page could not be displayed."
      description="An unexpected error interrupted the page. No data was changed by this error. Reload the app or return to the dashboard."
      detail={import.meta.env.DEV && error instanceof Error ? error.message : undefined}
    />
  );
}
