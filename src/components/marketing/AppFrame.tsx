import type { ReactNode } from "react";

/**
 * Chrome around a slice of the real application.
 *
 * Deliberately not a browser mockup with fake traffic-light dots — it mirrors the
 * app's own header so what's inside reads as the product rather than a picture of it.
 */
export function AppFrame({
  breadcrumb,
  status,
  children,
}: {
  breadcrumb: string[];
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-2xl shadow-black/60">
      <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-800/60 px-4 py-2.5">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
          {breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <span
                key={crumb}
                // Only the current page fits alongside the status pill on a phone;
                // the ancestor crumbs appear once there's room for them.
                className={`items-center gap-1.5 ${isLast ? "flex min-w-0" : "hidden sm:flex"}`}
              >
                {index > 0 ? (
                  <span aria-hidden className="hidden text-ink-600 sm:inline">
                    /
                  </span>
                ) : null}
                <span className={isLast ? "truncate font-medium text-ink-200" : "text-ink-400"}>
                  {crumb}
                </span>
              </span>
            );
          })}
        </nav>
        {status ? <div className="ml-auto shrink-0">{status}</div> : null}
      </div>
      {children}
    </div>
  );
}
