import { ReactNode, useState, useCallback } from 'react';
import { AccordionSection } from './AccordionSection';
import { Colors } from '../../lib/theme';

type Props = {
  checkInCount: number;
  children: ReactNode;
};

export function PlanProgressLogAccordion({ checkInCount, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((e) => !e), []);

  const subtitle =
    checkInCount === 0
      ? 'Your check-ins will appear here'
      : `${checkInCount} check-in${checkInCount === 1 ? '' : 's'} recorded`;

  return (
    <AccordionSection
      title="Progress log"
      subtitle={subtitle}
      expanded={expanded}
      onToggle={toggle}
      leftAccentColor={Colors.primaryDark}
    >
      {children}
    </AccordionSection>
  );
}
