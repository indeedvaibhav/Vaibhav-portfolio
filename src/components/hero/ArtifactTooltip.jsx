import { forwardRef } from 'react';

const ArtifactTooltip = forwardRef(function ArtifactTooltip(_props, ref) {
  return (
    <div
      ref={ref}
      className="artifact-tooltip"
      role="tooltip"
      aria-hidden="true"
    />
  );
});

export default ArtifactTooltip;
