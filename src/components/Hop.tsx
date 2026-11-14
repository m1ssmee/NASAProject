// Label for primary links and buttons: on hover the text hops once like a mover between two
// plates, and a wax-pencil tick marks it.
export function Hop({ children, tick = true }: { children: React.ReactNode; tick?: boolean }) {
  return (
    <span className="hop">
      <span className="hop__t">{children}</span>
      {tick && <i className="hop__tick" aria-hidden="true" />}
    </span>
  );
}
