import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// The shell exposes a DOM node (the desktop top-bar slot). Pages render their
// heading through <PageHeading>, which shows it inline on mobile/tablet (the
// existing look) and portals it into that top bar on desktop (lg+), so the
// title sits in the grey area above the white panel next to the profile chip.
export const HeaderSlotContext = createContext(null);

export function PageHeading({ children }) {
  const slot = useContext(HeaderSlotContext);
  return (
    <>
      {/* Mobile / tablet: inline at the top of the page content. */}
      <div className="mb-6 lg:hidden">{children}</div>
      {/* Desktop: into the shell top bar. */}
      {slot ? createPortal(<div className="hidden lg:block">{children}</div>, slot) : null}
    </>
  );
}
